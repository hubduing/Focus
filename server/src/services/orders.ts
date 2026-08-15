import { prisma } from '../db/client.js'
import { HttpError } from '../lib/errors.js'
import { sendOrderStatusMail } from '../lib/mailer.js'
import { prepareCheckoutCart } from './cart.js'
import { assertValidTransition } from './orderStatus.js'

const STATUS_LABELS: Record<string, string> = {
  created: 'Создан',
  paid: 'Оплачен',
  processing: 'В обработке',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function mapOrder(order: {
  id: string
  total: { toNumber(): number } | number
  status: string
  paymentMethod: string
  addressLabel: string
  addressStreet: string
  addressCity: string
  addressZip: string | null
  createdAt: Date
  userId: string
  items: Array<{
    id: string
    productId: string
    nameSnapshot: string
    priceSnapshot: { toNumber(): number } | number
    quantity: number
  }>
  payment: {
    provider: string
    status: string
    amount: { toNumber(): number } | number
    providerRef: string | null
  } | null
}) {
  return {
    id: order.id,
    userId: order.userId,
    total: Number(order.total),
    status: order.status,
    paymentMethod: order.paymentMethod,
    addressLabel: order.addressLabel,
    addressStreet: order.addressStreet,
    addressCity: order.addressCity,
    addressZip: order.addressZip,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.nameSnapshot,
      price: Number(item.priceSnapshot),
      quantity: item.quantity,
    })),
    payment: order.payment
      ? {
          provider: order.payment.provider,
          status: order.payment.status,
          amount: Number(order.payment.amount),
          providerRef: order.payment.providerRef,
        }
      : null,
  }
}

export interface ListOrdersParams {
  page: number
  perPage: number
}

export async function listOrders(userId: string, params: ListOrdersParams) {
  const { page, perPage } = params
  const [total, orders] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        items: true,
        payment: true,
      },
    }),
  ])

  return {
    data: orders.map(mapOrder),
    meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  }
}

export async function getOrder(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true, payment: true },
  })
  if (!order) {
    throw new HttpError(404, 'Заказ не найден')
  }
  return { data: mapOrder(order) }
}

export interface CreateOrderInput {
  addressId: string
  paymentMethod: 'card' | 'cash' | 'on_delivery'
}

// Создание заказа из корзины: цены/скидки/остатки считаются только на сервере,
// снимки названия и цены сохраняются на момент оформления.
export async function createOrder(userId: string, input: CreateOrderInput) {
  const lines = await prepareCheckoutCart(userId)

  const address = await prisma.address.findFirst({ where: { id: input.addressId, userId } })
  if (!address) {
    throw new HttpError(404, 'Адрес доставки не найден')
  }

  const total = round2(lines.reduce((sum, line) => sum + line.subtotal, 0))
  if (total <= 0) {
    throw new HttpError(400, 'Сумма заказа должна быть больше нуля')
  }

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId,
        total,
        status: 'created',
        paymentMethod: input.paymentMethod,
        addressLabel: address.label,
        addressStreet: address.street,
        addressCity: address.city,
        addressZip: address.zip,
        items: {
          create: lines.map((line) => ({
            productId: line.productId,
            nameSnapshot: line.name,
            priceSnapshot: line.unitPrice,
            quantity: line.quantity,
          })),
        },
        payment: {
          create: {
            provider: input.paymentMethod === 'card' ? 'stripe' : 'offline',
            amount: total,
            status: 'pending',
          },
        },
      },
      include: { items: true, payment: true },
    })
    // корзина очищается после успешного создания заказа
    await tx.cartItem.deleteMany({ where: { userId } })
    return created
  })

  return { data: mapOrder(order) }
}

export async function getOrderForAdmin(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payment: true },
  })
  if (!order) {
    throw new HttpError(404, 'Заказ не найден')
  }
  return { data: mapOrder(order) }
}

// Смена статуса заказа (админ). Валидирует переходы статусной модели,
// после изменения отправляет пользователю уведомление на email.
export async function updateOrderStatus(orderId: string, status: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      payment: true,
      paymentMethod: true,
      userId: true,
      total: true,
      items: true,
      addressLabel: true,
      addressStreet: true,
      addressCity: true,
    },
  })
  if (!order) {
    throw new HttpError(404, 'Заказ не найден')
  }

  assertValidTransition(order.status, status)

  const data: { status: string; payment?: { update: { status: string } } | undefined } = { status }
  // онлайн-подтверждение оплаты для офлайн-способов: синхронизируем запись оплаты
  if (status === 'paid' && order.paymentMethod !== 'card' && order.payment) {
    data.payment = { update: { status: 'succeeded' } }
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data,
    include: { items: true, payment: true },
  })
  const result = { data: mapOrder(updated) }

  // уведомляем покупателя (ошибка почты не должна ломать ответ)
  try {
    const user = await prisma.user.findUnique({ where: { id: order.userId }, select: { email: true } })
    if (user) {
      const fromAddress = [order.addressLabel, order.addressStreet, order.addressCity].filter(Boolean).join(', ')
      await sendOrderStatusMail(user.email, {
        id: order.id,
        total: Number(order.total),
        statusLabel: STATUS_LABELS[status] ?? status,
        items: order.items.map((item) => ({
          name: item.nameSnapshot,
          quantity: item.quantity,
          price: Number(item.priceSnapshot),
        })),
        address: fromAddress || undefined,
      })
    }
  } catch (err) {
    console.error('[orders] Не удалось отправить уведомление о статусе:', err)
  }

  return result
}

export async function listOrdersForAdmin(params: { page: number; perPage: number; status?: string }) {
  const { page, perPage, status } = params
  const where = status ? { status } : {}
  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { items: true, payment: true },
    }),
  ])
  return {
    data: orders.map(mapOrder),
    meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  }
}
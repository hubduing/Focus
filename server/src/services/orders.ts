import { prisma } from '../db/client.js'
import { HttpError } from '../lib/errors.js'

function mapOrder(order: {
  id: string
  total: { toNumber(): number } | number
  status: string
  paymentMethod: string
  createdAt: Date
  items: Array<{
    id: string
    productId: string
    nameSnapshot: string
    priceSnapshot: { toNumber(): number } | number
    quantity: number
  }>
  payment: { provider: string; status: string; amount: { toNumber(): number } | number } | null
}) {
  return {
    id: order.id,
    total: Number(order.total),
    status: order.status,
    paymentMethod: order.paymentMethod,
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
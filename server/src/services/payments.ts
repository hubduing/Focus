import { prisma } from '../db/client.js'
import { HttpError } from '../lib/errors.js'
import { getPaymentProvider } from './payments/index.js'
import { mockCompletedEvent } from './payments/mockProvider.js'

function publicWebBase(): string {
  return process.env.CLIENT_ORIGIN?.split(',')[0] ?? 'http://localhost:5173'
}

// POST /payments/checkout — создание Stripe Checkout Session для заказа.
export async function createCheckoutSession(userId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true, payment: true },
  })
  if (!order) {
    throw new HttpError(404, 'Заказ не найден')
  }
  if (order.status !== 'created') {
    throw new HttpError(409, 'Оплатить можно только заказ в статусе "created"')
  }
  if (order.paymentMethod !== 'card') {
    throw new HttpError(400, 'Для этого заказа выбран не карточный способ оплаты')
  }
  if (order.total.toNumber() <= 0) {
    throw new HttpError(400, 'Сумма заказа должна быть больше нуля')
  }

  const provider = getPaymentProvider()
  const successUrl = `${publicWebBase()}/checkout/success?order=${order.id}`
  const cancelUrl = `${publicWebBase()}/checkout?order=${order.id}`

  const session = await provider.createCheckoutSession({
    orderId: order.id,
    amount: Number(order.total),
    currency: process.env.STRIPE_CURRENCY ?? 'rub',
    lines: order.items.map((item) => ({
      name: item.nameSnapshot,
      quantity: item.quantity,
      unitAmount: Number(item.priceSnapshot),
    })),
    successUrl,
    cancelUrl,
  })

  await prisma.payment.upsert({
    where: { orderId: order.id },
    update: { providerRef: session.sessionId, status: 'pending' },
    create: {
      orderId: order.id,
      provider: provider.name,
      providerRef: session.sessionId,
      amount: order.total,
      status: 'pending',
    },
  })

  return { data: { sessionId: session.sessionId, url: session.url, provider: provider.name } }
}

// Обработка подтверждения оплаты (webhook stripe / mock-complete).
// Идемпотентна: повторный вызов для оплаченного заказа не меняет данные.
export async function completePayment(providerRef: string, amountTotal: number, eventStatus: string) {
  const payment = await prisma.payment.findFirst({ where: { providerRef } })
  if (!payment) {
    throw new HttpError(404, 'Платёж не найден')
  }
  // идемпотентность — повторные уведомления игнорируем
  if (payment.status === 'succeeded') {
    return { data: { alreadyProcessed: true } }
  }

  // подтверждаем оплату только при status = paid
  if (eventStatus !== 'paid') {
    return { data: { alreadyProcessed: false } }
  }

  const order = await prisma.order.findUnique({ where: { id: payment.orderId }, include: { items: true } })
  if (!order) {
    throw new HttpError(404, 'Заказ не найден')
  }

  // Проверка суммы на сервере: сумма из вебхука должна совпасть с сохранённой нами.
  if (amountTotal > 0 && Math.abs(amountTotal - Math.round(Number(order.total) * 100)) > 1) {
    console.error(`[payments] Сумма вебхука ${amountTotal} не совпадает с суммой заказа ${order.total}`)
    throw new HttpError(409, 'Сумма платежа не совпадает с суммой заказа')
  }

  await prisma.$transaction([
    prisma.payment.update({ where: { id: payment.id }, data: { status: 'succeeded' } }),
    prisma.order.update({ where: { id: order.id }, data: { status: 'paid' } }),
    // уменьшаем остатки товаров
    ...order.items.map((item) =>
      prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      }),
    ),
  ])

  return { data: { alreadyProcessed: false } }
}

// Mock-режим: имитация webhook checkout.session.completed.
export async function mockComplete(sessionId: string) {
  const provider = getPaymentProvider()
  if (provider.name !== 'mock') {
    throw new HttpError(404, 'Mock-оплата недоступна — включите PAYMENTS_PROVIDER=mock')
  }
  const event = mockCompletedEvent(sessionId)
  const result = await completePayment(event.providerRef, event.amountTotal, event.status)
  const payment = await prisma.payment.findFirst({ where: { providerRef: event.providerRef } })
  return { ...result, orderId: payment?.orderId ?? null }
}
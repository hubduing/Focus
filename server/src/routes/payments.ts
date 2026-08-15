import { Router, type NextFunction, type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import { checkoutSchema } from 'shared'
import { asyncHandler } from '../lib/asyncHandler.js'
import { HttpError } from '../lib/errors.js'
import { requireUser } from '../middleware/auth.js'
import * as paymentsService from '../services/payments.js'
import { getPaymentProvider } from '../services/payments/index.js'

const router = Router()

// Лимит попыток создания платёжной сессии (обнаружение абуза)
const checkoutLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, standardHeaders: true })

// POST /api/v1/payments/checkout — создание Checkout Session
router.post(
  '/checkout',
  requireUser,
  checkoutLimiter,
  asyncHandler(async (req, res) => {
    const input = checkoutSchema.parse(req.body)
    res.json(await paymentsService.createCheckoutSession(req.user!.id, input.orderId))
  }),
)

// POST /api/v1/payments/mock/complete — только для PAYMENTS_PROVIDER=mock:
// имитирует webhook checkout.session.completed (см. раздел 7 плана).
const mockCompleteHandler = asyncHandler(async (req, res) => {
  const sessionId = typeof req.query.session_id === 'string' ? req.query.session_id : ''
  if (!sessionId) {
    throw new HttpError(400, 'Параметр session_id обязателен')
  }
  const result = await paymentsService.mockComplete(sessionId)
  // mock-оплата происходит прямо в браузере — перенаправляем на страницу успеха в SPA
  const base = process.env.CLIENT_ORIGIN?.split(',')[0] ?? 'http://localhost:5173'
  const orderId = (result as { orderId?: string | null }).orderId
  if (orderId) {
    res.redirect(`${base}/checkout/success?order=${orderId}`)
    return
  }
  res.json(result)
})

router.get('/mock/complete', mockCompleteHandler)
router.post('/mock/complete', mockCompleteHandler)

export default router

// Публичный webhook Stripe. Монтируется на app-level ДО express.json(),
// т.к. для проверки подписи нужен сырой body (см. index.ts).
export async function webhookHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const provider = getPaymentProvider()
    if (provider.name === 'mock') {
      throw new HttpError(400, 'Webhook Stripe недоступен в mock-режиме')
    }
    const signature = req.headers['stripe-signature']
    if (typeof signature !== 'string') {
      throw new HttpError(400, 'Отсутствует заголовок stripe-signature')
    }
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body ?? '')
    const event = await provider.verifyWebhookEvent(rawBody, signature)
    if (!event) {
      throw new HttpError(400, 'Не удалось проверить подпись вебхука')
    }
    const result = await paymentsService.completePayment(event.providerRef, event.amountTotal, event.status)
    res.json(result)
  } catch (err) {
    next(err)
  }
}
import { HttpError } from '../../lib/errors.js'
import { mockProvider } from './mockProvider.js'
import type { PaymentProvider } from './provider.js'
import { createStripeProvider } from './stripeProvider.js'

let cached: PaymentProvider | null = null

// Выбор провайдера по PAYMENTS_PROVIDER (stripe | mock). По умолчанию — stripe.
export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached

  const mode = process.env.PAYMENTS_PROVIDER ?? 'stripe'
  if (mode === 'mock') {
    cached = mockProvider
    return cached
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secretKey || secretKey.includes('xxx')) {
    throw new HttpError(500, 'STRIPE_SECRET_KEY не настроен. Для локальной разработки укажите PAYMENTS_PROVIDER=mock')
  }

  cached = createStripeProvider({
    secretKey,
    webhookSecret,
    currency: process.env.STRIPE_CURRENCY ?? 'rub',
  })
  return cached
}
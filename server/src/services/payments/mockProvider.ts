import crypto from 'node:crypto'
import type {
  CheckoutSessionInput,
  CheckoutSessionResult,
  PaymentProvider,
  WebhookEvent,
} from './provider.js'

export const MOCK_PROVIDER_REF_PREFIX = 'cs_mock_'

// Тест-провайдер для локальной разработки и E2E без реального Stripe.
// Создаёт «сессию», URL которой ведёт на наш эндпоинт /payments/mock/complete —
// это мгновенно завершает оплату и активирует статус paid.
export const mockProvider: PaymentProvider = {
  name: 'mock',

  async createCheckoutSession(_input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const sessionId = `${MOCK_PROVIDER_REF_PREFIX}${crypto.randomBytes(16).toString('hex')}`
    const base = process.env.API_PUBLIC_URL ?? 'http://localhost:4000'
    const url = `${base}/api/v1/payments/mock/complete?session_id=${encodeURIComponent(sessionId)}`
    return { sessionId, url }
  },

  async verifyWebhookEvent(_rawBody: string, _signature: string): Promise<WebhookEvent | null> {
    return null
  },
}

// В mock-режиме «вебхук» имитируется прямым вызовом из /payments/mock/complete.
export function mockCompletedEvent(providerRef: string): WebhookEvent {
  return { providerRef, amountTotal: 0, status: 'paid' }
}
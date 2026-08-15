// Единый интерфейс платёжного провайдера. Все внешние вызовы (Stripe) идут через него,
// что позволяет подменять тест-провайдера без изменения остального кода (см. план, раздел 3).

export interface CheckoutLineInput {
  name: string
  quantity: number
  unitAmount: number
}

export interface CheckoutSessionInput {
  orderId: string
  amount: number
  currency: string
  lines: CheckoutLineInput[]
  successUrl: string
  cancelUrl: string
}

export interface CheckoutSessionResult {
  sessionId: string
  url: string | null
}

export interface WebhookEvent {
  providerRef: string
  amountTotal: number
  status: string
}

export interface PaymentProvider {
  readonly name: string
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult>
  verifyWebhookEvent(rawBody: string, signature: string): Promise<WebhookEvent | null>
}

// Для провайдеров с мажорными единицами валюты (сквозь провайдера в минорные).
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100)
}
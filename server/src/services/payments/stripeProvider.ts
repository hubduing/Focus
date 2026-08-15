import Stripe from 'stripe'
import {
  toMinorUnits,
  type CheckoutSessionInput,
  type CheckoutSessionResult,
  type PaymentProvider,
  type WebhookEvent,
} from './provider.js'

export interface StripeProviderOptions {
  secretKey: string
  webhookSecret?: string
  currency: string
}

// Реальный провайдер на основе Stripe (test mode).
export function createStripeProvider(options: StripeProviderOptions): PaymentProvider {
  const stripe = new Stripe(options.secretKey)
  const currency = options.currency

  return {
    name: 'stripe',
    async createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        currency,
        line_items: input.lines.map((line) => ({
          quantity: line.quantity,
          price_data: {
            currency,
            unit_amount: toMinorUnits(line.unitAmount),
            product_data: { name: line.name },
          },
        })),
        metadata: { orderId: input.orderId },
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
      })
      return { sessionId: session.id, url: session.url }
    },

    async verifyWebhookEvent(rawBody: string, signature: string): Promise<WebhookEvent | null> {
      if (!options.webhookSecret) return null
      let event: Stripe.Event
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, options.webhookSecret)
      } catch {
        return null
      }
      if (event.type !== 'checkout.session.completed') return null
      const session = event.data.object as Stripe.Checkout.Session
      return {
        providerRef: session.id,
        amountTotal: session.amount_total ?? 0,
        status: session.payment_status ?? 'unpaid',
      }
    },
  }
}
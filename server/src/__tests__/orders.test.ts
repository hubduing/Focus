import { describe, expect, it } from 'vitest'
import { assertValidTransition, canTransition, isKnownStatus } from '../services/orderStatus.js'
import { toMinorUnits } from '../services/payments/provider.js'
import { mockProvider } from '../services/payments/mockProvider.js'
import { createOrderSchema, productListQuerySchema, updateOrderStatusSchema, adminProductListQuerySchema } from 'shared'

describe('статусная модель заказа', () => {
  it('разрешает ожидаемые переходы по цепочке created → paid → processing → shipped → delivered', () => {
    expect(canTransition('created', 'paid')).toBe(true)
    expect(canTransition('paid', 'processing')).toBe(true)
    expect(canTransition('processing', 'shipped')).toBe(true)
    expect(canTransition('shipped', 'delivered')).toBe(true)
  })

  it('разрешает отмену из created/paid/processing', () => {
    expect(canTransition('created', 'cancelled')).toBe(true)
    expect(canTransition('paid', 'cancelled')).toBe(true)
    expect(canTransition('processing', 'cancelled')).toBe(true)
  })

  it('запрещает отмену и любые переходы из delivered/cancelled', () => {
    expect(canTransition('delivered', 'cancelled')).toBe(false)
    expect(canTransition('cancelled', 'paid')).toBe(false)
    expect(canTransition('cancelled', 'created')).toBe(false)
  })

  it('запрещает перескоки статусов', () => {
    expect(canTransition('created', 'processing')).toBe(false)
    expect(canTransition('created', 'delivered')).toBe(false)
    expect(canTransition('paid', 'delivered')).toBe(false)
  })

  it('разрешает установку того же статуса и знает все статусы', () => {
    expect(canTransition('created', 'created')).toBe(true)
    expect(isKnownStatus('created')).toBe(true)
    expect(isKnownStatus('unknown')).toBe(false)
  })

  it('assertValidTransition бросает HttpError на запрещённый переход', () => {
    expect(() => assertValidTransition('created', 'delivered')).toThrowError(/недопустим/)
    expect(() => assertValidTransition('created', 'paid')).not.toThrow()
  })
})

describe('платежи', () => {
  it('toMinorUnits переводит рубли в копейки с округлением', () => {
    expect(toMinorUnits(100)).toBe(10000)
    expect(toMinorUnits(99.99)).toBe(9999)
    expect(toMinorUnits(0.01)).toBe(1)
  })

  it('mock-провайдер создаёт сессию с url на mock/complete', async () => {
    const session = await mockProvider.createCheckoutSession({
      orderId: '00000000-0000-0000-0000-000000000001',
      amount: 100,
      currency: 'rub',
      lines: [{ name: 'Товар', quantity: 1, unitAmount: 100 }],
      successUrl: 'http://localhost:5173/checkout/success',
      cancelUrl: 'http://localhost:5173/checkout',
    })
    expect(session.sessionId).toMatch(/^cs_mock_/)
    expect(session.url).toContain('/api/v1/payments/mock/complete?session_id=')
  })

  it('mock-провайдер не принимает webhook (делегируется эндпоинту take)', async () => {
    expect(await mockProvider.verifyWebhookEvent('body', 'sig')).toBeNull()
  })
})

describe('schemas для заказов и админки', () => {
  it('createOrderSchema принимает card/cash/on_delivery и uuid адреса', () => {
    const ok = createOrderSchema.safeParse({
      addressId: '00000000-0000-0000-0000-000000000001',
      paymentMethod: 'card',
    })
    expect(ok.success).toBe(true)
    expect(createOrderSchema.safeParse({ addressId: 'x', paymentMethod: 'card' }).success).toBe(false)
    expect(createOrderSchema.safeParse({ addressId: '00000000-0000-0000-0000-000000000001', paymentMethod: 'bitcoin' }).success).toBe(false)
  })

  it('updateOrderStatusSchema принимает только известные статусы', () => {
    expect(updateOrderStatusSchema.safeParse({ status: 'paid' }).success).toBe(true)
    expect(updateOrderStatusSchema.safeParse({ status: 'unknown' }).success).toBe(false)
  })

  it('adminProductListQuerySchema дефолтит пагинацию и принимает активность', () => {
    const parsed = adminProductListQuerySchema.parse({})
    expect(parsed.page).toBe(1)
    expect(parsed.perPage).toBe(20)
    expect(adminProductListQuerySchema.parse({ active: 'false' }).active).toBe('false')
  })

  it('productListQuerySchema поддерживает фильтр ids для корзины гостя', () => {
    const parsed = productListQuerySchema.parse({ ids: '00000000-0000-0000-0000-000000000001,00000000-0000-0000-0000-000000000002' })
    expect(parsed.ids).toContain('00000000-0000-0000-0000-000000000001')
  })
})
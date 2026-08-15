import { describe, expect, it } from 'vitest'
import { computeCart, cartItemSchema, cartUpdateSchema, MAX_CART_QTY } from 'shared'

const baseLine = {
  productId: '00000000-0000-0000-0000-000000000001',
  price: 1000,
  discountPrice: null,
  stock: 10,
  active: true,
}

describe('computeCart', () => {
  it('считает итоги без скидки', () => {
    const { totals } = computeCart([{ ...baseLine, quantity: 2 }])
    expect(totals.count).toBe(2)
    expect(totals.distinctCount).toBe(1)
    expect(totals.subtotal).toBe(2000)
    expect(totals.baseSubtotal).toBe(2000)
    expect(totals.discount).toBe(0)
    expect(totals.unavailableCount).toBe(0)
  })

  it('учитывает скидочную цену', () => {
    const { lines, totals } = computeCart([
      { ...baseLine, quantity: 1, discountPrice: 800 },
    ])
    expect(lines[0].unitPrice).toBe(800)
    expect(lines[0].basePrice).toBe(1000)
    expect(totals.subtotal).toBe(800)
    expect(totals.discount).toBe(200)
  })

  it('помечает позицию недоступной, если остаток меньше количества', () => {
    const { lines, totals } = computeCart([{ ...baseLine, quantity: 15 }])
    expect(lines[0].available).toBe(false)
    expect(lines[0].subtotal).toBe(15000)
    expect(totals.unavailableCount).toBe(1)
  })

  it('помечает недоступной неактивную позицию', () => {
    const { lines } = computeCart([{ ...baseLine, quantity: 1, active: false }])
    expect(lines[0].available).toBe(false)
  })

  it('помечает недоступной позицию при нулевом остатке', () => {
    const { lines } = computeCart([{ ...baseLine, quantity: 1, stock: 0 }])
    expect(lines[0].available).toBe(false)
  })

  it('возвращает пустые итоги для пустой корзины', () => {
    const { totals } = computeCart([])
    expect(totals).toEqual({
      distinctCount: 0,
      count: 0,
      subtotal: 0,
      baseSubtotal: 0,
      discount: 0,
      unavailableCount: 0,
    })
  })
})

describe('cart schemas', () => {
  it('cartItemSchema валидирует корректный товар и дефолтит количество', () => {
    const result = cartItemSchema.safeParse({ productId: '00000000-0000-0000-0000-000000000001' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.quantity).toBe(1)
    }
  })

  it('cartItemSchema отклоняет количество больше лимита', () => {
    const result = cartItemSchema.safeParse({
      productId: '00000000-0000-0000-0000-000000000001',
      quantity: MAX_CART_QTY + 1,
    })
    expect(result.success).toBe(false)
  })

  it('cartUpdateSchema требует количество', () => {
    expect(cartUpdateSchema.safeParse({ quantity: 5 }).success).toBe(true)
    expect(cartUpdateSchema.safeParse({}).success).toBe(false)
    expect(cartUpdateSchema.safeParse({ quantity: 0 }).success).toBe(false)
  })
})
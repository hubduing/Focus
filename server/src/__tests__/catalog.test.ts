import { describe, expect, it } from 'vitest'
import { SortOption, productListQuerySchema } from 'shared'

describe('productListQuerySchema', () => {
  it('применяет дефолты page/perPage/sort', () => {
    const result = productListQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.perPage).toBe(20)
      expect(result.data.sort).toBe(SortOption.NEWEST)
      expect(result.data.inStock).toBeUndefined()
    }
  })

  it('парсит числовые и булевы параметры', () => {
    const result = productListQuerySchema.safeParse({
      page: '2',
      perPage: '50',
      minPrice: '100.5',
      maxPrice: '5000',
      inStock: 'true',
      sort: 'price_asc',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(2)
      expect(result.data.perPage).toBe(50)
      expect(result.data.minPrice).toBe(100.5)
      expect(result.data.maxPrice).toBe(5000)
      expect(result.data.inStock).toBe(true)
      expect(result.data.sort).toBe('price_asc')
    }
  })

  it('разбирает attributes из JSON-строки', () => {
    const result = productListQuerySchema.safeParse({ attributes: '{"color":"black","memory":512}' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.attributes).toEqual({ color: 'black', memory: 512 })
    }
  })

  it('отклоняет некорректный JSON в attributes', () => {
    const result = productListQuerySchema.safeParse({ attributes: '{bad json' })
    expect(result.success).toBe(false)
  })

  it('отклоняет невалидное значение inStock', () => {
    const result = productListQuerySchema.safeParse({ inStock: 'maybe' })
    expect(result.success).toBe(false)
  })

  it('отклоняет неизвестный sort', () => {
    const result = productListQuerySchema.safeParse({ sort: 'random' })
    expect(result.success).toBe(false)
  })

  it('тремит и валидирует search', () => {
    expect(productListQuerySchema.safeParse({ search: '  ноутбук  ' }).success).toBe(true)
    expect(productListQuerySchema.safeParse({ search: '  ' }).success).toBe(false)
  })
})
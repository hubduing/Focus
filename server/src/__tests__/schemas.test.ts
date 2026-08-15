import { describe, expect, it } from 'vitest'
import { productSchema, categorySchema } from 'shared'

describe('productSchema', () => {
  it('валидирует корректный товар', () => {
    const result = productSchema.safeParse({
      categoryId: '00000000-0000-0000-0000-000000000001',
      name: 'Ноутбук',
      slug: 'notebook',
      price: 79990,
      stock: 5,
      attributes: { color: 'black' },
      images: [],
    })
    expect(result.success).toBe(true)
  })

  it('отклоняет отрицательную цену', () => {
    const result = productSchema.safeParse({
      categoryId: '00000000-0000-0000-0000-000000000001',
      name: 'X',
      slug: 'x',
      price: -1,
    })
    expect(result.success).toBe(false)
  })

  it('отклоняет некорректный slug', () => {
    const result = productSchema.safeParse({
      categoryId: '00000000-0000-0000-0000-000000000001',
      name: 'X',
      slug: 'Bad Slug!',
      price: 10,
    })
    expect(result.success).toBe(false)
  })
})

describe('categorySchema', () => {
  it('валидирует категорию и нормализует position', () => {
    const result = categorySchema.safeParse({ name: 'Электроника', slug: 'electronics' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.position).toBe(0)
    }
  })
})
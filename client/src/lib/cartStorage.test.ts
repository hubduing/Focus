import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MAX_CART_QTY } from 'shared'
import { loadLocalCart, normalizeQuantity, persistLocalCart, type LocalCartItem } from './cartStorage'

const STORAGE_KEY = 'ecomm.cart.v1'

class StorageMock {
  private store = new Map<string, string>()

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }
}

describe('cartStorage', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: new StorageMock(),
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage')
  })

  it('нормализует количество в диапазон 1..MAX', () => {
    expect(normalizeQuantity(0)).toBe(1)
    expect(normalizeQuantity(-5)).toBe(1)
    expect(normalizeQuantity(MAX_CART_QTY + 10)).toBe(MAX_CART_QTY)
    expect(normalizeQuantity(3)).toBe(3)
  })

  it('сохраняет и восстанавливает корзину', () => {
    const items: LocalCartItem[] = [
      { productId: '00000000-0000-0000-0000-000000000001', quantity: 2 },
    ]
    persistLocalCart(items)
    expect(loadLocalCart()).toEqual(items)
  })

  it('игнорирует некорректный JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{broken json')
    expect(loadLocalCart()).toEqual([])
  })

  it('отбрасывает невалидные записи и чинит количество', () => {
    const corrupted = JSON.stringify([
      { productId: '00000000-0000-0000-0000-000000000001', quantity: 0 },
      { productId: '00000000-0000-0000-0000-000000000002', quantity: MAX_CART_QTY + 1 },
      { quantity: 1 },
    ])
    localStorage.setItem(STORAGE_KEY, corrupted)
    expect(loadLocalCart()).toEqual([
      { productId: '00000000-0000-0000-0000-000000000001', quantity: 1 },
      { productId: '00000000-0000-0000-0000-000000000002', quantity: MAX_CART_QTY },
    ])
  })

  it('возвращает пустую корзину без сохранённых данных', () => {
    expect(loadLocalCart()).toEqual([])
  })
})
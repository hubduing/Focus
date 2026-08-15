import { MAX_CART_QTY } from 'shared'

export interface LocalCartItem {
  productId: string
  quantity: number
}

const STORAGE_KEY = 'ecomm.cart.v1'

export function loadLocalCart(): LocalCartItem[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (item): item is LocalCartItem =>
          Boolean(item) &&
          typeof (item as LocalCartItem).productId === 'string' &&
          Number.isFinite((item as LocalCartItem).quantity),
      )
      .map((item) => ({
        productId: item.productId,
        quantity: normalizeQuantity(item.quantity),
      }))
  } catch {
    return []
  }
}

export function persistLocalCart(items: LocalCartItem[]) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // хранилище может быть переполнено — молча игнорируем
  }
}

export function normalizeQuantity(quantity: number): number {
  const int = Math.floor(quantity)
  if (!Number.isFinite(int)) return 1
  return Math.min(MAX_CART_QTY, Math.max(1, int))
}
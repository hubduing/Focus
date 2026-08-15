import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { MAX_CART_QTY } from 'shared'
import {
  loadLocalCart,
  normalizeQuantity,
  persistLocalCart,
  type LocalCartItem,
} from '../lib/cartStorage'

interface CartContextValue {
  items: LocalCartItem[]
  count: number
  addItem: (productId: string, quantity?: number) => void
  setQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<LocalCartItem[]>(loadLocalCart)

  const commit = useCallback((next: LocalCartItem[]) => {
    setItems(next)
    persistLocalCart(next)
  }, [])

  const addItem = useCallback(
    (productId: string, quantity = 1) => {
      const existing = items.find((item) => item.productId === productId)
      if (existing) {
        commit(
          items.map((item) =>
            item.productId === productId
              ? { ...item, quantity: Math.min(MAX_CART_QTY, item.quantity + quantity) }
              : item,
          ),
        )
      } else {
        commit([...items, { productId, quantity: normalizeQuantity(quantity) }])
      }
    },
    [commit, items],
  )

  const setQuantity = useCallback(
    (productId: string, quantity: number) => {
      commit(
        items.map((item) =>
          item.productId === productId ? { ...item, quantity: normalizeQuantity(quantity) } : item,
        ),
      )
    },
    [commit, items],
  )

  const removeItem = useCallback(
    (productId: string) => {
      commit(items.filter((item) => item.productId !== productId))
    },
    [commit, items],
  )

  const clear = useCallback(() => {
    commit([])
  }, [commit])

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      addItem,
      setQuantity,
      removeItem,
      clear,
    }),
    [items, addItem, setQuantity, removeItem, clear],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart должен использоваться внутри CartProvider')
  }
  return ctx
}
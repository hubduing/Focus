import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { computeCart, type CartLineInput, type CartTotals } from 'shared'
import {
  apiAddCartItem,
  apiClearCart,
  apiGetCart,
  apiListProducts,
  apiRemoveCartItem,
  apiUpdateCartItem,
  pushLocalCartToServer,
  type CartLine,
  type CartResponse,
  type Product,
} from '../lib/api'
import { loadLocalCart, persistLocalCart, type LocalCartItem } from '../lib/cartStorage'
import { useAuth } from './AuthContext'

interface CartContextValue {
  loading: boolean
  error: string | null
  lines: CartLine[]
  totals: CartTotals
  count: number
  addItem: (productId: string, quantity?: number) => Promise<void>
  setQuantity: (productId: string, quantity: number) => Promise<void>
  removeItem: (productId: string) => Promise<void>
  clear: () => Promise<void>
  reload: () => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)

const EMPTY_TOTALS: CartTotals = {
  distinctCount: 0,
  count: 0,
  subtotal: 0,
  baseSubtotal: 0,
  discount: 0,
  unavailableCount: 0,
}

function buildGuestLines(items: LocalCartItem[], products: Product[]): { lines: CartLine[]; totals: CartTotals } {
  const byId = new Map(products.map((p) => [p.id, p]))
  const inputs: CartLineInput[] = items
    .filter((item) => byId.has(item.productId))
    .map((item) => {
      const p = byId.get(item.productId)!
      return {
        productId: item.productId,
        quantity: item.quantity,
        price: Number(p.price),
        discountPrice: p.discountPrice === null ? null : Number(p.discountPrice),
        stock: p.stock,
        active: p.active,
      }
    })
  const calc = computeCart(inputs)
  const lines: CartLine[] = items
    .filter((item) => byId.has(item.productId))
    .map((item) => {
      const p = byId.get(item.productId)!
      const index = inputs.findIndex((i) => i.productId === item.productId)
      const computed = calc.lines[index]
      return {
        id: item.productId,
        productId: item.productId,
        name: p.name,
        slug: p.slug,
        quantity: item.quantity,
        basePrice: computed.basePrice,
        unitPrice: computed.unitPrice,
        subtotal: computed.subtotal,
        stock: p.stock,
        active: p.active,
        available: computed.available,
        image: Array.isArray(p.images) && typeof p.images[0] === 'string' ? p.images[0] : null,
      }
    })
  return { lines, totals: calc.totals }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const authed = Boolean(user)
  const [loading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serverCart, setServerCart] = useState<CartResponse | null>(null)
  const [guestLines, setGuestLines] = useState<CartLine[] | null>(null)
  const [guestTotals, setGuestTotals] = useState<CartTotals>(EMPTY_TOTALS)
  const syncedRef = useRef(false)
  const firstRunRef = useRef(true)

  async function loadGuest() {
    const items = loadLocalCart()
    if (items.length === 0) {
      setGuestLines([])
      setGuestTotals(EMPTY_TOTALS)
      return
    }
    try {
      const { data } = await apiListProducts({ ids: items.map((i) => i.productId).join(','), perPage: 100 })
      const built = buildGuestLines(items, data)
      setGuestLines(built.lines)
      setGuestTotals(built.totals)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить корзину')
    }
  }

  async function loadServer() {
    try {
      const cart = await apiGetCart()
      setServerCart(cart)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить корзину')
    }
  }

  useEffect(() => {
    if (firstRunRef.current) firstRunRef.current = false
    if (!authed) {
      syncedRef.current = false
      setServerCart(null)
      void loadGuest()
      return
    }
    if (!syncedRef.current) {
      syncedRef.current = true
      const local = loadLocalCart()
      if (local.length > 0) {
        pushLocalCartToServer(local)
          .catch(() => undefined)
          .finally(() => persistLocalCart([]))
      } else {
        persistLocalCart([])
      }
    }
    void loadServer()
  }, [authed])

  const reload = useCallback(async () => {
    setError(null)
    if (authed) await loadServer()
    else await loadGuest()
  }, [authed])

  const addItem = useCallback(
    async (productId: string, quantity = 1) => {
      setError(null)
      if (authed) {
        const cart = await apiAddCartItem(productId, quantity)
        setServerCart(cart)
        return
      }
      const items = loadLocalCart()
      const existing = items.find((i) => i.productId === productId)
      const next = existing
        ? items.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(99, i.quantity + quantity) } : i))
        : [...items, { productId, quantity }]
      persistLocalCart(next)
      await loadGuest()
    },
    [authed],
  )

  const setQuantity = useCallback(
    async (productId: string, quantity: number) => {
      setError(null)
      if (authed) {
        const cart = await apiUpdateCartItem(productId, quantity)
        setServerCart(cart)
        return
      }
      const qty = Math.min(99, Math.max(1, Math.floor(quantity)))
      persistLocalCart(loadLocalCart().map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)))
      await loadGuest()
    },
    [authed],
  )

  const removeItem = useCallback(
    async (productId: string) => {
      setError(null)
      if (authed) {
        const cart = await apiRemoveCartItem(productId)
        setServerCart(cart)
        return
      }
      persistLocalCart(loadLocalCart().filter((i) => i.productId !== productId))
      await loadGuest()
    },
    [authed],
  )

  const clear = useCallback(async () => {
    setError(null)
    if (authed) {
      const cart = await apiClearCart()
      setServerCart(cart)
      return
    }
    persistLocalCart([])
    setGuestLines([])
    setGuestTotals(EMPTY_TOTALS)
  }, [authed])

  const { lines, totals } = authed
    ? {
        lines: serverCart?.data ?? [],
        totals: serverCart?.meta ?? EMPTY_TOTALS,
      }
    : { lines: guestLines ?? [], totals: guestTotals }

  const count = totals.count

  const value = useMemo<CartContextValue>(
    () => ({ loading, error, lines, totals, count, addItem, setQuantity, removeItem, clear, reload }),
    [loading, error, lines, totals, count, addItem, setQuantity, removeItem, clear, reload],
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
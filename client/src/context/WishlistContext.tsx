import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiAddWishlistItem, apiGetWishlist, apiRemoveWishlistItem, type Product } from '../lib/api'
import { useAuth } from './AuthContext'

interface WishlistContextValue {
  productIds: Set<string>
  ready: boolean
  isWishlisted: (productId: string) => boolean
  toggle: (product: Product) => Promise<void>
  refresh: () => Promise<void>
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const authed = Boolean(user)
  const [productIds, setProductIds] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    if (!authed) {
      setProductIds(new Set())
      setReady(true)
      return
    }
    try {
      const { data } = await apiGetWishlist()
      setProductIds(new Set(data.map((item) => item.product.id)))
    } catch {
      // избранное недоступно — оставляем текущее состояние
    } finally {
      setReady(true)
    }
  }, [authed])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const isWishlisted = useCallback(
    (productId: string) => productIds.has(productId),
    [productIds],
  )

  const toggle = useCallback(
    async (product: Product) => {
      if (!authed) return
      const currently = productIds.has(product.id)
      setProductIds((prev) => {
        const next = new Set(prev)
        if (currently) next.delete(product.id)
        else next.add(product.id)
        return next
      })
      try {
        if (currently) await apiRemoveWishlistItem(product.id)
        else await apiAddWishlistItem(product.id)
      } catch {
        // откатываем оптимистичное обновление
        setProductIds((prev) => {
          const next = new Set(prev)
          if (currently) next.add(product.id)
          else next.delete(product.id)
          return next
        })
      }
    },
    [authed, productIds],
  )

  const value = useMemo<WishlistContextValue>(
    () => ({ productIds, ready, isWishlisted, toggle, refresh }),
    [productIds, ready, isWishlisted, toggle, refresh],
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext)
  if (!ctx) {
    throw new Error('useWishlist должен использоваться внутри WishlistProvider')
  }
  return ctx
}
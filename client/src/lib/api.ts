import type { LocalCartItem } from './cartStorage'

const API_BASE = '/api/v1'

const TOKEN_KEY = 'ecomm.token'

function authToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function cartHeaders(): Record<string, string> {
  const token = authToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// Синхронизация корзины локального пользователя на сервер. Работает только для авторизованных
// (когда сохранён токен) — для анонимов корзина живёт в localStorage (см. план, Этап 3).
export async function pushLocalCartToServer(items: LocalCartItem[]): Promise<void> {
  if (!authToken()) return
  const headers = cartHeaders()
  await fetch(`${API_BASE}/cart`, { method: 'DELETE', headers })
  for (const item of items) {
    await fetch(`${API_BASE}/cart`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ productId: item.productId, quantity: item.quantity }),
    })
  }
}
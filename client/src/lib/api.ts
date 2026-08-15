import type { LocalCartItem } from './cartStorage'

const API_BASE = '/api/v1'

export const TOKEN_KEY = 'ecomm.token'
const REFRESH_KEY = 'ecomm.refresh'
const USER_KEY = 'ecomm.user'

export interface Pagination {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface ApiList<T> {
  data: T[]
  meta: Pagination
}

export interface ApiErrorBody {
  error?: string
  message?: string
  details?: unknown
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status = 0) {
    super(message)
    this.status = status
  }
}

export interface CategoryNode {
  id: string
  parentId: string | null
  name: string
  slug: string
  position: number
  children?: CategoryNode[]
}

export interface Product {
  id: string
  categoryId: string
  name: string
  slug: string
  description: string | null
  price: number | string
  discountPrice: number | string | null
  stock: number
  attributes: Record<string, unknown>
  images: string[]
  active: boolean
  createdAt: string
  category?: { id: string; name: string; slug: string }
}

export interface User {
  id: string
  email: string
  name: string
  phone: string | null
  role: string
  createdAt: string
}

export interface Address {
  id: string
  label: string
  street: string
  city: string
  zip: string | null
}

export interface CartLine {
  id: string
  productId: string
  name: string
  slug: string
  quantity: number
  basePrice: number
  unitPrice: number
  subtotal: number
  stock: number
  active: boolean
  available: boolean
  image: string | null
}

export interface CartTotals {
  distinctCount: number
  count: number
  subtotal: number
  baseSubtotal: number
  discount: number
  unavailableCount: number
}

export interface CartResponse {
  data: CartLine[]
  meta: CartTotals
}

export interface OrderItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
}

export interface OrderPayment {
  provider: string
  status: string
  amount: number
  providerRef?: string | null
}

export interface Order {
  id: string
  userId: string
  total: number
  status: string
  paymentMethod: string
  addressLabel: string
  addressStreet: string
  addressCity: string
  addressZip: string | null
  createdAt: string
  items: OrderItem[]
  payment: OrderPayment | null
}

export interface WishlistItem {
  id: string
  product: {
    id: string
    name: string
    slug: string
    price: number
    discountPrice: number | null
    effectivePrice: number
    stock: number
    active: boolean
    image: string | null
  }
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // хранилище недоступно/переполнено — молча игнорируем
  }
}

export function getAccessToken(): string | null {
  return readStorage(TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return readStorage(REFRESH_KEY)
}

export function getUser(): User | null {
  const raw = readStorage(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function saveSession(user: User, accessToken: string, refreshToken: string) {
  writeStorage(TOKEN_KEY, accessToken)
  writeStorage(REFRESH_KEY, refreshToken)
  writeStorage(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  writeStorage(TOKEN_KEY, null)
  writeStorage(REFRESH_KEY, null)
  writeStorage(USER_KEY, null)
}

function authHeaders(json = false): Record<string, string> {
  const headers: Record<string, string> = {}
  if (json) headers['Content-Type'] = 'application/json'
  const token = getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, options)
  if (!res.ok) {
    let message = 'Ошибка запроса'
    try {
      const body = (await res.json()) as ApiErrorBody
      if (body.message) message = body.message
    } catch {
      // тело не JSON — оставляем общее сообщение
    }
    throw new ApiError(message, res.status)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

function jsonRequest<T>(path: string, method: string, body?: unknown, auth = true): Promise<T> {
  return request<T>(path, {
    method,
    headers: auth ? authHeaders(true) : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

// ---- Аутентификация ----
export async function apiRegister(input: { email: string; password: string; name: string; phone?: string }) {
  return jsonRequest<{ data: { user: User; accessToken: string; refreshToken: string } }>('/auth/register', 'POST', input, false)
}

export async function apiLogin(email: string, password: string) {
  return jsonRequest<{ data: { user: User; accessToken: string; refreshToken: string } }>('/auth/login', 'POST', { email, password }, false)
}

export async function apiRefresh(refreshToken: string) {
  return jsonRequest<{ data: { accessToken: string; refreshToken: string } }>('/auth/refresh', 'POST', { refreshToken })
}

export async function apiLogout(refreshToken?: string) {
  return jsonRequest<{ data: null }>('/auth/logout', 'POST', refreshToken ? { refreshToken } : undefined)
}

export async function apiRequestPasswordReset(email: string) {
  return jsonRequest<{ data: { message: string } }>('/auth/password/reset', 'POST', { email }, false)
}

export async function apiResetPassword(token: string, password: string) {
  return jsonRequest<{ data: { message: string } }>('/auth/password/reset/confirm', 'POST', { token, password }, false)
}

// ---- Профиль ----
export async function apiGetMe() {
  return request<{ data: User }>('/me', { headers: authHeaders() })
}

export async function apiUpdateProfile(input: { name?: string; phone?: string }) {
  return jsonRequest<{ data: User }>('/me', 'PATCH', input)
}

export async function apiListAddresses() {
  return request<{ data: Address[] }>('/me/addresses', { headers: authHeaders() })
}

export async function apiAddAddress(input: { label: string; street: string; city: string; zip?: string }) {
  return jsonRequest<{ data: Address }>('/me/addresses', 'POST', input)
}

export async function apiUpdateAddress(id: string, input: Partial<{ label: string; street: string; city: string; zip: string }>) {
  return jsonRequest<{ data: Address }>(`/me/addresses/${id}`, 'PATCH', input)
}

export async function apiDeleteAddress(id: string) {
  return jsonRequest<{ data: null }>(`/me/addresses/${id}`, 'DELETE')
}

// ---- Каталог ----
export async function apiCategories() {
  return request<{ data: CategoryNode[] }>('/categories', { headers: authHeaders() })
}

export interface ProductQuery {
  page?: number
  perPage?: number
  search?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  ids?: string
  sort?: string
}

export async function apiListProducts(query: ProductQuery = {}) {
  const qs = buildQuery(query as Record<string, string | number | boolean | undefined>)
  return request<ApiList<Product>>(`/products${qs}`, { headers: authHeaders() })
}

export async function apiGetProduct(slug: string) {
  return request<{ data: Product }>(`/products/${encodeURIComponent(slug)}`, { headers: authHeaders() })
}

export async function apiRelatedProducts(slug: string, limit = 8) {
  return request<{ data: Product[] }>(`/products/${encodeURIComponent(slug)}/related?limit=${limit}`, { headers: authHeaders() })
}

// ---- Корзина (серверная, для авторизованных) ----
export async function apiGetCart() {
  return request<CartResponse>('/cart', { headers: authHeaders() })
}

export async function apiAddCartItem(productId: string, quantity = 1) {
  return jsonRequest<CartResponse>('/cart', 'POST', { productId, quantity })
}

export async function apiUpdateCartItem(productId: string, quantity: number) {
  return jsonRequest<CartResponse>(`/cart/${productId}`, 'PATCH', { quantity })
}

export async function apiRemoveCartItem(productId: string) {
  return jsonRequest<CartResponse>(`/cart/${productId}`, 'DELETE')
}

export async function apiClearCart() {
  return jsonRequest<CartResponse>('/cart', 'DELETE')
}

// Синхронизация локальной (гостевой) корзины на сервер после входа.
export async function pushLocalCartToServer(items: LocalCartItem[]): Promise<void> {
  if (!getAccessToken()) return
  const headers = authHeaders(true)
  await fetch(`${API_BASE}/cart`, { method: 'DELETE', headers })
  for (const item of items) {
    await fetch(`${API_BASE}/cart`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ productId: item.productId, quantity: item.quantity }),
    })
  }
}

// ---- Заказы ----
export async function apiCreateOrder(input: { addressId: string; paymentMethod: 'card' | 'cash' | 'on_delivery' }) {
  return jsonRequest<{ data: Order }>('/orders', 'POST', input)
}

export async function apiListOrders(params: { page?: number; perPage?: number } = {}) {
  return request<ApiList<Order>>(`/orders${buildQuery(params)}`, { headers: authHeaders() })
}

export async function apiGetOrder(id: string) {
  return request<{ data: Order }>(`/orders/${id}`, { headers: authHeaders() })
}

// ---- Платежи ----
export async function apiCreateCheckout(orderId: string) {
  return jsonRequest<{ data: { sessionId: string; url: string | null; provider: string } }>('/payments/checkout', 'POST', { orderId })
}

// ---- Избранное ----
export async function apiGetWishlist() {
  return request<{ data: WishlistItem[] }>('/wishlist', { headers: authHeaders() })
}

export async function apiAddWishlistItem(productId: string) {
  return jsonRequest<{ data: WishlistItem[] }>('/wishlist', 'POST', { productId })
}

export async function apiRemoveWishlistItem(productId: string) {
  return jsonRequest<{ data: WishlistItem[] }>(`/wishlist/${productId}`, 'DELETE')
}

// ---- Админ ----
export async function apiAdminProducts(query: { page?: number; perPage?: number; search?: string; active?: string } = {}) {
  return request<ApiList<Product>>(`/admin/products${buildQuery(query)}`, { headers: authHeaders() })
}

export async function apiAdminCreateProduct(input: Record<string, unknown>) {
  return jsonRequest<{ data: Product }>('/admin/products', 'POST', input)
}

export async function apiAdminUpdateProduct(id: string, input: Record<string, unknown>) {
  return jsonRequest<{ data: Product }>(`/admin/products/${id}`, 'PATCH', input)
}

export async function apiAdminDeleteProduct(id: string) {
  return jsonRequest<{ data: null }>(`/admin/products/${id}`, 'DELETE')
}

export async function apiAdminCategories() {
  return request<{ data: CategoryNode[] }>('/admin/categories', { headers: authHeaders() })
}

export async function apiAdminCreateCategory(input: Record<string, unknown>) {
  return jsonRequest<{ data: CategoryNode }>('/admin/categories', 'POST', input)
}

export async function apiAdminUpdateCategory(id: string, input: Record<string, unknown>) {
  return jsonRequest<{ data: CategoryNode }>(`/admin/categories/${id}`, 'PATCH', input)
}

export async function apiAdminDeleteCategory(id: string) {
  return jsonRequest<{ data: null }>(`/admin/categories/${id}`, 'DELETE')
}

export async function apiAdminOrders(query: { page?: number; perPage?: number; status?: string } = {}) {
  return request<ApiList<Order>>(`/admin/orders${buildQuery(query)}`, { headers: authHeaders() })
}

export async function apiAdminUpdateOrderStatus(id: string, status: string) {
  return jsonRequest<{ data: Order }>(`/admin/orders/${id}/status`, 'PATCH', { status })
}
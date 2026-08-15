import type { OrderStatusValue, UserRoleValue } from './index.js'

export interface User {
  id: string
  email: string
  name: string
  phone: string | null
  role: UserRoleValue
  createdAt: Date
}

export interface Category {
  id: string
  parentId: string | null
  name: string
  slug: string
  position: number
}

export interface Product {
  id: string
  categoryId: string
  name: string
  slug: string
  description: string | null
  price: number
  discountPrice: number | null
  stock: number
  attributes: Record<string, unknown>
  images: string[]
  active: boolean
}

export interface OrderItemSnapshot {
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
  status: OrderStatusValue
  paymentMethod: string
  addressLabel: string
  addressStreet: string
  addressCity: string
  addressZip: string | null
  createdAt: Date
  items?: OrderItemSnapshot[]
  payment?: OrderPayment | null
}

export interface Address {
  id: string
  userId: string
  label: string
  street: string
  city: string
  zip: string | null
}

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

export interface ApiError {
  error: string
  message: string
  details?: unknown
}
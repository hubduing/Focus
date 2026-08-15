import { z } from 'zod'

export const OrderStatus = {
  CREATED: 'created',
  PAID: 'paid',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const

export type OrderStatusValue = (typeof OrderStatus)[keyof typeof OrderStatus]

export const UserRole = {
  USER: 'user',
  ADMIN: 'admin',
} as const

export type UserRoleValue = (typeof UserRole)[keyof typeof UserRole]

// ---- Формат ответов API ----
// Списки: { data, meta }
// Ошибки: { error, message, details }
export const PaymentMethod = {
  CARD: 'card',
  CASH: 'cash',
  ON_DELIVERY: 'on_delivery',
} as const

export const pagingSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
})

export const currencySchema = z.object({
  currency: z.enum(['RUB']).default('RUB'),
})

export * from './schemas.js'
export * from './types.js'
export * from './cart.js'
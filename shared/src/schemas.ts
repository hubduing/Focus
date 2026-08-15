import { z } from 'zod'

// ---- Пользователи ----
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(100),
  phone: z.string().optional(),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
})

export const resetPasswordSchema = z.object({
  email: z.string().email(),
})

export const setNewPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(72),
})

export const addressSchema = z.object({
  label: z.string().min(1).max(50),
  street: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  zip: z.string().optional(),
})

// ---- Каталог ----
export const categorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  parentId: z.string().uuid().nullish(),
  position: z.coerce.number().int().min(0).default(0),
})

export const productSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().max(5000).optional(),
  price: z.coerce.number().min(0).multipleOf(0.01),
  discountPrice: z.coerce.number().min(0).multipleOf(0.01).nullish(),
  stock: z.coerce.number().int().min(0).default(0),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  images: z.array(z.string().url()).default([]),
  active: z.boolean().default(true),
})

// ---- Корзина ----
export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
})

// ---- Заказы ----
export const createOrderSchema = z.object({
  addressId: z.string().uuid(),
  paymentMethod: z.enum(['card', 'cash', 'on_delivery']),
})

// ---- Plатежи ----
export const checkoutSchema = z.object({
  orderId: z.string().uuid(),
})

export const paginationMeta = z.object({
  page: z.number().int(),
  perPage: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
})
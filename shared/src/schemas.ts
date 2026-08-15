import { z } from 'zod'
import { MAX_CART_QTY } from './cart.js'

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

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
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

export const SortOption = {
  NEWEST: 'newest',
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
} as const

export type SortOptionValue = (typeof SortOption)[keyof typeof SortOption]

const booleanParam = z
  .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true' || v === '1'))

export const attributeFilterSchema = z.record(
  z.string().min(1).max(100),
  z.union([z.string(), z.number(), z.boolean()]),
)

const attributesJson = z
  .string()
  .optional()
  .transform((raw, ctx) => {
    if (raw === undefined) return undefined
    try {
      const value: unknown = JSON.parse(raw)
      const parsed = attributeFilterSchema.safeParse(value)
      if (!parsed.success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'attributes должен быть JSON-объектом с примитивными значениями' })
        return z.NEVER
      }
      return parsed.data
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'attributes должен быть корректным JSON' })
      return z.NEVER
    }
  })

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(100).optional(),
  category: z.string().trim().min(1).max(200).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: booleanParam,
  attributes: attributesJson,
  sort: z.enum(Object.values(SortOption) as [SortOptionValue, ...SortOptionValue[]]).default(SortOption.NEWEST),
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
  quantity: z.coerce.number().int().min(1).max(MAX_CART_QTY).default(1),
})

export const cartUpdateSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(MAX_CART_QTY),
})

// ---- Избранное ----
export const wishlistItemSchema = z.object({
  productId: z.string().uuid(),
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
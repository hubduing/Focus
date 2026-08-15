import { Prisma } from '@prisma/client'
import { prisma } from '../db/client.js'
import { HttpError } from '../lib/errors.js'
import { MAX_CART_QTY, computeCart, type CartLineInput } from 'shared'

const productSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  discountPrice: true,
  stock: true,
  active: true,
  images: true,
} as const satisfies Prisma.ProductSelect

type CartItemRow = Prisma.CartItemGetPayload<{
  include: { product: { select: typeof productSelect } }
}>

function toCartLine(row: CartItemRow): CartLineInput {
  return {
    productId: row.product.id,
    quantity: row.quantity,
    price: Number(row.product.price),
    discountPrice: row.product.discountPrice === null ? null : Number(row.product.discountPrice),
    stock: row.product.stock,
    active: row.product.active,
  }
}

function mapRow(row: CartItemRow, line: { unitPrice: number; subtotal: number; basePrice: number; available: boolean }) {
  const images = Array.isArray(row.product.images) ? (row.product.images as unknown[]) : []
  return {
    id: row.id,
    productId: row.product.id,
    name: row.product.name,
    slug: row.product.slug,
    quantity: row.quantity,
    basePrice: line.basePrice,
    unitPrice: line.unitPrice,
    subtotal: line.subtotal,
    stock: row.product.stock,
    active: row.product.active,
    available: line.available,
    image: typeof images[0] === 'string' ? images[0] : null,
  }
}

export async function getCart(userId: string) {
  const rows = await prisma.cartItem.findMany({
    where: { userId },
    orderBy: { product: { name: 'asc' } },
    include: { product: { select: productSelect } },
  })

  const { lines, totals } = computeCart(rows.map(toCartLine))

  return {
    data: rows.map((row, index) => mapRow(row, lines[index])),
    meta: totals,
  }
}

async function findCartRow(userId: string, productId: string) {
  return prisma.cartItem.findUnique({
    where: { userId_productId: { userId, productId } },
    include: { product: { select: productSelect } },
  })
}

async function requireActiveProduct(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, active: true, stock: true },
  })
  if (!product || !product.active) {
    throw new HttpError(404, 'Товар не найден')
  }
  if (product.stock <= 0) {
    throw new HttpError(409, 'Товара нет в наличии')
  }
  return product
}

export async function addCartItem(userId: string, productId: string, quantity: number) {
  const product = await requireActiveProduct(productId)
  const existing = await prisma.cartItem.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { quantity: true },
  })

  const target = Math.min(existing ? existing.quantity + quantity : quantity, MAX_CART_QTY, product.stock)

  await prisma.cartItem.upsert({
    where: { userId_productId: { userId, productId } },
    update: { quantity: target },
    create: { userId, productId, quantity: target },
  })

  return getCart(userId)
}

export async function updateCartItem(userId: string, productId: string, quantity: number) {
  const existing = await findCartRow(userId, productId)
  if (!existing) {
    throw new HttpError(404, 'Позиция в корзине не найдена')
  }
  const product = await requireActiveProduct(productId)

  const target = Math.min(quantity, MAX_CART_QTY, product.stock)
  await prisma.cartItem.update({
    where: { userId_productId: { userId, productId } },
    data: { quantity: target },
  })

  return getCart(userId)
}

export async function removeCartItem(userId: string, productId: string) {
  const existing = await prisma.cartItem.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true },
  })
  if (!existing) {
    throw new HttpError(404, 'Позиция в корзине не найдена')
  }
  await prisma.cartItem.delete({ where: { id: existing.id } })

  return getCart(userId)
}

export async function clearCart(userId: string) {
  await prisma.cartItem.deleteMany({ where: { userId } })
  return getCart(userId)
}

export interface CheckoutLine {
  productId: string
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

// Пересчёт цен, скидок и остатков на момент оформления заказа
export async function prepareCheckoutCart(userId: string): Promise<CheckoutLine[]> {
  const { data, meta } = await getCart(userId)

  if (data.length === 0) {
    throw new HttpError(400, 'Корзина пуста')
  }
  if (meta.unavailableCount > 0) {
    const details = data
      .filter((row) => !row.available)
      .map((row) => ({ productId: row.productId, name: row.name, stock: row.stock }))
    throw new HttpError(409, 'Часть товаров недоступна для оформления', details)
  }

  return data.map((row) => ({
    productId: row.productId,
    name: row.name,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    subtotal: row.subtotal,
  }))
}
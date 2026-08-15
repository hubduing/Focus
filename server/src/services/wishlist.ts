import { prisma } from '../db/client.js'
import { HttpError } from '../lib/errors.js'

function effectivePrice(price: unknown, discountPrice: unknown): number {
  const base = Number(price ?? 0)
  const discount = Number(discountPrice ?? base)
  return discount
}

export async function listWishlist(userId: string) {
  const items = await prisma.wishlist.findMany({
    where: { userId },
    orderBy: { product: { name: 'asc' } },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          discountPrice: true,
          stock: true,
          active: true,
          images: true,
        },
      },
    },
  })

  return {
    data: items.map((row) => {
      const images = Array.isArray(row.product.images) ? (row.product.images as unknown[]) : []
      return {
        id: row.id,
        product: {
          id: row.product.id,
          name: row.product.name,
          slug: row.product.slug,
          price: Number(row.product.price),
          discountPrice: row.product.discountPrice === null ? null : Number(row.product.discountPrice),
          effectivePrice: effectivePrice(row.product.price, row.product.discountPrice),
          stock: row.product.stock,
          active: row.product.active,
          image: typeof images[0] === 'string' ? images[0] : null,
        },
      }
    }),
  }
}

export async function addWishlistItem(userId: string, productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, active: true },
  })
  if (!product) {
    throw new HttpError(404, 'Товар не найден')
  }
  if (!product.active) {
    throw new HttpError(400, 'Нельзя добавить неактивный товар в избранное')
  }

  await prisma.wishlist.upsert({
    where: { userId_productId: { userId, productId } },
    update: {},
    create: { userId, productId },
  })

  return listWishlist(userId)
}

export async function removeWishlistItem(userId: string, productId: string) {
  const result = await prisma.wishlist.deleteMany({ where: { userId, productId } })
  if (result.count === 0) {
    throw new HttpError(404, 'Товар не найден в избранном')
  }
  return listWishlist(userId)
}
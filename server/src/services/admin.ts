import { Prisma } from '@prisma/client'
import { prisma } from '../db/client.js'

export interface AdminProductListParams {
  page: number
  perPage: number
  search?: string
  active?: 'true' | 'false'
}

function parseJson(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  return value
}

function mapProduct(product: {
  id: string
  categoryId: string
  name: string
  slug: string
  description: string | null
  price: unknown
  discountPrice: unknown
  stock: number
  attributes: unknown
  images: unknown
  active: boolean
  createdAt: Date
}) {
  return {
    id: product.id,
    categoryId: product.categoryId,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    discountPrice: product.discountPrice,
    stock: product.stock,
    attributes: parseJson(product.attributes),
    images: parseJson(product.images),
    active: product.active,
    createdAt: product.createdAt,
  }
}

export async function listAdminProducts(params: AdminProductListParams) {
  const { page, perPage } = params
  const where: Prisma.ProductWhereInput = {
    ...(params.active !== undefined && { active: params.active === 'true' }),
    ...(params.search !== undefined && {
      OR: [{ name: { contains: params.search, mode: 'insensitive' } }, { slug: { contains: params.search, mode: 'insensitive' } }],
    }),
  }

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ])

  return {
    data: products.map(mapProduct),
    meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  }
}

export async function getAdminProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) return null
  return mapProduct(product)
}

export async function listAdminCategories() {
  const categories = await prisma.category.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    include: { children: { orderBy: [{ position: 'asc' }, { name: 'asc' }] } },
  })
  return { data: categories }
}
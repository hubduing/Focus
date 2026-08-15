import { Prisma } from '@prisma/client'
import { prisma } from '../db/client.js'
import { HttpError } from '../lib/errors.js'
import type { SortOptionValue } from 'shared'

export interface ListProductsParams {
  page: number
  perPage: number
  search?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  attributes?: Record<string, string | number | boolean>
  sort: SortOptionValue
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface CategoryScope {
  ids: string[]
}

async function resolveCategoryScope(category?: string): Promise<CategoryScope | undefined> {
  if (!category) return undefined
  let categoryId: string | undefined
  if (UUID_RE.test(category)) {
    categoryId = category
  } else {
    const found = await prisma.category.findUnique({ where: { slug: category } })
    if (!found) return { ids: [] }
    categoryId = found.id
  }
  const children = await prisma.category.findMany({ where: { parentId: categoryId } })
  return { ids: [categoryId, ...children.map((c) => c.id)] }
}

interface SqlFilter {
  where: Prisma.Sql[]
}

function buildSqlFilters(p: ListProductsParams, scope: CategoryScope | undefined): SqlFilter {
  const where: Prisma.Sql[] = [Prisma.sql`"Product"."active" = true`]

  if (scope && scope.ids.length > 0) {
    where.push(Prisma.sql`"Product"."categoryId"::text = ANY(${scope.ids})`)
  } else if (scope && scope.ids.length === 0) {
    where.push(Prisma.sql`FALSE`)
  }

  if (p.minPrice !== undefined) {
    where.push(Prisma.sql`COALESCE("Product"."discountPrice", "Product"."price") >= ${p.minPrice}`)
  }
  if (p.maxPrice !== undefined) {
    where.push(Prisma.sql`COALESCE("Product"."discountPrice", "Product"."price") <= ${p.maxPrice}`)
  }
  if (p.inStock) {
    where.push(Prisma.sql`"Product"."stock" > 0`)
  }
  if (p.attributes) {
    for (const [key, value] of Object.entries(p.attributes)) {
      where.push(Prisma.sql`"Product"."attributes" ->> ${key} = ${String(value)}`)
    }
  }

  return { where }
}

interface SearchCondition {
  condition?: Prisma.Sql
  rank?: Prisma.Sql
}

function buildSearch(p: ListProductsParams): SearchCondition {
  if (!p.search) return {}
  const tsquery = Prisma.sql`websearch_to_tsquery('russian', ${p.search})`
  return {
    condition: Prisma.sql`"Product"."searchVector" @@ ${tsquery}`,
    rank: Prisma.sql`ts_rank("Product"."searchVector", ${tsquery}) DESC`,
  }
}

function buildOrderBy(p: ListProductsParams, search: SearchCondition): Prisma.Sql {
  if (search.rank) return search.rank
  switch (p.sort) {
    case 'price_asc':
      return Prisma.sql`COALESCE("Product"."discountPrice", "Product"."price") ASC`
    case 'price_desc':
      return Prisma.sql`COALESCE("Product"."discountPrice", "Product"."price") DESC`
    case 'name_asc':
      return Prisma.sql`"Product"."name" ASC`
    case 'name_desc':
      return Prisma.sql`"Product"."name" DESC`
    case 'newest':
    default:
      return Prisma.sql`"Product"."createdAt" DESC`
  }
}

interface ProductRow {
  id: string
  categoryId: string
  name: string
  slug: string
  description: string | null
  price: string | number
  discountPrice: string | number | null
  stock: number
  attributes: unknown
  images: unknown
  active: boolean
  createdAt: Date | string
  cat_id: string
  cat_parentId: string | null
  cat_name: string
  cat_slug: string
  cat_position: number
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

function mapProductRow(row: ProductRow) {
  return {
    id: row.id,
    categoryId: row.categoryId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: row.price,
    discountPrice: row.discountPrice,
    stock: row.stock,
    attributes: parseJson(row.attributes),
    images: parseJson(row.images),
    active: row.active,
    createdAt: row.createdAt,
    category: {
      id: row.cat_id,
      parentId: row.cat_parentId,
      name: row.cat_name,
      slug: row.cat_slug,
      position: row.cat_position,
    },
  }
}

const PRODUCT_SELECT = Prisma.sql`
  SELECT
    "Product"."id",
    "Product"."categoryId",
    "Product"."name",
    "Product"."slug",
    "Product"."description",
    "Product"."price",
    "Product"."discountPrice",
    "Product"."stock",
    "Product"."attributes",
    "Product"."images",
    "Product"."active",
    "Product"."createdAt",
    "Category"."id" AS "cat_id",
    "Category"."parentId" AS "cat_parentId",
    "Category"."name" AS "cat_name",
    "Category"."slug" AS "cat_slug",
    "Category"."position" AS "cat_position"
  FROM "Product"
  JOIN "Category" ON "Category"."id" = "Product"."categoryId"
`

export async function listProducts(p: ListProductsParams) {
  const scope = await resolveCategoryScope(p.category)
  const search = buildSearch(p)
  const filters = buildSqlFilters(p, scope)

  const where: Prisma.Sql[] = [...filters.where]
  if (search.condition) {
    where.push(search.condition)
  }
  const whereSql = Prisma.join(where, ' AND ')

  const [totalRows] = await prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
    SELECT COUNT(*)::int AS total
    FROM "Product"
    JOIN "Category" ON "Category"."id" = "Product"."categoryId"
    WHERE ${whereSql}
  `)

  const orderBy = buildOrderBy(p, search)
  const page = p.page
  const perPage = p.perPage

  const rows = await prisma.$queryRaw<ProductRow[]>(Prisma.sql`
    ${PRODUCT_SELECT}
    WHERE ${whereSql}
    ORDER BY ${orderBy}
    LIMIT ${perPage} OFFSET ${(page - 1) * perPage}
  `)

  const total = totalRows?.total ?? 0
  return {
    data: rows.map(mapProductRow),
    meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  }
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { category: true },
  })
  if (!product || !product.active) {
    throw new HttpError(404, 'Товар не найден')
  }
  return {
    data: {
      ...product,
      attributes: product.attributes as Record<string, unknown>,
      images: product.images as unknown[],
    },
  }
}

export async function getRelatedProducts(slug: string, limit = 8) {
  const product = await prisma.product.findUnique({
    where: { slug },
    select: { id: true, categoryId: true },
  })
  if (!product) {
    throw new HttpError(404, 'Товар не найден')
  }

  const related = await prisma.product.findMany({
    where: {
      active: true,
      categoryId: product.categoryId,
      id: { not: product.id },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { category: true },
  })

  return {
    data: related.map((r) => ({
      ...r,
      attributes: r.attributes as Record<string, unknown>,
      images: r.images as unknown[],
    })),
  }
}
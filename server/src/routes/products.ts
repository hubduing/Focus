import { Router } from 'express'
import { productListQuerySchema, productSchema } from 'shared'
import { asyncHandler } from '../lib/asyncHandler.js'
import { getProductBySlug, getRelatedProducts, listProducts } from '../services/catalog.js'
import { requireAdmin, requireUser } from '../middleware/auth.js'
import { prisma } from '../db/client.js'

const router = Router()

// GET /api/v1/products — список с пагинацией, поиском, фильтрами и сортировкой
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = productListQuerySchema.parse(req.query)
    const result = await listProducts(query)
    res.json(result)
  }),
)

// GET /api/v1/products/:slug/related — похожие товары (та же категория)
router.get(
  '/:slug/related',
  asyncHandler(async (req, res) => {
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8))
    const result = await getRelatedProducts(req.params.slug, limit)
    res.json(result)
  }),
)

// GET /api/v1/products/:slug
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const result = await getProductBySlug(req.params.slug)
    res.json(result)
  }),
)

// Мутации товаров — только для админов (полноценная админ-панель на Этапе 6,
// API: /admin/products/*). Здесь guard для защиты публичного каталога.
const adminOnly = [requireUser, requireAdmin]

// POST /api/v1/products — создать товар (ADMIN)
router.post('/', ...adminOnly, asyncHandler(async (req, res) => {
    const input = productSchema.parse(req.body)
    const product = await prisma.product.create({
      data: {
        categoryId: input.categoryId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        price: input.price,
        discountPrice: input.discountPrice ?? null,
        stock: input.stock,
        attributes: input.attributes,
        images: input.images,
        active: input.active,
      },
    })
    res.status(201).json({ data: product })
  }),
)

// PATCH /api/v1/products/:id
router.patch('/:id', ...adminOnly, asyncHandler(async (req, res) => {
    const input = productSchema.partial().parse(req.body)
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
        ...(input.name !== undefined && { name: input.name }),
        ...(input.slug !== undefined && { slug: input.slug }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.discountPrice !== undefined && { discountPrice: input.discountPrice }),
        ...(input.stock !== undefined && { stock: input.stock }),
        ...(input.attributes !== undefined && { attributes: input.attributes }),
        ...(input.images !== undefined && { images: input.images }),
        ...(input.active !== undefined && { active: input.active }),
      },
    })
    res.json({ data: product })
  }),
)

// DELETE /api/v1/products/:id
router.delete('/:id', ...adminOnly, asyncHandler(async (req, res) => {
    await prisma.product.delete({ where: { id: req.params.id } })
    res.status(204).send()
  }),
)

export default router
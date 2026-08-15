import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../db/client.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { HttpError } from '../lib/errors.js'
import { productSchema } from 'shared'

const router = Router()

// GET /api/v1/products — список с пагинацией
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1)
    const perPage = Math.min(100, Math.max(1, Number(req.query.perPage) || 20))
    const categoryId = typeof req.query.category === 'string' ? req.query.category : undefined

    const where: Prisma.ProductWhereInput = {
      active: true,
      ...(categoryId && { categoryId }),
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { category: true },
      }),
    ])

    res.json({
      data: products,
      meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    })
  }),
)

// GET /api/v1/products/:slug
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: { category: true },
    })
    if (!product || !product.active) {
      throw new HttpError(404, 'Товар не найден')
    }
    res.json({ data: product })
  }),
)

// POST /api/v1/products — создать товар (ADMIN на Этапе 6)
router.post(
  '/',
  asyncHandler(async (req, res) => {
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
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
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
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.product.delete({ where: { id: req.params.id } })
    res.status(204).send()
  }),
)

export default router
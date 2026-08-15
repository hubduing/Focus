import { Router } from 'express'
import { prisma } from '../db/client.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { HttpError } from '../lib/errors.js'
import { requireAdmin, requireUser } from '../middleware/auth.js'
import { categorySchema } from 'shared'

const router = Router()

// Мутации категорий — только для админов (см. /admin/categories, Этап 6)
const adminOnly = [requireUser, requireAdmin]

// GET /api/v1/categories — дерево категорий (2 уровня)
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      include: { children: { orderBy: [{ position: 'asc' }, { name: 'asc' }] } },
    })
    res.json({ data: categories })
  }),
)

// GET /api/v1/categories/:slug — категория с подкатегориями
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: { children: { orderBy: [{ position: 'asc' }, { name: 'asc' }] } },
    })
    if (!category) {
      throw new HttpError(404, 'Категория не найдена')
    }
    res.json({ data: category })
  }),
)

// POST /api/v1/categories — создать категорию (ADMIN)
router.post('/', ...adminOnly, asyncHandler(async (req, res) => {
    const input = categorySchema.parse(req.body)
    if (input.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: input.parentId } })
      if (!parent) {
        throw new HttpError(400, 'Родительская категория не найдена')
      }
      if (parent.parentId) {
        throw new HttpError(400, 'Вложенность категорий допускается максимум до 2 уровней')
      }
    }
    const category = await prisma.category.create({
      data: {
        name: input.name,
        slug: input.slug,
        parentId: input.parentId ?? undefined,
        position: input.position,
      },
    })
    res.status(201).json({ data: category })
  }),
)

// PATCH /api/v1/categories/:id
router.patch('/:id', ...adminOnly, asyncHandler(async (req, res) => {
    const input = categorySchema.partial().parse(req.body)
    if (input.parentId) {
      const parent = await prisma.category.findUnique({ where: { id: input.parentId } })
      if (!parent) {
        throw new HttpError(400, 'Родительская категория не найдена')
      }
      if (parent.parentId) {
        throw new HttpError(400, 'Вложенность категорий допускается максимум до 2 уровней')
      }
    }
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.slug !== undefined && { slug: input.slug }),
        ...(input.parentId !== undefined && { parentId: input.parentId }),
        ...(input.position !== undefined && { position: input.position }),
      },
    })
    res.json({ data: category })
  }),
)

// DELETE /api/v1/categories/:id
router.delete('/:id', ...adminOnly, asyncHandler(async (req, res) => {
    await prisma.category.delete({ where: { id: req.params.id } })
    res.status(204).send()
  }),
)

export default router
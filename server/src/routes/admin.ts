import { Router } from 'express'
import {
  adminOrderListQuerySchema,
  adminProductListQuerySchema,
  categorySchema,
  productSchema,
  updateOrderStatusSchema,
} from 'shared'
import { prisma } from '../db/client.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { HttpError } from '../lib/errors.js'
import { requireAdmin, requireUser } from '../middleware/auth.js'
import * as adminService from '../services/admin.js'
import * as ordersService from '../services/orders.js'

const router = Router()

// Все маршруты админ-панели: авторизация + роль admin
router.use(requireUser, requireAdmin)

// ==== Товары ====
// GET /api/v1/admin/products — список (включая неактивные) с поиском
router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const query = adminProductListQuerySchema.parse(req.query)
    res.json(await adminService.listAdminProducts(query))
  }),
)

// GET /api/v1/admin/products/:id
router.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const product = await adminService.getAdminProduct(req.params.id)
    if (!product) {
      throw new HttpError(404, 'Товар не найден')
    }
    res.json({ data: product })
  }),
)

// POST /api/v1/admin/products
router.post(
  '/products',
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
    res.status(201).json({ data: adminService.getAdminProduct(product.id) })
  }),
)

// PATCH /api/v1/admin/products/:id
router.patch(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const input = productSchema.partial().parse(req.body)
    const existing = await prisma.product.findUnique({ where: { id: req.params.id }, select: { id: true } })
    if (!existing) {
      throw new HttpError(404, 'Товар не найден')
    }
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
    res.json({ data: adminService.getAdminProduct(product.id) })
  }),
)

// DELETE /api/v1/admin/products/:id
router.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id }, select: { id: true } })
    if (!existing) {
      throw new HttpError(404, 'Товар не найден')
    }
    await prisma.product.delete({ where: { id: req.params.id } })
    res.status(204).send()
  }),
)

// ==== Категории ====
// GET /api/v1/admin/categories
router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    res.json(await adminService.listAdminCategories())
  }),
)

// POST /api/v1/admin/categories
router.post(
  '/categories',
  asyncHandler(async (req, res) => {
    const input = categorySchema.parse(req.body)
    await assertCategoryParent(input.parentId)
    const category = await prisma.category.create({
      data: { name: input.name, slug: input.slug, parentId: input.parentId ?? undefined, position: input.position },
    })
    res.status(201).json({ data: category })
  }),
)

// PATCH /api/v1/admin/categories/:id
router.patch(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const input = categorySchema.partial().parse(req.body)
    if (input.parentId) {
      await assertCategoryParent(input.parentId)
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

// DELETE /api/v1/admin/categories/:id
router.delete(
  '/categories/:id',
  asyncHandler(async (req, res) => {
    const children = await prisma.category.count({ where: { parentId: req.params.id } })
    if (children > 0) {
      throw new HttpError(409, 'Нельзя удалить категорию с подкатегориями')
    }
    const products = await prisma.product.count({ where: { categoryId: req.params.id } })
    if (products > 0) {
      throw new HttpError(409, 'Нельзя удалить категорию с товарами')
    }
    await prisma.category.delete({ where: { id: req.params.id } })
    res.status(204).send()
  }),
)

// ==== Заказы ====
// GET /api/v1/admin/orders?status=&page=&perPage=
router.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const query = adminOrderListQuerySchema.parse(req.query)
    res.json(await ordersService.listOrdersForAdmin(query))
  }),
)

// GET /api/v1/admin/orders/:id
router.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    res.json(await ordersService.getOrderForAdmin(req.params.id))
  }),
)

// PATCH /api/v1/admin/orders/:id/status
router.patch(
  '/orders/:id/status',
  asyncHandler(async (req, res) => {
    const input = updateOrderStatusSchema.parse(req.body)
    res.json(await ordersService.updateOrderStatus(req.params.id, input.status))
  }),
)

export default router

// Вложенность категорий — максимум 2 уровня (родитель не должен сам быть подкатегорией).
async function assertCategoryParent(parentId?: string | null) {
  if (!parentId) return
  const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { parentId: true } })
  if (!parent) {
    throw new HttpError(400, 'Родительская категория не найдена')
  }
  if (parent.parentId) {
    throw new HttpError(400, 'Вложенность категорий допускается максимум до 2 уровней')
  }
}
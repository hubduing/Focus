import { Router } from 'express'
import { pagingSchema } from 'shared'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireUser } from '../middleware/auth.js'
import * as ordersService from '../services/orders.js'

const router = Router()

// Создание заказа (POST /orders) — Этап 5 (оформление заказа и платежи).
// Здесь — история заказов и статусы для личного кабинета.
router.use(requireUser)

// GET /api/v1/orders — история заказов пользователя
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = pagingSchema.parse(req.query)
    res.json(await ordersService.listOrders(req.user!.id, query))
  }),
)

// GET /api/v1/orders/:id — детали заказа (только свой)
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await ordersService.getOrder(req.user!.id, req.params.id))
  }),
)

export default router
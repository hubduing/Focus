import { Router } from 'express'
import { createOrderSchema, pagingSchema } from 'shared'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireUser } from '../middleware/auth.js'
import * as ordersService from '../services/orders.js'

const router = Router()

router.use(requireUser)

// POST /api/v1/orders — создание заказа из корзины (оформление заказа)
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createOrderSchema.parse(req.body)
    res.status(201).json(await ordersService.createOrder(req.user!.id, input))
  }),
)

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
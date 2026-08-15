import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireUser } from '../middleware/auth.js'
import { cartItemSchema, cartUpdateSchema } from 'shared'
import * as cartService from '../services/cart.js'

const router = Router()

// Все операции с серверной корзиной доступны только авторизованным пользователям.
// Для анонимов корзина хранится на клиенте (localStorage) и синхронизируется сюда после входа.
router.use(requireUser)

// GET /api/v1/cart — содержимое корзины + пересчитанные итоги
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await cartService.getCart(req.user!.id))
  }),
)

// POST /api/v1/cart — добавить товар (или увеличить количество)
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = cartItemSchema.parse(req.body)
    res.status(201).json(await cartService.addCartItem(req.user!.id, input.productId, input.quantity))
  }),
)

// PATCH /api/v1/cart/:productId — изменить количество
router.patch(
  '/:productId',
  asyncHandler(async (req, res) => {
    const input = cartUpdateSchema.parse(req.body)
    res.json(await cartService.updateCartItem(req.user!.id, req.params.productId, input.quantity))
  }),
)

// DELETE /api/v1/cart/:productId — удалить позицию
router.delete(
  '/:productId',
  asyncHandler(async (req, res) => {
    res.json(await cartService.removeCartItem(req.user!.id, req.params.productId))
  }),
)

// DELETE /api/v1/cart — очистить корзину
router.delete(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await cartService.clearCart(req.user!.id))
  }),
)

export default router
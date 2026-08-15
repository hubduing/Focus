import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'
import { requireUser } from '../middleware/auth.js'
import { addressSchema, updateProfileSchema } from 'shared'
import * as usersService from '../services/users.js'

const router = Router()

// Все маршруты личного кабинета требуют авторизации
router.use(requireUser)

// GET /api/v1/me — профиль (ФИО, телефон, роль) + список адресов доставки
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await usersService.getProfile(req.user!.id))
  }),
)

// PATCH /api/v1/me — обновление ФИО и телефона
router.patch(
  '/',
  asyncHandler(async (req, res) => {
    const input = updateProfileSchema.parse(req.body)
    res.json(await usersService.updateProfile(req.user!.id, input))
  }),
)

// ---- Адреса доставки ----
// GET /api/v1/me/addresses
router.get(
  '/addresses',
  asyncHandler(async (req, res) => {
    res.json(await usersService.listAddresses(req.user!.id))
  }),
)

// POST /api/v1/me/addresses — добавить адрес
router.post(
  '/addresses',
  asyncHandler(async (req, res) => {
    const input = addressSchema.parse(req.body)
    res.status(201).json(await usersService.addAddress(req.user!.id, input))
  }),
)

// PATCH /api/v1/me/addresses/:id — изменить адрес
router.patch(
  '/addresses/:id',
  asyncHandler(async (req, res) => {
    const input = addressSchema.partial().parse(req.body)
    res.json(await usersService.updateAddress(req.user!.id, req.params.id, input))
  }),
)

// DELETE /api/v1/me/addresses/:id — удалить адрес
router.delete(
  '/addresses/:id',
  asyncHandler(async (req, res) => {
    res.json(await usersService.deleteAddress(req.user!.id, req.params.id))
  }),
)

export default router
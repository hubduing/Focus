import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { asyncHandler } from '../lib/asyncHandler.js'
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
  setNewPasswordSchema,
} from 'shared'
import * as authService from '../services/auth.js'

const router = Router()

// Жёсткий rate limit на подбор пароля и регистрацию
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true })

// POST /api/v1/auth/register — регистрация пользователя
router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body)
    const result = await authService.registerUser({
      email: input.email,
      password: input.password,
      name: input.name,
      phone: input.phone,
    })
    res.status(201).json(result)
  }),
)

// POST /api/v1/auth/login — вход по email + пароль
router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body)
    res.json(await authService.loginUser(input.email, input.password))
  }),
)

// POST /api/v1/auth/refresh — ротация refresh-токена
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const input = refreshTokenSchema.parse(req.body)
    res.json(await authService.refreshSession(input.refreshToken))
  }),
)

// POST /api/v1/auth/logout — отзыв refresh-токена
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const input = refreshTokenSchema.safeParse(req.body)
    res.json(await authService.logoutSession(input.success ? input.data.refreshToken : undefined))
  }),
)

// POST /api/v1/auth/password/reset — запрос ссылки для сброса пароля (test-режим: лог в консоль)
router.post(
  '/password/reset',
  asyncHandler(async (req, res) => {
    const input = resetPasswordSchema.parse(req.body)
    res.json(await authService.requestPasswordReset(input.email))
  }),
)

// POST /api/v1/auth/password/reset/confirm — установка нового пароля по токену
router.post(
  '/password/reset/confirm',
  asyncHandler(async (req, res) => {
    // токен может прийти как в body, так и в query (?token=... из test-ссылки)
    const body = { ...req.body, token: req.body.token ?? req.query.token }
    const input = setNewPasswordSchema.parse(body)
    res.json(await authService.resetPassword(input.token, input.password))
  }),
)

export default router
import { prisma } from '../db/client.js'
import { HttpError } from '../lib/errors.js'
import { hashPassword, verifyPassword } from '../lib/passwords.js'
import { generateRandomToken, hashToken, signAccessToken } from '../lib/tokens.js'

interface PublicUser {
  id: string
  email: string
  name: string
  phone: string | null
  role: string
  createdAt: Date
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

function toPublicUser(user: {
  id: string
  email: string
  name: string
  phone: string | null
  role: string
  createdAt: Date
}): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    createdAt: user.createdAt,
  }
}

async function issueTokens(user: { id: string; email: string; role: string }): Promise<TokenPair> {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role })
  const refreshToken = generateRandomToken()
  const expiresDays = Number(process.env.JWT_REFRESH_TTL_DAYS ?? 30)
  const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000)

  await prisma.$transaction([
    // чистим протухшие токены сессий пользователя
    prisma.refreshToken.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } }),
    prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: hashToken(refreshToken), expiresAt },
    }),
  ])

  return { accessToken, refreshToken }
}

export interface RegisterInput {
  email: string
  password: string
  name: string
  phone?: string
}

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } })
  if (existing) {
    throw new HttpError(409, 'Пользователь с таким email уже зарегистрирован')
  }

  const passwordHash = await hashPassword(input.password)
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      phone: input.phone ?? null,
    },
  })

  const tokens = await issueTokens(user)
  return { data: { user: toPublicUser(user), accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } }
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new HttpError(401, 'Неверный email или пароль')
  }
  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) {
    throw new HttpError(401, 'Неверный email или пароль')
  }

  const tokens = await issueTokens(user)
  return { data: { user: toPublicUser(user), accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } }
}

// Ротация refresh-токена: старый инвалидируется, выдаётся новая пара.
export async function refreshSession(refreshToken: string) {
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(refreshToken) } })
  if (!record) {
    throw new HttpError(401, 'Недействительный refresh-токен')
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    await prisma.refreshToken.deleteMany({ where: { id: record.id } })
    throw new HttpError(401, 'Refresh-токен истёк')
  }

  const user = await prisma.user.findUnique({
    where: { id: record.userId },
    select: { id: true, email: true, role: true },
  })
  if (!user) {
    throw new HttpError(401, 'Пользователь не найден')
  }

  // ротация: старый токен нельзя использовать повторно
  await prisma.refreshToken.deleteMany({ where: { id: record.id } })
  const tokens = await issueTokens(user)
  return { data: tokens }
}

export async function logoutSession(refreshToken?: string) {
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { tokenHash: hashToken(refreshToken) } })
  }
  return { data: null }
}

const RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES ?? 60)

function publicApiBase(): string {
  return process.env.API_PUBLIC_URL ?? 'http://localhost:4000'
}

// Восстановление пароля. В test-режиме email не отправляется — ссылка логируется в консоль.
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  // Ответ одинаков в обоих случаях, чтобы не раскрывать наличие аккаунта
  const message = 'Если аккаунт с таким email существует, мы отправим ссылку для сброса пароля'

  if (!user) {
    return { data: { message } }
  }

  const token = generateRandomToken()
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000)
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
  })

  const link = `${publicApiBase()}/api/v1/auth/password/reset/confirm?token=${token}`
  console.log(`[test-mode] Ссылка для сброса пароля: ${link}`)

  return { data: { message } }
}

export async function resetPassword(token: string, newPassword: string) {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } })
  if (!record) {
    throw new HttpError(400, 'Недействительная или уже использованная ссылка для сброса пароля')
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    await prisma.passwordResetToken.deleteMany({ where: { id: record.id } })
    throw new HttpError(400, 'Ссылка для сброса пароля истекла')
  }

  const passwordHash = await hashPassword(newPassword)
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.delete({ where: { id: record.id } }),
    // завершаем все активные сессии
    prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
  ])

  return { data: { message: 'Пароль успешно изменён' } }
}
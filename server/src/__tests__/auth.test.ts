import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '../lib/passwords.js'
import { generateRandomToken, hashToken, signAccessToken, verifyAccessToken } from '../lib/tokens.js'
import {
  addressSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  setNewPasswordSchema,
  wishlistItemSchema,
} from 'shared'

process.env.JWT_SECRET = 'test-secret'

describe('passwords', () => {
  it('хэширует и проверяет пароль', async () => {
    const hash = await hashPassword('supersecret1')
    expect(hash).not.toBe('supersecret1')
    expect(await verifyPassword('supersecret1', hash)).toBe(true)
    expect(await verifyPassword('wrong-password', hash)).toBe(false)
  })

  it('даёт разные хэши для одинаковых паролей (соль)', async () => {
    const a = await hashPassword('samepassword')
    const b = await hashPassword('samepassword')
    expect(a).not.toBe(b)
  })

  it('возвращает false для некорректного хэша', async () => {
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false)
  })
})

describe('tokens', () => {
  it('генерирует уникальные высокоэнтропийные токены', () => {
    const a = generateRandomToken()
    const b = generateRandomToken()
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(a).not.toBe(b)
  })

  it('хэширует токен детерминированно (SHA-256)', () => {
    const token = 'abc123'
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/)
    expect(hashToken(token)).toBe(hashToken(token))
    expect(hashToken(token)).not.toBe(token)
  })

  it('подписывает и проверяет access-токен', () => {
    const token = signAccessToken({ sub: 'user-1', email: 'a@example.com', role: 'admin' })
    const payload = verifyAccessToken(token)
    expect(payload).toEqual({ sub: 'user-1', email: 'a@example.com', role: 'admin' })
  })

  it('отклоняет токен с неверной подписью', () => {
    const token = signAccessToken({ sub: 'user-1' })
    expect(verifyAccessToken(token, 'other-secret')).toBeNull()
  })

  it('возвращает null для мусорной строки', () => {
    expect(verifyAccessToken('not-a-jwt')).toBeNull()
  })
})

describe('auth schemas', () => {
  it('registerSchema валидирует корректную регистрацию', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
      name: 'Иван Иванов',
      phone: '+79990001122',
    })
    expect(result.success).toBe(true)
  })

  it('registerSchema отклоняет короткий пароль и неверный email', () => {
    expect(registerSchema.safeParse({ email: 'x@y.z', password: 'short', name: 'Тест' }).success).toBe(false)
    expect(registerSchema.safeParse({ email: 'not-an-email', password: 'password123', name: 'Тест' }).success).toBe(
      false,
    )
  })

  it('loginSchema требует email и пароль', () => {
    expect(loginSchema.safeParse({ email: 'user@example.com', password: 'password123' }).success).toBe(true)
    expect(loginSchema.safeParse({ email: 'user@example.com' }).success).toBe(false)
  })

  it('refreshTokenSchema требует непустой токен', () => {
    expect(refreshTokenSchema.safeParse({ refreshToken: 'some-token' }).success).toBe(true)
    expect(refreshTokenSchema.safeParse({}).success).toBe(false)
  })

  it('setNewPasswordSchema требует токен и новый пароль (мин. 8 символов)', () => {
    expect(setNewPasswordSchema.safeParse({ token: 't', password: 'newpassword' }).success).toBe(true)
    expect(setNewPasswordSchema.safeParse({ token: 't', password: 'short' }).success).toBe(false)
  })

  it('addressSchema валидирует адрес', () => {
    expect(
      addressSchema.safeParse({ label: 'Дом', street: 'ул. Ленина, 1', city: 'Москва', zip: '101000' }).success,
    ).toBe(true)
    expect(addressSchema.safeParse({ street: 'ул. Ленина, 1', city: 'Москва' }).success).toBe(false)
  })

  it('wishlistItemSchema требует uuid товара', () => {
    expect(wishlistItemSchema.safeParse({ productId: '00000000-0000-0000-0000-000000000001' }).success).toBe(true)
    expect(wishlistItemSchema.safeParse({ productId: 'not-a-uuid' }).success).toBe(false)
  })
})
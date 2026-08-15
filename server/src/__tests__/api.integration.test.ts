import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'

// Мокаем слой БД: интеграционные тесты проверяют связку
// маршруты → middleware/роли → Zod-валидация → формат { data, meta } / { error, message }.
vi.mock('../db/client.js', () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    refreshToken: { findUnique: vi.fn(), deleteMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
    address: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    category: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    product: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(async (queries: Array<Promise<unknown>>) => {
      for (const q of queries) await q
      return []
    }),
  },
}))

import app from '../index.js'
import { prisma } from '../db/client.js'
import { hashPassword } from '../lib/passwords.js'
import { signAccessToken } from '../lib/tokens.js'

process.env.JWT_SECRET = 'test-secret'

const UUID = '00000000-0000-0000-0000-000000000001'

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID,
    email: 'user@example.com',
    name: 'Иван',
    phone: null,
    role: 'user',
    passwordHash: '',
    createdAt: new Date().toISOString(),
    addresses: [],
    ...overrides,
  }
}

function productRow() {
  return {
    id: UUID,
    categoryId: UUID,
    name: 'Ноутбук',
    slug: 'notebook',
    description: 'Описание',
    price: '99900',
    discountPrice: null,
    stock: 5,
    attributes: {},
    images: [],
    active: true,
    createdAt: new Date().toISOString(),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // Дефолтное поведение после clearAllMocks: снова ставим стабы
  ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
  ;(prisma.category.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
  ;(prisma.category.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
  ;(prisma.product.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
})

describe('health и каркас', () => {
  it('GET /health возвращает ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(typeof res.body.uptime).toBe('number')
  })

  it('неизвестный маршрут отдаёт 404 в формате { error, message }', async () => {
    const res = await request(app).get('/api/v1/unknown')
    expect(res.status).toBe(404)
    expect(res.body.error).toBeDefined()
    expect(res.body.message).toContain('Маршрут не найден')
  })
})

describe('каталог: категории', () => {
  it('GET /categories отдаёт дерево категорий', async () => {
    ;(prisma.category.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: UUID, parentId: null, name: 'Электроника', slug: 'electronics', position: 0, children: [] },
    ])
    const res = await request(app).get('/api/v1/categories')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0]).toMatchObject({ slug: 'electronics', children: [] })
  })

  it('GET /categories/:slug возвращает 404 для неизвестной категории', async () => {
    const res = await request(app).get('/api/v1/categories/nope')
    expect(res.status).toBe(404)
    expect(res.body.message).toContain('Категория не найдена')
  })
})

describe('оформление заказа: валидация', () => {
  it('POST /orders без токена отклоняется (401)', async () => {
    const res = await request(app).post('/api/v1/orders').send({ addressId: UUID, paymentMethod: 'card' })
    expect(res.status).toBe(401)
  })

  it('POST /orders c неверным paymentMethod даёт 400 validation_error', async () => {
    const token = signAccessToken({ sub: UUID, role: 'user' })
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ addressId: UUID, paymentMethod: 'bitcoin' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('validation_error')
    expect(Array.isArray(res.body.details)).toBe(true)
  })
})

describe('пользователи: /me', () => {
  it('GET /me требует токен', async () => {
    const res = await request(app).get('/api/v1/me')
    expect(res.status).toBe(401)
  })

  it('GET /me возвращает профиль с адресами', async () => {
    ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...userRow(),
      addresses: [{ id: UUID, label: 'Дом', street: 'ул. Тестовая, 1', city: 'Москва', zip: '101000' }],
    })
    const token = signAccessToken({ sub: UUID, role: 'user' })
    const res = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.data.email).toBe('user@example.com')
    expect(res.body.data.addresses).toHaveLength(1)
  })
})

describe('админ: роли и доступ', () => {
  it('GET /admin/products без токена → 401', async () => {
    const res = await request(app).get('/api/v1/admin/products')
    expect(res.status).toBe(401)
  })

  it('GET /admin/products с ролью user → 403', async () => {
    const token = signAccessToken({ sub: UUID, role: 'user' })
    const res = await request(app).get('/api/v1/admin/products').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
    expect(res.body.message).toContain('admin')
  })

  it('GET /admin/products с ролью admin → 200 + пагинация', async () => {
    ;(prisma.product.count as ReturnType<typeof vi.fn>).mockResolvedValue(1)
    ;(prisma.product.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([productRow()])
    const token = signAccessToken({ sub: UUID, role: 'admin' })
    const res = await request(app).get('/api/v1/admin/products').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.meta).toMatchObject({ page: 1, total: 1, totalPages: 1 })
  })

  it('POST /admin/products с admin и невалидным body → 400 validation_error', async () => {
    const token = signAccessToken({ sub: UUID, role: 'admin' })
    const res = await request(app)
      .post('/api/v1/admin/products')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Без цены' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('validation_error')
  })

  it('PATCH /admin/orders/:id/status с невалидным статусом → 400', async () => {
    const token = signAccessToken({ sub: UUID, role: 'admin' })
    const res = await request(app)
      .patch('/api/v1/admin/orders/00000000-0000-0000-0000-000000000002/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'unknown' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('validation_error')
  })
})

describe('аутентификация: register/login', () => {
  it('POST /auth/register создаёт пользователя и возвращает токены', async () => {
    ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue(userRow())
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'new@example.com',
      password: 'password123',
      name: 'Новый',
    })
    expect(res.status).toBe(201)
    expect(res.body.data.accessToken).toBeDefined()
    expect(res.body.data.refreshToken).toBeDefined()
    expect(res.body.data.user.email).toBe('user@example.com')
  })

  it('POST /auth/register c коротким паролем → 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'a@example.com', password: 'short', name: 'Тест' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('validation_error')
  })

  it('POST /auth/login с неверным паролем → 401', async () => {
    ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(userRow({ passwordHash: await hashPassword('right-password') }))
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'user@example.com', password: 'wrong' })
    expect(res.status).toBe(401)
    expect(res.body.message).toContain('Неверный email или пароль')
  })
})
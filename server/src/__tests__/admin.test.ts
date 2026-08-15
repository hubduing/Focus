import { describe, expect, it } from 'vitest'
import {
  adminOrderListQuerySchema,
  adminProductListQuerySchema,
  categorySchema,
  productSchema,
  updateOrderStatusSchema,
} from 'shared'
import { HttpError } from '../lib/errors.js'
import { requireAdmin, requireUser } from '../middleware/auth.js'
import { signAccessToken } from '../lib/tokens.js'

process.env.JWT_SECRET = 'test-secret'

function makeRes() {
  return { status: () => undefined } as unknown as import('express').Response
}

function makeNext() {
  const calls: unknown[][] = []
  const next = (...args: unknown[]) => {
    calls.push(args)
  }
  return { next, calls }
}

function makeReq(authorization?: string) {
  const req = { headers: {} as Record<string, string | undefined> } as import('express').Request
  if (authorization) req.headers.authorization = authorization
  return req
}

describe('admin schemas', () => {
  it('adminProductListQuerySchema дефолтит пагинацию и принимает фильтры', () => {
    const result = adminProductListQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.perPage).toBe(20)
      expect(result.data.active).toBeUndefined()
    }
    const withFilters = adminProductListQuerySchema.safeParse({ page: '2', perPage: '50', search: 'ноут', active: 'false' })
    expect(withFilters.success).toBe(true)
    if (withFilters.success) {
      expect(withFilters.data.page).toBe(2)
      expect(withFilters.data.perPage).toBe(50)
      expect(withFilters.data.search).toBe('ноут')
      expect(withFilters.data.active).toBe('false')
    }
  })

  it('adminOrderListQuerySchema принимает валидный статус и пагинацию', () => {
    const result = adminOrderListQuerySchema.safeParse({ page: '1', perPage: '20', status: 'paid' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('paid')
    }
    expect(adminOrderListQuerySchema.safeParse({ status: 'unknown' }).success).toBe(false)
  })

  it('productSchema валидирует полный товар и дефолтит необязательные поля', () => {
    const result = productSchema.safeParse({
      categoryId: '00000000-0000-0000-0000-000000000001',
      name: 'Ноутбук',
      slug: 'notebook',
      price: 99.99,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.stock).toBe(0)
      expect(result.data.active).toBe(true)
      expect(result.data.attributes).toEqual({})
      expect(result.data.images).toEqual([])
    }
    expect(productSchema.safeParse({ name: 'x', slug: 'nope', price: 100 }).success).toBe(false)
  })

  it('categorySchema валидирует новый родитель и позицию', () => {
    const result = categorySchema.safeParse({
      name: 'Электроника',
      slug: 'electronics',
      parentId: '00000000-0000-0000-0000-000000000001',
      position: 2,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.parentId).toBe('00000000-0000-0000-0000-000000000001')
      expect(result.data.position).toBe(2)
    }
    expect(categorySchema.safeParse({ name: 'x', slug: 'BAD SLUG' }).success).toBe(false)
  })

  it('updateOrderStatusSchema принимает известный статус', () => {
    expect(updateOrderStatusSchema.safeParse({ status: 'shipped' }).success).toBe(true)
    expect(updateOrderStatusSchema.safeParse({ status: 'hacked' }).success).toBe(false)
  })
})

describe('admin role middleware', () => {
  it('requireUser отклоняет запрос без Bearer-токена', () => {
    const req = makeReq()
    const { next, calls } = makeNext()
    requireUser(req, makeRes(), next)
    expect(calls).toHaveLength(1)
    expect(calls[0][0]).toBeInstanceOf(HttpError)
    expect((calls[0][0] as HttpError).status).toBe(401)
  })

  it('requireUser пропускает запрос с валидным токеном и заполняет req.user', () => {
    const token = signAccessToken({ sub: 'user-1', role: 'admin' })
    const req = makeReq(`Bearer ${token}`)
    const { next, calls } = makeNext()
    requireUser(req, makeRes(), next)
    expect(calls).toHaveLength(1)
    expect(calls[0][0]).toBeUndefined()
    expect(req.user).toMatchObject({ id: 'user-1', role: 'admin' })
  })

  it('requireUser отклоняет невалидный токен', () => {
    const req = makeReq('Bearer not-a-jwt')
    const { next, calls } = makeNext()
    requireUser(req, makeRes(), next)
    expect(calls).toHaveLength(1)
    expect(calls[0][0]).toBeInstanceOf(HttpError)
    expect((calls[0][0] as HttpError).status).toBe(401)
  })

  it('requireAdmin требует роль admin', () => {
    const adminReq = { user: { id: 'a', role: 'admin' } } as unknown as import('express').Request
    const adminNext = makeNext()
    requireAdmin(adminReq, makeRes(), adminNext.next)
    expect(adminNext.calls).toHaveLength(1)
    expect(adminNext.calls[0][0]).toBeUndefined()

    const userReq = { user: { id: 'u', role: 'user' } } as unknown as import('express').Request
    const userNext = makeNext()
    requireAdmin(userReq, makeRes(), userNext.next)
    expect(userNext.calls[0][0]).toBeInstanceOf(HttpError)
    expect((userNext.calls[0][0] as HttpError).status).toBe(403)
  })

  it('requireAdmin отклоняет неавторизованный запрос', () => {
    const req = {} as unknown as import('express').Request
    const { next, calls } = makeNext()
    requireAdmin(req, makeRes(), next)
    expect(calls).toHaveLength(1)
    expect(calls[0][0]).toBeInstanceOf(HttpError)
    expect((calls[0][0] as HttpError).status).toBe(401)
  })
})
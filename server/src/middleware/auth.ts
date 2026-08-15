import type { NextFunction, Request, Response } from 'express'
import { HttpError } from '../lib/errors.js'
import { verifyAccessToken } from '../lib/tokens.js'

export interface AuthUser {
  id: string
  role: string
  email?: string
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length).trim() || null
}

export function requireUser(req: Request, _res: Response, next: NextFunction) {
  const token = bearerToken(req)
  if (!token) {
    next(new HttpError(401, 'Требуется авторизация'))
    return
  }
  const payload = verifyAccessToken(token)
  if (!payload) {
    next(new HttpError(401, 'Недействительный или просроченный токен'))
    return
  }
  const user: AuthUser = {
    id: payload.sub,
    role: payload.role ?? 'user',
    ...(payload.email && { email: payload.email }),
  }
  req.user = user
  next()
}
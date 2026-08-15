import jwt from 'jsonwebtoken'
import type { SignOptions } from 'jsonwebtoken'
import crypto from 'node:crypto'

export interface AccessTokenPayload {
  sub: string
  email?: string
  role?: string
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const secret = process.env.JWT_SECRET ?? ''
  const ttl = (process.env.JWT_ACCESS_TTL ?? '15m') as SignOptions['expiresIn']
  return jwt.sign(payload, secret, { expiresIn: ttl })
}

export function verifyAccessToken(
  token: string,
  secret = process.env.JWT_SECRET ?? '',
): AccessTokenPayload | null {
  try {
    const payload = jwt.verify(token, secret)
    if (typeof payload === 'string' || typeof payload.sub !== 'string' || !payload.sub) {
      return null
    }
    return {
      sub: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      role: typeof payload.role === 'string' ? payload.role : undefined,
    }
  } catch {
    return null
  }
}

// Высокоэнтропийный случайный токен (64 hex-символа) для refresh и сброса пароля.
export function generateRandomToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// В БД храним только SHA-256 хэш токена — сам токен не сохраняется.
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
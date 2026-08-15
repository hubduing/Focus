import jwt from 'jsonwebtoken'

export interface AccessTokenPayload {
  sub: string
  email?: string
  role?: string
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
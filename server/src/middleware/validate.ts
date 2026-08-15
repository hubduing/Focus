import type { NextFunction, Request, Response } from 'express'
import type { ZodType } from 'zod'
import { ZodError } from 'zod'

export function validate(schema: ZodType, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req[source])
    if (!parsed.success) {
      next(new ZodError(parsed.error.issues))
      return
    }
    ;(req as Request & Record<string, unknown>)[source] = parsed.data
    next()
  }
}
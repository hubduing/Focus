import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import type { ApiError as ApiErrorType } from 'shared'

export class HttpError extends Error {
  status: number
  details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, `Маршрут не найден: ${req.method} ${req.originalUrl}`))
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const payload: ApiErrorType = {
      error: 'validation_error',
      message: 'Некорректные входные данные',
      details: err.issues,
    }
    res.status(400).json(payload)
    return
  }

  if (err instanceof HttpError) {
    const payload: ApiErrorType = { error: err.name, message: err.message, details: err.details }
    res.status(err.status).json(payload)
    return
  }

  console.error('[error]', err)
  const payload: ApiErrorType = { error: 'internal_error', message: 'Внутренняя ошибка сервера' }
  res.status(500).json(payload)
}
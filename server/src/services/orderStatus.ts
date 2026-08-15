import { HttpError } from '../lib/errors.js'

// Статусная модель заказа из плана: created → paid → processing → shipped → delivered / cancelled.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  created: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

export function isKnownStatus(status: string): boolean {
  return Object.hasOwn(ALLOWED_TRANSITIONS, status)
}

export function canTransition(from: string, to: string): boolean {
  if (from === to) return true
  const allowed = ALLOWED_TRANSITIONS[from]
  return Boolean(allowed && allowed.includes(to))
}

export function assertValidTransition(from: string, to: string): void {
  if (!isKnownStatus(from)) {
    throw new HttpError(409, `Неизвестный статус заказа: ${from}`)
  }
  if (!canTransition(from, to)) {
    throw new HttpError(409, `Переход статуса "${from}" → "${to}" недопустим`)
  }
}
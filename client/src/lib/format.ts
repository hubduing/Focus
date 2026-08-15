const priceFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
})

export function formatPrice(value: number | string | null | undefined): string {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '—'
  return priceFormatter.format(n)
}

export function formatDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export const STATUS_LABELS: Record<string, string> = {
  created: 'Создан',
  paid: 'Оплачен',
  processing: 'В обработке',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: 'Картой онлайн (Stripe)',
  cash: 'Наличными при получении',
  on_delivery: 'Оплата при получении',
}
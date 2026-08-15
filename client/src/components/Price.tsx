import { formatPrice } from '../lib/format'

interface PriceProps {
  value: number | string | null | undefined
  oldValue?: number | string | null
}

export default function Price({ value, oldValue }: PriceProps) {
  const hasDiscount = oldValue != null && Number(value) < Number(oldValue)
  return (
    <span className="price">
      {hasDiscount && <span className="price-old">{formatPrice(oldValue)}</span>}{' '}
      <span className={hasDiscount ? 'price-discount' : undefined}>{formatPrice(value)}</span>
    </span>
  )
}
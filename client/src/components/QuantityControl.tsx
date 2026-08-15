import { MAX_CART_QTY } from 'shared'

interface QuantityControlProps {
  quantity: number
  onChange: (quantity: number) => void
  stock?: number
  disabled?: boolean
}

export default function QuantityControl({ quantity, onChange, stock, disabled }: QuantityControlProps) {
  const max = stock ? Math.min(MAX_CART_QTY, stock) : MAX_CART_QTY
  const minus = () => {
    if (quantity > 1) onChange(quantity - 1)
  }
  const plus = () => {
    if (quantity < max) onChange(quantity + 1)
  }

  return (
    <div className="qty-control" role="group" aria-label="Количество">
      <button type="button" onClick={minus} disabled={disabled || quantity <= 1} aria-label="Уменьшить">
        −
      </button>
      <span aria-live="polite">{quantity}</span>
      <button type="button" onClick={plus} disabled={disabled || quantity >= max} aria-label="Увеличить">
        +
      </button>
    </div>
  )
}
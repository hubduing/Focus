import { useCart } from '../context/CartContext'

export default function CartBadge() {
  const { count } = useCart()
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        position: 'relative',
        fontWeight: 600,
      }}
      role="status"
      aria-label={`Корзина, товаров: ${count}`}
    >
      Корзина
      {count > 0 && (
        <span
          style={{
            minWidth: 20,
            padding: '0 6px',
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            lineHeight: 1,
            color: '#fff',
            background: '#c0392b',
            borderRadius: 10,
          }}
        >
          {count}
        </span>
      )}
    </div>
  )
}
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import QuantityControl from '../components/QuantityControl'
import EmptyState from '../components/EmptyState'
import Spinner from '../components/Spinner'
import { formatPrice } from '../lib/format'

export default function CartPage() {
  const { lines, totals, loading, setQuantity, removeItem, clear } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  if (loading && lines.length === 0) return <Spinner />

  if (lines.length === 0) {
    return (
      <div className="section">
        <div className="container">
          <p className="eyebrow">Корзина</p>
          <EmptyState
            icon="🛒"
            title="Корзина пуста"
            description="Ничего страшного. В каталоге много хороших вещей."
            action={{ label: 'Перейти в каталог', to: '/catalog' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="section">
      <div className="container">
        <p className="eyebrow">Корзина</p>
        <h1 className="display section-title" style={{ marginBottom: 26 }}>
          Ваши вещи
        </h1>

        {totals.unavailableCount > 0 && (
          <div className="alert alert-error">
            Часть позиций недоступна (нет в наличии или снято с продажи). Уберите их, чтобы оформить заказ.
          </div>
        )}

        <div className="cart-layout">
          <div>
            {lines.map((line) => (
              <div key={line.productId} className="cart-item">
                <div className="cart-item__img">
                  {line.image ? (
                    <img src={line.image} alt={line.name} />
                  ) : (
                    <span aria-hidden="true">{line.name.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <p className="cart-item__title">
                    <Link to={`/catalog/${line.slug}`}>{line.name}</Link>
                  </p>
                  <div className="cart-item__price">
                    {formatPrice(line.unitPrice)} × {line.quantity}
                  </div>
                  {!line.available && <div className="stock-hint stock-no">Недоступно</div>}
                </div>
                <div className="cart-item__right">
                  <QuantityControl quantity={line.quantity} onChange={(q) => void setQuantity(line.productId, q)} stock={line.stock} disabled={!line.available} />
                  <div className="cart-item__sum">{formatPrice(line.subtotal)}</div>
                  <button className="btn btn-danger btn-small" onClick={() => void removeItem(line.productId)}>
                    Удалить
                  </button>
                </div>
              </div>
            ))}

            <div style={{ marginTop: 22 }}>
              <button className="btn btn-ghost btn-small" onClick={() => void clear()}>
                Очистить корзину
              </button>
            </div>
          </div>

          <aside className="summary">
            <h2>Итого</h2>
            <div className="summary-row">
              <span>Товары</span>
              <span>{totals.count} шт.</span>
            </div>
            {totals.discount > 0 && (
              <div className="summary-row discount">
                <span>Скидка</span>
                <span>−{formatPrice(totals.discount)}</span>
              </div>
            )}
            <div className="summary-row total">
              <span>К оплате</span>
              <span>{formatPrice(totals.subtotal)}</span>
            </div>
            {!user && (
              <div className="alert alert-info" style={{ marginTop: 12, marginBottom: 12, fontSize: 13 }}>
                Для оформления нужен вход. Не переживайте, корзина сохранится и перенесётся в аккаунт.
              </div>
            )}
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 8 }}
              disabled={totals.unavailableCount > 0 || totals.count === 0}
              onClick={() => (user ? navigate('/checkout') : navigate('/login', { state: { from: '/checkout' } }))}
            >
              Оформить заказ
            </button>
          </aside>
        </div>
      </div>
    </div>
  )
}
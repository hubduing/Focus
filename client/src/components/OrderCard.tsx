import { Link } from 'react-router-dom'
import type { Order } from '../lib/api'
import { STATUS_LABELS } from '../lib/format'

export default function OrderCard({ order, admin = false }: { order: Order; admin?: boolean }) {
  const basePath = admin ? '/admin/orders' : '/account/orders'
  return (
    <div className="order-card">
      <div className="order-card__head">
        <div>
          <strong>Заказ №{order.id.slice(0, 8)}</strong>
          <span style={{ color: 'var(--ink-faint)', marginLeft: 10, fontSize: 13 }}>
            {new Date(order.createdAt).toLocaleDateString('ru-RU')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className={`status-chip status-${order.status}`}>{STATUS_LABELS[order.status] ?? order.status}</span>
          <Link to={`${basePath}/${order.id}`} className="link" style={{ fontSize: 13.5 }}>
            Подробнее
          </Link>
        </div>
      </div>
      <div className="order-card__body">
        <ul className="order-lines">
          {order.items.slice(0, 3).map((item) => (
            <li key={item.id}>
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{item.price.toLocaleString('ru-RU')} ₽</span>
            </li>
          ))}
          {order.items.length > 3 && (
            <li>
              <span>…ещё {order.items.length - 3}</span>
            </li>
          )}
        </ul>
        <div className="order-total">
          <span>Итого</span>
          <span>{order.total.toLocaleString('ru-RU')} ₽</span>
        </div>
      </div>
    </div>
  )
}
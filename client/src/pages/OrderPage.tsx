import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiGetOrder, type Order } from '../lib/api'
import { PAYMENT_METHOD_LABELS, STATUS_LABELS } from '../lib/format'
import EmptyState from '../components/EmptyState'
import Spinner from '../components/Spinner'

export default function OrderPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    apiGetOrder(id)
      .then(({ data }) => setOrder(data))
      .catch(() => setNotFound(true))
  }, [id])

  if (notFound) {
    return (
      <div className="section">
        <div className="container">
          <EmptyState icon="!" title="Заказ не найден" action={{ label: 'К заказам', to: '/account/orders' }} />
        </div>
      </div>
    )
  }
  if (!order) return <Spinner />

  return (
    <div className="panel">
      <h2>
        Заказ №{order.id.slice(0, 8)}
        <span className={`status-chip status-${order.status}`} style={{ marginLeft: 12 }}>
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </h2>

      <div style={{ fontSize: 14.5, color: 'var(--ink-soft)', marginBottom: 18 }}>
        {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
        {order.payment && (
          <span>
            {' '}· оплата: {order.payment.status === 'succeeded' ? 'подтверждена' : 'ожидает подтверждения'}
            {order.payment.provider !== 'offline' && ` (${order.payment.provider})`}
          </span>
        )}
      </div>

      <ul className="order-lines">
        {order.items.map((item) => (
          <li key={item.id}>
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>{(item.price * item.quantity).toLocaleString('ru-RU')} ₽</span>
          </li>
        ))}
      </ul>

      <div className="order-total">
        <span>Итого</span>
        <span>{order.total.toLocaleString('ru-RU')} ₽</span>
      </div>

      <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px dashed var(--line)' }}>
        <strong>{order.addressLabel}</strong>
        <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 14 }}>
          {order.addressStreet}, {order.addressCity}
          {order.addressZip ? `, ${order.addressZip}` : ''}
        </p>
      </div>
    </div>
  )
}
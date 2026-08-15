import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiGetOrder, type Order } from '../lib/api'
import { STATUS_LABELS } from '../lib/format'
import Spinner from '../components/Spinner'

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order')
  const [order, setOrder] = useState<Order | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!orderId) return
    apiGetOrder(orderId)
      .then(({ data }) => setOrder(data))
      .catch(() => setNotFound(true))
  }, [orderId])

  if (!orderId) {
    return (
      <div className="section">
        <div className="container" style={{ maxWidth: 640 }}>
          <div className="alert alert-info">Заказ ещё не создан. Начните с каталога.</div>
          <Link to="/catalog" className="btn btn-primary">К каталогу</Link>
        </div>
      </div>
    )
  }

  if (!order && !notFound) return <Spinner />

  const paid = order?.status === 'paid'

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 700 }}>
        <div className="empty" style={{ textAlign: 'left', border: 'none', padding: 0 }}>
          <p className="eyebrow">Статус заказа</p>
          <h1 className="display section-title" style={{ margin: '10px 0 14px' }}>
            {paid ? 'Оплата прошла ✓' : 'Заказ принят'}
          </h1>
          {notFound ? (
            <p style={{ color: 'var(--ink-soft)' }}>Заказ не найден. Проверьте ссылку или откройте заказы в кабинете.</p>
          ) : (
            <>
              <p style={{ color: 'var(--ink-soft)', fontSize: 16 }}>
                {paid
                  ? 'Спасибо! Мы начали обрабатывать заказ. Следите за статусом в личном кабинете.'
                  : 'Мы получили заказ. Для карточной оплаты вы должны были пройти платёж; подробности — в личном кабинете.'}
              </p>
              <div className="panel" style={{ marginTop: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <span>Заказ #{order!.id.slice(0, 8)}</span>
                  <span className={`status-chip status-${order!.status}`}>{STATUS_LABELS[order!.status] ?? order!.status}</span>
                </div>
                <div className="order-total" style={{ padding: '12px 0 0' }}>
                  <span>Сумма</span>
                  <span>{order!.total.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link to={`/account/orders/${order!.id}`} className="btn btn-primary">Смотреть заказ</Link>
                <Link to="/catalog" className="btn btn-ghost">В каталог</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
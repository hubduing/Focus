import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  apiAddAddress,
  apiCreateCheckout,
  apiCreateOrder,
  apiListAddresses,
  type Address,
} from '../lib/api'
import { PAYMENT_METHOD_LABELS } from '../lib/format'
import { useCart } from '../context/CartContext'
import Spinner from '../components/Spinner'

const PAYMENT_METHODS: Array<'card' | 'cash' | 'on_delivery'> = ['card', 'cash', 'on_delivery']

export default function CheckoutPage() {
  const { lines, totals, reload } = useCart()
  const navigate = useNavigate()
  const [addresses, setAddresses] = useState<Address[] | null>(null)
  const [selected, setSelected] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'on_delivery'>('card')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewAddress, setShowNewAddress] = useState(false)
  const [newAddress, setNewAddress] = useState({ label: '', street: '', city: '', zip: '' })

  useEffect(() => {
    apiListAddresses()
      .then(({ data }) => {
        setAddresses(data)
        if (data.length > 0) setSelected(data[0].id)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Не удалось загрузить адреса'))
  }, [])

  if (addresses === null) return <Spinner />

  const addAddress = async () => {
    const { data } = await apiAddAddress(newAddress)
    setAddresses((prev) => [...(prev ?? []), data])
    setSelected(data.id)
    setShowNewAddress(false)
    setNewAddress({ label: '', street: '', city: '', zip: '' })
  }

  const submit = async () => {
    if (!selected) {
      setError('Выберите адрес доставки')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const { data: order } = await apiCreateOrder({ addressId: selected, paymentMethod })
      await reload()
      if (paymentMethod === 'card') {
        const { data: session } = await apiCreateCheckout(order.id)
        if (session.url) {
          // редирект на страницу оплаты (Stripe test / mock)
          window.location.assign(session.url)
          return
        }
      }
      navigate(`/checkout/success?order=${order.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось оформить заказ')
      setSubmitting(false)
    }
  }

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <p className="eyebrow">Оформление</p>
        <h1 className="display section-title" style={{ marginBottom: 26 }}>
          Заказ и доставка
        </h1>
        {error && <div className="alert alert-error">{error}</div>}
        {lines.length === 0 && !submitting && (
          <div className="alert alert-info">
            Корзина пуста.{' '}
            <Link to="/catalog" className="link">
              Перейти в каталог
            </Link>
          </div>
        )}

        <div className="panel">
          <h2>1 · Адрес доставки</h2>
          {addresses.length === 0 && <p style={{ color: 'var(--ink-soft)' }}>У вас пока нет сохранённых адресов.</p>}
          {addresses.map((addr) => (
            <label key={addr.id} className="pay-option">
              <input
                type="radio"
                name="address"
                value={addr.id}
                checked={selected === addr.id}
                onChange={() => setSelected(addr.id)}
              />
              <span>
                <strong>{addr.label}</strong>
                <span>
                  {addr.street}, {addr.city}
                  {addr.zip ? `, ${addr.zip}` : ''}
                </span>
              </span>
            </label>
          ))}

          {showNewAddress ? (
            <div style={{ marginTop: 14 }}>
              <div className="field">
                <label className="label" htmlFor="n-label">Название</label>
                <input id="n-label" className="input" value={newAddress.label} placeholder="Например: Работа" onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })} />
              </div>
              <div className="field">
                <label className="label" htmlFor="n-street">Улица, дом, квартира</label>
                <input id="n-street" className="input" value={newAddress.street} placeholder="ул. Ленина, 1, кв. 5" onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })} />
              </div>
              <div className="field">
                <label className="label" htmlFor="n-city">Город</label>
                <input id="n-city" className="input" value={newAddress.city} placeholder="Москва" onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} />
              </div>
              <div className="field">
                <label className="label" htmlFor="n-zip">Индекс</label>
                <input id="n-zip" className="input" value={newAddress.zip} placeholder="101000" onChange={(e) => setNewAddress({ ...newAddress, zip: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary" onClick={() => void addAddress()}>Сохранить адрес</button>
                <button className="btn btn-ghost" onClick={() => setShowNewAddress(false)}>Отмена</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-ghost btn-small" style={{ marginTop: 12 }} onClick={() => setShowNewAddress(true)}>
              + Добавить адрес
            </button>
          )}
        </div>

        <div className="panel">
          <h2>2 · Способ оплаты</h2>
          {PAYMENT_METHODS.map((m) => (
            <label key={m} className={`pay-option ${paymentMethod === m ? 'selected' : ''}`}>
              <input type="radio" name="pay" value={m} checked={paymentMethod === m} onChange={() => setPaymentMethod(m)} />
              <span>
                <strong>{PAYMENT_METHOD_LABELS[m]}</strong>
                <span>
                  {m === 'card'
                    ? 'Перейдёте на страницу тестовой оплаты Stripe (карта 4242 4242 4242 4242).'
                    : 'Оплатите при получении или иным способом.'}
                </span>
              </span>
            </label>
          ))}
        </div>

        <div className="panel summary" style={{ position: 'static' }}>
          <div className="summary-row">
            <span>Товары ({totals.count} шт.)</span>
            <span>{totals.baseSubtotal.toLocaleString('ru-RU')} ₽</span>
          </div>
          {totals.discount > 0 && (
            <div className="summary-row discount">
              <span>Скидка</span>
              <span>−{totals.discount.toLocaleString('ru-RU')} ₽</span>
            </div>
          )}
          <div className="summary-row total">
            <span>Итого</span>
            <span>{totals.subtotal.toLocaleString('ru-RU')} ₽</span>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 14 }} disabled={submitting || lines.length === 0} onClick={() => void submit()}>
            {submitting ? 'Оформляем…' : paymentMethod === 'card' ? 'Перейти к оплате' : 'Подтвердить заказ'}
          </button>
        </div>
      </div>
    </div>
  )
}
import { useEffect, useState } from 'react'
import {
  apiAddAddress,
  apiDeleteAddress,
  apiListAddresses,
  apiUpdateProfile,
  type Address,
} from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

export default function AccountProfile() {
  const { user, setUser } = useAuth()
  const { show } = useToast()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [saved, setSaved] = useState(false)
  const [newAddress, setNewAddress] = useState({ label: '', street: '', city: '', zip: '' })
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    apiListAddresses()
      .then(({ data }) => setAddresses(data))
      .catch(() => undefined)
  }, [])

  const saveProfile = async () => {
    const { data } = await apiUpdateProfile({ name, phone: phone || undefined })
    setUser({ ...data, phone: data.phone ?? null })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addAddress = async () => {
    setAdding(true)
    try {
      const { data } = await apiAddAddress(newAddress)
      setAddresses((prev) => [...prev, data])
      setNewAddress({ label: '', street: '', city: '', zip: '' })
      show('Адрес сохранён')
    } finally {
      setAdding(false)
    }
  }

  const removeAddress = async (id: string) => {
    await apiDeleteAddress(id)
    setAddresses((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <>
      <div className="panel">
        <h2>Профиль</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label" htmlFor="p-name">Имя</label>
            <input id="p-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label" htmlFor="p-phone">Телефон</label>
            <input id="p-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 900 000-00-00" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label" htmlFor="p-email">Email</label>
            <input id="p-email" className="input" value={user?.email ?? ''} disabled />
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: 18 }} onClick={() => void saveProfile()}>
          Сохранить
        </button>
        {saved && <span className="alert alert-success" style={{ margin: '12px 0 0', display: 'inline-block' }}>Сохранено</span>}
      </div>

      <div className="panel">
        <h2>Адреса доставки</h2>
        {addresses.length > 0 && (
          <div className="address-grid" style={{ marginBottom: 18 }}>
            {addresses.map((addr) => (
              <div key={addr.id} className="address-card">
                <strong>{addr.label}</strong>
                <p>
                  {addr.street}, {addr.city}
                  {addr.zip ? `, ${addr.zip}` : ''}
                </p>
                <button className="btn btn-danger btn-small" onClick={() => void removeAddress(addr.id)}>
                  Удалить
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <input className="input" placeholder="Название (Дом, Работа)" value={newAddress.label} onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })} />
          <input className="input" placeholder="Улица, дом, квартира" value={newAddress.street} onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })} />
          <input className="input" placeholder="Город" value={newAddress.city} onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })} />
          <input className="input" placeholder="Индекс" value={newAddress.zip} onChange={(e) => setNewAddress({ ...newAddress, zip: e.target.value })} />
        </div>
        <button className="btn btn-ghost" style={{ marginTop: 14 }} disabled={adding || !newAddress.street || !newAddress.city} onClick={() => void addAddress()}>
          + Добавить адрес
        </button>
      </div>
    </>
  )
}
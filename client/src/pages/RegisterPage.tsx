import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await register({ ...form, phone: form.phone || undefined })
      navigate('/account', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось зарегистрироваться')
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-side">
        <p className="eyebrow" style={{ color: 'var(--ember)' }}>Регистрация</p>
        <h2 className="display">Меньше минут на новую полку.</h2>
        <p>Экономия времени — единственное, что мы гарантируем с доставки.</p>
      </div>
      <div className="auth-form">
        <div className="auth-box">
          <h1 className="display">Создать аккаунт</h1>
          <p className="subtitle">Уже есть? <Link to="/login" className="link">Войдите</Link>.</p>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label className="label" htmlFor="r-name">Имя</label>
              <input id="r-name" className="input" required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label className="label" htmlFor="r-email">Email</label>
              <input id="r-email" className="input" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label className="label" htmlFor="r-phone">Телефон</label>
              <input id="r-phone" className="input" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+7 900 000-00-00" />
            </div>
            <div className="field">
              <label className="label" htmlFor="r-password">Пароль</label>
              <input id="r-password" className="input" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <div className="field-hint">Минимум 8 символов.</div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
              {submitting ? 'Создаём…' : 'Зарегистрироваться'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
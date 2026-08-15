import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/account'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось войти')
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-side">
        <p className="eyebrow" style={{ color: 'var(--ember)' }}>Вход</p>
        <h2 className="display">С возвращением.</h2>
        <p>Ваши заказы, избранное и корзина ждут вас в личном кабинете.</p>
      </div>
      <div className="auth-form">
        <div className="auth-box">
          <h1 className="display">Войти</h1>
          <p className="subtitle">Или <Link to="/register" className="link">зарегистрируйтесь</Link> за минуту.</p>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label className="label" htmlFor="l-email">Email</label>
              <input id="l-email" className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label className="label" htmlFor="l-password">Пароль</label>
              <input id="l-password" className="input" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div style={{ textAlign: 'right', marginBottom: 12 }}>
              <Link to="/reset-password" className="link">Забыли пароль?</Link>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
              {submitting ? 'Входим…' : 'Войти'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
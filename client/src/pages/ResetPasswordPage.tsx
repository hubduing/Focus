import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiRequestPasswordReset, apiResetPassword } from '../lib/api'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function requestReset(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const res = await apiRequestPasswordReset(email)
      setMessage(res.data.message)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить запрос')
    }
  }

  async function setNewPassword(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!token) return
    try {
      const res = await apiResetPassword(token, password)
      setMessage(res.data.message)
      setPassword('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сбросить пароль')
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-side">
        <p className="eyebrow" style={{ color: 'var(--ember)' }}>
          Пароль
        </p>
        <h2 className="display">Восстановление доступа.</h2>
        <p>Введите email — пришлём ссылку для сброса, или установите новый пароль по ссылке из письма.</p>
      </div>
      <div className="auth-form">
        <div className="auth-box">
          {token ? (
            <>
              <h1 className="display">Новый пароль</h1>
              {error && <div className="alert alert-error">{error}</div>}
              {message && <div className="alert alert-success">{message} Можете <Link to="/login" className="link">войти</Link>.</div>}
              {!message && (
                <form onSubmit={setNewPassword}>
                  <div className="field">
                    <label className="label" htmlFor="rp-password">Новый пароль</label>
                    <input
                      id="rp-password"
                      className="input"
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%' }}>
                    Сохранить пароль
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              <h1 className="display">Сброс пароля</h1>
              {error && <div className="alert alert-error">{error}</div>}
              {message && <div className="alert alert-success" style={{ marginTop: 12 }}>{message}</div>}
              {!sent && (
                <form onSubmit={requestReset}>
                  <div className="field">
                    <label className="label" htmlFor="rp-email">Email</label>
                    <input
                      id="rp-email"
                      className="input"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%' }}>
                    Отправить ссылку
                  </button>
                </form>
              )}
            </>
          )}
          <p className="subtitle" style={{ marginTop: 16 }}>
            Вспомнили пароль? <Link to="/login" className="link">Войти</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
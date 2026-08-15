import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import SearchSuggest from './SearchSuggest'

export default function Header() {
  const { user, logout } = useAuth()
  const { count } = useCart()
  const navigate = useNavigate()

  return (
    <header className="site-header">
      <div className="container site-header__in">
        <Link to="/" className="brand">
          ВЕЩ<span className="accent">Ь</span>
        </Link>
        <nav className="site-nav" aria-label="Основная навигация">
          <NavLink to="/catalog" end>
            Каталог
          </NavLink>
          {user && (
            <>
              <NavLink to="/account/orders" end>
                Заказы
              </NavLink>
              {user.role === 'admin' && <NavLink to="/admin">Админ</NavLink>}
            </>
          )}
        </nav>
        <SearchSuggest />
        <div className="site-actions">
          <Link to="/cart" className="icon-btn" aria-label={`Корзина, товаров: ${count}`}>
            <span aria-hidden="true">🛒</span>
            <span className="btn-text">Корзина</span>
            {count > 0 && <span className="badge-count">{count}</span>}
          </Link>
          {user ? (
            <>
              <Link to="/account" className="icon-btn">
                <span className="user-chip">
                  <span className="dot" aria-hidden="true" />
                  {user.name.split(' ')[0]}
                </span>
              </Link>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => {
                  void logout().then(() => navigate('/'))
                }}
              >
                Выйти
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-small">
              Войти
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
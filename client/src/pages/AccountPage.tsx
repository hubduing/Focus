import { NavLink, Outlet } from 'react-router-dom'

export default function AccountPage() {
  return (
    <div className="section">
      <div className="container">
        <p className="eyebrow">Личный кабинет</p>
        <h1 className="display section-title" style={{ marginBottom: 26 }}>
          Кабинет
        </h1>
        <div className="account-layout">
          <nav className="account-nav" aria-label="Разделы кабинета">
            <NavLink to="/account" end>
              Профиль и адреса
            </NavLink>
            <NavLink to="/account/orders" end>
              Заказы
            </NavLink>
            <NavLink to="/account/wishlist">Избранное</NavLink>
          </nav>
          <main>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
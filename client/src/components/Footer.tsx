import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-links">
          <Link to="/" className="brand">
            ВЕЩ<span className="accent">Ь</span>
          </Link>
          <Link to="/catalog">Каталог</Link>
          <Link to="/cart">Корзина</Link>
          <Link to="/account">Личный кабинет</Link>
        </div>
        <div className="bottom-row">
          <span>© 2026 ВЕЩЬ — интернет-витрина. Тестовые платежи Stripe.</span>
          <span>Тестовая карта: 4242 4242 4242 4242</span>
        </div>
      </div>
    </footer>
  )
}
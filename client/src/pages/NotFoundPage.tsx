import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="section">
      <div className="container">
        <div className="notfound center-page" style={{ flexDirection: 'column', minHeight: '50vh' }}>
          <h1 className="display">404</h1>
          <p style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>Такой страницы нет — но каталог, кажется, совсем рядом.</p>
          <Link to="/catalog" className="btn btn-primary">
            В каталог
          </Link>
        </div>
      </div>
    </div>
  )
}
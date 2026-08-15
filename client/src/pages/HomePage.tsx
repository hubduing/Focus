import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiCategories, apiListProducts, type CategoryNode, type Product } from '../lib/api'
import ProductCard from '../components/ProductCard'
import Spinner from '../components/Spinner'

export default function HomePage() {
  const [categories, setCategories] = useState<CategoryNode[] | null>(null)
  const [featured, setFeatured] = useState<Product[] | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([apiCategories(), apiListProducts({ perPage: 8, sort: 'newest' })])
      .then(([cats, list]) => {
        if (cancelled) return
        setCategories(cats.data)
        setFeatured(list.data)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <section className="hero">
        <div className="container">
          <p className="eyebrow reveal">Интернет-витрина · тестовая оплата</p>
          <h1 className="display reveal">
            Вещи, которым место в <span style={{ color: 'var(--ember)' }}>вашей</span> жизни
          </h1>
          <p className="reveal">
            Каталог электроники и не только: поиск, фильтры, корзина, личный кабинет и оплата картой в тестовом режиме.
          </p>
          <Link to="/catalog" className="btn btn-primary reveal">
            Смотреть каталог →
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Навигация</p>
              <h2 className="section-title display">Категории</h2>
            </div>
          </div>
          {categories === null ? (
            <Spinner />
          ) : (
            <div className="cat-strip">
              {categories.map((cat) => (
                <Link key={cat.id} to={`/catalog?category=${cat.slug}`} className="cat-chip">
                  {cat.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Новинки</p>
              <h2 className="section-title display">Свежие поступления</h2>
            </div>
            <Link to="/catalog" className="btn btn-ghost btn-small">
              Все товары
            </Link>
          </div>
          {featured === null ? (
            <Spinner />
          ) : featured.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)' }}>Пока нет товаров — добавьте их через админ-панель.</p>
          ) : (
            <div className="grid">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
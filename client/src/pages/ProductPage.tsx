import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGetProduct, apiRelatedProducts, type Product } from '../lib/api'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../context/WishlistContext'
import { useToast } from '../components/Toast'
import Price from '../components/Price'
import ProductCard from '../components/ProductCard'
import QuantityControl from '../components/QuantityControl'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [adding, setAdding] = useState(false)
  const { addItem } = useCart()
  const { user } = useAuth()
  const { isWishlisted, toggle } = useWishlist()
  const { show } = useToast()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    if (!slug) return
    Promise.all([apiGetProduct(slug), apiRelatedProducts(slug)])
      .then(([p, rel]) => {
        if (cancelled) return
        setProduct(p.data)
        setRelated(rel.data)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setNotFound(true)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) return <Spinner />
  if (notFound || !product) {
    return (
      <div className="section">
        <div className="container">
          <EmptyState
            icon="?"
            title="Товар не найден"
            description="Кажется, эту вещь мы не возим. Загляните в каталог."
            action={{ label: 'В каталог', to: '/catalog' }}
          />
        </div>
      </div>
    )
  }

  const image = Array.isArray(product.images) && typeof product.images[0] === 'string' ? product.images[0] : null
  const soldOut = product.stock <= 0
  const inWishlist = isWishlisted(product.id)
  const hasDiscount = Number(product.discountPrice) > 0
  const attributes = product.attributes ?? {}

  const onAdd = async () => {
    setAdding(true)
    try {
      await addItem(product.id, quantity)
      show(`«${product.name}» — в корзине`)
    } catch (e) {
      show(e instanceof Error ? e.message : 'Не удалось добавить в корзину')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="section">
      <div className="container">
        <nav aria-label="Хлебные крошки" style={{ fontSize: 13.5, color: 'var(--ink-faint)', marginBottom: 22 }}>
          <Link to="/catalog" className="link">Каталог</Link>
          {product.category && (
            <>
              {' '}/ <Link to={`/catalog?category=${product.category.slug}`} className="link">{product.category.name}</Link>
            </>
          )}
        </nav>

        <div className="product-layout">
          <div className="product-media">
            {image ? <img src={image} alt={product.name} /> : <span className="card-media-placeholder">{product.name.slice(0, 2).toUpperCase()}</span>}
          </div>

          <div>
            <p className="eyebrow">Артикул · {product.slug}</p>
            <h1 className="display" style={{ fontSize: 'clamp(26px, 4vw, 42px)', margin: '10px 0 14px' }}>
              {product.name}
            </h1>
            <div className="product-meta">
              <span className="stock-hint stock-ok">{soldOut ? <span className="stock-no">Нет в наличии</span> : `В наличии: ${product.stock} шт.`}</span>
            </div>

            <div className="product-price-row">
              <Price value={hasDiscount ? Number(product.discountPrice) : Number(product.price)} oldValue={hasDiscount ? Number(product.price) : undefined} />
            </div>

            {product.description && <p style={{ color: 'var(--ink-soft)', fontSize: 15.5, margin: '14px 0 0' }}>{product.description}</p>}

            <div className="qty-row">
              <QuantityControl quantity={quantity} onChange={setQuantity} stock={product.stock} disabled={soldOut} />
              <button className="btn btn-primary" style={{ flex: 1, maxWidth: 260 }} disabled={soldOut || adding} onClick={onAdd}>
                {adding ? 'Добавляем…' : soldOut ? 'Нет в наличии' : 'В корзину'}
              </button>
              {user && (
                <button
                  type="button"
                  className={`wishlist-btn ${inWishlist ? 'active' : ''}`}
                  aria-label={inWishlist ? 'Убрать из избранного' : 'В избранное'}
                  onClick={() => void toggle(product)}
                >
                  {inWishlist ? <span className="heart-filled">♥</span> : <span aria-hidden="true">♡</span>}
                </button>
              )}
            </div>

            {Object.keys(attributes).length > 0 && (
              <div className="specs">
                <div className="specs-title">Характеристики</div>
                <dl className="specs-grid">
                  {Object.entries(attributes).map(([key, value]) => (
                    <div key={key} className="spec">
                      <dt>{key}</dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <div className="section" style={{ paddingBottom: 0 }}>
            <div className="section-head">
              <div>
                <p className="eyebrow">Похожие</p>
                <h2 className="section-title display">Вам может подойти</h2>
              </div>
            </div>
            <div className="grid">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
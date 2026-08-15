import { Link } from 'react-router-dom'
import type { Product } from '../lib/api'
import Price from './Price'
import { useWishlist } from '../context/WishlistContext'
import { useAuth } from '../context/AuthContext'

function effectivePrice(product: Product): number {
  const discount = Number(product.discountPrice)
  return Number.isFinite(discount) && discount > 0 ? discount : Number(product.price)
}

export default function ProductCard({ product }: { product: Product }) {
  const { user } = useAuth()
  const { isWishlisted, toggle } = useWishlist()
  const isInWishlist = isWishlisted(product.id)
  const soldOut = product.stock <= 0
  const price = effectivePrice(product)
  const image = Array.isArray(product.images) && typeof product.images[0] === 'string' ? product.images[0] : null

  return (
    <article className="card">
      <Link to={`/catalog/${product.slug}`} className="card-media" tabIndex={-1}>
        {image ? (
          <img src={image} alt={product.name} loading="lazy" />
        ) : (
          <span className="card-media-placeholder" aria-hidden="true">
            {product.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        {soldOut ? (
          <span className="card-badge card-badge--soldout">Нет в наличии</span>
        ) : (
          Number(product.discountPrice) > 0 && (
            <span className="card-badge">
              −{Math.round(((Number(product.price) - Number(product.discountPrice)) / Number(product.price)) * 100)}%
            </span>
          )
        )}
      </Link>
      <div className="card-body">
        {product.category && <div className="card-category">{product.category.name}</div>}
        <h3 className="card-title">
          <Link to={`/catalog/${product.slug}`}>{product.name}</Link>
        </h3>
        <div className="card-footer">
          <Price value={price} oldValue={soldOut ? undefined : Number(product.price)} />
          {user && (
            <button
              type="button"
              className={`wishlist-btn ${isInWishlist ? 'active' : ''}`}
              aria-label={isInWishlist ? 'Убрать из избранного' : 'В избранное'}
              title={isInWishlist ? 'В избранном' : 'В избранное'}
              onClick={(e) => {
                e.preventDefault()
                void toggle(product)
              }}
            >
              {isInWishlist ? <span className="heart-filled">♥</span> : <span aria-hidden="true">♡</span>}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
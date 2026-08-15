import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGetWishlist, type WishlistItem } from '../lib/api'
import EmptyState from '../components/EmptyState'
import Spinner from '../components/Spinner'
import Price from '../components/Price'

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[] | null>(null)

  useEffect(() => {
    apiGetWishlist()
      .then(({ data }) => setItems(data))
      .catch(() => setItems([]))
  }, [])

  if (items === null) return <Spinner />

  return (
    <div className="panel">
      <h2>Избранное</h2>
      {items.length === 0 ? (
        <EmptyState
          icon="♡"
          title="Избранное пусто"
          description="Отмечайте понравившиеся вещи сердечком на карточках."
        />
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {items.map((item) => (
            <div key={item.id} className="card">
              <Link to={`/catalog/${item.product.slug}`} className="card-media" tabIndex={-1}>
                {item.product.image ? (
                  <img src={item.product.image} alt={item.product.name} loading="lazy" />
                ) : (
                  <span className="card-media-placeholder">{item.product.name.slice(0, 2).toUpperCase()}</span>
                )}
              </Link>
              <div className="card-body">
                <h3 className="card-title">
                  <Link to={`/catalog/${item.product.slug}`}>{item.product.name}</Link>
                </h3>
                <div className="card-footer">
                  <Price value={item.product.effectivePrice} oldValue={item.product.discountPrice ? item.product.price : undefined} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
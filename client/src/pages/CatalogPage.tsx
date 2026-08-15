import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiCategories, apiListProducts, type CategoryNode, type Product } from '../lib/api'
import ProductCard from '../components/ProductCard'
import Filters from '../components/Filters'
import Pagination from '../components/Pagination'
import EmptyState from '../components/EmptyState'
import Spinner from '../components/Spinner'

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[] | null>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const search = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const sort = searchParams.get('sort') ?? 'newest'
  const minPriceRaw = searchParams.get('minPrice')
  const maxPriceRaw = searchParams.get('maxPrice')
  const inStock = searchParams.get('inStock') === '1'
  const minPrice = minPriceRaw ? Number(minPriceRaw) : undefined
  const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : undefined

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      apiCategories(),
      apiListProducts({
        page,
        perPage: 12,
        search: search || undefined,
        category: category || undefined,
        sort,
        minPrice,
        maxPrice,
        inStock: inStock || undefined,
      }),
    ])
      .then(([cats, list]) => {
        if (cancelled) return
        setCategories(cats.data)
        setProducts(list.data)
        setTotal(list.meta.total)
        setTotalPages(list.meta.totalPages)
        setLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Не удалось загрузить каталог')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page, search, category, sort, minPrice, maxPrice, inStock])

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    next.delete('page')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="section">
      <div className="container">
        <p className="eyebrow">Каталог</p>
        <h1 className="display section-title" style={{ marginBottom: 24 }}>
          {category ? categories.find((c) => c.slug === category)?.name ?? category : 'Все товары'}
          {search && <span style={{ color: 'var(--ink-faint)' }}> · «{search}»</span>}
        </h1>

        <form
          style={{ display: 'flex', gap: 10, marginBottom: 28, maxWidth: 560 }}
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            const q = new FormData(e.currentTarget).get('q')?.toString() ?? ''
            update({ q: q || null })
          }}
        >
          <input className="input" name="q" defaultValue={search} placeholder="Поиск по названию…" aria-label="Поиск" />
          <button type="submit" className="btn btn-primary">
            Найти
          </button>
        </form>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 28, alignItems: 'start' }}>
          <aside>
            <Filters
              minPrice={minPrice}
              maxPrice={maxPrice}
              inStock={inStock}
              sort={sort}
              onMinPrice={(v) => update({ minPrice: v === undefined ? null : String(v) })}
              onMaxPrice={(v) => update({ maxPrice: v === undefined ? null : String(v) })}
              onInStock={(v) => update({ inStock: v ? '1' : null })}
              onSort={(v) => update({ sort: v })}
            />
            <div className="panel" style={{ marginTop: 22 }}>
              <h2>Категории</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button type="button" className="cat-chip" style={{ textAlign: 'left' }} onClick={() => update({ category: null })}>
                  Все
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className="cat-chip"
                    style={{ textAlign: 'left', ...(category === cat.slug ? { background: 'var(--ink)', color: 'var(--paper)' } : {}) }}
                    onClick={() => update({ category: cat.slug })}
                  >
                    {cat.name}
                    {cat.children && cat.children.length > 0 && ` (${cat.children.length})`}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div>
            {loading ? (
              <Spinner />
            ) : error ? (
              <div className="alert alert-error">{error}</div>
            ) : products && products.length === 0 ? (
              <EmptyState
                icon="ø"
                title="Ничего не нашлось"
                description="Попробуйте изменить фильтры или запрос — но лучше позвоните. Мы почти всегда найдём."
                action={{ label: 'Сбросить фильтры', to: '/catalog' }}
              />
            ) : (
              <>
                <div className="grid">
                  {products?.map((product) => <ProductCard key={product.id} product={product} />)}
                </div>
                <Pagination meta={{ page, perPage: 12, total, totalPages }} page={page} onPage={(p) => update({ page: String(p) })} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
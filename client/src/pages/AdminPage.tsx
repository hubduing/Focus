import { useEffect, useState, type FormEvent } from 'react'
import {
  apiAdminCategories,
  apiAdminCreateCategory,
  apiAdminCreateProduct,
  apiAdminDeleteCategory,
  apiAdminDeleteProduct,
  apiAdminOrders,
  apiAdminProducts,
  apiAdminUpdateCategory,
  apiAdminUpdateOrderStatus,
  apiAdminUpdateProduct,
  type CategoryNode,
  type Order,
  type Product,
} from '../lib/api'
import { STATUS_LABELS } from '../lib/format'
import { useToast } from '../components/Toast'
import EmptyState from '../components/EmptyState'
import Pagination from '../components/Pagination'
import Spinner from '../components/Spinner'

type Tab = 'products' | 'categories' | 'orders'

const ORDER_STATUSES = ['created', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']

const NEXT_STATUS: Record<string, string[]> = {
  created: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

function toEditForm(product: Product) {
  return {
    categoryId: product.categoryId,
    name: product.name,
    slug: product.slug,
    description: product.description ?? '',
    price: Number(product.price).toString(),
    discountPrice: product.discountPrice == null ? '' : Number(product.discountPrice).toString(),
    stock: String(product.stock),
    active: product.active,
    images: Array.isArray(product.images) ? product.images.join('\n') : '',
    attributes: JSON.stringify(product.attributes ?? {}, null, 2),
  }
}

function parseAttributes(raw: string): Record<string, unknown> {
  const trimmed = raw.trim()
  if (!trimmed) return {}
  const value: unknown = JSON.parse(trimmed)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Атрибуты должны быть JSON-объектом, например: {"цвет":"чёрный"}')
  }
  return value as Record<string, unknown>
}

export default function AdminPage() {
  const { show } = useToast()
  const [tab, setTab] = useState<Tab>('products')

  return (
    <div className="section">
      <div className="container">
        <p className="eyebrow">Управление</p>
        <h1 className="display section-title" style={{ marginBottom: 22 }}>
          Админ-панель
        </h1>

        <div className="admin-tabs" role="tablist">
          {(['products', 'categories', 'orders'] as Tab[]).map((t) => (
            <button key={t} role="tab" className={`admin-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'products' ? 'Товары' : t === 'categories' ? 'Категории' : 'Заказы'}
            </button>
          ))}
        </div>

        {tab === 'products' && <ProductsAdmin onToast={show} />}
        {tab === 'categories' && <CategoriesAdmin onToast={show} />}
        {tab === 'orders' && <OrdersAdmin onToast={show} />}
      </div>
    </div>
  )
}

// ---------------- Товары ----------------
function ProductsAdmin({ onToast }: { onToast: (m: string) => void }) {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [meta, setMeta] = useState({ page: 1, perPage: 15, total: 0, totalPages: 0 })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<CategoryNode[]>([])
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [form, setForm] = useState<ReturnType<typeof toEditForm> | null>(null)

  const load = async (p = page, q = search) => {
    const res = await apiAdminProducts({ page: p, perPage: 15, search: q || undefined })
    setProducts(res.data)
    setMeta(res.meta)
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([apiAdminProducts({ page, perPage: 15, search: search || undefined }), apiAdminCategories()])
      .then(([res, cats]) => {
        if (cancelled) return
        setProducts(res.data)
        setMeta(res.meta)
        setCategories(cats.data)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [page, search])

  const openNew = () => {
    setEditing('new')
    setForm({
      categoryId: categories[0]?.id ?? '',
      name: '',
      slug: '',
      description: '',
      price: '',
      discountPrice: '',
      stock: '0',
      active: true,
      images: '',
      attributes: '{}',
    })
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm(toEditForm(p))
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    const payload = {
      categoryId: form.categoryId,
      name: form.name,
      slug: form.slug,
      description: form.description || undefined,
      price: Number(form.price),
      discountPrice: form.discountPrice === '' ? null : Number(form.discountPrice),
      stock: Number(form.stock),
      active: form.active,
      images: form.images.split('\n').map((s) => s.trim()).filter(Boolean),
      attributes: parseAttributes(form.attributes),
    }
    try {
      if (editing === 'new') {
        await apiAdminCreateProduct(payload)
        onToast('Товар создан')
      } else if (editing) {
        await apiAdminUpdateProduct(editing.id, payload)
        onToast('Товар обновлён')
      }
      setEditing(null)
      setForm(null)
      void load()
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Не удалось сохранить')
    }
  }

  const remove = async (p: Product) => {
    if (!window.confirm(`Удалить «${p.name}»?`)) return
    try {
      await apiAdminDeleteProduct(p.id)
      onToast('Товар удалён')
      void load()
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Не удалось удалить')
    }
  }

  if (editing && form) {
    return (
      <div className="panel">
        <h2>{editing === 'new' ? 'Новый товар' : `Редактирование: ${editing.name}`}</h2>
        <form onSubmit={(e) => void save(e)}>
          <div className="field">
            <label className="label">Название</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">Slug</label>
            <input className="input" required pattern="[a-z0-9-]+" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">Категория</label>
            <select className="select" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="label">Цена, ₽</label>
            <input className="input" type="number" min={0} step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">Скидочная цена, ₽ (пусто — нет)</label>
            <input className="input" type="number" min={0} step="0.01" value={form.discountPrice} onChange={(e) => setForm({ ...form, discountPrice: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">Остаток</label>
            <input className="input" type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">Описание</label>
            <textarea className="textarea" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">URL изображений (по одному на строку)</label>
            <textarea className="textarea" rows={3} value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">Характеристики (JSON, например {"{"}"цвет":"чёрный","гарантия":"1 год"{"}"})</label>
            <textarea className="textarea" rows={4} value={form.attributes} onChange={(e) => setForm({ ...form, attributes: e.target.value })} />
          </div>
          <div className="field">
            <label className="label">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                style={{ marginRight: 8, accentColor: 'var(--ember)' }}
              />
              Активен (показывать в каталоге)
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" type="submit">Сохранить</button>
            <button className="btn btn-ghost" type="button" onClick={() => { setEditing(null); setForm(null) }}>
              Отмена
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <input
          className="input"
          style={{ maxWidth: 340 }}
          placeholder="Поиск по названию или slug…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <button className="btn btn-primary" onClick={openNew}>+ Новый товар</button>
      </div>
      {products === null ? (
        <Spinner />
      ) : products.length === 0 ? (
        <EmptyState icon="▣" title="Товаров нет" description="Добавьте первый товар." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Цена</th>
                <th>Остаток</th>
                <th>Активен</th>
                <th align="right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{p.slug}</div>
                  </td>
                  <td>
                    {Number(p.price).toLocaleString('ru-RU')} ₽
                    {p.discountPrice != null && <div style={{ color: 'var(--ember)', fontSize: 12.5 }}>−{Number(p.discountPrice).toLocaleString('ru-RU')} ₽</div>}
                  </td>
                  <td>{p.stock}</td>
                  <td>{p.active ? 'да' : 'нет'}</td>
                  <td>
                    <div className="cell-actions">
                      <button className="btn btn-ghost btn-small" onClick={() => openEdit(p)}>Изменить</button>
                      <button className="btn btn-danger btn-small" onClick={() => void remove(p)}>Удалить</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination meta={meta} page={page} onPage={setPage} />
        </div>
      )}
    </>
  )
}

// ---------------- Категории ----------------
function CategoriesAdmin({ onToast }: { onToast: (m: string) => void }) {
  const [categories, setCategories] = useState<CategoryNode[] | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [parentId, setParentId] = useState('')
  const [editing, setEditing] = useState<CategoryNode | null>(null)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editParentId, setEditParentId] = useState('')

  const load = async () => {
    const { data } = await apiAdminCategories()
    setCategories(data)
  }

  useEffect(() => {
    void load()
  }, [])

  const create = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await apiAdminCreateCategory({ name, slug, parentId: parentId || null })
      onToast('Категория создана')
      setName('')
      setSlug('')
      setParentId('')
      void load()
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Не удалось создать')
    }
  }

  const startEdit = (c: CategoryNode) => {
    setEditing(c)
    setEditName(c.name)
    setEditSlug(c.slug)
    setEditParentId(c.parentId ?? '')
  }

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return
    try {
      await apiAdminUpdateCategory(editing.id, { name: editName, slug: editSlug, parentId: editParentId || null })
      onToast('Категория обновлена')
      setEditing(null)
      void load()
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Не удалось обновить')
    }
  }

  const remove = async (c: CategoryNode) => {
    if (!window.confirm(`Удалить категорию «${c.name}»?`)) return
    try {
      await apiAdminDeleteCategory(c.id)
      onToast('Категория удалена')
      void load()
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Не удалось удалить')
    }
  }

  if (categories === null) return <Spinner />

  const rootCategories = categories.filter((c) => c.parentId === null)

  if (editing) {
    return (
      <div className="panel">
        <h2>Редактирование: {editing.name}</h2>
        <form onSubmit={(e) => void saveEdit(e)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <input className="input" placeholder="Название" required value={editName} onChange={(e) => setEditName(e.target.value)} />
          <input className="input" placeholder="Slug (латиницей)" required pattern="[a-z0-9-]+" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} />
          <select className="select" value={editParentId} onChange={(e) => setEditParentId(e.target.value)}>
            <option value="">Без родителя</option>
            {rootCategories
              .filter((c) => c.id !== editing.id)
              .map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" type="submit">Сохранить</button>
            <button className="btn btn-ghost" type="button" onClick={() => setEditing(null)}>Отмена</button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="panel">
      <h2>Новая категория</h2>
      <form onSubmit={(e) => void create(e)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <input className="input" placeholder="Название" required value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="Slug (латиницей)" required pattern="[a-z0-9-]+" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <select className="select" value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">Без родителя</option>
          {rootCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button className="btn btn-primary" type="submit">Создать</button>
      </form>

      <h2 style={{ marginTop: 28 }}>Существующие</h2>
      {categories.length === 0 ? (
        <EmptyState icon="▰" title="Категорий нет" />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Slug</th>
              <th align="right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.name}</strong>
                  {c.children && c.children.length > 0 && (
                    <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>
                      {c.children.map((ch) => ch.name).join(', ')}
                    </div>
                  )}
                </td>
                <td>{c.slug}</td>
                <td>
                  <div className="cell-actions">
                    <button className="btn btn-ghost btn-small" onClick={() => startEdit(c)}>Изменить</button>
                    <button className="btn btn-danger btn-small" onClick={() => void remove(c)}>Удалить</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ---------------- Заказы ----------------
function OrdersAdmin({ onToast }: { onToast: (m: string) => void }) {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [meta, setMeta] = useState({ page: 1, perPage: 20, total: 0, totalPages: 0 })
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async (p = page, status = statusFilter) => {
    const res = await apiAdminOrders({ page: p, perPage: 20, status: status || undefined })
    setOrders(res.data)
    setMeta(res.meta)
  }

  useEffect(() => {
    let cancelled = false
    apiAdminOrders({ page, perPage: 20, status: statusFilter || undefined })
      .then((res) => {
        if (cancelled) return
        setOrders(res.data)
        setMeta(res.meta)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [page, statusFilter])

  const changeStatus = async (order: Order, status: string) => {
    setBusyId(order.id)
    try {
      await apiAdminUpdateOrderStatus(order.id, status)
      onToast(`Статус заказа → ${STATUS_LABELS[status] ?? status}`)
      void load()
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Не удалось сменить статус')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <label className="label" htmlFor="o-status">Фильтр по статусу</label>
        <select id="o-status" className="select" style={{ maxWidth: 280 }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">Все заказы</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {orders === null ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <EmptyState icon="▤" title="Заказов нет" />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Заказ</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th>Оплата</th>
                <th align="right">Сменить статус</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>#{o.id.slice(0, 8)}</strong>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{new Date(o.createdAt).toLocaleString('ru-RU')}</div>
                  </td>
                  <td>{o.total.toLocaleString('ru-RU')} ₽</td>
                  <td>
                    <span className={`status-chip status-${o.status}`}>{STATUS_LABELS[o.status] ?? o.status}</span>
                  </td>
                  <td>
                    {o.payment ? (
                      <span style={{ fontSize: 13 }}>
                        {o.payment.status === 'succeeded' ? 'оплачен' : 'не оплачен'}
                        {o.payment.provider !== 'offline' ? ` · ${o.payment.provider}` : ''}
                      </span>
                    ) : '—'}
                  </td>
                  {NEXT_STATUS[o.status]?.length > 0 ? (
                    <td>
                      <div className="cell-actions" style={{ justifyContent: 'flex-end' }}>
                        {NEXT_STATUS[o.status].map((s) => (
                          <button
                            key={s}
                            className="btn btn-ghost btn-small"
                            disabled={busyId === o.id}
                            onClick={() => void changeStatus(o, s)}
                          >
                            {STATUS_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    </td>
                  ) : (
                    <td align="right">—</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination meta={meta} page={page} onPage={setPage} />
        </div>
      )}
    </>
  )
}
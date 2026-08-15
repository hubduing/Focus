import { useState } from 'react'

interface FiltersProps {
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  sort: string
  onMinPrice: (v: number | undefined) => void
  onMaxPrice: (v: number | undefined) => void
  onInStock: (v: boolean) => void
  onSort: (v: string) => void
}

export default function Filters({ minPrice, maxPrice, inStock, sort, onMinPrice, onMaxPrice, onInStock, onSort }: FiltersProps) {
  const [localMin, setLocalMin] = useState(minPrice ? String(minPrice) : '')
  const [localMax, setLocalMax] = useState(maxPrice ? String(maxPrice) : '')

  const applyPrice = () => {
    const min = localMin === '' ? undefined : Number(localMin)
    const max = localMax === '' ? undefined : Number(localMax)
    if (min !== undefined && Number.isNaN(min)) return
    if (max !== undefined && Number.isNaN(max)) return
    onMinPrice(min)
    onMaxPrice(max)
  }

  return (
    <div className="panel">
      <h2>Фильтры</h2>
      <div className="field">
        <label className="label" htmlFor="f-min">
          Цена от, ₽
        </label>
        <input
          id="f-min"
          className="input"
          type="number"
          min={0}
          inputMode="numeric"
          value={localMin}
          placeholder="от"
          onChange={(e) => setLocalMin(e.target.value)}
          onBlur={applyPrice}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applyPrice()
          }}
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="f-max">
          Цена до, ₽
        </label>
        <input
          id="f-max"
          className="input"
          type="number"
          min={0}
          inputMode="numeric"
          value={localMax}
          placeholder="до"
          onChange={(e) => setLocalMax(e.target.value)}
          onBlur={applyPrice}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applyPrice()
          }}
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="f-stock">
          <input
            id="f-stock"
            type="checkbox"
            checked={Boolean(inStock)}
            style={{ marginRight: 8, accentColor: 'var(--ember)' }}
            onChange={(e) => onInStock(e.target.checked)}
          />
          Только в наличии
        </label>
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label className="label" htmlFor="f-sort">
          Сортировка
        </label>
        <select id="f-sort" className="select" value={sort} onChange={(e) => onSort(e.target.value)}>
          <option value="newest">Сначала новые</option>
          <option value="price_asc">Сначала дешевле</option>
          <option value="price_desc">Сначала дороже</option>
          <option value="name_asc">По имени (А–Я)</option>
          <option value="name_desc">По имени (Я–А)</option>
        </select>
      </div>
    </div>
  )
}
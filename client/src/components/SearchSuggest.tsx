import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiListProducts, type Product } from '../lib/api'
import { formatPrice } from '../lib/format'

// Поиск-саггест: живой поиск по названию с подсказками пока пользователь печатает.
export default function SearchSuggest() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const timer = useRef<number | undefined>(undefined)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  useEffect(() => {
    const raw = query.trim()
    if (!raw) {
      setSuggestions([])
      setOpen(false)
      return
    }
    if (timer.current) window.clearTimeout(timer.current)
    // дебаунс, чтобы не дёргать API на каждое нажатие
    timer.current = window.setTimeout(() => {
      apiListProducts({ search: raw, perPage: 5 })
        .then((res) => {
          setSuggestions(res.data)
          setOpen(true)
        })
        .catch(() => {
          setSuggestions([])
          setOpen(false)
        })
    }, 220)
  }, [query])

  // закрываем выпадашку при клике вне компонента
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setOpen(false)
    const raw = query.trim()
    if (!raw) return
    navigate(`/catalog?q=${encodeURIComponent(raw)}`)
  }

  const follow = (product: Product) => {
    setOpen(false)
    setQuery('')
    navigate(`/catalog/${product.slug}`)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % suggestions.length)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
      return
    }
    if (e.key === 'Enter' && active >= 0 && suggestions[active]) {
      e.preventDefault()
      follow(suggestions[active])
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="search-suggest" ref={boxRef}>
      <form role="search" className="search-suggest__form" onSubmit={submit}>
        <input
          className="input search-suggest__input"
          type="search"
          value={query}
          placeholder="Поиск…"
          aria-label="Поиск по каталогу"
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(-1)
          }}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true)
          }}
          onKeyDown={onKeyDown}
        />
      </form>

      {open && suggestions.length > 0 && (
        <ul className="suggest-list" role="listbox">
          {suggestions.map((product, index) => (
            <li key={product.id} role="option" aria-selected={index === active} className={index === active ? 'active' : ''}>
              <Link
                to={`/catalog/${product.slug}`}
                className="suggest-item"
                onClick={() => follow(product)}
                onMouseEnter={() => setActive(index)}
              >
                <span className="suggest-name">{product.name}</span>
                <span className="suggest-price">{formatPrice(product.price)}</span>
              </Link>
            </li>
          ))}
          <li className="suggest-footer">
            <Link
              to={`/catalog?q=${encodeURIComponent(query)}`}
              onClick={() => {
                setOpen(false)
              }}
            >
              Все результаты по «{query}» →
            </Link>
          </li>
        </ul>
      )}
    </div>
  )
}
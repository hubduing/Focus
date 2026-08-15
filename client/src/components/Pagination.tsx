import type { Pagination as PaginationMeta } from '../lib/api'

interface PaginationProps {
  meta: PaginationMeta
  page: number
  onPage: (page: number) => void
}

export default function Pagination({ meta, page, onPage }: PaginationProps) {
  if (meta.totalPages <= 1) return null

  const pages: number[] = []
  const total = meta.totalPages
  const start = Math.max(1, Math.min(page - 2, total - 4))
  const end = Math.min(total, start + 4)
  for (let i = start; i <= end; i += 1) pages.push(i)

  return (
    <nav className="pagination" aria-label="Пагинация">
      <button className="page-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Предыдущая страница">
        ←
      </button>
      {pages.map((p) => (
        <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => onPage(p)} aria-current={p === page ? 'page' : undefined}>
          {p}
        </button>
      ))}
      <button
        className="page-btn"
        disabled={page >= total}
        onClick={() => onPage(page + 1)}
        aria-label="Следующая страница"
      >
        →
      </button>
    </nav>
  )
}
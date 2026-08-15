export default function Spinner() {
  return (
    <div className="center-page" role="status" aria-label="Загрузка">
      <div className="spinner" />
    </div>
  )
}

export function BlockLoader() {
  return <div className="spinner" role="status" aria-label="Загрузка" />
}
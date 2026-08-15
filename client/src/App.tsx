import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <h1>Магазин</h1>
      <p>Фронтенд-каркас готов, каталог появится на Этапе 7.</p>
      <button onClick={() => setCount((c) => c + 1)}>count: {count}</button>
    </div>
  )
}
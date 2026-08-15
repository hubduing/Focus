import { useState } from 'react'
import CartBadge from './components/CartBadge'
import { CartProvider } from './context/CartContext'

export default function App() {
  const [count, setCount] = useState(0)
  return (
    <CartProvider>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: '1px solid #e2e2e2',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 18 }}>Магазин</span>
        <CartBadge />
      </header>
      <main style={{ padding: '24px' }}>
        <h1>Магазин</h1>
        <p>Фронтенд-каркас готов, каталог появится на Этапе 7.</p>
        <button onClick={() => setCount((c) => c + 1)}>count: {count}</button>
      </main>
    </CartProvider>
  )
}
import { useEffect, useState } from 'react'
import { apiListOrders, type Order } from '../lib/api'
import OrderCard from '../components/OrderCard'
import EmptyState from '../components/EmptyState'
import Spinner from '../components/Spinner'

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null)

  useEffect(() => {
    let cancelled = false
    apiListOrders({ perPage: 50 })
      .then((res) => {
        if (!cancelled) setOrders(res.data)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  if (orders === null) return <Spinner />

  return (
    <div className="panel">
      <h2>История заказов</h2>
      {orders.length === 0 ? (
        <EmptyState
          icon="▤"
          title="Заказов пока нет"
          description="Когда оформите первый — он появится здесь."
        />
      ) : (
        orders.map((order) => <OrderCard key={order.id} order={order} />)
      )}
    </div>
  )
}
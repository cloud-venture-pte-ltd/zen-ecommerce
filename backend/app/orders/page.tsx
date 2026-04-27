'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Alert from '@/components/Alert'

interface Order {
  id: number
  customer_name: string
  total_amount: number
  status: string
  payment_method: string | null
  payment_reference: string | null
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/login')
      return
    }

    const loadOrders = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setOrders(data)
        } else if (response.status !== 401) {
          setError('Failed to load orders')
        }
      } catch (err: any) {
        setError('Failed to load orders')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [router])

  if (loading) return <div className="text-center">Loading...</div>

  return (
    <>
      <Alert type="danger" message={error} />
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Order History</h1>
        <Link href="/" className="btn btn-outline-secondary">
          Back to Store
        </Link>
      </div>

      {orders.length > 0 ? (
        orders.map((order) => (
          <div key={order.id} className="card shadow-sm mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h2 className="h5 mb-1">Order #{order.id}</h2>
                  <div className="text-muted small">
                    Payment: {order.payment_method || '-'}
                    {order.payment_reference && ` | Ref: ${order.payment_reference}`}
                  </div>
                </div>
                <div className="text-end">
                  <div className="badge text-bg-success">{order.status}</div>
                  <div className="fw-bold mt-2">${order.total_amount.toFixed(2)}</div>
                  <Link
                    href={`/orders/${order.id}`}
                    className="btn btn-sm btn-outline-primary mt-2"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="alert alert-info">You have no orders yet.</div>
      )}
    </>
  )
}

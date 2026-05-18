'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Alert from '@/components/Alert'

interface OrderItem {
  id: number
  product: { name: string }
  quantity: number
  unit_price: number
}

interface Order {
  id: number
  customer_name: string
  customer_email: string
  shipping_address: string
  total_amount: number
  status: string
  payment_method: string | null
  payment_reference: string | null
  items: OrderItem[]
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = parseInt(params.id as string)
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/login')
      return
    }

    const loadOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setOrder(data)
        } else {
          setError('Order not found')
        }
      } catch (err: any) {
        setError('Failed to load order')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadOrder()
  }, [orderId, router])

  if (loading) return <div className="text-center">Loading...</div>
  if (!order) return <Alert type="danger" message={error || 'Order not found'} />

  return (
    <>
      <Alert type="danger" message={error} />
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Order #{order.id}</h1>
        <Link href="/orders" className="btn btn-outline-secondary">
          Back to Orders
        </Link>
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-4">
            <div className="col-md-6">
              <h2 className="h5">Order Information</h2>
              <p className="mb-1">
                <strong>Status:</strong>{' '}
                <span className="badge text-bg-success">{order.status}</span>
              </p>
              <p className="mb-1">
                <strong>Total:</strong> ${order.total_amount.toFixed(2)}
              </p>
              <p className="mb-1">
                <strong>Payment Method:</strong> {order.payment_method || '-'}
              </p>
              <p className="mb-1">
                <strong>Payment Reference:</strong> {order.payment_reference || '-'}
              </p>
            </div>
            <div className="col-md-6">
              <h2 className="h5">Shipping</h2>
              <p className="mb-1">
                <strong>Name:</strong> {order.customer_name}
              </p>
              <p className="mb-1">
                <strong>Email:</strong> {order.customer_email}
              </p>
              <p className="mb-0">
                <strong>Address:</strong>
                <br />
                {order.shipping_address}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <h2 className="h5 mb-3">Items</h2>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Unit Price</th>
                  <th>Qty</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product.name}</td>
                    <td>${item.unit_price.toFixed(2)}</td>
                    <td>{item.quantity}</td>
                    <td>
                      ${(item.unit_price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

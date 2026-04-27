'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Alert from '@/components/Alert'

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  subtotal: number
}

export default function CheckoutPage() {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }

    setUser(JSON.parse(userData))

    const cart = JSON.parse(localStorage.getItem('cart') || '[]')
    if (cart.length === 0) {
      router.push('/cart')
      return
    }

    const withSubtotals = cart.map((item: any) => ({
      ...item,
      subtotal: item.price * item.quantity,
    }))
    setCartItems(withSubtotals)
    setLoading(false)
  }, [router])

  const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const formData = new FormData(e.currentTarget)
      // Add cart items to form data
      formData.append('cart_items_json', JSON.stringify(cartItems))
      
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json()
        setError(err.detail || 'Checkout failed')
        return
      }

      // Clear cart
      localStorage.removeItem('cart')
      router.push('/success')
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="text-center">Loading...</div>
  if (!user) return null

  return (
    <>
      <Alert type="danger" message={error} />
      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card shadow-sm">
            <div className="card-body">
              <h1 className="h3 mb-4">Checkout</h1>
              <form onSubmit={handleSubmit}>
                <h5 className="mb-3">Shipping Details</h5>
                <div className="mb-3">
                  <label className="form-label">Customer Name</label>
                  <input
                    className="form-control"
                    type="text"
                    name="customer_name"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Customer Email</label>
                  <input
                    className="form-control"
                    type="email"
                    name="customer_email"
                    defaultValue={user.email}
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="form-label">Shipping Address</label>
                  <textarea
                    className="form-control"
                    name="shipping_address"
                    rows={4}
                    required
                  ></textarea>
                </div>
                <h5 className="mb-3">Payment (Mock Gateway)</h5>
                <input type="hidden" name="payment_method" value="Card" />
                <div className="mb-3">
                  <label className="form-label">Cardholder Name</label>
                  <input
                    className="form-control"
                    type="text"
                    name="card_name"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Card Number</label>
                  <input
                    className="form-control"
                    type="text"
                    name="card_number"
                    placeholder="4111 1111 1111 1111"
                    required
                  />
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Expiry</label>
                    <input
                      className="form-control"
                      type="text"
                      name="expiry"
                      placeholder="12/29"
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">CVV</label>
                    <input
                      className="form-control"
                      type="text"
                      name="cvv"
                      placeholder="123"
                      required
                    />
                  </div>
                </div>
                <button
                  className="btn btn-success w-100 mt-2"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? 'Processing...' : 'Place Order'}
                </button>
              </form>
            </div>
          </div>
        </div>
        <div className="col-lg-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <h4 className="mb-3">Order Summary</h4>
              {cartItems.map((item) => (
                <div key={item.id} className="d-flex justify-content-between border-bottom py-2">
                  <div>
                    <strong>{item.name}</strong>
                    <br />
                    <small className="text-muted">Qty: {item.quantity}</small>
                  </div>
                  <div>${item.subtotal.toFixed(2)}</div>
                </div>
              ))}
              <div className="d-flex justify-content-between mt-3">
                <strong>Total</strong>
                <strong>${total.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

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
  image_url: string | null
  subtotal: number
}

export default function CartPage() {
  const router = useRouter()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]')
    const withSubtotals = cart.map((item: any) => ({
      ...item,
      subtotal: item.price * item.quantity,
    }))
    setCartItems(withSubtotals)
    setLoading(false)
  }, [])

  const handleUpdateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId)
      return
    }

    const updated = cartItems.map((item) =>
      item.id === productId
        ? { ...item, quantity, subtotal: item.price * quantity }
        : item
    )
    setCartItems(updated)
    localStorage.setItem('cart', JSON.stringify(updated))
  }

  const handleRemoveItem = (productId: number) => {
    const updated = cartItems.filter((item) => item.id !== productId)
    setCartItems(updated)
    localStorage.setItem('cart', JSON.stringify(updated))
  }

  const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0)

  if (loading) return <div className="text-center">Loading...</div>

  if (cartItems.length === 0) {
    return (
      <>
        <div className="alert alert-secondary">Your cart is empty.</div>
        <Link href="/" className="btn btn-primary">
          Continue Shopping
        </Link>
      </>
    )
  }

  return (
    <>
      <Alert type="danger" message={error} />
      <h1 className="h3 mb-4">Your Cart</h1>
      <div className="table-responsive">
        <table className="table align-middle bg-white shadow-sm">
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th style={{ width: '160px' }}>Quantity</th>
              <th>Subtotal</th>
              <th style={{ width: '120px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {cartItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="d-flex align-items-center gap-3">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        className="small-img"
                        alt={item.name}
                      />
                    )}
                    <span>{item.name}</span>
                  </div>
                </td>
                <td>${item.price.toFixed(2)}</td>
                <td>
                  <div className="d-flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateQuantity(item.id, parseInt(e.target.value) || 0)
                      }
                      className="form-control"
                    />
                  </div>
                </td>
                <td>${item.subtotal.toFixed(2)}</td>
                <td>
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleRemoveItem(item.id)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="d-flex justify-content-between align-items-center mt-4">
        <Link href="/" className="btn btn-outline-secondary">
          Continue Shopping
        </Link>
        <div className="text-end">
          <h4>Total: ${total.toFixed(2)}</h4>
          <Link href="/checkout" className="btn btn-success">
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </>
  )
}

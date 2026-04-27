'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { productsAPI, type Product } from '@/lib/services'
import Link from 'next/link'
import Alert from '@/components/Alert'

export default function ProductPage() {
  const params = useParams()
  const router = useRouter()
  const productId = parseInt(params.id as string)
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const res = await productsAPI.getById(productId)
        setProduct(res.data)
        setError('')
      } catch (err: any) {
        setError('Product not found')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [productId])

  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return

    const quantity = parseInt((e.currentTarget as HTMLFormElement).quantity.value) || 1

    if (quantity > product.stock) {
      setError(`Only ${product.stock} item(s) available in stock.`)
      return
    }

    const cartItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity,
      image_url: product.image_url,
      subtotal: product.price * quantity,
    }

    const cart = JSON.parse(localStorage.getItem('cart') || '[]')
    const existing = cart.find((item: any) => item.id === productId)
    
    if (existing) {
      const newQty = existing.quantity + quantity
      if (newQty > product.stock) {
        setError(`Only ${product.stock} item(s) available in stock.`)
        return
      }
      existing.quantity = newQty
      existing.subtotal = existing.price * existing.quantity
    } else {
      cart.push(cartItem)
    }

    localStorage.setItem('cart', JSON.stringify(cart))
    router.push('/cart')
  }

  if (loading) return <div className="text-center">Loading...</div>
  if (!product) return <div className="alert alert-danger">Product not found</div>

  // Local fallback image (gray placeholder with "No Image" text)
  const fallbackImage = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect width='800' height='600' fill='%23e9ecef'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='32' fill='%236c757d' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E`

  return (
    <>
      <Alert type="danger" message={error} />
      <div className="row g-4">
        <div className="col-md-6">
          <img
            src={product.image_url || fallbackImage}
            className="img-fluid rounded shadow-sm"
            alt={product.name}
          />
        </div>
        <div className="col-md-6">
          <h1 className="h2">{product.name}</h1>
          <p className="text-muted">Category: {product.category}</p>
          <p>{product.description}</p>
          <p className="price h4">${product.price.toFixed(2)}</p>
          <p className="text-muted">Stock available: {product.stock}</p>
          <form onSubmit={handleAddToCart} className="row g-3">
            <div className="col-auto">
              <input
                type="number"
                name="quantity"
                min="1"
                defaultValue="1"
                className="form-control"
                required
              />
            </div>
            <div className="col-auto">
              <button className="btn btn-success" type="submit">
                Add to cart
              </button>
            </div>
          </form>
          <Link href="/" className="btn btn-link mt-3 ps-0">
            ← Back to store
          </Link>
        </div>
      </div>
    </>
  )
}

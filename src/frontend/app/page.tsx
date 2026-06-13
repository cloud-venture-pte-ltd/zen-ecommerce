'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { productsAPI, type Product } from '@/lib/services'
import Alert from '@/components/Alert'
import ProductCard from '@/components/ProductCard'

function HomePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const q = searchParams.get('q') || ''

  useEffect(() => {
    const loadProducts = async () => {
      try {
        console.log('Loading products from API')
        const res = await productsAPI.list(q)
        console.log('Products loaded:', res.data)
        setProducts(res.data)
        setError('')
      } catch (err: any) {
        console.error('Failed to load products:', err)
        setError(`Failed to load products: ${err.message || 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [q])

  const handleAddToCart = async (productId: number, quantity: number) => {
    try {
      // Add to localStorage cart
      const product = products.find((p) => p.id === productId)
      if (!product) return

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
        existing.quantity += quantity
        existing.subtotal = existing.price * existing.quantity
      } else {
        cart.push(cartItem)
      }

      localStorage.setItem('cart', JSON.stringify(cart))
      router.push('/cart')
    } catch (err) {
      console.error(err)
      setError('Failed to add to cart')
    }
  }

  if (loading) return <div className="text-center">Loading...</div>

  return (
    <>
      <Alert type="danger" message={error} />
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">Products</h1>
        {q && <span className="text-muted">Search: "{q}"</span>}
      </div>
      <div className="row g-4">
        {products.length === 0 ? (
          <div className="col-12">
            <div className="alert alert-secondary">No products found.</div>
          </div>
        ) : (
          products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
            />
          ))
        )}
      </div>
    </>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="text-center">Loading...</div>}>
      <HomePageContent />
    </Suspense>
  )
}

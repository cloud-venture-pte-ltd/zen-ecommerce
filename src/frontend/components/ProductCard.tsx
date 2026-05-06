'use client'

import Link from 'next/link'
import type { Product } from '@/lib/services'

interface ProductCardProps {
  product: Product
  onAddToCart: (productId: number, quantity: number) => void
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const quantity = parseInt((e.currentTarget as HTMLFormElement).quantity.value) || 1
    onAddToCart(product.id, quantity)
  }

  // Local fallback image (gray placeholder with "No Image" text)
  const fallbackImage = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Crect width='600' height='400' fill='%23e9ecef'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='24' fill='%236c757d' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E`

  return (
    <div className="col-md-4">
      <div className="card product-card h-100 shadow-sm">
        <img
          src={product.image_url || fallbackImage}
          className="card-img-top"
          alt={product.name}
          style={{ height: '220px', objectFit: 'cover' }}
        />
        <div className="card-body d-flex flex-column">
          <h5 className="card-title">{product.name}</h5>
          <p className="text-muted small mb-1">Category: {product.category}</p>
          <p className="card-text">
            {product.description.substring(0, 120)}
            {product.description.length > 120 ? '...' : ''}
          </p>
          <p className="price mb-2" style={{ color: '#198754', fontWeight: '700' }}>
            ${product.price.toFixed(2)}
          </p>
          <p className="small text-muted mb-3">Stock: {product.stock}</p>
          <div className="mt-auto d-flex gap-2">
            <Link href={`/product/${product.id}`} className="btn btn-outline-primary btn-sm">
              View
            </Link>
            <form onSubmit={handleSubmit} className="flex-grow-1">
              <input type="hidden" name="quantity" value="1" />
              <button className="btn btn-success btn-sm w-100" type="submit">
                Add to cart
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

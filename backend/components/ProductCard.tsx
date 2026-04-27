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

  return (
    <div className="col-md-4">
      <div className="card product-card h-100 shadow-sm">
        <img
          src={product.image_url || 'https://via.placeholder.com/600x400?text=No+Image'}
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

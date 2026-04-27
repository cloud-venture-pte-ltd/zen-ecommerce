'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '@/components/Alert'

interface Product {
  id: number
  name: string
  description: string
  price: number
  stock: number
  category: string
  image_url?: string
}

interface Order {
  id: number
  customer_name: string
  total_amount: number
  status: string
}

export default function AdminPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/login')
      return
    }

    const userData = JSON.parse(user)
    if (userData.role !== 'admin') {
      router.push('/')
      return
    }

    loadData()
  }, [router])

  const loadData = async () => {
    try {
      const productsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/products`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
      })

      const ordersResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/orders`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
      })

      if (productsResponse.ok) {
        const productsData = await productsResponse.json()
        setProducts(productsData || [])
      }
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json()
        setOrders(ordersData || [])
      }
    } catch (err: any) {
      setError('Failed to load admin data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const formData = new FormData(e.currentTarget)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
        body: formData,
      })

      if (response.ok) {
        setSuccess('Product added successfully')
        e.currentTarget.reset()
        loadData()
      } else {
        const data = await response.json()
        setError(data.detail || 'Failed to add product')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add product')
      console.error(err)
    }
  }

  const handleEditProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingProduct) return

    setError('')
    setSuccess('')

    try {
      const formData = new FormData(e.currentTarget)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/products/${editingProduct.id}/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
        body: formData,
      })

      if (response.ok) {
        setSuccess('Product updated successfully')
        setShowEditModal(false)
        setEditingProduct(null)
        loadData()
      } else {
        const data = await response.json()
        setError(data.detail || 'Failed to update product')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update product')
      console.error(err)
    }
  }

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/products/${productId}/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
      })

      if (response.ok) {
        setSuccess('Product deleted successfully')
        loadData()
      } else {
        const data = await response.json()
        setError(data.detail || 'Failed to delete product')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete product')
      console.error(err)
    }
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setShowEditModal(true)
  }

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('status', status)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
        },
        body: formData,
      })

      if (response.ok) {
        setSuccess(`Order #${orderId} status updated to ${status}`)
        loadData()
      } else {
        const data = await response.json()
        setError(data.detail || 'Failed to update order status')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update order status')
      console.error(err)
    }
  }

  if (loading) return <div className="text-center">Loading...</div>

  return (
    <>
      <Alert type="danger" message={error} />
      <Alert type="success" message={success} />

      <div className="row mb-5">
        <div className="col-md-8">
          <h2 className="h4 mb-3">Add Product</h2>
          <div className="card shadow-sm">
            <div className="card-body">
              <form onSubmit={handleAddProduct}>
                <div className="mb-3">
                  <label className="form-label">Product Name</label>
                  <input
                    className="form-control"
                    type="text"
                    name="name"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    name="description"
                    rows={3}
                    required
                  ></textarea>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Category</label>
                    <input
                      className="form-control"
                      type="text"
                      name="category"
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Price</label>
                    <input
                      className="form-control"
                      type="number"
                      name="price"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">Stock</label>
                  <input
                    className="form-control"
                    type="number"
                    name="stock"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Image URL</label>
                  <input
                    className="form-control"
                    type="text"
                    name="image_url"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Or Upload Image</label>
                  <input
                    className="form-control"
                    type="file"
                    name="image_file"
                    accept="image/*"
                  />
                </div>
                <button className="btn btn-success w-100" type="submit">
                  Add Product
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <h2 className="h4 mb-3">Products ({products.length})</h2>
          <div className="table-responsive">
            <table className="table table-striped table-sm">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.id}</td>
                    <td>{product.name}</td>
                    <td>{product.category}</td>
                    <td>${product.price.toFixed(2)}</td>
                    <td>{product.stock}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-primary me-2"
                        onClick={() => openEditModal(product)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Product</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowEditModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleEditProduct}>
                  <div className="mb-3">
                    <label className="form-label">Product Name</label>
                    <input
                      className="form-control"
                      type="text"
                      name="name"
                      defaultValue={editingProduct.name}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      name="description"
                      rows={3}
                      defaultValue={editingProduct.description}
                      required
                    ></textarea>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Category</label>
                      <input
                        className="form-control"
                        type="text"
                        name="category"
                        defaultValue={editingProduct.category}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Price</label>
                      <input
                        className="form-control"
                        type="number"
                        name="price"
                        step="0.01"
                        defaultValue={editingProduct.price}
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Stock</label>
                    <input
                      className="form-control"
                      type="number"
                      name="stock"
                      defaultValue={editingProduct.stock}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Image URL</label>
                    <input
                      className="form-control"
                      type="text"
                      name="image_url"
                      defaultValue={editingProduct.image_url || ''}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Or Upload New Image</label>
                    <input
                      className="form-control"
                      type="file"
                      name="image_file"
                      accept="image/*"
                    />
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowEditModal(false)}
                    >
                      Cancel
                    </button>
                    <button className="btn btn-primary" type="submit">
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row mt-5">
        <div className="col-12">
          <h2 className="h4 mb-3">Recent Orders ({orders.length})</h2>
          <div className="table-responsive">
            <table className="table table-striped table-sm">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.customer_name}</td>
                    <td>${order.total_amount.toFixed(2)}</td>
                    <td>
                      <span className={`badge ${
                        order.status === 'Delivered' ? 'text-bg-success' :
                        order.status === 'Cancelled' ? 'text-bg-danger' :
                        order.status === 'Shipped' ? 'text-bg-info' :
                        order.status === 'Paid' ? 'text-bg-primary' :
                        'text-bg-warning'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={order.status}
                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                        style={{ width: '150px', display: 'inline-block' }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
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

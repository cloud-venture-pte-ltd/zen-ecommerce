import api from './api'

export interface User {
  id: number
  name: string
  email: string
  role: 'customer' | 'admin'
}

export interface AuthResponse {
  user: User
  token: string
}

export interface Product {
  id: number
  name: string
  description: string
  price: number
  image_url: string | null
  stock: number
  category: string
}

export interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  image_url: string | null
  subtotal?: number
}

export interface OrderItem {
  id: number
  product_id: number
  product: Product
  quantity: number
  unit_price: number
}

export interface Order {
  id: number
  customer_name: string
  customer_email: string
  shipping_address: string
  total_amount: number
  status: string
  payment_method: string | null
  payment_reference: string | null
  items: OrderItem[]
  created_at: string
}

// Auth API
export const authAPI = {
  register: (name: string, email: string, password: string) =>
    api.post<AuthResponse>('/api/register', { name, email, password }),

  login: (email: string, password: string) =>
    api.post<AuthResponse>('/api/login', { email, password }),

  logout: () => api.post('/api/logout'),
}

// Products API
export const productsAPI = {
  list: (q?: string) =>
    api.get<Product[]>('/api/products', { params: { q } }),

  getById: (id: number) =>
    api.get<Product>(`/api/products/${id}`),
}

// Cart API
export const cartAPI = {
  add: (productId: number, quantity: number) =>
    api.post(`/api/cart/add/${productId}`, { quantity }),

  get: () =>
    api.get<CartItem[]>('/api/cart'),

  update: (productId: number, quantity: number) =>
    api.post(`/api/cart/update/${productId}`, { quantity }),

  remove: (productId: number) =>
    api.post(`/api/cart/remove/${productId}`),
}

// Orders API
export const ordersAPI = {
  list: () =>
    api.get<Order[]>('/api/orders'),

  getById: (id: number) =>
    api.get<Order>(`/api/orders/${id}`),

  checkout: (
    customerName: string,
    customerEmail: string,
    shippingAddress: string,
    cardName: string,
    cardNumber: string,
    expiry: string,
    cvv: string
  ) =>
    api.post('/api/checkout', {
      customer_name: customerName,
      customer_email: customerEmail,
      shipping_address: shippingAddress,
      card_name: cardName,
      card_number: cardNumber,
      expiry,
      cvv,
    }),
}

// Admin API
export const adminAPI = {
  getProducts: () =>
    api.get<Product[]>('/api/admin/products'),

  addProduct: (formData: FormData) =>
    api.post('/api/admin/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getOrders: () =>
    api.get<Order[]>('/api/admin/orders'),

  updateOrderStatus: (orderId: number, status: string) =>
    api.post(`/api/admin/orders/${orderId}/status`, { status }),
}
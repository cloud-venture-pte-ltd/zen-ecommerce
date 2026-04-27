import { useState, useEffect } from 'react'
import type { User } from './services'

// Custom event for auth state changes within the same tab
const AUTH_CHANGE_EVENT = 'auth-change'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('user')
      }
    }
    setLoading(false)

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        if (e.newValue) {
          try {
            setUser(JSON.parse(e.newValue))
          } catch {
            setUser(null)
          }
        } else {
          setUser(null)
        }
      }
    }

    // Listen for custom auth change events from same tab
    const handleAuthChange = (e: CustomEvent) => {
      const stored = localStorage.getItem('user')
      if (stored) {
        try {
          setUser(JSON.parse(stored))
        } catch {
          setUser(null)
        }
      } else {
        setUser(null)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener(AUTH_CHANGE_EVENT as any, handleAuthChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener(AUTH_CHANGE_EVENT as any, handleAuthChange)
    }
  }, [])

  const login = (userData: User, token: string) => {
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('auth_token', token)
    setUser(userData)
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT))
  }

  const logout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('auth_token')
    setUser(null)
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT))
  }

  return { user, loading, login, logout }
}

export const useCart = () => {
  const [cart, setCart] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('cart')
    if (stored) {
      try {
        setCart(JSON.parse(stored))
      } catch {
        setCart([])
      }
    }
    setLoading(false)
  }, [])

  const addItem = (item: any) => {
    const existing = cart.find((i) => i.id === item.id)
    let updated
    if (existing) {
      updated = cart.map((i) =>
        i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
      )
    } else {
      updated = [...cart, item]
    }
    setCart(updated)
    localStorage.setItem('cart', JSON.stringify(updated))
  }

  const updateItem = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
    } else {
      const updated = cart.map((i) =>
        i.id === productId ? { ...i, quantity } : i
      )
      setCart(updated)
      localStorage.setItem('cart', JSON.stringify(updated))
    }
  }

  const removeItem = (productId: number) => {
    const updated = cart.filter((i) => i.id !== productId)
    setCart(updated)
    localStorage.setItem('cart', JSON.stringify(updated))
  }

  const clear = () => {
    setCart([])
    localStorage.removeItem('cart')
  }

  const count = cart.reduce((sum, item) => sum + item.quantity, 0)
  const total = cart.reduce((sum, item) => sum + item.subtotal, 0)

  return { cart, loading, addItem, updateItem, removeItem, clear, count, total }
}

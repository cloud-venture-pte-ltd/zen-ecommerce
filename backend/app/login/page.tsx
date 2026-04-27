'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Alert from '@/components/Alert'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      router.push('/')
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const formData = new FormData(e.currentTarget)
      const apiUrl = '/api/login'
      console.log('Attempting login to:', apiUrl)
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      })

      console.log('Login response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Login successful:', data)
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('auth_token', data.token || '')
        // Dispatch auth change event to update header
        window.dispatchEvent(new CustomEvent('auth-change'))
        // Redirect admin to admin dashboard, others to home
        if (data.user?.role === 'admin') {
          router.push('/admin')
        } else {
          router.push('/')
        }
      } else {
        const errorText = await response.text()
        console.error('Login failed:', response.status, errorText)
        setError(`Login failed: ${response.status} - ${errorText}`)
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSeedAdmin = async () => {
    try {
      const response = await fetch('/api/admin/seed-admin', {
        method: 'POST',
      })
      if (response.ok) {
        setError('')
        alert('Admin account seeded. Use admin@example.com / change-me')
      }
    } catch (err: any) {
      console.error(err)
    }
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-5">
        <div className="card shadow-sm">
          <div className="card-body">
            <h1 className="h3 mb-4">Login</h1>
            <Alert type="danger" message={error} />
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  type="email"
                  name="email"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  className="form-control"
                  type="password"
                  name="password"
                  required
                />
              </div>
              <button
                className="btn btn-primary w-100"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <hr />
            <button
              className="btn btn-outline-secondary w-100"
              onClick={handleSeedAdmin}
              type="button"
            >
              Seed default admin account
            </button>
            <p className="mt-3 mb-0">
              No account yet?{' '}
              <Link href="/register">Register here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

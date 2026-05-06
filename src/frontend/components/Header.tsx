'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/hooks'

export default function Header() {
  const { user } = useAuth()

  const handleLogout = async () => {
    localStorage.removeItem('user')
    localStorage.removeItem('auth_token')
    window.location.href = '/login'
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
      <div className="container">
        <Link className="navbar-brand fw-bold" href="/">
          Zen E-Commerce
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navMain"
          aria-controls="navMain"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navMain">
          <form className="d-flex ms-lg-3 my-3 my-lg-0" method="GET" action="/">
            <input
              className="form-control me-2"
              type="search"
              name="q"
              placeholder="Search products"
            />
            <button className="btn btn-outline-light" type="submit">
              Search
            </button>
          </form>

          <ul className="navbar-nav ms-auto align-items-lg-center">
            <li className="nav-item">
              <Link className="nav-link" href="/cart">
                Cart (0)
              </Link>
            </li>

            {user ? (
              <>
                <li className="nav-item">
                  <Link className="nav-link" href="/orders">
                    My Orders
                  </Link>
                </li>

                {user.role === 'admin' && (
                  <li className="nav-item">
                    <Link className="nav-link" href="/admin">
                      Admin
                    </Link>
                  </li>
                )}

                <li className="nav-item">
                  <span className="nav-link">Hi, {user.name}</span>
                </li>

                <li className="nav-item">
                  <button
                    className="btn btn-outline-light btn-sm ms-lg-2"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="nav-link" href="/login">
                    Login
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="btn btn-outline-light btn-sm ms-lg-2" href="/register">
                    Register
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  )
}

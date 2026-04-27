'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SuccessPage() {
  const router = useRouter()
  const [orderData, setOrderData] = useState<any>(null)

  useEffect(() => {
    // In a real app, this would come from the API response
    // For now, we'll show a generic success message
    setOrderData({
      orderId: Math.floor(Math.random() * 100000),
      total: 'Contact support for details',
    })
  }, [])

  if (!orderData) return <div className="text-center">Loading...</div>

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <div
          className="card shadow-sm border-success"
          style={{ borderWidth: '2px' }}
        >
          <div className="card-body text-center">
            <h1 className="h2 text-success mb-3">Order Placed Successfully</h1>
            <p className="lead">Thank you for your purchase.</p>
            <div className="mt-4 text-start">
              <p>
                <strong>Order ID:</strong> {orderData.orderId}
              </p>
              <p>
                <strong>Total Paid:</strong> {orderData.total}
              </p>
              <p>
                <strong>Payment Provider:</strong> Mock Gateway
              </p>
            </div>
            <Link href="/" className="btn btn-primary mt-3">
              Back to Store
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

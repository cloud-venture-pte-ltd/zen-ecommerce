'use client'

interface AlertProps {
  type: 'success' | 'danger' | 'warning' | 'info'
  message: string
}

export default function Alert({ type, message }: AlertProps) {
  if (!message) return null
  return <div className={`alert alert-${type}`}>{message}</div>
}

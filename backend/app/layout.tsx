import type { Metadata } from 'next'
import 'bootstrap/dist/css/bootstrap.min.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Zen E-Commerce',
  description: 'Zen E-Commerce built with Next.js and FastAPI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
        <style>{`
          body { background: #f8f9fa; }
          .product-card img { height: 220px; object-fit: cover; }
          .small-img { width: 72px; height: 72px; object-fit: cover; border-radius: 8px; border: 1px solid #dee2e6; }
          .price { color: #198754; font-weight: 700; }
          .logout-form { margin: 0; }
        `}</style>
      </head>
      <body>
        <Header />
        <div className="container my-4">{children}</div>
        <Footer />
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
      </body>
    </html>
  )
}

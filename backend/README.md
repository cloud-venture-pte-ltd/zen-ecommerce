# Zen E-Commerce Frontend

Next.js + React frontend for Zen E-Commerce. Replaces Jinja2 templates from the original FastAPI backend.

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For production deployment on Azure:

```
NEXT_PUBLIC_API_URL=https://<backend-hostname>/api
```

## Architecture

- **Frontend:** Next.js 14 + React 18
- **Backend:** FastAPI (Python) - runs separately on port 8000
- **State Management:** localStorage for cart, React Context/hooks for user auth
- **API Communication:** Axios with interceptors for token management

## Pages

- `/` - Home / Product listing
- `/product/[id]` - Product detail
- `/cart` - Shopping cart
- `/checkout` - Order checkout
- `/orders` - Order history
- `/orders/[id]` - Order details
- `/login` - User login
- `/register` - User registration
- `/admin` - Admin dashboard (products, orders)
- `/success` - Order success page

## Components

- `Header` - Navigation bar with search, cart count, user menu
- `Footer` - Footer with copyright
- `Alert` - Alert component for errors/success
- `ProductCard` - Product grid card

## Hooks

- `useAuth()` - User authentication state
- `useCart()` - Shopping cart management

## API Integration

All API calls go to the FastAPI backend. The API URL is configured via `NEXT_PUBLIC_API_URL` environment variable.

### Authentication Flow

1. User logs in/registers
2. Backend returns user object + token
3. Token stored in localStorage
4. Token added to Authorization header for protected requests
5. On 401, token cleared and redirected to login

### Cart Management

Shopping cart is stored in localStorage as an array of items. Each item has:
- `id` - Product ID
- `name` - Product name
- `price` - Unit price
- `quantity` - Quantity in cart
- `image_url` - Product image
- `subtotal` - price * quantity

## Deployment

See root `.azure/deployment-plan.md` for Azure deployment instructions.

### Docker Build

```bash
docker build -f frontend/Dockerfile -t zen-ecommerce-frontend:latest .
```

### Docker Run

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://backend:8000 \
  zen-ecommerce-frontend:latest
```

## Development Notes

- FastAPI backend must be running on port 8000 for API calls to work
- CORS is configured on the FastAPI backend to allow requests from this frontend
- Cart persists across page reloads via localStorage
- User authentication state also persists via localStorage

## License

MIT

# Zen Eshop

A Linux friendly proof of concept using containers:
- **Web:** Node.js + Express + EJS + Bootstrap
- **Database:** MySQL 8
- **Features:** product catalog, search, cart, user registration/login, mock card checkout, admin dashboard, product image upload

## What this version adds

- Demo card payment flow with mock payment reference
- Product image upload from your local machine
- Uploaded images persisted through a Docker bind mount
- Order records now include payment method and payment reference
- Basic stock decrement after successful checkout

## Project Structure

```text
zen-eshop/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── package.json
├── server.js
├── sql/
│   └── init.sql
├── public/
│   ├── css/styles.css
│   └── uploads/
└── views/
```

## Start on Ubuntu

```bash
unzip zen-eshop.zip
cd zen-eshop
cp .env.example .env
docker compose up -d --build
```

## Open in browser

- Storefront: http://localhost:3000
- Login: http://localhost:3000/login
- Admin: http://localhost:3000/admin

## Default admin

1. Open `/login`
2. Click **Seed default admin account**
3. Login with:

```text
Email: admin@example.com
Password: Admin@123
```

## Demo payment

- This version uses `PAYMENT_PROVIDER=mock`
- No real payment gateway is called
- Enter any card number with at least 12 digits
- A mock payment reference is generated and saved with the order

## Product image upload

From the admin page, either:
- upload an image file from your Ubuntu machine, or
- paste a remote image URL

Uploaded files are stored in:

```text
./public/uploads
```

and mounted into the container so they stay available between restarts.

## MySQL connection from host

```text
Host: 127.0.0.1
Port: 3307
Database: ecommerce_db
User: ecom_user
Password: ecom_pass
```

## Common commands

```bash
docker compose logs -f
docker compose ps
docker compose down
docker compose down -v   # remove containers + volume
```

## Notes

- This is a learning/demo environment, not production-hardened.
- Payment is simulated for local testing.
- For production, add CSRF protection, stricter validation, rate limiting, HTTPS, image scanning, object storage, real payment integration, stock locking, and stronger admin security.

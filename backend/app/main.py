import time
import json
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Optional
from sqlalchemy.orm import joinedload
from fastapi import FastAPI, Request, Depends, Form, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware

from app.auth import hash_password, verify_password
from app.core.config import settings
from app.db import Base, SessionLocal, engine, get_db
from app.models import Order, OrderItem, Product, User

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Zen E-Commerce built with FastAPI and PostgreSQL",
)

# Add CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "http://192.168.13.208:3000",
        "http://192.168.13.208:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key=settings.session_secret, max_age=60 * 60 * 24)

BASE_DIR = Path(__file__).resolve().parent
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"
UPLOADS_DIR = STATIC_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

templates = Jinja2Templates(directory=str(TEMPLATES_DIR))


def path_with_base(path: str = "/") -> str:
    if not settings.base_path:
        return path
    if path == "/":
        return f"{settings.base_path}/"
    if path.startswith("/"):
        return f"{settings.base_path}{path}"
    return f"{settings.base_path}/{path}"


app.mount(path_with_base("/static"), StaticFiles(directory=str(STATIC_DIR)), name="static")


def seed_admin_if_missing(db: Session) -> None:
    existing = db.query(User).filter(User.email == settings.admin_email).first()
    if not existing:
        db.add(
            User(
                name="Admin",
                email=settings.admin_email,
                password_hash=hash_password(settings.admin_password),
                role="admin",
            )
        )
        db.commit()


def seed_products_if_missing(db: Session) -> None:
    if db.query(Product).count() > 0:
        return
    products = [
        Product(
            name="Wireless Headphones",
            description="Comfortable wireless headphones with good battery life.",
            price=Decimal("89.90"),
            category="Audio",
            stock=15,
            image_url="https://images.unsplash.com/photo-1594215741864-6024bef4f3e3?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fHdpcmVsZXNzJTIwaGVhcmRwaG9uZXxlbnwwfHwwfHx8MA%3D%3D",
        ),
        Product(
            name="Mechanical Keyboard",
            description="Compact mechanical keyboard with tactile switches.",
            price=Decimal("129.00"),
            category="Accessories",
            stock=8,
            image_url="https://images.unsplash.com/photo-1771370580887-d41ae6d1d6ed?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8Y29tcHV0ZXIlMjBhY2Nlc3NvcmllcyUyMGtleWJvYXJkfGVufDB8fDB8fHww",
        ),
        Product(
            name="4K Monitor",
            description="27-inch 4K display suitable for work and entertainment.",
            price=Decimal("399.00"),
            category="Displays",
            stock=5,
            image_url="https://images.unsplash.com/photo-1570485071395-29b575ea3b4e?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8bW9uaXRvcnxlbnwwfHwwfHx8MA%3D%3D",
        ),
    ]
    db.add_all(products)
    db.commit()


def get_or_create_cart(request: Request):
    cart = request.session.get("cart")
    if cart is None:
        request.session["cart"] = []
        cart = request.session["cart"]
    return cart


def calculate_cart(cart):
    return [
        {**item, "subtotal": float(item["price"]) * int(item["quantity"])}
        for item in cart
    ]


def current_user(request: Request) -> Optional[dict]:
    return request.session.get("user")


def render(request: Request, template_name: str, context: Optional[dict] = None):
    if context is None:
        context = {}

    full_context = {
        "request": request,
        "app_name": settings.app_name or "Zen E-Commerce",
        "base_path": settings.base_path,
        "path_with_base": path_with_base,
        "current_user": request.session.get("user"),
        "cart_count": sum(int(item.get("quantity", 0)) for item in request.session.get("cart", [])),
        "current_year": datetime.now().year,
        **context,
    }

    return templates.TemplateResponse(
        request=request,
        name=template_name,
        context=full_context,
    )

def require_auth(request: Request):
    user = current_user(request)
    if not user:
        raise HTTPException(status_code=303, headers={"Location": path_with_base("/login")})
    return user


def require_admin(request: Request):
    user = current_user(request)
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return user


# Token-based auth for API endpoints
def get_current_user_from_token(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    
    # Extract token from "Bearer <token>"
    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    
    token = parts[1]
    # Our mock tokens are in format "mock-token-{user_id}"
    if token.startswith("mock-token-"):
        try:
            user_id = int(token.split("-")[-1])
            return db.get(User, user_id)
        except (ValueError, IndexError):
            return None
    return None


def require_api_auth(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_token(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}


def require_api_admin(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_token(request, db)
    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}


def save_upload(file: UploadFile) -> str:
    suffix = Path(file.filename or "upload.bin").suffix
    safe_name = f"{int(time.time() * 1000)}{suffix}"
    target = UPLOADS_DIR / safe_name
    with target.open("wb") as f:
        f.write(file.file.read())
    return path_with_base(f"/static/uploads/{safe_name}")


@app.on_event("startup")
def on_startup():
    connected = False
    last_error = None
    for _ in range(20):
        try:
            Base.metadata.create_all(bind=engine)
            with SessionLocal() as db:
                seed_admin_if_missing(db)
                seed_products_if_missing(db)
            connected = True
            break
        except Exception as exc:
            last_error = exc
            time.sleep(3)
    if not connected:
        raise RuntimeError(f"Unable to connect to PostgreSQL: {last_error}")


#@app.get("/", include_in_schema=False)
#def root_redirect():
#    return RedirectResponse(url=path_with_base("/"), status_code=302)

@app.get("/", response_class=HTMLResponse)
def root_home(request: Request, q: str = "", db: Session = Depends(get_db)):
    if settings.base_path:
        return RedirectResponse(url=path_with_base("/"), status_code=302)

    products = db.query(Product).order_by(Product.id.asc()).all()
    return render(request, "index.html", {"products": products, "q": q})

@app.get(path_with_base("/"), response_class=HTMLResponse)
def home(request: Request, q: str = "", db: Session = Depends(get_db)):
    if q:
        products = (
            db.query(Product)
            .filter(
                or_(
                    Product.name.ilike(f"%{q}%"),
                    Product.description.ilike(f"%{q}%"),
                    Product.category.ilike(f"%{q}%"),
                )
            )
            .order_by(Product.id.asc())
            .all()
        )
    else:
        products = db.query(Product).order_by(Product.id.asc()).all()
    return render(request, "index.html", {"products": products, "q": q})


@app.get(path_with_base("/product/{product_id}"), response_class=HTMLResponse)
def product_detail(product_id: int, request: Request, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return render(request, "product.html", {"product": product})


@app.post(path_with_base("/cart/add/{product_id}"))
def add_to_cart(product_id: int, request: Request, quantity: int = Form(1), db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    qty = max(1, int(quantity))

    if product.stock <= 0:
        return render(
            request,
            "product.html",
            {
                "product": product,
                "error": "This product is out of stock.",
            },
        )

    cart = get_or_create_cart(request)
    existing = next((item for item in cart if item["id"] == product.id), None)
    current_qty_in_cart = existing["quantity"] if existing else 0
    requested_total = current_qty_in_cart + qty

    if requested_total > product.stock:
        return render(
            request,
            "product.html",
            {
                "product": product,
                "error": f"Only {product.stock} item(s) available in stock.",
            },
        )

    if existing:
        existing["quantity"] = requested_total
    else:
        cart.append(
            {
                "id": product.id,
                "name": product.name,
                "price": float(product.price),
                "quantity": qty,
                "image_url": product.image_url,
            }
        )

    request.session["cart"] = cart
    return RedirectResponse(url=path_with_base("/cart"), status_code=303)

@app.get(path_with_base("/cart"), response_class=HTMLResponse)
def cart_page(request: Request):
    cart_items = calculate_cart(get_or_create_cart(request))
    total = sum(item["subtotal"] for item in cart_items)
    return render(request, "cart.html", {"cart_items": cart_items, "total": total})


@app.post(path_with_base("/cart/update/{product_id}"))
def update_cart(product_id: int, request: Request, quantity: int = Form(...), db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if quantity <= 0:
        request.session["cart"] = [item for item in get_or_create_cart(request) if item["id"] != product_id]
        return RedirectResponse(url=path_with_base("/cart"), status_code=303)

    if quantity > product.stock:
        cart_items = calculate_cart(get_or_create_cart(request))
        total = sum(item["subtotal"] for item in cart_items)
        return render(
            request,
            "cart.html",
            {
                "cart_items": cart_items,
                "total": total,
                "error": f"Only {product.stock} item(s) available for {product.name}.",
            },
        )

    updated = []
    for item in get_or_create_cart(request):
        if item["id"] == product_id:
            item["quantity"] = quantity
        updated.append(item)

    request.session["cart"] = updated
    return RedirectResponse(url=path_with_base("/cart"), status_code=303)

@app.post(path_with_base("/cart/remove/{product_id}"))
def remove_cart_item(product_id: int, request: Request):
    request.session["cart"] = [item for item in get_or_create_cart(request) if item["id"] != product_id]
    return RedirectResponse(url=path_with_base("/cart"), status_code=303)

@app.get(path_with_base("/checkout"), response_class=HTMLResponse)
def checkout_get(request: Request):
    user = current_user(request)
    if not user:
        return RedirectResponse(url=path_with_base("/login"), status_code=303)

    cart_items = calculate_cart(get_or_create_cart(request))
    if not cart_items:
        return RedirectResponse(url=path_with_base("/cart"), status_code=303)

    total = sum(item["subtotal"] for item in cart_items)

    return render(
        request,
        "checkout.html",
        {
            "cart_items": cart_items,
            "total": total,
            "error": None,
            "payment_provider": settings.payment_provider,
        },
    )

@app.get(path_with_base("/register"), response_class=HTMLResponse)
def register_get(request: Request):
    return render(request, "register.html", {"error": None})


@app.post(path_with_base("/register"), response_class=HTMLResponse)
def register_post(
    request: Request,
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return render(request, "register.html", {"error": "Email already registered."})
    db.add(User(name=name, email=email, password_hash=hash_password(password), role="customer"))
    db.commit()
    return RedirectResponse(url=path_with_base("/login"), status_code=303)


@app.get(path_with_base("/login"), response_class=HTMLResponse)
def login_get(request: Request):
    return render(request, "login.html", {"error": None})


@app.post(path_with_base("/login"), response_class=HTMLResponse)
def login_post(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        return render(request, "login.html", {"error": "Invalid credentials."})
    request.session["user"] = {"id": user.id, "name": user.name, "email": user.email, "role": user.role}
    return RedirectResponse(url=path_with_base("/"), status_code=303)


@app.post(path_with_base("/logout"))
def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url=path_with_base("/"), status_code=303)


@app.post(path_with_base("/admin/seed-admin"))
def seed_admin(request: Request, db: Session = Depends(get_db)):
    seed_admin_if_missing(db)
    return RedirectResponse(url=path_with_base("/login"), status_code=303)


@app.post(path_with_base("/checkout"), response_class=HTMLResponse)
def checkout_post(
    request: Request,
    customer_name: str = Form(...),
    customer_email: str = Form(...),
    shipping_address: str = Form(...),
    card_name: str = Form(...),
    card_number: str = Form(...),
    expiry: str = Form(...),
    cvv: str = Form(...),
    db: Session = Depends(get_db),
):
    require_auth(request)
    user = current_user(request)
    if not user:
        return RedirectResponse(url=path_with_base("/login"), status_code=303)

    customer_email = user["email"]
    cart_items = calculate_cart(get_or_create_cart(request))
    if not cart_items:
        return RedirectResponse(url=path_with_base("/cart"), status_code=303)

    total = sum(item["subtotal"] for item in cart_items)
    if not all([customer_name, customer_email, shipping_address, card_name, card_number, expiry, cvv]):
        return render(
            request,
            "checkout.html",
            {
                "cart_items": cart_items,
                "total": total,
                "error": "All shipping and payment fields are required.",
                "payment_provider": settings.payment_provider,
            },
        )

    card_digits = "".join(ch for ch in card_number if ch.isdigit())
    if len(card_digits) < 12:
        return render(
            request,
            "checkout.html",
            {
                "cart_items": cart_items,
                "total": total,
                "error": "Enter a valid demo card number.",
                "payment_provider": settings.payment_provider,
            },
        )

    payment_reference = generate_mock_reference()
    order = Order(
        customer_name=customer_name,
        customer_email=customer_email,
        shipping_address=shipping_address,
        total_amount=Decimal(str(total)),
        status="Paid (Mock Gateway)",
        payment_method="Card",
        payment_reference=payment_reference,
    )
    db.add(order)
    db.flush()

    for item in cart_items:
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=item["id"],
                quantity=int(item["quantity"]),
                unit_price=Decimal(str(item["price"])),
            )
        )
        product = db.get(Product, item["id"])
        if product and product.stock >= int(item["quantity"]):
            product.stock -= int(item["quantity"])

    db.commit()
    request.session["cart"] = []
    return render(
        request,
        "success.html",
        {
            "order_id": order.id,
            "total": total,
            "payment_reference": payment_reference,
            "payment_provider": settings.payment_provider,
        },
    )

@app.get(path_with_base("/orders"), response_class=HTMLResponse)
def order_history(request: Request, db: Session = Depends(get_db)):
    user = current_user(request)
    if not user:
        return RedirectResponse(url=path_with_base("/login"), status_code=303)

    orders = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.customer_email == user["email"])
        .order_by(Order.id.desc())
        .all()
    )

    return render(request, "orders.html", {"orders": orders})
def generate_mock_reference():
    return f"MOCKPAY-{int(time.time())}-{int(time.time() * 1000) % 100000}"

@app.get(path_with_base("/orders/{order_id}"), response_class=HTMLResponse)
def order_detail(order_id: int, request: Request, db: Session = Depends(get_db)):
    user = current_user(request)
    if not user:
        return RedirectResponse(url=path_with_base("/login"), status_code=303)

    order = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == order_id)
        .first()
    )

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if user["role"] != "admin" and order.customer_email != user["email"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    return render(request, "order_detail.html", {"order": order})

@app.post(path_with_base("/checkout"), response_class=HTMLResponse)
def checkout_post(
    request: Request,
    customer_name: str = Form(...),
    customer_email: str = Form(...),
    shipping_address: str = Form(...),
    card_name: str = Form(...),
    card_number: str = Form(...),
    expiry: str = Form(...),
    cvv: str = Form(...),
    db: Session = Depends(get_db),
):
    require_auth(request)
    user = current_user(request)
    if not user:
        return RedirectResponse(url=path_with_base("/login"), status_code=303)

    customer_email = user["email"]
    cart_items = calculate_cart(get_or_create_cart(request))
    if not cart_items:
        return RedirectResponse(url=path_with_base("/cart"), status_code=303)

    total = sum(item["subtotal"] for item in cart_items)
    if not all([customer_name, customer_email, shipping_address, card_name, card_number, expiry, cvv]):
        return render(
            request,
            "checkout.html",
            {
                "cart_items": cart_items,
                "total": total,
                "error": "All shipping and payment fields are required.",
                "payment_provider": settings.payment_provider,
            },
        )

    card_digits = "".join(ch for ch in card_number if ch.isdigit())
    if len(card_digits) < 12:
        return render(
            request,
            "checkout.html",
            {
                "cart_items": cart_items,
                "total": total,
                "error": "Enter a valid demo card number.",
                "payment_provider": settings.payment_provider,
            },
        )

    payment_reference = generate_mock_reference()
    order = Order(
        customer_name=customer_name,
        customer_email=customer_email,
        shipping_address=shipping_address,
        total_amount=Decimal(str(total)),
        status="Paid (Mock Gateway)",
        payment_method="Card",
        payment_reference=payment_reference,
    )
    db.add(order)
    db.flush()

    for item in cart_items:
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=item["id"],
                quantity=int(item["quantity"]),
                unit_price=Decimal(str(item["price"])),
            )
        )
        product = db.get(Product, item["id"])
        if product and product.stock >= int(item["quantity"]):
            product.stock -= int(item["quantity"])

    db.commit()
    request.session["cart"] = []
    return render(
        request,
        "success.html",
        {
            "order_id": order.id,
            "total": total,
            "payment_reference": payment_reference,
            "payment_provider": settings.payment_provider,
        },
    )


@app.get(path_with_base("/admin"), response_class=HTMLResponse)
def admin_get(request: Request, db: Session = Depends(get_db)):
    require_admin(request)
    products = db.query(Product).order_by(Product.id.desc()).all()
    orders = db.query(Order).order_by(Order.id.desc()).limit(10).all()
    return render(request, "admin.html", {"products": products, "orders": orders, "error": None, "success": None})


@app.post(path_with_base("/admin/products"), response_class=HTMLResponse)
def admin_add_product(
    request: Request,
    name: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    price: Decimal = Form(...),
    stock: int = Form(...),
    image_url: str = Form(""),
    image_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    require_admin(request)
    try:
        final_image_url = image_url.strip() or None
        if image_file and image_file.filename:
            if not (image_file.content_type or "").startswith("image/"):
                raise ValueError("Only image uploads are allowed.")
            final_image_url = save_upload(image_file)

        db.add(
            Product(
                name=name,
                description=description,
                category=category,
                price=price,
                stock=stock,
                image_url=final_image_url,
            )
        )
        db.commit()
        success = "Product added successfully."
        error = None
    except Exception as exc:
        db.rollback()
        success = None
        error = str(exc) or "Unable to save product."

    products = db.query(Product).order_by(Product.id.desc()).all()
    orders = db.query(Order).order_by(Order.id.desc()).limit(10).all()
    return render(request, "admin.html", {"products": products, "orders": orders, "error": error, "success": success})

@app.post(path_with_base("/admin/orders/{order_id}/status"), response_class=HTMLResponse)
def admin_update_order_status(
    order_id: int,
    request: Request,
    status: str = Form(...),
    db: Session = Depends(get_db),
):
    require_admin(request)

    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    allowed_statuses = ["Pending", "Paid", "Shipped", "Delivered", "Cancelled"]
    if status not in allowed_statuses:
        products = db.query(Product).order_by(Product.id.desc()).all()
        orders = db.query(Order).order_by(Order.id.desc()).limit(10).all()
        return render(
            request,
            "admin.html",
            {
                "products": products,
                "orders": orders,
                "error": "Invalid order status.",
                "success": None,
            },
        )

    order.status = status
    db.commit()

    products = db.query(Product).order_by(Product.id.desc()).all()
    orders = db.query(Order).order_by(Order.id.desc()).limit(10).all()
    return render(
        request,
        "admin.html",
        {
            "products": products,
            "orders": orders,
            "error": None,
            "success": f"Order #{order.id} status updated to {status}.",
        },
    )

@app.post(path_with_base("/admin/products/{product_id}/update"), response_class=HTMLResponse)
def admin_update_product(
    product_id: int,
    request: Request,
    name: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    price: Decimal = Form(...),
    stock: int = Form(...),
    image_url: str = Form(""),
    image_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    require_admin(request)
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    try:
        final_image_url = product.image_url
        if image_file and image_file.filename:
            if not (image_file.content_type or "").startswith("image/"):
                raise ValueError("Only image uploads are allowed.")
            final_image_url = save_upload(image_file)
        elif image_url is not None:
            final_image_url = image_url.strip() or None

        product.name = name
        product.description = description
        product.category = category
        product.price = price
        product.stock = stock
        product.image_url = final_image_url
        db.commit()
        success = "Product updated successfully."
        error = None
    except Exception as exc:
        db.rollback()
        success = None
        error = str(exc) or "Unable to update product."

    products = db.query(Product).order_by(Product.id.desc()).all()
    orders = db.query(Order).order_by(Order.id.desc()).limit(10).all()
    return render(request, "admin.html", {"products": products, "orders": orders, "error": error, "success": success})


@app.post(path_with_base("/admin/products/{product_id}/delete"), response_class=HTMLResponse)
def admin_delete_product(product_id: int, request: Request, db: Session = Depends(get_db)):
    require_admin(request)
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if db.query(OrderItem).filter(OrderItem.product_id == product_id).first():
        products = db.query(Product).order_by(Product.id.desc()).all()
        orders = db.query(Order).order_by(Order.id.desc()).limit(10).all()
        return render(
            request,
            "admin.html",
            {
                "products": products,
                "orders": orders,
                "error": "Cannot delete product because it exists in past orders.",
                "success": None,
            },
        )

    db.delete(product)
    db.commit()
    products = db.query(Product).order_by(Product.id.desc()).all()
    orders = db.query(Order).order_by(Order.id.desc()).limit(10).all()
    return render(
        request,
        "admin.html",
        {"products": products, "orders": orders, "error": None, "success": "Product deleted successfully."},
    )

# JSON API endpoints for Next.js frontend
from pydantic import BaseModel
from typing import List

class ProductResponse(BaseModel):
    id: int
    name: str
    description: str
    price: float
    image_url: Optional[str]
    stock: int
    category: str
    
    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    
    class Config:
        from_attributes = True

class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product: ProductResponse
    quantity: int
    unit_price: float
    
    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    customer_name: str
    customer_email: str
    shipping_address: str
    total_amount: float
    status: str
    payment_method: Optional[str]
    payment_reference: Optional[str]
    items: List[OrderItemResponse]
    
    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    user: UserResponse
    token: str

# API Routes for Next.js frontend
@app.get("/api/products", response_model=List[ProductResponse])
def api_list_products(q: str = "", db: Session = Depends(get_db)):
    if q:
        products = (
            db.query(Product)
            .filter(
                or_(
                    Product.name.ilike(f"%{q}%"),
                    Product.description.ilike(f"%{q}%"),
                    Product.category.ilike(f"%{q}%"),
                )
            )
            .order_by(Product.id.asc())
            .all()
        )
    else:
        products = db.query(Product).order_by(Product.id.asc()).all()
    return products

@app.get("/api/products/{product_id}", response_model=ProductResponse)
def api_get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.get("/api/cart")
def api_get_cart(request: Request):
    cart = get_or_create_cart(request)
    return calculate_cart(cart)

@app.post("/api/cart/add/{product_id}")
def api_add_to_cart(
    product_id: int,
    request: Request,
    quantity: int = Form(1),
    db: Session = Depends(get_db)
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    qty = max(1, int(quantity))
    
    if product.stock <= 0:
        raise HTTPException(status_code=400, detail="Product out of stock")
    
    cart = get_or_create_cart(request)
    existing = next((item for item in cart if item["id"] == product.id), None)
    current_qty_in_cart = existing["quantity"] if existing else 0
    requested_total = current_qty_in_cart + qty
    
    if requested_total > product.stock:
        raise HTTPException(
            status_code=400,
            detail=f"Only {product.stock} item(s) available in stock"
        )
    
    if existing:
        existing["quantity"] = requested_total
    else:
        cart.append({
            "id": product.id,
            "name": product.name,
            "price": float(product.price),
            "quantity": qty,
            "image_url": product.image_url,
        })
    
    request.session["cart"] = cart
    return {"message": "Added to cart", "cart": calculate_cart(cart)}

@app.post("/api/cart/update/{product_id}")
def api_update_cart(
    product_id: int,
    request: Request,
    quantity: int = Form(...),
    db: Session = Depends(get_db)
):
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if quantity <= 0:
        cart = [item for item in get_or_create_cart(request) if item["id"] != product_id]
        request.session["cart"] = cart
        return {"message": "Item removed", "cart": calculate_cart(cart)}
    
    if quantity > product.stock:
        raise HTTPException(
            status_code=400,
            detail=f"Only {product.stock} item(s) available"
        )
    
    cart = get_or_create_cart(request)
    for item in cart:
        if item["id"] == product_id:
            item["quantity"] = quantity
    
    request.session["cart"] = cart
    return {"message": "Cart updated", "cart": calculate_cart(cart)}

@app.post("/api/cart/remove/{product_id}")
def api_remove_from_cart(product_id: int, request: Request):
    cart = [item for item in get_or_create_cart(request) if item["id"] != product_id]
    request.session["cart"] = cart
    return {"message": "Item removed", "cart": calculate_cart(cart)}

@app.post("/api/register", response_model=AuthResponse)
def api_register(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        name=name,
        email=email,
        password_hash=hash_password(password),
        role="customer"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {
        "user": UserResponse.from_orm(user),
        "token": "mock-token-" + str(user.id)
    }

@app.post("/api/login", response_model=AuthResponse)
def api_login(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    request.session["user"] = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role
    }
    
    return {
        "user": UserResponse.from_orm(user),
        "token": "mock-token-" + str(user.id)
    }

@app.post("/api/logout")
def api_logout(request: Request):
    request.session.clear()
    return {"message": "Logged out"}

@app.get("/api/me")
def api_get_current_user(request: Request):
    user = current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

@app.get("/api/orders", response_model=List[OrderResponse])
def api_list_orders(request: Request, db: Session = Depends(get_db)):
    user = require_api_auth(request, db)
    orders = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.customer_email == user["email"])
        .order_by(Order.id.desc())
        .all()
    )
    return orders

@app.get("/api/orders/{order_id}", response_model=OrderResponse)
def api_get_order(order_id: int, request: Request, db: Session = Depends(get_db)):
    user = require_api_auth(request, db)
    order = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == order_id)
        .first()
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if user["role"] != "admin" and order.customer_email != user["email"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    return order

@app.post("/api/checkout", response_model=OrderResponse)
def api_checkout(
    request: Request,
    customer_name: str = Form(...),
    customer_email: str = Form(...),
    shipping_address: str = Form(...),
    card_name: str = Form(...),
    card_number: str = Form(...),
    expiry: str = Form(...),
    cvv: str = Form(...),
    cart_items_json: str = Form(...),
    db: Session = Depends(get_db)
):
    user = require_api_auth(request, db)
    
    # Parse cart items from JSON
    try:
        cart_items = json.loads(cart_items_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid cart data")
    
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    if not all([customer_name, customer_email, shipping_address, card_name, card_number, expiry, cvv]):
        raise HTTPException(status_code=400, detail="All fields are required")
    
    card_digits = "".join(ch for ch in card_number if ch.isdigit())
    if len(card_digits) < 12:
        raise HTTPException(status_code=400, detail="Invalid card number")
    
    # Stock validation
    for item in cart_items:
        product = db.get(Product, item["id"])
        if not product:
            raise HTTPException(status_code=400, detail=f"Product #{item['id']} no longer exists")
        if product.stock < item["quantity"]:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product.name}")
    
    total = sum(item["subtotal"] for item in cart_items)
    payment_reference = generate_mock_reference()
    
    order = Order(
        customer_name=customer_name,
        customer_email=customer_email,
        shipping_address=shipping_address,
        total_amount=Decimal(str(total)),
        status="Paid (Mock Gateway)",
        payment_method="Card",
        payment_reference=payment_reference,
    )
    db.add(order)
    db.flush()
    
    for item in cart_items:
        product = db.get(Product, item["id"])
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=item["id"],
                quantity=item["quantity"],
                unit_price=Decimal(str(item["price"])),
            )
        )
        if product:
            product.stock -= item["quantity"]
    
    db.commit()
    request.session["cart"] = []
    
    # Reload order with items
    order = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .filter(Order.id == order.id)
        .first()
    )
    return order

@app.get("/api/admin/products", response_model=List[ProductResponse])
def api_admin_list_products(request: Request, db: Session = Depends(get_db)):
    require_api_admin(request, db)
    products = db.query(Product).order_by(Product.id.desc()).all()
    return products

@app.get("/api/admin/orders", response_model=List[OrderResponse])
def api_admin_list_orders(request: Request, db: Session = Depends(get_db)):
    require_api_admin(request, db)
    orders = (
        db.query(Order)
        .options(joinedload(Order.items).joinedload(OrderItem.product))
        .order_by(Order.id.desc())
        .limit(50)
        .all()
    )
    return orders

@app.post("/api/admin/products", response_model=ProductResponse)
def api_admin_add_product(
    request: Request,
    name: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    price: Decimal = Form(...),
    stock: int = Form(...),
    image_url: str = Form(""),
    image_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    require_admin(request)
    
    final_image_url = image_url.strip() or None
    if image_file and image_file.filename:
        if not (image_file.content_type or "").startswith("image/"):
            raise HTTPException(status_code=400, detail="Only image uploads allowed")
        final_image_url = save_upload(image_file)
    
    product = Product(
        name=name,
        description=description,
        category=category,
        price=price,
        stock=stock,
        image_url=final_image_url,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@app.post("/api/admin/orders/{order_id}/status")
def api_admin_update_order_status(
    order_id: int,
    request: Request,
    status: str = Form(...),
    db: Session = Depends(get_db)
):
    require_api_admin(request, db)
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.status = status
    db.commit()
    return {"message": "Order status updated", "order_id": order_id, "status": status}

@app.post("/api/admin/seed-admin")
def api_seed_admin(request: Request, db: Session = Depends(get_db)):
    seed_admin_if_missing(db)
    return {"message": "Admin account seeded"}

# Root endpoint
@app.get("/")
def root():
    return {"message": "Zen E-Commerce API", "docs": "/docs"}

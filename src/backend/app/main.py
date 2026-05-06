import time
from decimal import Decimal
from pathlib import Path
from typing import Optional, List
from sqlalchemy.orm import joinedload
from fastapi import FastAPI, Request, Depends, Form, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_, text
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware
from app.auth import hash_password, verify_password
from app.core.config import settings
from app.db import Base, SessionLocal, engine, get_db
from app.models import Order, OrderItem, Product, User
from pydantic import BaseModel

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Zen E-Commerce built with FastAPI and PostgreSQL",
)

app.add_middleware(SessionMiddleware, secret_key=settings.session_secret, max_age=60 * 60 * 24)


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



@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def ready():
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as e:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={"status": "not ready", "detail": str(e)}
        )

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

def save_upload(file: UploadFile) -> str:
    suffix = Path(file.filename or "upload.bin").suffix
    safe_name = f"{int(time.time() * 1000)}{suffix}"
    upload_dir = Path(__file__).resolve().parent / "static" / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    target = upload_dir / safe_name
    with target.open("wb") as f:
        f.write(file.file.read())
    return f"/static/uploads/{safe_name}"

def generate_mock_reference() -> str:
    return f"MOCKPAY-{int(time.time())}-{int(time.time() * 1000) % 100000}"

#@app.get("/", include_in_schema=False)
#def root_redirect():
# Pydantic response models

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
    require_api_auth(request, db)
    
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

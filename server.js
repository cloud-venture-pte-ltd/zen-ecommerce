const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const SequelizeStoreFactory = require('connect-session-sequelize');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const { Sequelize, DataTypes, Op } = require('sequelize');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const uploadsDir = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 3306,
  dialect: 'mysql',
  logging: false,
  dialectOptions: { connectTimeout: 60000 }
});

const Product = sequelize.define('Product', {
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  image_url: { type: DataTypes.STRING, allowNull: true },
  stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  category: { type: DataTypes.STRING, allowNull: false, defaultValue: 'General' }
}, { tableName: 'products' });

const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'customer'), allowNull: false, defaultValue: 'customer' }
}, { tableName: 'users' });

const Order = sequelize.define('Order', {
  customer_name: { type: DataTypes.STRING, allowNull: false },
  customer_email: { type: DataTypes.STRING, allowNull: false },
  shipping_address: { type: DataTypes.TEXT, allowNull: false },
  total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Pending' },
  payment_method: { type: DataTypes.STRING, allowNull: true },
  payment_reference: { type: DataTypes.STRING, allowNull: true }
}, { tableName: 'orders' });

const OrderItem = sequelize.define('OrderItem', {
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
}, { tableName: 'order_items' });

Order.hasMany(OrderItem, { foreignKey: 'order_id' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
Product.hasMany(OrderItem, { foreignKey: 'product_id' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id' });

const SequelizeStore = SequelizeStoreFactory(session.Store);
const sessionStore = new SequelizeStore({ db: sequelize });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image uploads are allowed.'));
    cb(null, true);
  }
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => {
  if (!req.session.cart) req.session.cart = [];
  res.locals.cartCount = req.session.cart.reduce((sum, item) => sum + item.quantity, 0);
  res.locals.currentUser = req.session.user || null;
  next();
});

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') return res.status(403).send('Forbidden');
  next();
}

function calculateCart(cart) {
  return cart.map(item => ({ ...item, subtotal: Number(item.price) * item.quantity }));
}

function generateMockPaymentReference() {
  return `MOCKPAY-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

app.get('/', async (req, res) => {
  const q = req.query.q || '';
  const where = q ? {
    [Op.or]: [
      { name: { [Op.like]: `%${q}%` } },
      { description: { [Op.like]: `%${q}%` } },
      { category: { [Op.like]: `%${q}%` } }
    ]
  } : {};
  const products = await Product.findAll({ where, order: [['id', 'ASC']] });
  res.render('index', { products, q });
});

app.get('/product/:id', async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) return res.status(404).send('Product not found');
  res.render('product', { product });
});

app.post('/cart/add/:id', async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) return res.status(404).send('Product not found');

  const qty = Math.max(1, parseInt(req.body.quantity || '1', 10));
  const cart = req.session.cart;
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: qty,
      image_url: product.image_url
    });
  }
  res.redirect('/cart');
});

app.get('/cart', (req, res) => {
  const cartItems = calculateCart(req.session.cart);
  const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  res.render('cart', { cartItems, total });
});

app.post('/cart/update/:id', (req, res) => {
  const qty = parseInt(req.body.quantity || '1', 10);
  req.session.cart = req.session.cart
    .map(item => item.id === Number(req.params.id) ? { ...item, quantity: qty } : item)
    .filter(item => item.quantity > 0);
  res.redirect('/cart');
});

app.post('/cart/remove/:id', (req, res) => {
  req.session.cart = req.session.cart.filter(item => item.id !== Number(req.params.id));
  res.redirect('/cart');
});

app.get('/register', (_req, res) => res.render('register', { error: null }));
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.render('register', { error: 'Email already registered.' });
    const password_hash = await bcrypt.hash(password, 10);
    await User.create({ name, email, password_hash, role: 'customer' });
    res.redirect('/login');
  } catch (_err) {
    res.render('register', { error: 'Unable to register user.' });
  }
});

app.get('/login', (_req, res) => res.render('login', { error: null }));
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) return res.render('login', { error: 'Invalid credentials.' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.render('login', { error: 'Invalid credentials.' });
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.redirect('/');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

app.get('/checkout', requireAuth, (req, res) => {
  const cartItems = calculateCart(req.session.cart);
  const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  if (!cartItems.length) return res.redirect('/cart');
  res.render('checkout', {
    cartItems,
    total,
    error: null,
    paymentProvider: process.env.PAYMENT_PROVIDER || 'mock'
  });
});

app.post('/checkout', requireAuth, async (req, res) => {
  const cartItems = calculateCart(req.session.cart);
  const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  if (!cartItems.length) return res.redirect('/cart');

  const { customer_name, customer_email, shipping_address, card_name, card_number, expiry, cvv } = req.body;
  if (!customer_name || !customer_email || !shipping_address || !card_name || !card_number || !expiry || !cvv) {
    return res.render('checkout', {
      cartItems,
      total,
      error: 'All shipping and payment fields are required.',
      paymentProvider: process.env.PAYMENT_PROVIDER || 'mock'
    });
  }

  if (String(card_number).replace(/\s+/g, '').length < 12) {
    return res.render('checkout', {
      cartItems,
      total,
      error: 'Enter a valid demo card number.',
      paymentProvider: process.env.PAYMENT_PROVIDER || 'mock'
    });
  }

  const paymentReference = generateMockPaymentReference();
  const order = await Order.create({
    customer_name,
    customer_email,
    shipping_address,
    total_amount: total,
    status: 'Paid (Mock Gateway)',
    payment_method: 'Card',
    payment_reference: paymentReference
  });

  for (const item of cartItems) {
    await OrderItem.create({ order_id: order.id, product_id: item.id, quantity: item.quantity, unit_price: item.price });
    await Product.decrement('stock', { by: item.quantity, where: { id: item.id, stock: { [Op.gte]: item.quantity } } });
  }

  req.session.cart = [];
  res.render('success', { orderId: order.id, total, paymentReference, paymentProvider: process.env.PAYMENT_PROVIDER || 'mock' });
});

app.get('/admin', requireAdmin, async (req, res) => {
  const products = await Product.findAll({ order: [['id', 'DESC']] });
  const orders = await Order.findAll({ order: [['id', 'DESC']], limit: 10 });
  res.render('admin', { products, orders, error: null, success: null });
});

app.post('/admin/products', requireAdmin, (req, res) => {
  upload.single('image_file')(req, res, async err => {
    try {
      if (err) {
        const products = await Product.findAll({ order: [['id', 'DESC']] });
        const orders = await Order.findAll({ order: [['id', 'DESC']], limit: 10 });
        return res.status(400).render('admin', { products, orders, error: err.message, success: null });
      }

      const { name, description, price, image_url, stock, category } = req.body;
      const finalImageUrl = req.file ? `/uploads/${req.file.filename}` : (image_url || null);
      await Product.create({ name, description, price, image_url: finalImageUrl, stock, category });

      const products = await Product.findAll({ order: [['id', 'DESC']] });
      const orders = await Order.findAll({ order: [['id', 'DESC']], limit: 10 });
      res.render('admin', { products, orders, error: null, success: 'Product added successfully.' });
    } catch (_e) {
      const products = await Product.findAll({ order: [['id', 'DESC']] });
      const orders = await Order.findAll({ order: [['id', 'DESC']], limit: 10 });
      res.status(500).render('admin', { products, orders, error: 'Unable to save product.', success: null });
    }
  });
});

app.post('/admin/products/:id/update', requireAdmin, (req, res) => {
  upload.single('image_file')(req, res, async err => {
    try {
      const product = await Product.findByPk(req.params.id);
      if (!product) {
        return res.status(404).send('Product not found');
      }

      if (err) {
        const products = await Product.findAll({ order: [['id', 'DESC']] });
        const orders = await Order.findAll({ order: [['id', 'DESC']], limit: 10 });
        return res.status(400).render('admin', {
          products,
          orders,
          error: err.message,
          success: null
        });
      }

      const { name, description, price, image_url, stock, category } = req.body;

      let finalImageUrl = product.image_url;
      if (req.file) {
        finalImageUrl = `/uploads/${req.file.filename}`;
      } else if (typeof image_url === 'string') {
        finalImageUrl = image_url.trim() || null;
      }

      await product.update({
        name,
        description,
        price,
        image_url: finalImageUrl,
        stock,
        category
      });

      const products = await Product.findAll({ order: [['id', 'DESC']] });
      const orders = await Order.findAll({ order: [['id', 'DESC']], limit: 10 });
      res.render('admin', {
        products,
        orders,
        error: null,
        success: 'Product updated successfully.'
      });
    } catch (_e) {
      const products = await Product.findAll({ order: [['id', 'DESC']] });
      const orders = await Order.findAll({ order: [['id', 'DESC']], limit: 10 });
      res.status(500).render('admin', {
        products,
        orders,
        error: 'Unable to update product.',
        success: null
      });
    }
  });
});

app.post('/admin/products/:id/delete', requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).send('Product not found');
    }

    const usedInOrders = await OrderItem.findOne({
      where: { product_id: product.id }
    });

    if (usedInOrders) {
      const products = await Product.findAll({ order: [['id', 'DESC']] });
      const orders = await Order.findAll({ order: [['id', 'DESC']], limit: 10 });
      return res.status(400).render('admin', {
        products,
        orders,
        error: 'Cannot delete product because it exists in past orders.',
        success: null
      });
    }

    await product.destroy();

    const products = await Product.findAll({ order: [['id', 'DESC']] });
    const orders = await Order.findAll({ order: [['id', 'DESC']], limit: 10 });
    res.render('admin', {
      products,
      orders,
      error: null,
      success: 'Product deleted successfully.'
    });
  } catch (_e) {
    const products = await Product.findAll({ order: [['id', 'DESC']] });
    const orders = await Order.findAll({ order: [['id', 'DESC']], limit: 10 });
    res.status(500).render('admin', {
      products,
      orders,
      error: 'Unable to delete product.',
      success: null
    });
  }
});

app.post('/admin/seed-admin', async (_req, res) => {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';
  const existing = await User.findOne({ where: { email } });
  if (!existing) {
    const password_hash = await bcrypt.hash(password, 10);
    await User.create({ name: 'Admin', email, password_hash, role: 'admin' });
  }
  res.redirect('/login');
});

async function start() {
  let connected = false;
  for (let i = 1; i <= 20; i++) {
    try {
      await sequelize.authenticate();
      connected = true;
      break;
    } catch (_err) {
      console.log(`Database not ready yet (attempt ${i}/20)...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  if (!connected) throw new Error('Unable to connect to MySQL after multiple attempts.');

  await sequelize.sync();

  const orderColumns = await sequelize.getQueryInterface().describeTable('orders');
  if (!orderColumns.payment_method) {
    await sequelize.getQueryInterface().addColumn('orders', 'payment_method', { type: DataTypes.STRING, allowNull: true });
  }
  if (!orderColumns.payment_reference) {
    await sequelize.getQueryInterface().addColumn('orders', 'payment_reference', { type: DataTypes.STRING, allowNull: true });
  }

  await sessionStore.sync();

  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

start().catch(err => {
  console.error('Startup failure:', err);
  process.exit(1);
});

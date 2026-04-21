CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url VARCHAR(500),
  stock INT NOT NULL DEFAULT 0,
  category VARCHAR(100) NOT NULL DEFAULT 'General',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','customer') NOT NULL DEFAULT 'customer',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  shipping_address TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(100) NOT NULL DEFAULT 'Pending',
  payment_method VARCHAR(100) NULL,
  payment_reference VARCHAR(150) NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

INSERT INTO products (name, description, price, image_url, stock, category)
SELECT * FROM (
  SELECT 'Wireless Mouse', 'Ergonomic wireless mouse for daily productivity.', 49.90, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80', 30, 'Accessories'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Wireless Mouse') LIMIT 1;

INSERT INTO products (name, description, price, image_url, stock, category)
SELECT * FROM (
  SELECT 'Mechanical Keyboard', 'Compact mechanical keyboard with tactile switches.', 129.00, 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=800&q=80', 20, 'Accessories'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Mechanical Keyboard') LIMIT 1;

INSERT INTO products (name, description, price, image_url, stock, category)
SELECT * FROM (
  SELECT 'USB-C Dock', 'Multi-port USB-C dock for laptop expansion and charging.', 179.00, 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80', 15, 'Connectivity'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'USB-C Dock') LIMIT 1;

INSERT INTO products (name, description, price, image_url, stock, category)
SELECT * FROM (
  SELECT 'BlueTooth Headphones', 'Wireless Bluetooth headphones with noise cancellation.', 99.00, 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80', 25, 'Audio'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'BlueTooth Headphones') LIMIT 1;

INSERT INTO products (name, description, price, image_url, stock, category)
SELECT * FROM (
  SELECT 'External SSD', 'High-speed external solid-state drive for data backup and storage.', 149.00, 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80', 20, 'Storage'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'External SSD') LIMIT 1;

INSERT INTO products (name, description, price, image_url, stock, category)
SELECT * FROM (
  SELECT 'Wide Screen Monitor', 'High-resolution wide screen monitor for enhanced productivity.', 299.00, 'https://images.unsplash.com/photo-1593696140826-c58bed479fcb?auto=format&fit=crop&w=800&q=80', 15, 'Displays'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Wide Screen Monitor') LIMIT 1;

INSERT INTO products (name, description, price, image_url, stock, category)
SELECT * FROM (
  SELECT 'Bluetooth Speaker', 'High-resolution Bluetooth speaker for immersive audio experience.', 199.00, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80', 15, 'Audio'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Bluetooth Speaker') LIMIT 1;

INSERT INTO products (name, description, price, image_url, stock, category)
SELECT * FROM (
  SELECT 'HDMI Splitter', 'High-resolution HDMI splitter for connecting multiple displays.', 79.00, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80', 20, 'Connectivity'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'HDMI Splitter') LIMIT 1;

INSERT INTO products (name, description, price, image_url, stock, category)
SELECT * FROM (
  SELECT 'USB HUb', 'High-resolution USB hub for connecting multiple devices.', 79.00, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80', 20, 'Connectivity'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'USB HUb') LIMIT 1;

INSERT INTO products (name, description, price, image_url, stock, category)
SELECT * FROM (
  SELECT 'Wireless Printer', 'High-resolution wireless printer for convenient printing.', 149.00, 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80', 15, 'Connectivity'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Wireless Printer') LIMIT 1;



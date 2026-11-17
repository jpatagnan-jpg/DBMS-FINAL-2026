# QuickCart Philippines — DBMS Final Project

A local, database-backed online shopping/order management demonstration built with Python, Flask, SQLite, HTML, and CSS. This is an implementation schema newly designed from the QuickCart project description; it is not a recovered copy of an earlier group ERD.

## Features
- Customer registration saved in SQLite; passwords are hashed with Werkzeug.
- Database-backed login, logout, and protected dashboard.
- Admin-only product CRUD (create, read, update, delete).
- Customer order creation with stock checking and stock deduction.
- Customer sees their own orders; admin sees all orders and can update order status.
- CSRF form token checks, parameterized SQL, foreign-key constraints, and role checks.

## Requirements
- Python 3.10 or newer
- Internet connection only to install Flask (not needed after installation)

## Run on Windows
1. Extract the ZIP file.
2. Open the extracted `quickcart` folder in File Explorer.
3. Click the address bar, type `cmd`, and press Enter.
4. Create a virtual environment:
   ```bat
   py -m venv .venv
   .venv\Scripts\activate
   ```
5. Install Flask:
   ```bat
   py -m pip install -r requirements.txt
   ```
6. Initialize the database and sample products:
   ```bat
   py init_db.py
   ```
7. Start the application:
   ```bat
   py app.py
   ```
8. Open `http://127.0.0.1:5000` in your browser.

The database file `quickcart.db` is created in this folder. It stores the actual users, products, categories, orders, and order items.

## Demo flow
1. Register a new customer account at `/register`.
2. Log in with the new account. Try an incorrect password once to demonstrate rejection.
3. Show the dashboard, product list, and create an order.
4. To demonstrate product CRUD and order-status management, create an admin account using the optional procedure below.
5. Open the SQLite database using DB Browser for SQLite and show the `users`, `products`, `orders`, and `order_items` tables.

## Optional: create an administrator
For a classroom demo, create a separate admin account from the terminal while the app is stopped. Run:

```bat
py -c "from app import init_db; import sqlite3; from werkzeug.security import generate_password_hash; init_db(); c=sqlite3.connect('quickcart.db'); c.execute('INSERT INTO users(full_name,email,password_hash,role) VALUES (?,?,?,?)', ('QuickCart Admin','admin@quickcart.local',generate_password_hash('ChangeMe123!'),'admin')); c.commit(); c.close(); print('Admin created')"
```

Admin demo login: `admin@quickcart.local` / `ChangeMe123!`. Change this password before any deployment. Do not use this demo password for a real account.

## Database design
- `users` 1-to-many `orders`
- `categories` 1-to-many `products`
- `orders` 1-to-many `order_items`
- `products` 1-to-many `order_items`

See `schema.sql` and `ERD.md`.

## Important limitations / honest scope
This is a working academic prototype. It does not connect to a real GCash/Maya payment gateway, courier API, email/SMS service, or Make/Zapier automation. Payment and shipping integrations described in the group's Day 2 architecture are future integration points, not implemented features. The app is intended for local demonstration; configure a strong `SECRET_KEY`, HTTPS, production server, secure database backups, and deployment settings before public hosting.

## GitHub
Create/use the group's existing repository, then upload this project folder. Do not commit `quickcart.db`, `.venv`, secrets, or real customer data. Add the Day 1 and Day 2 documents to the required repository folders separately.

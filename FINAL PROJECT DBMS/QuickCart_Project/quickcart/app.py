
import os
import sqlite3
import secrets
from functools import wraps
from flask import (
    Flask, render_template, request, redirect,
    url_for, session, flash, g, abort
)
from werkzeug.security import generate_password_hash, check_password_hash


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, 'quickcart.db')

app = Flask(__name__)

app.config.update(
    SECRET_KEY=os.environ.get(
        'SECRET_KEY',
        'change-this-development-secret-before-deployment'
    ),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax'
)


SCHEMA = '''
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer'
        CHECK(role IN ('customer','admin')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price REAL NOT NULL CHECK(price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    total REAL NOT NULL CHECK(total >= 0),
    status TEXT NOT NULL DEFAULT 'Pending'
        CHECK(status IN (
            'Pending','Processing','Shipped','Completed','Cancelled'
        )),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL
        REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_price REAL NOT NULL CHECK(unit_price >= 0)
);
'''


def db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA foreign_keys = ON')
    return g.db


@app.teardown_appcontext
def close_db(error=None):
    conn = g.pop('db', None)
    if conn is not None:
        conn.close()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute('PRAGMA foreign_keys = ON')
    conn.executescript(SCHEMA)

    for name in [
        'Electronics',
        'Fashion',
        'Home & Living',
        'School Supplies'
    ]:
        conn.execute(
            'INSERT OR IGNORE INTO categories(name) VALUES (?)',
            (name,)
        )

    count = conn.execute(
        'SELECT COUNT(*) FROM products'
    ).fetchone()[0]

    if count == 0:
        cats = {
            r[1]: r[0]
            for r in conn.execute('SELECT id,name FROM categories')
        }

        sample = [
            (cats['Electronics'], 'Wireless Mouse',
             '2.4GHz USB wireless mouse', 399.00, 25),
            (cats['Electronics'], 'USB-C Hub',
             'Multi-port USB-C adapter', 899.00, 12),
            (cats['Fashion'], 'Canvas Tote Bag',
             'Reusable everyday tote bag', 249.00, 30),
            (cats['Home & Living'], 'Desk Organizer',
             'Compact desktop organizer', 329.00, 18),
            (cats['School Supplies'], 'Notebook Set',
             'Set of three ruled notebooks', 120.00, 50),
        ]

        conn.executemany(
            '''INSERT INTO products
               (category_id,name,description,price,stock)
               VALUES (?,?,?,?,?)''',
            sample
        )

    conn.commit()
    conn.close()


@app.before_request
def csrf_setup():
    session.setdefault('_csrf', secrets.token_hex(24))


@app.context_processor
def inject_globals():
    return {
        'csrf_token': session.get('_csrf'),
        'current_user': session.get('user')
    }


def csrf_protect():
    if (
        request.method == 'POST'
        and request.form.get('_csrf') != session.get('_csrf')
    ):
        abort(400, 'Invalid form token. Refresh the page and try again.')


app.before_request(csrf_protect)


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get('user'):
            return redirect(url_for('login'))
        return fn(*args, **kwargs)
    return wrapper


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get('user'):
            return redirect(url_for('login'))

        if session['user']['role'] != 'admin':
            abort(403)

        return fn(*args, **kwargs)
    return wrapper


@app.route('/')
def index():
    if session.get('user'):
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))


@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form.get('full_name', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm = request.form.get('confirm_password', '')

        if not name or len(name) > 100 or not email or len(email) > 150:
            flash('Please provide a valid name and email address.', 'error')

        elif len(password) < 8:
            flash('Password must contain at least 8 characters.', 'error')

        elif password != confirm:
            flash('Passwords do not match.', 'error')

        else:
            try:
                db().execute(
                    '''INSERT INTO users(full_name,email,password_hash)
                       VALUES (?,?,?)''',
                    (name, email, generate_password_hash(password))
                )

                db().commit()
                flash('Account created. You can now log in.', 'success')
                return redirect(url_for('login'))

            except sqlite3.IntegrityError:
                db().rollback()
                flash(
                    'That email address is already registered.',
                    'error'
                )

    return render_template('register.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')

        user = db().execute(
            'SELECT * FROM users WHERE email=?',
            (email,)
        ).fetchone()

        if user and check_password_hash(user['password_hash'], password):
            session.clear()
            session['_csrf'] = secrets.token_hex(24)

            session['user'] = {
                'id': user['id'],
                'name': user['full_name'],
                'email': user['email'],
                'role': user['role']
            }

            flash('Welcome back, ' + user['full_name'] + '!', 'success')
            return redirect(url_for('dashboard'))

        flash('Incorrect email or password.', 'error')

    return render_template('login.html')


@app.post('/logout')
@login_required
def logout():
    session.clear()
    flash('You have been logged out.', 'success')
    return redirect(url_for('login'))


@app.route('/dashboard')
@login_required
def dashboard():
    conn = db()

    if session['user']['role'] == 'admin':
        stats = {
            'products': conn.execute(
                'SELECT COUNT(*) FROM products'
            ).fetchone()[0],
            'orders': conn.execute(
                'SELECT COUNT(*) FROM orders'
            ).fetchone()[0],
            'users': conn.execute(
                'SELECT COUNT(*) FROM users'
            ).fetchone()[0],
            'low_stock': conn.execute(
                'SELECT COUNT(*) FROM products WHERE stock <= 5'
            ).fetchone()[0]
        }

        recent = conn.execute(
            '''SELECT o.id,o.total,o.status,o.created_at,u.full_name
               FROM orders o
               JOIN users u ON u.id=o.user_id
               ORDER BY o.id DESC LIMIT 5'''
        ).fetchall()

    else:
        stats = {
            'products': conn.execute(
                'SELECT COUNT(*) FROM products'
            ).fetchone()[0],
            'orders': conn.execute(
                'SELECT COUNT(*) FROM orders WHERE user_id=?',
                (session['user']['id'],)
            ).fetchone()[0],
            'users': 0,
            'low_stock': 0
        }

        recent = conn.execute(
            '''SELECT o.id,o.total,o.status,o.created_at,u.full_name
               FROM orders o
               JOIN users u ON u.id=o.user_id
               WHERE o.user_id=?
               ORDER BY o.id DESC LIMIT 5''',
            (session['user']['id'],)
        ).fetchall()

    return render_template(
        'dashboard.html',
        stats=stats,
        recent=recent
    )


@app.route('/products')
@login_required
def products():
    rows = db().execute(
        '''SELECT p.*, c.name AS category_name
           FROM products p
           LEFT JOIN categories c ON c.id=p.category_id
           ORDER BY p.id DESC'''
    ).fetchall()

    return render_template('products.html', products=rows)


@app.route('/products/new', methods=['GET', 'POST'])
@admin_required
def product_new():
    categories = db().execute(
        'SELECT * FROM categories ORDER BY name'
    ).fetchall()

    if request.method == 'POST':
        try:
            name = request.form['name'].strip()
            desc = request.form.get('description', '').strip()
            price = float(request.form['price'])
            stock = int(request.form['stock'])
            cat = request.form.get('category_id') or None

            if not name or price < 0 or stock < 0:
                raise ValueError()

            db().execute(
                '''INSERT INTO products
                   (category_id,name,description,price,stock)
                   VALUES (?,?,?,?,?)''',
                (cat, name, desc, price, stock)
            )

            db().commit()
            flash('Product added successfully.', 'success')
            return redirect(url_for('products'))

        except (ValueError, KeyError, sqlite3.IntegrityError):
            db().rollback()
            flash('Check the product details and try again.', 'error')

    return render_template(
        'product_form.html',
        product=None,
        categories=categories
    )


@app.route('/products/<int:pid>/edit', methods=['GET', 'POST'])
@admin_required
def product_edit(pid):
    product = db().execute(
        'SELECT * FROM products WHERE id=?',
        (pid,)
    ).fetchone()

    if not product:
        abort(404)

    categories = db().execute(
        'SELECT * FROM categories ORDER BY name'
    ).fetchall()

    if request.method == 'POST':
        try:
            name = request.form['name'].strip()
            desc = request.form.get('description', '').strip()
            price = float(request.form['price'])
            stock = int(request.form['stock'])
            cat = request.form.get('category_id') or None

            if not name or price < 0 or stock < 0:
                raise ValueError()

            db().execute(
                '''UPDATE products
                   SET category_id=?,name=?,description=?,price=?,stock=?
                   WHERE id=?''',
                (cat, name, desc, price, stock, pid)
            )

            db().commit()
            flash('Product updated.', 'success')
            return redirect(url_for('products'))

        except (ValueError, KeyError, sqlite3.IntegrityError):
            db().rollback()
            flash('Check the product details and try again.', 'error')

    return render_template(
        'product_form.html',
        product=product,
        categories=categories
    )


@app.post('/products/<int:pid>/delete')
@admin_required
def product_delete(pid):
    try:
        db().execute(
            'DELETE FROM products WHERE id=?',
            (pid,)
        )
        db().commit()
        flash('Product deleted.', 'success')

    except sqlite3.IntegrityError:
        db().rollback()
        flash(
            'This product is part of an order and cannot be deleted.',
            'error'
        )

    return redirect(url_for('products'))


@app.route('/orders')
@login_required
def orders():
    if session['user']['role'] == 'admin':
        rows = db().execute(
            '''SELECT o.*,u.full_name,u.email
               FROM orders o
               JOIN users u ON u.id=o.user_id
               ORDER BY o.id DESC'''
        ).fetchall()

    else:
        rows = db().execute(
            '''SELECT o.*,u.full_name,u.email
               FROM orders o
               JOIN users u ON u.id=o.user_id
               WHERE o.user_id=?
               ORDER BY o.id DESC''',
            (session['user']['id'],)
        ).fetchall()

    return render_template('orders.html', orders=rows)


@app.route('/orders/new', methods=['GET', 'POST'])
@login_required
def order_new():
    available = db().execute(
        'SELECT * FROM products WHERE stock>0 ORDER BY name'
    ).fetchall()

    if request.method == 'POST':
        try:
            pid = int(request.form['product_id'])
            qty = int(request.form['quantity'])

            if qty < 1:
                raise ValueError()

            conn = db()
            conn.execute('BEGIN IMMEDIATE')

            product = conn.execute(
                'SELECT * FROM products WHERE id=?',
                (pid,)
            ).fetchone()

            if not product or product['stock'] < qty:
                conn.rollback()
                flash(
                    'Product unavailable or insufficient stock.',
                    'error'
                )

            else:
                total = round(product['price'] * qty, 2)

                cur = conn.execute(
                    '''INSERT INTO orders(user_id,total,status)
                       VALUES (?,?,?)''',
                    (session['user']['id'], total, 'Pending')
                )

                conn.execute(
                    '''INSERT INTO order_items
                       (order_id,product_id,quantity,unit_price)
                       VALUES (?,?,?,?)''',
                    (cur.lastrowid, pid, qty, product['price'])
                )

                conn.execute(
                    'UPDATE products SET stock=stock-? WHERE id=?',
                    (qty, pid)
                )

                conn.commit()
                flash('Order placed successfully.', 'success')
                return redirect(url_for('orders'))

        except (ValueError, KeyError):
            db().rollback()
            flash('Enter a valid product and quantity.', 'error')

    return render_template(
        'order_new.html',
        products=available
    )


@app.post('/orders/<int:oid>/status')
@admin_required
def order_status(oid):
    status = request.form.get('status')

    if status not in [
        'Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled'
    ]:
        flash('Invalid order status.', 'error')

    else:
        db().execute(
            'UPDATE orders SET status=? WHERE id=?',
            (status, oid)
        )
        db().commit()
        flash('Order status updated.', 'success')

    return redirect(url_for('orders'))


# DELETE ORDER ROUTE
@app.post('/orders/<int:oid>/delete')
@admin_required
def order_delete(oid):
    conn = db()

    try:
        conn.execute('BEGIN IMMEDIATE')

        order = conn.execute(
            'SELECT id FROM orders WHERE id=?',
            (oid,)
        ).fetchone()

        if not order:
            conn.rollback()
            flash('Order not found.', 'error')
            return redirect(url_for('orders'))

        items = conn.execute(
            '''SELECT product_id, quantity
               FROM order_items
               WHERE order_id=?''',
            (oid,)
        ).fetchall()

        # Restore product stock before deleting the order.
        for item in items:
            conn.execute(
                'UPDATE products SET stock=stock+? WHERE id=?',
                (item['quantity'], item['product_id'])
            )

        # Related order_items are deleted through ON DELETE CASCADE.
        conn.execute(
            'DELETE FROM orders WHERE id=?',
            (oid,)
        )

        conn.commit()
        flash(
            'Order deleted and product stock restored.',
            'success'
        )

    except sqlite3.Error:
        conn.rollback()
        flash('Could not delete the order.', 'error')

    return redirect(url_for('orders'))


@app.route('/health')
def health():
    return {
        'status': 'ok',
        'database': 'SQLite',
        'database_file': 'quickcart.db'
    }


if __name__ == '__main__':
    init_db()
    app.run(debug=True)

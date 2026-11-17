# QuickCart implementation checklist

Use this as the implementation checklist. Only mark an item complete after testing it on the group's computer.

- [x] Flask application source created
- [x] SQLite relational schema created (`users`, `categories`, `products`, `orders`, `order_items`)
- [x] Database initialization and sample catalog script created
- [x] Registration writes account records to SQLite
- [x] Passwords stored as Werkzeug password hashes, not plaintext
- [x] Login verifies credentials against the database
- [x] Incorrect credentials are rejected with a generic message
- [x] Logout clears the login session
- [x] Dashboard and management routes require authentication
- [x] Product create, read, update, and delete routes implemented for administrators
- [x] Customers can create orders; order and order-item records are saved
- [x] Stock is checked and deducted when an order is placed
- [x] Admin can view orders and update order status
- [x] SQL uses parameterized statements
- [x] CSRF token checks added to POST forms
- [x] ERD, SQL schema, README, and local run instructions included
- [ ] Install Python and Flask on the presentation computer
- [ ] Run the app successfully on the presentation computer
- [ ] Register a fresh account and verify it appears in `users`
- [ ] Test a wrong password
- [ ] Log in and show the protected dashboard
- [ ] Create an order and show `orders`, `order_items`, and reduced product stock
- [ ] Log in as admin and demonstrate product create/edit/delete
- [ ] Capture the required 5–10 minute screen recording
- [ ] Upload source and documents to the group's actual GitHub repository
- [ ] Add the real GitHub repository URL to the final submission

**Important:** Source code has been generated, but items requiring execution, screenshots, GitHub upload, or recording must be verified by the group before being marked complete.

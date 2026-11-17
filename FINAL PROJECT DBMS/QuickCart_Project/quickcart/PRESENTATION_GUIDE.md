# QuickCart 5–10 minute screen-recording guide

## Before recording
1. Start the app using `py app.py` and open `http://127.0.0.1:5000`.
2. Open DB Browser for SQLite and load `quickcart.db` in a separate window.
3. If demonstrating admin product CRUD, create the demo admin account using the command in README.
4. Keep the database browser ready, but do not show or disclose anyone's real password.

## Suggested recording sequence (about 7 minutes)
1. **0:00–0:40 — Introduction:** Identify QuickCart Philippines and explain that it uses Flask, Python, and SQLite.
2. **0:40–1:40 — Registration:** Register a new customer with a test email and password.
3. **1:40–2:20 — Database proof:** Refresh the `users` table in DB Browser. Show the new email and that `password_hash` contains a hash rather than the original password.
4. **2:20–3:00 — Login validation:** Log in with the wrong password and show that access is rejected. Then log in with the correct password.
5. **3:00–3:40 — Protected dashboard:** Show the dashboard and navigate to Products and Orders.
6. **3:40–5:00 — Customer operation:** Place an order. Show the order in the application and the matching records in `orders` and `order_items`. Show that product stock decreased.
7. **5:00–6:30 — Admin CRUD:** Log in as the demo admin. Add a test product, edit it, and delete it. Show the database/product list reflecting the changes.
8. **6:30–7:00 — Logout:** Log out and show that protected pages return to the login screen.

## Narration tip
Explain what each action does rather than reading code. Example: “When a customer registers, the application hashes the password and inserts the account into the SQLite users table. During login, the submitted password is checked against that stored hash.”

Only demonstrate features that you have successfully tested on the actual computer.

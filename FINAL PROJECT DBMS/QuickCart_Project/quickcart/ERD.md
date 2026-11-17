# QuickCart database ERD

```mermaid
erDiagram
    USERS ||--o{ ORDERS : places
    CATEGORIES ||--o{ PRODUCTS : groups
    ORDERS ||--|{ ORDER_ITEMS : contains
    PRODUCTS ||--o{ ORDER_ITEMS : appears_in
    USERS {
      int id PK
      string full_name
      string email UK
      string password_hash
      string role
      datetime created_at
    }
    CATEGORIES {
      int id PK
      string name UK
    }
    PRODUCTS {
      int id PK
      int category_id FK
      string name
      string description
      decimal price
      int stock
      datetime created_at
    }
    ORDERS {
      int id PK
      int user_id FK
      decimal total
      string status
      datetime created_at
    }
    ORDER_ITEMS {
      int id PK
      int order_id FK
      int product_id FK
      int quantity
      decimal unit_price
    }
```

## Table purposes
- **users:** account identity, hashed password, and role.
- **categories:** product grouping.
- **products:** catalog details, price, and available stock.
- **orders:** order owner, total, status, and timestamp.
- **order_items:** product, quantity, and price snapshot for each order.

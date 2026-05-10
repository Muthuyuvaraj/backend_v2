# VIGNESH AGENCY — Backend v2

**Pure JavaScript SQLite — No Visual Studio / C++ build tools needed on Windows!**

Previous version used `better-sqlite3` which requires compiling C++ native modules.  
This version uses `sql.js` — a WebAssembly port of SQLite that works on all platforms without any build tools.

---

## ✅ Quick Start (Windows)

```powershell
cd backend
npm install
npm start
```

That's it! No Visual Studio, no Python, no node-gyp errors.

Server runs at → **http://localhost:3001**

---

## File Structure

```
backend/
├── server.js          ← Entry point
├── database.js        ← sql.js setup, schema, seed data
├── package.json
├── vignesh_agency.db  ← Auto-created SQLite file (after first run)
└── routes/
    ├── dashboard.js   ← Today's stats, agency profile
    ├── dealers.js     ← Dealer CRUD + statement
    ├── products.js    ← Product groups + variants
    ├── bills.js       ← Create & manage bills
    ├── payments.js    ← Record payments
    └── reports.js     ← Sales reports (daily/weekly/monthly...)
```

---

## API Endpoints

### Dashboard
```
GET  /api/dashboard          → Today sales, pending, counts, recent bills
GET  /api/dashboard/agency   → Agency profile
PUT  /api/dashboard/agency   → Update agency profile
```

### Dealers
```
GET    /api/dealers              → List all (optional ?search=)
GET    /api/dealers/:id          → Dealer + bill history
POST   /api/dealers              → Create dealer
PUT    /api/dealers/:id          → Update dealer
DELETE /api/dealers/:id          → Delete (only if no bills)
GET    /api/dealers/:id/statement → Bills + payments summary
```

### Products
```
GET    /api/products             → All groups + variants (optional ?category=Milk)
GET    /api/products/categories  → ['Milk', 'Curd', ...]
POST   /api/products             → Create group  { name, category }
PUT    /api/products/:id         → Update group
DELETE /api/products/:id         → Delete group + variants
POST   /api/products/:id/variants     → Add variant
PUT    /api/products/variants/:vid    → Update variant
DELETE /api/products/variants/:vid    → Delete variant
```

### Bills
```
GET    /api/bills                → List (optional ?dealer_id, ?status, ?date)
GET    /api/bills/:id            → Full bill with items + agency info (for invoice)
POST   /api/bills                → Create bill
PATCH  /api/bills/:id/status     → Update status { status: 'paid' }
DELETE /api/bills/:id            → Delete bill
```

**POST /api/bills body:**
```json
{
  "dealer_id": 1,
  "bill_date": "2026-04-11",
  "items": [
    { "variant_id": 2, "crates": 4 },
    { "variant_id": 1, "crates": 4 }
  ]
}
```

### Payments
```
GET  /api/payments               → Recent payments
GET  /api/payments/dealer/:id    → Dealer payment history
POST /api/payments               → Record payment
```

**POST /api/payments body:**
```json
{
  "dealer_id": 1,
  "bill_id": 3,
  "amount": 1087.20,
  "mode": "cash"
}
```
Modes: `cash` | `upi` | `bank` | `cheque`

### Reports
```
GET /api/reports?period=daily       → Daily report
GET /api/reports?period=weekly
GET /api/reports?period=monthly
GET /api/reports?period=quarterly
GET /api/reports?period=half_yearly
GET /api/reports/outstanding        → Dealers with pending balance
GET /api/reports/products           → Product-wise performance
```

---

## Why sql.js instead of better-sqlite3?

| Feature           | better-sqlite3    | sql.js (this version) |
|-------------------|-------------------|-----------------------|
| Windows install   | ❌ Needs VS C++   | ✅ Pure JS, no tools  |
| Performance       | ✅ Native speed   | ✅ Fast enough        |
| File persistence  | ✅ Auto           | ✅ Manual save (done) |
| API compatibility | Same SQL          | Same SQL              |

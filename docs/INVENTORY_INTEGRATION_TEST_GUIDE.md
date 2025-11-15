# Frontend Inventory Integration - Testing Guide

## ✅ Completed Features

### 1. Stock Badges on Product Cards (CJCatalog.jsx)
**What was added:**
- Green "✓ IN STOCK" badge for products with ≥10 units
- Orange "⚡ X LEFT" badge for products with 1-9 units
- Red "OUT OF STOCK" badge for products with 0 units

**How to test:**
1. Navigate to the storefront (main product catalog)
2. Look for colored badges in the top-right corner of each product card
3. Badges auto-update based on `stock_quantity` from database

---

### 2. Stock Info in Product Detail Modal (ProductDetail.jsx)
**What was added:**
- Dynamic stock status below price:
  - "✓ In stock" (green) for ≥10 units
  - "⚡ Only X left - order soon!" (orange) for 1-9 units
  - "✕ Out of Stock" (red) for 0 units
- Disabled "Add to Cart" button when out of stock

**How to test:**
1. Click any product card to open detail modal
2. Check stock status display under the price
3. Try to add out-of-stock item to cart (button should be disabled)

---

### 3. Admin Inventory Panel (AdminDashboard > Inventory tab)
**What was added:**
- New "📦 Inventory" tab in admin dashboard
- Stats cards showing:
  - Total products
  - In Stock count (≥10)
  - Low Stock count (1-9)
  - Out of Stock count (0)
- Product table with:
  - Product name, CJ PID, stock quantity, status badge
  - Expandable warehouse details (location, stock breakdown, last updated)
- "🔄 Sync Now" button to manually trigger CJ inventory sync

**How to test:**
1. Login as admin (support@snuggleup.co.za)
2. Open Admin Dashboard
3. Click "Inventory" tab
4. View stats cards and product table
5. Click "Show (X)" button to expand warehouse details for a product
6. Click "🔄 Sync Now" to trigger manual sync (will update stock from CJ API)
7. Check sync result notification (shows updated/failed counts)

---

### 4. Cart Stock Validation (App.jsx)
**What was added:**
- Visual warnings in cart:
  - "⚠️ Out of stock" for items with 0 available
  - "⚠️ Only X available" when cart quantity > stock
- Pre-checkout validation:
  - Fetches latest stock for each cart item before payment
  - Blocks checkout if any item is out of stock or insufficient quantity
  - Shows detailed alert listing unavailable items

**How to test:**
1. Add products to cart
2. Open cart modal
3. Check for stock warnings under product name (if applicable)
4. Adjust cart quantity beyond stock limits to trigger warnings
5. Click "Proceed to PayFast Checkout"
6. If any item has stock issues, alert will appear listing problems
7. Update cart and retry

---

## 🧪 End-to-End Test Scenarios

### Scenario A: Happy Path (In Stock)
1. Backend: Run inventory sync to populate stock data
2. Frontend: View product catalog → see "IN STOCK" badges
3. Click product → see "✓ In stock" status
4. Add 2 units to cart
5. Proceed to checkout → validation passes, redirect to PayFast

### Scenario B: Low Stock Warning
1. Admin: Navigate to Inventory panel
2. Find product with 1-5 units in stock
3. Frontend: View that product → see "X LEFT" badge
4. Open detail → see "⚡ Only X left" warning
5. Add to cart → see warning in cart view
6. Checkout should still work if quantity ≤ stock

### Scenario C: Out of Stock Blocking
1. Admin: Find product with 0 stock
2. Frontend: See "OUT OF STOCK" badge
3. Click product → "Add to Cart" button disabled
4. If already in cart, checkout will be blocked with alert

### Scenario D: Manual Sync Workflow
1. Admin: Open Inventory panel
2. Note current stock levels
3. Click "🔄 Sync Now"
4. Wait for sync to complete (throttled by CJ API limits)
5. Check sync result notification
6. Expand warehouse details to verify updated timestamps
7. Frontend: Badges and stock status should reflect new data

---

## 🚀 Quick Start Commands

### Backend
```powershell
cd backend
npm run dev
```

### Frontend
```powershell
cd frontend
npm run dev
```

### Trigger Manual Sync (Alternative: via API)
```powershell
# Using curl (PowerShell)
$token = "YOUR_ADMIN_JWT_TOKEN"
curl -X POST "http://localhost:3000/api/cj/inventory/sync" `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"limit": 10}'
```

---

## 📋 Environment Variables (Optional Tuning)

Add to `backend/.env`:
```env
# Enable/disable scheduled sync (default: enabled)
CJ_INVENTORY_SYNC_ENABLED=true

# Sync interval in milliseconds (default: 15 min)
CJ_INVENTORY_SYNC_INTERVAL_MS=900000

# Max products per sync batch (default: all)
CJ_INVENTORY_SYNC_BATCH_LIMIT=100
```

---

## 🐛 Known Edge Cases Handled

1. **Missing cj_vid**: Service attempts to fetch product details and extract first variant ID
2. **CJ API throttling**: Service respects 1 req/sec limit + backoff on 429 errors
3. **Stock data unavailable**: Products show 0 stock until first sync completes
4. **Cart item stock_quantity missing**: Defaults to 0, triggers out-of-stock warning

---

## 🔄 Next Steps (Optional Enhancements)

- [ ] Low-stock email alerts (when stock < threshold)
- [ ] CJ webhook integration for real-time updates
- [ ] Inventory history chart in admin panel
- [ ] Multi-warehouse selection for customers
- [ ] Safety stock buffer (reserve units to prevent overselling)

---

## ✅ Validation Checklist

- [x] Stock badges render on product cards
- [x] Stock status shows in product detail
- [x] Admin inventory panel loads data
- [x] Manual sync updates database
- [x] Warehouse details expand/collapse
- [x] Cart displays stock warnings
- [x] Checkout blocks on out-of-stock items
- [x] No console errors in browser/backend
- [x] All modified files pass linter (0 errors)

---

**Implementation Date:** November 15, 2025  
**Files Modified:**
- `frontend/src/lib/cjApi.js` (added inventory helpers)
- `frontend/src/components/CJCatalog.jsx` (stock badges)
- `frontend/src/components/ProductDetail.jsx` (stock status)
- `frontend/src/components/AdminDashboard.jsx` (inventory tab)
- `frontend/src/components/admin/InventoryPanel.jsx` (new)
- `frontend/src/App.jsx` (cart stock warnings)
- `backend/src/db.js` (inventory table)
- `backend/src/services/inventorySync.js` (new)
- `backend/src/routes/cj.js` (sync endpoints)
- `backend/src/server.js` (scheduled sync)
- `CJ_API_REFERENCE.md` (documentation)

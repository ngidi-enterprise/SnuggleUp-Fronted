# Admin Access Fix - Quick Guide

## What Was Wrong?

1. **SQL Query Error**: The analytics endpoint had a broken PostgreSQL query using `jsonb_array_elements` incorrectly
2. **No Admin Flag**: Your email `support@snuggleup.co.za` wasn't marked as admin in the database

## What I Fixed

### 1. Fixed Analytics Query (`backend/src/routes/admin.js`)
Changed from:
```sql
SELECT 
  jsonb_array_elements(items::jsonb)->>'name' as product_name,
  jsonb_array_elements(items::jsonb)->>'id' as product_id,
  ...
```

To:
```sql
SELECT 
  item->>'name' as product_name,
  item->>'id' as product_id,
  ...
FROM orders, jsonb_array_elements(items::jsonb) as item
```

### 2. Added Hardcoded Admin Email (`backend/src/middleware/admin.js`)
Now `support@snuggleup.co.za` is automatically recognized as admin without needing database setup!

```javascript
const ADMIN_EMAILS = [
  'support@snuggleup.co.za',
  // Add more admin emails here as needed
];
```

## How to Test It Now

### Option 1: Use the HTML File (Recommended)

1. **Open this file in your browser:**
   ```
   c:\Users\MHlomuka\Downloads\Workspace\make-admin-support.html
   ```
   - Right-click the file → "Open with" → Chrome/Edge/Firefox
   - OR double-click it to open in your default browser

2. **Click "Grant Admin Access"** button
   - This will call the backend to make you admin
   - If it fails, the backend might be sleeping (Render free tier)

3. **Go back to your SnuggleUp website and refresh**
   - You should now see "Admin Dashboard" button

### Option 2: Deploy Changes to Render

If your backend is on Render (production), you need to:

1. **Commit and push these changes:**
   ```powershell
   git add .
   git commit -m "Fix admin access and analytics query"
   git push origin main
   ```

2. **Wait for Render to auto-deploy** (2-3 minutes)

3. **Refresh your SnuggleUp website**
   - The frontend will detect you're admin automatically

### Option 3: Start Backend Locally

If you have Node.js installed:

```powershell
# In backend directory
cd c:\Users\MHlomuka\Downloads\Workspace\backend
npm install  # If not done already
npm run dev
```

Then update your frontend `.env`:
```
VITE_API_BASE=http://localhost:3000
```

## Why You're Getting 500 Error

The error "Failed to fetch analytics" was caused by:
1. Broken SQL query trying to call `jsonb_array_elements` multiple times
2. PostgreSQL doesn't allow that syntax

The fix uses a cross join with `jsonb_array_elements` as a table function, which is the correct PostgreSQL pattern.

## Verify Admin Access

Once backend is updated, check:
1. Frontend shows "Admin Dashboard" button next to your name
2. Console logs: `✅ SUCCESS! You are recognized as admin!`
3. Clicking "Admin Dashboard" opens the admin panel

## Files Changed

- ✅ `backend/src/routes/admin.js` - Fixed analytics query
- ✅ `backend/src/middleware/admin.js` - Added hardcoded admin email
- ✅ `make-admin-support.html` - Helper tool to set admin flag

## Next Steps

After you're logged in as admin, you can:
1. View analytics (orders, revenue, top products)
2. Curate products from CJ catalog
3. Set custom pricing
4. Manage orders and users

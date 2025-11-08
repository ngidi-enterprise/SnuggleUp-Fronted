# Quick Deployment Guide - Upload to GitHub

## The Problem
Your local changes aren't on GitHub yet, so Render doesn't have the new code. You need to upload these files manually since git isn't installed.

## Solution: Use GitHub's Web Interface

### Step 1: Open Your GitHub Repository
1. Go to https://github.com and login
2. Navigate to your SnuggleUp repository
3. You should see folders like `backend/`, `frontend/`, etc.

### Step 2: Upload NEW Backend Files

#### Upload `backend/src/routes/setup.js`
1. In GitHub, click on `backend` → `src` → `routes`
2. Click "Add file" → "Upload files"
3. From your computer, navigate to `C:\Users\MHlomuka\Downloads\Workspace\backend\src\routes\`
4. Upload `setup.js`
5. Scroll down and click "Commit changes"

#### Upload `backend/src/routes/admin.js`
- Same process as above, upload `admin.js` to `backend/src/routes/`

#### Upload `backend/src/routes/products.js`
- Same process as above, upload `products.js` to `backend/src/routes/`

#### Upload `backend/src/middleware/admin.js`
1. In GitHub, go to `backend` → `src` → `middleware`
2. Click "Add file" → "Upload files"
3. Upload `admin.js` from `C:\Users\MHlomuka\Downloads\Workspace\backend\src\middleware\`

### Step 3: Update MODIFIED Backend Files

#### Update `backend/src/server.js`
1. In GitHub, navigate to `backend/src/server.js`
2. Click the pencil icon (Edit this file)
3. Open your local file at `C:\Users\MHlomuka\Downloads\Workspace\backend\src\server.js`
4. Copy ALL the content from your local file
5. Paste it into the GitHub editor (replacing everything)
6. Scroll down and click "Commit changes"

#### Update `backend/src/db.js`
- Same process: edit in GitHub, paste content from your local file

### Step 4: Upload Frontend Admin Components

#### Create the admin folder
1. In GitHub, go to `frontend/src/components/`
2. Click "Add file" → "Create new file"
3. Type `admin/Analytics.jsx` in the filename box (this creates the folder)
4. Open your local file at `C:\Users\MHlomuka\Downloads\Workspace\frontend\src\components\admin\Analytics.jsx`
5. Copy and paste the content
6. Commit

#### Upload remaining admin components
Repeat for each file:
- `admin/ProductCuration.jsx`
- `admin/PricingManager.jsx`
- `admin/OrderManagement.jsx`
- `admin/UserManagement.jsx`

#### Upload admin dashboard files
1. Go to `frontend/src/components/`
2. Upload `AdminDashboard.jsx`
3. Upload `AdminDashboard.css`

### Step 5: Update Frontend Files

Update these files using the edit method (like you did for server.js):
- `frontend/src/App.jsx`
- `frontend/src/components/CJCatalog.jsx`
- `frontend/src/components/CJProductDetail.jsx`

### Step 6: Wait for Deployment

1. Go to https://dashboard.render.com
2. Click on your web service (backend)
3. You should see "Deploy in progress" or a new deploy starting automatically
4. Wait 2-5 minutes for it to finish
5. Check the logs for "✅ PostgreSQL database initialized successfully"

### Step 7: Make Yourself Admin

Open Render Dashboard → PostgreSQL database → Connect → PSQL Command

Run this SQL:
```sql
UPDATE users SET is_admin = TRUE WHERE email = 'support@snuggleup.co.za';
```

### Step 8: Test

1. Open https://snuggleup-frontend.onrender.com (or your Render frontend URL)
2. Login with support@snuggleup.co.za
3. Look for 🛡️ Admin button in header
4. Click it to open admin dashboard

---

## Files Checklist

**NEW Backend Files:**
- [ ] backend/src/routes/setup.js
- [ ] backend/src/routes/admin.js
- [ ] backend/src/routes/products.js
- [ ] backend/src/middleware/admin.js

**NEW Frontend Files:**
- [ ] frontend/src/components/admin/Analytics.jsx
- [ ] frontend/src/components/admin/ProductCuration.jsx
- [ ] frontend/src/components/admin/PricingManager.jsx
- [ ] frontend/src/components/admin/OrderManagement.jsx
- [ ] frontend/src/components/admin/UserManagement.jsx
- [ ] frontend/src/components/AdminDashboard.jsx
- [ ] frontend/src/components/AdminDashboard.css

**MODIFIED Files:**
- [ ] backend/src/server.js (added routes)
- [ ] backend/src/db.js (added curated_products table)
- [ ] frontend/src/App.jsx (added admin button)
- [ ] frontend/src/components/CJCatalog.jsx (fetch from /api/products)
- [ ] frontend/src/components/CJProductDetail.jsx (fetch curated product)

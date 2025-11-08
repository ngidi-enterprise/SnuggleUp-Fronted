# Make Yourself Admin - SQL Method

Since the new backend code isn't deployed yet, use this SQL command directly in your Render PostgreSQL database:

## Step 1: Go to Render Dashboard
1. Open https://dashboard.render.com
2. Click on your PostgreSQL database (not the web service)
3. Click "Connect" → "PSQL Command" (copy the command)
4. OR use the web SQL editor if available

## Step 2: Run This SQL Command

```sql
-- Make support@snuggleup.co.za an admin
UPDATE users 
SET is_admin = TRUE 
WHERE email = 'support@snuggleup.co.za';

-- Verify it worked
SELECT email, is_admin, created_at 
FROM users 
WHERE email = 'support@snuggleup.co.za';
```

If you see `is_admin | t` (true) in the result, you're now an admin!

## Step 3: Deploy New Code to Render

You need to upload these NEW files to your GitHub repository:

### New Files (must be created in GitHub):
- `backend/src/routes/setup.js`
- `backend/src/routes/admin.js`
- `backend/src/routes/products.js`
- `backend/src/middleware/admin.js`
- All files in `frontend/src/components/admin/` folder:
  - `Analytics.jsx`
  - `ProductCuration.jsx`
  - `PricingManager.jsx`
  - `OrderManagement.jsx`
  - `UserManagement.jsx`
- `frontend/src/components/AdminDashboard.jsx`
- `frontend/src/components/AdminDashboard.css`

### Modified Files (must be updated in GitHub):
- `backend/src/server.js`
- `backend/src/db.js`
- `frontend/src/App.jsx`
- `frontend/src/components/CJCatalog.jsx`
- `frontend/src/components/CJProductDetail.jsx`

## Step 4: After Deployment

1. Wait 2-3 minutes for Render to rebuild
2. Login to your store with support@snuggleup.co.za
3. Look for the 🛡️ Admin button in the header
4. Click it to access the admin dashboard

## Alternative: Use GitHub Web Interface

Since you don't have git installed locally:

1. Go to your GitHub repository in a web browser
2. Navigate to each folder (backend/src/routes, etc.)
3. Click "Add file" → "Upload files"
4. Drag and drop the new files from your Downloads/Workspace folder
5. Commit the changes
6. Render will automatically detect and deploy

---

**Important**: The admin dashboard and curated products system won't work until the new backend code is deployed to Render!

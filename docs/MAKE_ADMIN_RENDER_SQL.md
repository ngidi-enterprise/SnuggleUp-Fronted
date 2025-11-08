# Make Admin via Render PostgreSQL Shell

## Quick Method (Recommended) - Direct SQL

Since the HTML file has CORS issues, use Render's built-in PostgreSQL shell:

### Step 1: Go to Your Database on Render

1. Visit: https://dashboard.render.com
2. Click on your **PostgreSQL database** (not the web service)
3. Look for "Connect" or "Shell" option

### Step 2: Run This SQL Command

```sql
-- Insert or update support@snuggleup.co.za as admin
INSERT INTO users (email, password, name, is_admin)
VALUES ('support@snuggleup.co.za', 'external-auth', 'Support', TRUE)
ON CONFLICT (email) 
DO UPDATE SET is_admin = TRUE;

-- Verify it worked
SELECT email, is_admin, name, created_at 
FROM users 
WHERE email = 'support@snuggleup.co.za';
```

You should see:
```
email                    | is_admin | name    | created_at
support@snuggleup.co.za  | t        | Support | 2025-11-05...
```

### Step 3: Test Admin Access

1. Go to your SnuggleUp website: https://vitejsviteeadmfezy-esxh--5173--cf284e50.local-credentialless.webcontainer.io
2. **Hard refresh** (Ctrl+Shift+R or Cmd+Shift+R)
3. You should now see "Admin Dashboard" button

## Alternative: Use the HTML File After CORS Fix

I've updated the backend to allow CORS for the setup endpoint. After the next deployment:

1. Open: `C:\Users\MHlomuka\Downloads\Workspace\make-admin-support.html`
2. Click "Grant Admin Access"
3. Should work without CORS errors

## Why This Works Now

The backend code now includes:
1. **Hardcoded admin email** - `support@snuggleup.co.za` is automatically recognized
2. **Fixed analytics query** - No more 500 errors
3. **CORS enabled for setup** - HTML file can make requests

## What Happens Next?

Once you're admin:
- Frontend detects admin status by calling `/api/admin/analytics`
- "Admin Dashboard" button appears in header
- You can access all admin features:
  - View analytics
  - Curate products from CJ
  - Set custom pricing
  - Manage orders

## Troubleshooting

**Still not showing as admin?**
1. Clear browser cache
2. Log out and log back in
3. Check browser console for errors
4. Verify database has `is_admin = TRUE` for your email

**Can't access Render database?**
1. Go to dashboard.render.com
2. Select your PostgreSQL instance
3. Click "Info" tab
4. Copy the PSQL Command
5. Run it in your local terminal (requires psql installed)

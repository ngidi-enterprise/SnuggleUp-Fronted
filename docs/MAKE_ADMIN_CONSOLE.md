# Make Admin via Browser Console - EASIEST METHOD

Since CORS is blocking the HTML file, use your SnuggleUp website's console directly:

## Steps:

### 1. Go to Your SnuggleUp Website
Open: https://vitejsviteeadmfezy-esxh--5173--cf284e50.local-credentialless.webcontainer.io

### 2. Open Browser Console
Press **F12** or right-click → "Inspect" → Click "Console" tab

### 3. Copy and Paste This Code
```javascript
fetch('https://snuggleup-backend.onrender.com/api/setup/make-admin', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'support@snuggleup.co.za',
    secret: 'snuggleup-admin-setup-2025'
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ SUCCESS!', data);
  alert('Admin access granted! Refresh the page.');
})
.catch(err => {
  console.error('❌ ERROR:', err);
  alert('Error: ' + err.message);
});
```

### 4. Press Enter

You should see:
```
✅ SUCCESS! { success: true, message: 'User is now an admin!', user: {...} }
```

### 5. Refresh the Page
Press **Ctrl + Shift + R** (hard refresh)

### 6. Check for Admin Button
You should now see "Admin Dashboard" button next to your name!

---

## Alternative: Since Hardcoded Email is Already Deployed

Actually, you might already be admin! The code has:
```javascript
const ADMIN_EMAILS = ['support@snuggleup.co.za'];
```

Try this in the console to check:
```javascript
// Check if you're recognized as admin
fetch('https://snuggleup-backend.onrender.com/api/admin/analytics', {
  headers: { 
    'Authorization': 'Bearer ' + localStorage.getItem('supabase.auth.token') 
  }
})
.then(r => r.json())
.then(data => console.log('✅ Admin check passed!', data))
.catch(err => console.error('❌ Not admin:', err));
```

If this works, you're already admin - just refresh the page!

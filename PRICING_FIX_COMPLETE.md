# Complete Pricing Fix - SnuggleUp

## What Happened
Products were showing inflated prices (R1321 instead of R69) due to **double USD→ZAR conversion** that occurred during a brief period when both frontend AND backend were converting prices.

## Current State ✅
**The code is NOW CORRECT** - no more double conversion will happen for new products:
- ✅ Frontend converts USD → ZAR (ProductCuration.jsx line 185)
- ✅ Backend receives ZAR, applies 2x markup only (admin.js line 152)
- ✅ No double conversion anymore

## Products That Need Fixing
Any products added between when we first implemented conversion and when we fixed it may have inflated prices. These need one-time correction.

---

## HOW TO FIX ALL PRODUCTS (Web-Based, No SQL Required)

### Step 1: Open the Fix Tool
1. Go to: **https://snuggleup.co.za/fix-all-prices.html**
2. Make sure you're logged in as admin first

### Step 2: Get Token
1. Click **"Get Token"** button
2. You should see: `✅ Token found: eyJhb...`

### Step 3: Preview
1. Click **"Preview All Products"**
2. You'll see a table showing:
   - Which products need fixing
   - Current prices vs. what they'll become
   - Total count

### Step 4: Fix
1. Click **"Fix All Products"**
2. Confirm the action
3. Wait for it to complete (shows progress)
4. You'll see: `✅ Fixed: X products`

### Step 5: Verify
1. Refresh your Admin Dashboard
2. Go to "Curated Products" tab
3. Check that prices now look reasonable:
   - Baby toys: R50-R300
   - Furniture: R400-R2000
   - Not: R1000+ for small items

---

## Technical Details

### Pricing Flow (Correct)
```
CJ API → Returns $69.98 USD
  ↓
Frontend (ProductCuration.jsx)
  → Converts: $69.98 × 18.90 = R1321.62
  → Sends to backend: cj_cost_price: 1321.62
  ↓
Backend (admin.js)
  → Receives: R1321.62 (already in ZAR)
  → Applies markup: R1321.62 × 2 = R2643.24
  → Stores: cost=R1321.62, retail=R2643.24
```

### What Was Wrong (Fixed)
During the bug period, backend ALSO converted:
```
Frontend: $69.98 × 18.90 = R1321.62 ✓
Backend: R1321.62 × 18.90 = R24,991 ✗ (DOUBLE CONVERSION!)
```

### The Fix
The tool detects products where:
- Cost price > R100 (likely double-converted)
- Dividing by 18.90 brings it to reasonable USD range ($1-$200)

Then updates them to correct ZAR values.

---

## Environment Variables
```env
USD_TO_ZAR=18.90        # Update this periodically for current exchange rate
PRICE_MARKUP=2.0        # 2x markup for retail (100% profit margin)
```

To change these:
1. Go to Render Dashboard → Backend Service → Environment
2. Update values
3. Save and redeploy

---

## Files Modified (Already Deployed)
- ✅ `frontend/src/components/admin/ProductCuration.jsx` - Frontend converts USD→ZAR
- ✅ `backend/src/routes/admin.js` - Backend expects ZAR, no conversion
- ✅ `frontend/public/fix-all-prices.html` - One-time fix tool

---

## FAQ

**Q: Will new products have this problem?**  
A: No, the code is fixed. Only products added during the brief bug period need correction.

**Q: How do I know if a product needs fixing?**  
A: If cost price is >R500 for baby items or >R100 seems too high for the product, it's likely affected.

**Q: Can I run the fix tool multiple times?**  
A: Yes, it's safe. It only updates products that need correction.

**Q: What if I manually edited a price?**  
A: The tool checks `custom_price` vs. calculated price. If you set a custom price, it won't override unless it's clearly wrong.

**Q: How often should I update USD_TO_ZAR?**  
A: Check monthly or when ZAR exchange rate changes significantly (±5%).

---

## Support
If you see any products with wrong prices after running the fix:
1. Note the product ID
2. Check the CJ website for the actual USD price
3. Manually edit in Admin Dashboard → Curated Products → Edit

# CJ Dropshipping Order Automation

## Overview
This system allows admins to submit paid orders to CJ Dropshipping for fulfillment and automatically track their shipping status.

## Implementation: Admin Manual Trigger (Option 2)

### Features Implemented

#### 1. Database Schema (✅ Complete)
Added 6 columns to `orders` table:
- `cj_order_id` - CJ's internal order ID
- `cj_order_number` - CJ's order number
- `cj_tracking_number` - Shipping tracking number
- `cj_tracking_url` - Tracking URL for customers
- `cj_submitted_at` - Timestamp when order was submitted to CJ
- `cj_status` - CJ fulfillment status (SUBMITTED, SHIPPED, etc.)

**File:** `backend/src/db.js` (lines 70-100)

#### 2. Helper Functions (✅ Complete)

**File:** `backend/src/routes/orders.js`

##### `getOrderById(orderId)`
- Fetches order details from database
- Parses JSON items field
- Returns complete order object with cart items

##### `buildCJOrderData(order)`
- Transforms local order format to CJ API format
- Maps shipping information
- Filters products to only include CJ items (with `cj_vid`)
- Returns payload for `cjClient.createOrder()`

**Required fields in order:**
- `order_number` - Your order number
- `shipping_country` - Country code (default: 'ZA')
- `shipping_method` - Logistics provider (default: 'USPS+')
- `items[]` - Array with `cj_vid` and `quantity`

**Note:** Currently uses placeholder shipping data. Future enhancement: collect customer shipping details during checkout.

##### `updateOrderCJInfo(orderId, cjOrderId, cjOrderNumber, cjStatus)`
- Updates order with CJ response data
- Sets `cj_submitted_at` timestamp
- Marks status as 'SUBMITTED'

##### `updateOrderTracking(cjOrderId, trackingNumber, trackingUrl)`
- Updates order tracking information
- Sets status to 'SHIPPED'
- Called by CJ webhook handler

#### 3. Admin Endpoint (✅ Complete)

**File:** `backend/src/routes/admin.js`

##### POST `/api/admin/orders/:orderId/submit-to-cj`
**Purpose:** Submit a paid order to CJ for fulfillment

**Flow:**
1. Fetch order from database
2. Validate order status is 'paid'
3. Check order hasn't already been submitted
4. Build CJ order payload
5. Validate cart contains CJ products (cj_vid present)
6. Call `cjClient.createOrder()`
7. Update local order with CJ order IDs
8. Return success/error response

**Success Response:**
```json
{
  "success": true,
  "message": "Order submitted to CJ successfully",
  "cjOrderId": "CJ12345",
  "cjOrderNumber": "CJO987654321",
  "orderNumber": "SUP-1234567890"
}
```

**Error Responses:**
- `404` - Order not found
- `400` - Order not paid / already submitted / no CJ products
- `500` - CJ API error

##### GET `/api/admin/orders`
**Purpose:** List all orders with CJ status

**Returns:**
- Order details including CJ tracking columns
- Parsed items array
- Limited to 100 most recent orders

#### 4. Admin UI (✅ Complete)

**File:** `frontend/src/components/admin/OrderManagement.jsx`

**Features:**
- Added "CJ Status" column to orders table
- "Submit to CJ" button for paid orders without CJ order ID
- Displays CJ order status badges (SUBMITTED, SHIPPED, etc.)
- Shows tracking number when available
- Order detail modal shows full CJ information:
  - CJ Order ID and Number
  - CJ Status badge
  - Tracking number and link
  - Submission timestamp

**UI States:**
- Not submitted: "Not submitted" (gray)
- Submitted: Green badge with status
- Shipped: Includes tracking number
- Submitting: Button shows "Submitting..." (disabled)

#### 5. Cart Integration (✅ Complete)

**File:** `frontend/src/components/CJProductDetail.jsx` (lines 148-149)

Cart items already include:
```javascript
{
  id: `curated-${product.id}`,
  name: product.product_name,
  price: product.custom_price,
  image: product.product_image,
  category: product.category,
  cj_vid: product.cj_vid,  // ✅ Required for CJ order submission
  cj_pid: product.cj_pid,  // ✅ CJ product ID
  stock_quantity: product.stock_quantity,
  quantity: 1
}
```

**Verification:**
- Cart items passed to `createOrder()` in `backend/src/routes/payments.js`
- Stored in `orders.items` JSON field
- Extracted by `buildCJOrderData()` helper

#### 6. CJ Webhook Handler (✅ Complete)

**File:** `backend/src/routes/cj.js`

##### POST `/api/cj/webhook`
**Purpose:** Receive tracking updates from CJ Dropshipping

**Security:**
- Validates `x-cj-signature` header
- Verifies webhook authenticity

**Handled Events:**

1. **Logistics/Shipping Events** (`logistics`, `order_shipped`)
   - Extracts tracking number and URL
   - Calls `updateOrderTracking()`
   - Updates order status to 'SHIPPED'
   - Logs success

2. **Order Status Updates** (`order_status`)
   - Updates `cj_status` field
   - Logs status change

**TODO: Email Notifications**
The webhook handler includes commented code for sending customer email notifications. To implement:
1. Set up email service (SendGrid, AWS SES, etc.)
2. Uncomment email code in webhook handler
3. Create email template with tracking link

### Usage Workflow

#### For Admins:
1. Customer completes PayFast payment
2. Order status automatically updates to 'paid'
3. Admin opens Admin Dashboard → Orders tab
4. Click "Submit to CJ" button next to paid order
5. System validates and submits order to CJ
6. CJ Order ID and Number displayed immediately
7. When CJ ships, webhook updates tracking info automatically
8. Customer can view tracking number (future: email notification)

#### Current Limitations:
1. **Shipping Information:** Uses placeholder data
   - **Fix:** Add shipping form to checkout flow
   - Collect: name, address, city, province, postal code, phone
   
2. **Email Notifications:** Not implemented
   - **Fix:** Integrate email service (SendGrid recommended)
   - Send tracking link when webhook receives shipping notification

3. **Mixed Orders:** Non-CJ products not handled
   - Only items with `cj_vid` are submitted to CJ
   - Other items would require separate fulfillment process

4. **Payment Gateway:** Currently supports PayFast only
   - CJ requires confirmation payment received before processing

### API Reference

See `CJ_API_REFERENCE.md` for complete CJ API documentation.

**Key CJ Methods Used:**
- `cjClient.createOrder(orderData)` - Submit order for fulfillment
- `cjClient.getOrderStatus(cjOrderId)` - Check order status
- `cjClient.getTracking(trackingNumber)` - Get shipment tracking

### Testing

**Manual Test Flow:**
1. Add CJ product to cart (ensure `cj_vid` is set)
2. Complete checkout with PayFast
3. Mark payment as successful (test mode)
4. Login as admin
5. Navigate to Orders tab
6. Click "Submit to CJ" for the paid order
7. Verify success message shows CJ Order ID
8. Check order details show CJ information

**Webhook Testing:**
Use CJ webhook simulator or create test POST request:
```bash
POST http://your-backend.com/api/cj/webhook
Headers:
  x-cj-signature: <valid_signature>
  x-cj-timestamp: <timestamp>
  Content-Type: application/json

Body:
{
  "eventType": "logistics",
  "data": {
    "orderId": "CJ12345",
    "trackingNumber": "1Z999AA10123456789",
    "trackingUrl": "https://tracking.example.com/track/1Z999AA10123456789"
  }
}
```

### Database Queries

**Check CJ order status:**
```sql
SELECT 
  order_number,
  status,
  cj_order_id,
  cj_order_number,
  cj_status,
  cj_tracking_number,
  cj_submitted_at
FROM orders
WHERE cj_order_id IS NOT NULL
ORDER BY cj_submitted_at DESC;
```

**Find orders ready for CJ submission:**
```sql
SELECT 
  id,
  order_number,
  total_amount,
  created_at
FROM orders
WHERE status = 'paid'
  AND cj_order_id IS NULL
ORDER BY created_at ASC;
```

### Future Enhancements

1. **Automatic Submission:** Convert to Option 1 (PayFast webhook auto-submit)
2. **Bulk Submission:** Select multiple orders and submit in batch
3. **Retry Logic:** Auto-retry failed submissions
4. **Customer Portal:** Show tracking in user dashboard
5. **Email Notifications:** Automated shipping confirmations
6. **Shipping Form:** Collect customer shipping details at checkout
7. **Returns/Refunds:** Integration with CJ returns API
8. **Inventory Alerts:** Prevent orders for out-of-stock items

## Files Modified

- `backend/src/db.js` - Database schema
- `backend/src/routes/orders.js` - Helper functions
- `backend/src/routes/admin.js` - Admin endpoints + imports
- `backend/src/routes/cj.js` - Webhook handler + imports
- `frontend/src/components/admin/OrderManagement.jsx` - UI updates
- `frontend/src/components/CJProductDetail.jsx` - Already had cart integration

## Related Documentation

- `CJ_API_REFERENCE.md` - Complete CJ API documentation
- `CJ_SETUP.md` - Initial CJ integration setup
- `payfast_README.md` - PayFast payment integration
- `ADMIN_DASHBOARD_GUIDE.md` - Admin panel usage

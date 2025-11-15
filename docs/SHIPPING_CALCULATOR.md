# Real-Time Shipping Calculator Implementation

## Overview
Customers can now choose from real shipping methods with actual costs and delivery times from CJ Dropshipping. No more flat shipping rates - prices are calculated based on cart contents, destination country, and selected carrier.

## Features Implemented

### 1. Backend API (`/api/shipping/...`)

**POST /quote**
- Accepts cart items (with CJ variant IDs) and shipping destination
- Calls CJ's `freightCalculate` API for real quotes
- Returns multiple shipping options with:
  - Carrier name (e.g., "CJ Packet-Registered", "DHL Express")
  - Price in USD and ZAR (auto-converted)
  - Delivery time estimates
  - Tracking availability

**GET /countries**
- Returns list of supported shipping destinations
- Includes country codes, names, and flag emojis

### 2. Frontend Integration

**Cart Shipping Selector**
- Automatically fetches quotes when cart opens
- Displays shipping methods in dropdown:
  - Carrier name
  - Price in ZAR
  - Estimated delivery days
- Auto-selects cheapest option by default
- Updates total price when method changes

**Checkout Flow**
- Selected shipping method passed to PayFast payment
- Shipping cost included in order total
- Method name stored for CJ order creation

### 3. Data Flow

```
1. User adds items to cart
2. Cart opens → fetch shipping quotes
   ├─ Extract cj_vid from cart items
   ├─ POST to /api/shipping/quote
   ├─ Backend calls CJ freightCalculate
   └─ Return quotes with ZAR prices
3. User selects shipping method
4. Checkout → pass shippingMethod to PayFast
5. Order creation → use logisticName for CJ order
```

## API Request/Response Examples

### Request to `/api/shipping/quote`:
```json
{
  "items": [
    { "cj_vid": "V123456", "quantity": 2 },
    { "cj_vid": "V789012", "quantity": 1 }
  ],
  "shippingCountry": "ZA",
  "postalCode": "2196"
}
```

### Response:
```json
{
  "quotes": [
    {
      "logisticName": "CJ Packet-Registered",
      "totalPostage": 5.50,
      "priceUSD": 5.50,
      "priceZAR": 101.75,
      "deliveryDay": "15-25",
      "currency": "USD",
      "tracking": true
    },
    {
      "logisticName": "DHL Express",
      "totalPostage": 25.00,
      "priceUSD": 25.00,
      "priceZAR": 462.50,
      "deliveryDay": "5-7",
      "currency": "USD",
      "tracking": true
    }
  ],
  "shippingCountry": "ZA",
  "fromCountry": "CN"
}
```

## Currency Conversion
- CJ returns prices in USD
- Backend converts to ZAR using configured rate (currently 18.5)
- **TODO**: Update exchange rate regularly or integrate live currency API

## User Experience Improvements

### Before
- ✗ Flat R99 shipping for all orders
- ✗ No delivery time estimates
- ✗ Limited to one shipping method
- ✗ Free shipping over R800

### After
- ✓ Real prices based on weight/destination
- ✓ Multiple carrier options
- ✓ Delivery time estimates (5-25 days)
- ✓ Tracking availability shown
- ✓ Cheaper options for lighter items
- ✓ Express shipping available

## Configuration

### Exchange Rate (Update Regularly)
File: `backend/src/routes/shipping.js`
```javascript
const USD_TO_ZAR = 18.5; // Update this value
```

### Supported Countries
Currently hardcoded list in `/api/shipping/countries`
- Add more countries as needed
- CJ supports 200+ destinations

## Testing Checklist

1. **Cart with single item**
   - ✓ Quotes load when cart opens
   - ✓ Cheapest method auto-selected
   - ✓ Prices display correctly in ZAR

2. **Cart with multiple items**
   - ✓ Combined shipping calculated
   - ✓ Heavier items = higher quotes

3. **Different countries**
   - ✓ Change country → new quotes
   - ✓ Prices vary by destination

4. **Checkout flow**
   - ✓ Selected method passed to PayFast
   - ✓ Shipping cost included in total
   - ✓ Order record includes shipping method

5. **Edge cases**
   - ✓ Missing cj_vid → error message
   - ✓ CJ API down → fallback to standard shipping
   - ✓ No quotes available → display error

## Known Limitations

1. **Exchange rate hardcoded** - needs manual updates or API integration
2. **No postal code validation** - accepts any input
3. **Cache not implemented** - same cart fetches quotes every time (could optimize)
4. **CJ rate limiting** - if many users checkout simultaneously, may hit API limits

## Future Enhancements

- [ ] Live currency conversion API (e.g., exchangerate-api.com)
- [ ] Cache shipping quotes for 10 minutes per cart hash
- [ ] Allow admin to set markup on shipping costs
- [ ] Show estimated delivery date (not just days)
- [ ] Insurance options for valuable orders
- [ ] Bulk shipping discounts for multiple items

## Files Modified

### Backend
- `backend/src/routes/shipping.js` (NEW) - Shipping quote endpoints
- `backend/src/server.js` - Register shipping routes
- `backend/src/services/cjClient.js` - Already had getFreightQuote method

### Frontend
- `frontend/src/App.jsx` - Updated shipping fetch logic, field names (costZAR → priceZAR)
- `frontend/src/components/ShippingOptions.jsx` (NEW) - Standalone shipping selector component (not yet used, available for future checkout page)

## Deployment Notes

1. Restart backend server to load new shipping routes
2. Frontend will automatically use new `/api/shipping/quote` endpoint
3. No database migrations needed
4. Update `USD_TO_ZAR` exchange rate before deploying to production

## Customer Messaging

**Cart page notification:**
> 📦 Shipping Method: [Dropdown] 
> Prices and delivery times are calculated based on your cart contents.

**Checkout confirmation:**
> Your order will ship via [Carrier Name] from China.
> Estimated delivery: [X-Y days]
> Tracking: [Yes/No]

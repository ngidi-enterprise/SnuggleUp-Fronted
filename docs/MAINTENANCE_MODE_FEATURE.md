# Maintenance Mode Feature

## Overview
Added a friendly maintenance mode overlay that automatically detects when Render (or the backend) is experiencing downtime and displays a user-friendly message instead of confusing error screens.

## How It Works

### Automatic Detection
- **Failure Threshold**: After 2 consecutive API request failures, the maintenance mode overlay appears
- **Auto-Recovery**: When the backend comes back online, the failure counter resets automatically
- **Manual Retry**: Users can click "Try Again" to reload the page and attempt to reconnect

### User Experience
Instead of seeing cryptic errors like "Failed to fetch" or "Network error", users see:
- ☕ Friendly message: "We'll be right back! Our servers are taking a quick coffee break"
- Clear explanation of the temporary issue
- Prominent "Try Again" button
- Contact email for persistent issues
- Beautiful animated design that matches SnuggleUp branding

## Files Added

### `frontend/src/components/MaintenanceMode.jsx`
React component that displays the overlay with:
- Animated warning icon
- Friendly messaging
- Retry button
- Contact information

### `frontend/src/components/MaintenanceMode.css`
Styling for the maintenance mode:
- Full-screen overlay with backdrop blur
- Smooth fade-in animation
- Bouncing icon animation
- Responsive design for mobile
- Brand-matching color scheme (pink gradient buttons)

## Files Modified

### `frontend/src/App.jsx`
Added backend health monitoring:
- `backendDown` state - tracks if maintenance mode should show
- `backendCheckFailed` counter - tracks consecutive failures
- Enhanced `fetchApi()` function - monitors API health and updates counters
- MaintenanceMode component integrated at the end of the app

### `frontend/src/lib/cjApi.js`
Improved error handling:
- Better network error detection
- User-friendly error messages for backend unavailability

## Testing

### Simulate Backend Downtime
1. Stop your backend server locally, or wait for Render to go down
2. Try to browse products or perform any action requiring the API
3. After 2 failed requests, the maintenance overlay should appear
4. Restart backend and click "Try Again" - site should work again

### Manual Test
In browser console, you can simulate by setting:
```javascript
// Force maintenance mode on
window.dispatchEvent(new CustomEvent('backend-down'));
```

## Configuration

### Threshold Adjustment
To change when maintenance mode appears, edit in `App.jsx`:
```javascript
// Show maintenance mode after 2 consecutive failures
if (newCount >= 2) {
  setBackendDown(true);
}
```

Change `>= 2` to a different number (e.g., `>= 3` for 3 failures).

## Benefits

✅ **No User Confusion**: Clear communication instead of technical errors
✅ **Professional Image**: Shows you care about user experience even during issues
✅ **Automatic**: No manual intervention needed - detects and recovers automatically
✅ **Brand Consistent**: Matches SnuggleUp's friendly, parent-focused design
✅ **Mobile Friendly**: Responsive design works on all devices
✅ **Actionable**: Users can retry without needing to manually refresh

## Next Steps (Optional Enhancements)

1. **Status Page Integration**: Show real-time status from a monitoring service
2. **Estimated Recovery Time**: If you have monitoring, show expected recovery time
3. **Feature Degradation**: Instead of full lockout, allow browsing cached products
4. **Social Media Links**: Add links to your social channels for updates during outages

# Inventory Sync Monitoring & History

## Overview
Added comprehensive sync monitoring and history tracking to the admin dashboard, providing full visibility into automated and manual inventory synchronization runs.

## Features Implemented

### 1. **Database Schema**
Created `inventory_sync_history` table to track every sync run:
- `started_at` - Sync start timestamp
- `completed_at` - Sync completion timestamp
- `products_updated` - Count of successfully updated products
- `products_failed` - Count of failed products
- `status` - Sync status: `running`, `completed`, or `failed`
- `error_message` - Error details if sync failed
- `sync_type` - Either `scheduled` (automatic) or `manual` (admin-triggered)
- Automatically calculates duration via SQL `EXTRACT(EPOCH FROM (completed_at - started_at))`

### 2. **Backend Enhancements**

#### Updated `inventorySync.js`
- Logs every sync run to history table
- Records start time before sync begins
- Updates with success/failure status and metrics upon completion
- Returns `syncHistoryId` for tracking
- Accepts `syncType` parameter to distinguish scheduled vs manual syncs

#### New API Endpoints (`/api/cj/inventory/...`)

**GET /sync-history?limit=10** (Admin only)
```json
{
  "history": [
    {
      "id": 1,
      "started_at": "2025-11-15T10:30:00Z",
      "completed_at": "2025-11-15T10:32:15Z",
      "products_updated": 45,
      "products_failed": 2,
      "status": "completed",
      "sync_type": "scheduled",
      "duration_seconds": 135
    }
  ]
}
```

**GET /sync-status** (Admin only)
```json
{
  "lastSync": {
    "started_at": "2025-11-15T10:30:00Z",
    "completed_at": "2025-11-15T10:32:15Z",
    "products_updated": 45,
    "products_failed": 2,
    "status": "completed",
    "sync_type": "scheduled"
  },
  "isRunning": false,
  "currentSync": null,
  "nextScheduledSync": "2025-11-15T10:45:00Z",
  "syncInterval": 900000
}
```

### 3. **Frontend Admin Panel**

#### Sync Status Card
- Real-time sync status indicator (Running/Idle)
- Last sync timestamp and results
- Next scheduled sync time
- Products updated count
- Sync type (manual/scheduled)

#### Sync History Table (Toggleable)
- Last 10 sync runs displayed
- Columns: Started, Type, Updated, Failed, Duration, Status
- Color-coded status badges (green=completed, orange=running, red=failed)
- Auto-formatted duration (seconds → mm:ss)
- Scrollable history view

#### Enhanced Refresh
- Refresh button now reloads inventory, status, AND history
- All data stays in sync across panels

## Usage

### Admin Dashboard
1. Navigate to **Admin → Inventory**
2. View **Sync Status** card showing current state
3. Click **"Show History"** to see recent sync runs
4. Use **"Sync Now"** for manual sync (will be logged as `manual` type)
5. Scheduled syncs run automatically every 15 minutes (logged as `scheduled` type)

### Monitoring Sync Health
- **Green status**: Last sync completed successfully
- **Orange status**: Sync currently running
- **Failed products > 0**: Check backend logs for details
- **Duration tracking**: Identify performance issues if syncs take too long

## Database Initialization
The `inventory_sync_history` table is created automatically on server start via `backend/src/db.js`. No manual migration needed.

## Configuration
Sync interval controlled by environment variable:
```env
CJ_INVENTORY_SYNC_INTERVAL_MS=900000  # 15 minutes (default)
CJ_INVENTORY_SYNC_ENABLED=true         # Enable/disable scheduler
```

## Benefits
- **Accountability**: Track when and why inventory was synced
- **Debugging**: Identify patterns in sync failures
- **Performance**: Monitor sync duration over time
- **Visibility**: See difference between manual and automated syncs
- **Reliability**: Detect if scheduled syncs are running as expected

## Technical Notes
- History entries are never deleted (consider adding retention policy later)
- Failed syncs still create history records with error messages
- Sync status endpoint checks for running syncs to prevent overlaps
- Frontend auto-refreshes all data after manual sync completes
- Duration calculated server-side using PostgreSQL EXTRACT function

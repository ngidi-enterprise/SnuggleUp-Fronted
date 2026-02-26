# SnuggleUp Platform — Implementation Summary (Updated 2025-11-14)

This document reflects the current, working system: React + Vite frontend, Express (ESM) backend, PostgreSQL, Supabase Auth, CJ Dropshipping catalog, and PayFast payments. It replaces older SQLite-focused documentation.

## What’s included right now
- Supabase authentication integrated end-to-end (backend verifies tokens via JWKS RS256 → HS256 fallback → app JWT).
- CJ catalog browsing/search via the stable /product/list endpoint with proper field mapping and HTTPS image normalization.
- PayFast checkout flow, with success/cancel handling.
- Server-side cart persistence backed by PostgreSQL (JSONB) for authenticated users.
- 30-minute inactivity auto-logout with a 2-minute warning toast and “Stay Logged In” action.
- Mobile-responsive UI pass (header/grid/cart modal/touch targets).
- Admin Dashboard with Smart Pricing Assistant (pricing edits, margins/markups), Product Curation, Analytics, Orders, Users.

## Architecture at a glance
Frontend (Vite/React 18)
- Auth Context: Supabase session, activity tracking, warning toast
- Cart state in `App.jsx` with backend sync when authenticated
- CJ catalog/components with URL normalization
- Admin Dashboard overlays store for admins

Backend (Express, ESM)
- Auth: `src/middleware/auth.js` (JWKS, HS256 fallback, app JWT)
- Admin gate: `src/middleware/admin.js` (DB flag or allowlist; auto-provision user row if missing)
- Data: PostgreSQL via `src/db.js` (idempotent table creates, includes carts)
- Routes: `routes/admin.js`, `routes/cart.js`, `routes/cj.js`, `routes/payments.js`, `routes/products.js`

Key Data
- Table: `carts(id SERIAL, user_id TEXT UNIQUE, items JSONB, created_at, updated_at)`
- Curated products table used by admin features (pricing/curation)

## Core user journeys
New user (guest → buyer)
```
1) Browse CJ catalog → add to cart (guest, local state)
2) Login/Register (Supabase)
3) On login, cart merges: backend[] ∪ local[]; duplicates prefer higher quantity; merged saved to backend
4) Proceed to checkout → PayFast
5) On success: order handled; backend cart can be cleared
```
Returning user
```
1) Login → Admin check runs
2) Cart loads from backend (autosync on change)
3) Checkout to PayFast
```

## File map (current)
Backend
- `backend/src/db.js` — PostgreSQL init (idempotent creates, includes carts)
- `backend/src/middleware/auth.js` — Supabase token verification (JWKS, HS256 fallback, app JWT)
- `backend/src/middleware/admin.js` — Admin gate (DB flag or hardcoded allowlist), auto-provision local user
- `backend/src/services/cjClient.js` — CJ client, throttling, /product/list, field mapping
- `backend/src/routes/cart.js` — GET/POST/DELETE /api/cart (auth required)
- `backend/src/routes/admin.js` — Analytics, Curated products (list/update), Orders, Users, CJ helpers
- `backend/src/routes/payments.js` — PayFast form/signature + notify handling (now splits mixed carts into two orders with suffix -L/-I)


Frontend
- `frontend/src/context/AuthContext.jsx` — Supabase session + 30m inactivity with 28m warning
- `frontend/src/App.jsx` — Cart state, merge/clear logic, admin gating, PayFast call
- `frontend/src/components/admin/PricingManager.jsx` — Smart Pricing Assistant UI
- `frontend/src/components/CJCatalog.jsx`, `frontend/src/lib/cjApi.js` — Catalog UI + URL normalization
- `frontend/src/App.css` — Responsive styles and mobile/touch affordances

## Key endpoints
Public/optional auth
- `GET /api/cj/...` (catalog/shipping quotes; shipping requires body)

Authenticated
- `GET /api/cart` — get current cart (JSONB items)
- `POST /api/cart` — upsert cart items
- `DELETE /api/cart` — clear cart
- `POST /api/payments/create` — PayFast initiation (expects totals and items)

Admin (requireAdmin)
- `GET /api/admin/analytics`
- `GET /api/admin/products`  |  `PUT /api/admin/products/:id`
- `GET /api/admin/orders`    |  `PUT /api/admin/orders/:id`
- `GET /api/admin/users`     |  `PUT /api/admin/users/:id/admin`

## Cart persistence: contract
- Inputs: local cart array, backend cart array (JSONB)
- On login: merged = backend ∪ local; duplicates keep higher quantity; merged saved to backend immediately.
- On logout: cart is cleared locally.
- Autosave: when authenticated and cart changes, POST to /api/cart.
- Edge cases: backend 500s do not clear cart; local state wins.

## Session management
- 30-minute inactivity timeout.
- Warning toast at ~28 minutes with “Stay Logged In”.
- Activity sources: mousedown/keydown/scroll/touchstart.

## Database highlights
- `carts` table uses JSONB for flexibility and simple upsert logic.
- Admin/user records live in `users`; admin status is `is_admin` boolean.

## Admin & Smart Pricing Assistant
- Access: Admin Dashboard auto-opens for admins post-login.
- Pricing tab: Lists curated products, shows supplier cost, suggested 2x price, current retail, margin/markup badges; inline edit saves via `/api/admin/products/:id`.
- Admin checks: backend gate (DB `is_admin` or allowlist); frontend also has a tiny allowlist for UX.

## Mobile responsiveness
- Header stacks, product grid adapts (2→1 cols), cart modal full-screen on small viewports.
- Touch targets sized ≥44px; smooth scrolling; overflow-x hidden.

## How to run (dev)
- Backend: from `backend/` run `npm run dev` (nodemon on :3000). ESM with explicit `.js` imports.
- Frontend: from `frontend/` run `npm run dev` (Vite on :5173).
- PayFast testing: expose backend with `ngrok http 3000`, set `BACKEND_URL` to ngrok URL, `PAYFAST_TEST_MODE=true`.

## Challenges we hit and fixes
1) CJ API 1600101 “Interface not found”
- Cause: Using /product/listV2 and wrong fields.
- Fix: Revert to /product/list, parse `data.list`, fields `pid`, `productNameEn`.

2) Guest adds → login dropped items
- Cause: Merge only ran when backend had items; missed empty-backend case.
- Fix: Always merge local with backend; prefer higher quantity; save merged.

3) Cart not clearing on logout
- Fix: In `App.jsx` effect, when `!isAuthenticated && cartLoaded`, clear cart state.

4) 500s on /api/cart
- Cause: `req.user.id` used while middleware sets `req.user.userId`.
- Fix: Use `userId || id || sub` in cart routes.

## Quality gates (current)
- Build: PASS
- Lint/Typecheck: PASS (manual review; no strict config)
- Tests: Manual verification for recent changes (add focused tests next)

## Next steps
1) Promote your live login email to admin (SQL in AI_HANDOFF_NOTES.md) and verify dashboard loads.
2) Add 2–3 front-end tests around cart merge and logout clearing.
3) Harden shipping quotes (retry/backoff on 429/5xx; better UI messaging).
4) Prepare PayFast production mode checklist (keys, domain allowlists, notify URL).

## References
- Quick agent rules: `.github/copilot-instructions.md`
- Handoff summary: `AI_HANDOFF_NOTES.md`
- Admin/analytics, CJ token help: `backend/src/routes/admin.js`

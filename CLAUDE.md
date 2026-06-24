# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

No test suite is configured (`npm test` exits with an error).

## Environment Setup

Copy `.env.example` to `.env` and fill in:

```
MONGO_URL=          # Required — MongoDB connection string
JWT_SECRET=         # Required — JWT signing secret
PORT=3000           # Optional, defaults to 3000
NODE_ENV=development

# Optional: seeds a super admin on startup
SUPER_ADMIN_USERNAME=
SUPER_ADMIN_PASSWORD=
SUPER_ADMIN_FIRST_NAME=
SUPER_ADMIN_LAST_NAME=
SUPER_ADMIN_PHONE=
```

The app skips DB connection and seeding if `MONGO_URL` is unset (dev convenience), but `JWT_SECRET` and `MONGO_URL` are enforced as required at startup when running as the entry point.

## Architecture

This is an Express 5 + MongoDB (Mongoose) + Pug MVC app. The module system is ESM (`"type": "module"`). Entry point is `app.js`.

### Dual rendering pattern

The app serves two kinds of responses from the same routes:

- **SSR pages** (`/admin`, `/orders`, `/driver`, etc.): Protected by `pageAuth(role)` middleware (cookie-based JWT). Page data is fetched server-side in `src/services/page-data.service.js` and passed to Pug templates as `initData` (JSON-stringified). Client-side JS hydrates from `window.__initData`.
- **REST API** (`/api/*`): Protected by `authMiddleware` (JWT via cookie or `Authorization: Bearer` header) + `authorize(...roles)`. Used by client-side fetch calls and external integrations.

`pageAuth` redirects unauthenticated users to `/signin`; `authMiddleware` returns JSON 401s.

### Roles

Three user roles: `admin`, `driver`, `merchant`. Admins access all SSR admin pages; drivers access `/driver`; merchants access `/merchant`.

### Order model field abbreviations

The `Order` model uses abbreviated field names:
- `m` — merchant username
- `c` — customer (`f`=firstName, `l`=lastName, `p`=phone, `loc.d`=district, `loc.cty`=city)
- `pr` — price (`t`=total, `d`=delivery)
- `s` — status (0–6 enum)
- `e` — exchange/return flag, `eN` — exchange note
- `cb` — created by

### Key services

- `src/services/page-data.service.js` — all DB queries for SSR page hydration; one export per page (`getAdminPageData`, `getOrdersPageData`, etc.)
- `src/services/seedLocations.service.js` / `seedSuperAdmin.service.js` — run once at startup

### Middleware stack (in order)

1. `requestLogger` — attaches `X-Request-Id`, logs method/path/status
2. `helmet` — security headers
3. `rateLimit` — 200 req / 15 min per IP on `/api/*`
4. `pageAuth(role)` / `authMiddleware` + `authorize(...roles)` — route-level auth
5. `express-validator` chains from `src/middleware/validators.js` → `validateRequest` — request validation
6. `asyncHandler` — wraps async route handlers to forward errors to Express
7. `errorHandler` — global error handler (last middleware)

### Swagger / OpenAPI

Dev-only Swagger UI is mounted at `/docs/api` from `docs/openapi.yaml`.

### Static assets

Served from `src/public/`: `/assets`, `/css`, `/js`, `/components`.

## Security Fixes (Recent)

The following critical security vulnerabilities have been addressed:

### Authentication & Authorization
- All unauthenticated order GET endpoints now require authentication:
  - `GET /api/orders` — admin only
  - `GET /api/orders/:id` — admin, merchant, or driver
  - `GET /api/orders/merchant/:merchantName` — admin or merchant with ownership check
  - `GET /api/orders/:id/history` — admin or merchant
  - `GET /api/orders/customers/phone/:phone` — admin or merchant
- Public endpoint preserved: `GET /api/orders/track/:id` (for customer tracking page)
- Admin endpoints: `GET /api/drivers`, `GET /api/merchants`, `GET /api/merchants/:username`

### Data Access Control
- Driver status updates now verify ownership: `PATCH /api/orders/:id/status` only allows drivers to update their assigned orders
- Merchant access to orders filtered by username
- Hardcoded "operator" role removed (undefined in User model enum)

### Audit & Validation
- Audit logs now record actual user (`req.user.username`) instead of hardcoded "driver"/"admin"
- Status validator fixed: now validates `body("s")` matching controller expectation
- Order status conversion validates input explicitly, returns 400 for invalid values (no silent defaults)

### Auth Endpoints
- `GET /api/auth/me` — retrieve authenticated user
- `POST /api/auth/logout` — clear session
- Both require `authMiddleware`

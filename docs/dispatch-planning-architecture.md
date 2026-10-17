# Phase 14: website live tracking and dispatch planning

## Boundaries

Phase 14 adds SSR website consumers for Phase 13's existing process-memory live location service and a derived dispatch recommendation service. It does not change the Prisma schema, create migrations, or introduce a second location repository. Orders remain authoritative. A recommendation is advisory until an Admin explicitly confirms assignment.

There are no delivery coordinates in `Order`; destination data is district and city text. The `User` model has no active-driver flag. Therefore every account with role `DRIVER` is eligible for a suggestion, area text is only a grouping signal, and GPS is displayed as an informational fresh-sharing state only. The service never geocodes, calculates distance, estimates ETA, draws a route, or uses GPS to rank drivers.

## Shared dispatch flow

```text
Admin or Driver client
  → authenticated dispatch API
  → DispatchPlanningService (bounded board page + grouped workload aggregates)
  → deterministic workload/area recommendation
  → UI review
  → explicit Admin confirmation with order updatedAt version
  → existing updateOrder transaction + OrderHistory
  → existing Phase 11 after-commit event hook
```

Both SSR and Flutter render the same backend board and sequence contracts. Browser code and Flutter do not compute recommendations. The board reads at most 100 orders per page (default 50), while driver load is summarized by database aggregation over active orders. Filters include status (`WAREHOUSE` / `NEW`), assignment, Beirut-local today/all, Express, district, city, and merchant username. Only `WAREHOUSE` and `NEW` enter the dispatch pool. `Picked_up` contributes to driver workload but is never shown as assignable work.

Default assignment filtering is unassigned. Assigned orders can be inspected when requested but cannot be reassigned from the planner. There is no bulk assignment. The assign endpoint accepts only a driver username and the displayed order `updatedAt`; it loads and verifies the authoritative order, permits only unassigned `WAREHOUSE`/`NEW`, and delegates to the existing order update controller. That controller atomically guards the version, status, and `driverId = null` in the order update within the same transaction as the existing history insert. A stale update returns 409; no event dispatch occurs before commit. Existing assignment notifications/events remain the only lifecycle hooks.

## Ranking and driver sequence

Current active workload consists of assigned `WAREHOUSE`, `NEW`, and `Picked_up` orders. One waiting order is one workload unit; one picked-up order is two units. Lower score ranks first:

```text
weightedUnits × 100
+ activeExpressOrders × 20
- 25 when the driver has active work in the same district
- 40 when the driver has active work in the same district and city
```

Reasons expose the component facts that informed the suggestion. Ties use weighted units, active order count, normalized username, then driver ID. Page recommendations simulate the earlier recommendations in that same page when calculating later workload so that the planner does not repeatedly recommend one driver without accounting for its own preceding suggestions. This simulation is local to a response; it never writes assignments.

Driver `GET /api/dispatch/my-sequence` scopes by the authenticated Driver ID and orders their active assigned work by Express first, normalized district/city, created time, then order ID. This is a suggested list order, not navigation or route optimization. Driver's normal order list and lifecycle controls remain unchanged.

Fresh GPS is shown only as `isLive` and `updatedAt` on the Admin board. Coordinates are deliberately omitted and never affect scoring because customer destination coordinates do not exist.

## API access

| Contract | Access | Result |
| --- | --- | --- |
| `GET /api/dispatch/board` | Admin | Paged orders grouped by district/city, driver workload, recommendation and alternatives, filters and page metadata. No phone numbers or coordinates. |
| `POST /api/dispatch/orders/:id/assign` | Admin | Allows only `{driverUsername, expectedUpdatedAt}`. Rejects extra fields, unassigned/status/version mismatches. Uses the existing order assignment transaction and history. |
| `GET /api/dispatch/my-sequence` | Driver | Suggested sequence for `req.user.id`; no caller-supplied driver ID. |
| `GET /api/tracking/drivers/live` | Admin | Existing Phase 13 fresh location endpoint; used by Admin map only. |
| `GET /api/orders/track/:id/live` | Public | Existing Phase 13 order-ID endpoint; no driver lookup/enumeration or identity in the new response. |
| `GET /api/orders/:id/live` | Admin or owning Merchant | Existing Phase 13 endpoint; Merchant lookup is constrained to their own order. |
| `POST` / `DELETE /api/tracking/location` | Driver | Existing Phase 13 current-point publish/clear API. Website uses the same authenticated driver identity and endpoint. |

Cookie-authenticated browser mutations carry the existing CSRF token. Bearer-authenticated Flutter calls remain supported. Assignment requests are separately rate-limited. No arbitrary location, driver ID, order status, finance field, or recommendation is accepted from a client.

## Website live tracking

The public `/track?id=<Order.id>` page polls the existing public live-order endpoint every 12 seconds only for status `Picked_up`. It shows a current point only when the endpoint marks it fresh; stale/unavailable states clear the marker. It never calls the Admin driver enumeration endpoint.

Admin `/live-tracking` polls the existing Admin endpoint and displays only fresh current locations for drivers with active picked-up work. Merchant order tables offer a live-location dialog only for that Merchant's own `Picked_up` order; the backend's owner-scoped endpoint remains authoritative. Maps use Leaflet and OpenStreetMap tiles with attribution; if map assets or tiles fail, order state and location status remain available.

The SSR Driver dashboard has explicit Start, Pause, Resume, and Stop controls. Browser geolocation is requested only after Start, only in a secure context, and only when the page's assigned orders include a picked-up delivery. Publishing is throttled and applies the same Phase 13 validation. Hiding the tab pauses sharing and attempts to clear the current point; it does not resume automatically. Closing/navigation uses best-effort clear, with the Phase 13 TTL as fallback. This is foreground browser tracking, not background tracking.

All clients poll every 12 seconds while visible. Hidden pages clear displayed markers and resume with an immediate fresh API read. No route points are retained. The Phase 13 repository is process-local and defaults to `LIVE_TRACKING_ENABLED=false`. Render process/instance count must be verified before enabling it; multiple instances or restarts can lose/split current points. See [live tracking architecture](live-tracking-architecture.md).

The existing public order tracker already has its pre-Phase-14 public order fields. Phase 14 does not add phone or driver identity to the live-location payload, expand public order fields, or add any public driver listing.

## Persistence and future work

No Phase 14 persistence is added. Reliable multi-instance GPS requires an approved shared ephemeral/current-location store or database-backed design; route history requires explicit retention and privacy requirements. A true route planner would also require trustworthy destination coordinates and a routing provider/service. A durable dispatch-plan/recommendation history is not stored. Bulk atomic assignment is deferred; current UI confirms one order at a time.

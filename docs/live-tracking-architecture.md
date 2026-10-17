# Phase 13: live driver tracking

## Current architecture

Driver GPS is an explicit, foreground-only session:

```text
Driver taps Start
  → Flutter LocationSource checks platform/service permission
  → fixes are quality-checked and throttled
  → authenticated POST /api/tracking/location
  → backend verifies req.user is the driver and has a Picked_up order
  → latest point is held in an ephemeral repository
  → Admin, public-order, and merchant-order reads apply separate authorization
```

This does not reuse `OrderHistory.location` or any other unrelated field. The database has no dedicated live-coordinate storage, and Phase 13 adds none. Phase 11 notification events remain unchanged; GPS updates do not create notification events. Phase 12 WhatsApp/SMS messages do not carry coordinates.

## Storage and deployment

`InMemoryLiveLocationRepository` keeps only the newest point per driver in one Node process. The default is `LIVE_TRACKING_ENABLED=false`; disabled mode accepts no points and reports tracking unavailable. Enable it only after confirming the deployment is constrained to one process and accepting its ephemeral behavior.

Current Render instance count is not declared in this repository: there is no Render Blueprint or service configuration checked in. Verify the Render dashboard before setting the flag. Render can distribute requests across multiple instances and can briefly run replacement instances during deploys, so process-local points can be missing or split across instances. A restart, redeploy, recycle, scale event, or process replacement loses points. This is not durable or cross-instance tracking. See [Render scaling](https://render.com/docs/scaling) and [Render deploys](https://render.com/docs/deploys).

The repository expires points after `LIVE_LOCATION_TTL_SECONDS` (default 120 seconds, bounded to 30–3600). It marks a point stale after `LIVE_LOCATION_FRESH_SECONDS` (default 45 seconds, bounded to the TTL). Stale responses omit coordinates. Expired points are deleted when the repository is read or written; no route history is retained.

## Backend contracts

| Method and route | Access | Behavior |
| --- | --- | --- |
| `POST /api/tracking/location` | Authenticated Driver | Accepts only latitude, longitude, accuracy, optional heading/speed/capturedAt. Driver identity comes from the token. Rate limited to 30 requests/minute. Requires at least one assigned `Picked_up` order. |
| `DELETE /api/tracking/location` | Authenticated Driver | Clears only the caller's current in-memory point. |
| `GET /api/tracking/drivers/live` | Admin | Lists fresh locations only for current drivers with `Picked_up` work. No phone or finance data. |
| `GET /api/orders/track/:id/live` | Public, existing order-ID tracking contract | Resolves the current assigned driver from the order. Only `Picked_up` orders can expose a fresh point. No driver ID is accepted. Response is `no-store`. |
| `GET /api/orders/:id/live` | Admin or owning Merchant | Loads by order ID; Merchant lookup is constrained to `merchantId = req.user.id`. No merchant-wide driver endpoint exists. |

Public location is unavailable for unknown orders, unassigned orders, `WAREHOUSE`, `NEW`, delivered, cancelled, collected, or paid states. A reassignment immediately changes the source driver because every read reloads the order assignment. Public output contains only availability/live/stale flags, latitude/longitude/accuracy for a fresh point, and `updatedAt`; it contains no driver identity, phone, email, other orders, or finance information. Admin output may include driver identity and active picked-up order IDs.

Coordinates must be finite and within geographic bounds; accuracy is limited to 100 metres, speed to 80 m/s, heading to 0–360 degrees, device timestamps cannot be over two minutes old or 30 seconds in the future, and extra client fields are rejected. The backend performs no order writes or finance calculations.

## Flutter behavior

The Driver screen has an explicit Start/Resume/Stop control. Permission is requested only after Start; only while-in-use permission is requested. The app stops GPS publishing and clears its current server point when backgrounded, then checks service and permission again on resume. Logout also stops the local stream and attempts to clear the current point before removing the bearer token. A failed clear is bounded by server TTL. The session is not restored after process termination.

Geolocator requests high-accuracy foreground fixes with a 15-metre platform distance filter. Flutter publishes the first fix, then at most every five seconds after 25 metres of movement, or every ten seconds to refresh a stationary point. Fixes worse than 100 metres are ignored. Failed uploads are not queued; only a future latest fix is sent. Backend validation and the current database order status remain authoritative.

The public tracking page polls only the currently viewed `Picked_up` order every 12 seconds. Merchant order detail uses the authenticated, owner-scoped endpoint at the same cadence. Admin opens a dedicated live map from Admin → Drivers. Polling pauses when the app is backgrounded and stops when the view is disposed. The existing public route remains `/track?id=<Order.id>`.

## Maps and ETA

The project already contained `google_maps_flutter` but had no map implementation or Google key configuration. Phase 13 uses `flutter_map` with the OpenStreetMap standard raster tile URL and the visible `© OpenStreetMap contributors` attribution. Native `flutter_map` caching is enabled by default and honours tile cache metadata; browser caching is used on web. `LIVE_MAP_TILE_URL` can replace the URL template at Flutter build time (`--dart-define`), for example when GoDelivery selects a commercial or self-hosted provider. Do not put private keys in this client-side value.

OpenStreetMap's standard tiles are best-effort, require visible attribution and an identifying User-Agent for native apps, and must not be bulk downloaded or used as an unlimited high-volume commercial tile service. This app requests only tiles visible in an interactive map and sets `userAgentPackageName` to the app package. Confirm [the current OSM tile policy](https://operations.osmfoundation.org/policies/tiles/) and choose an OSM-derived hosted provider or self-hosted tiles if production volume needs a service guarantee.

Orders store city/district text and have no customer destination coordinates. The app does not geocode addresses or display distance/ETA. A point-to-point distance is also not shown because there is no destination point. Maps fail independently of order status and live-location API state.

## Configuration

Add these backend environment values only when enabling the feature:

```dotenv
LIVE_TRACKING_ENABLED=true
LIVE_LOCATION_FRESH_SECONDS=45
LIVE_LOCATION_TTL_SECONDS=120
```

The checked-in `.env.example` keeps tracking disabled. There are no credentials or provider tokens for location. Android declares coarse/fine location; iOS declares a When-In-Use purpose string. No background permission, Android foreground service, or iOS background mode is configured. On web, Geolocator requests browser permission only after the Driver taps Start and requires a secure context. Windows desktop Driver tracking is shown as unsupported.

## Privacy and reliability limitations

- Sharing starts only after a Driver action and is visibly indicated in the Driver screen.
- Only the driver's own current point can be published; a client cannot select another driver or order.
- Location reads are limited to Admin's current-work map, an existing public order ID while `Picked_up`, or a Merchant's own order.
- The system has no persistent preferences/consent, historical route, message history, durable retry queue, exactly-once guarantee, Redis, WebSocket/SSE, or delivery receipt. Failed GPS updates are dropped; a failed stop request is covered by TTL.
- The existing public order details endpoint already returns its established tracking fields, including customer phone, as documented by Phase 12. This Phase 13 endpoint adds no such fields and exposes no driver's personal details.
- Physical permission, battery, GPS-disabled, background/resume, reassignment, cancellation, delivery, and network-switch QA must be completed on real test accounts/devices before production enablement. No production GPS or customer data was used for automated verification.

## Future storage only (not implemented)

Reliable multi-instance current location could use a dedicated Redis/managed real-time store with TTL and authorization-aware reads. Optional durable sessions would need an approved schema describing driver, captured/received timestamps, accuracy, lifecycle, and retention/deletion rules. Historical routes require a separate explicit business purpose, user notice, access policy, and retention schedule. None of these models, migrations, external stores, or background services are part of Phase 13.

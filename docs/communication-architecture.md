# Phase 12 transactional communication

## Audit and current data

- Phase 11 already builds `ORDER_CREATED`, `ORDER_ASSIGNED`, `ORDER_PICKED_UP`, `ORDER_DELIVERED`, `ORDER_CANCELLED`, `ORDER_RETURNED`, `DRIVER_COLLECTION_CREATED`, `MERCHANT_PAYMENT_CREATED`, and `PREPAID_ADJUSTMENT_CREATED` events. Phase 12 consumes those event types through the existing `notifications.afterCommit` hook. Order creation now emits the same `ORDER_CREATED` event for Admin-created orders as well; it has no in-app recipient in that case, but lets the communication policy handle a customer receipt.
- Customer phone is `Order.customerPhone`. Merchant and Driver phone values are `User.phone`, through the existing Order relations or event recipient IDs.
- Order entry stores the selected country code with the customer phone. Existing formatting is varied, so `DEFAULT_PHONE_COUNTRY_CODE` is optional and empty by default. Without it, local numbers lacking an international/country prefix are rejected for external delivery. Stored values are never changed.
- No Twilio, Meta, WhatsApp, or SMS provider SDK was present. SMTP/Nodemailer is used for password reset only and is not reused for SMS.
- The public tracker is `/track?id=<orderId>`; the public API is `/api/orders/track/:id`. Tracking URLs use `APP_URL`.
- The schema has no consent or communication-preference fields and no durable outbox/message history. It does have legacy WhatsApp fields on Order, which this phase neither changes nor uses.
- Public tracking already returns the customer phone in its existing payload, and existing merchant/assigned-driver order APIs return customer phone under their current access rules. Phase 12 adds no public phone endpoint and the new preview is Admin-only or scoped to the Driver's assigned Order.

## Event path and policy

```text
successful business transaction
  → existing Phase 11 event
  → communication policy
  → authoritative recipient lookup
  → fixed internal template
  → selected transport
```

Controllers do not call provider code. The existing notification hook schedules communication dispatch after the transaction has committed. It does not await provider responses, and all communication failures are caught and logged without changing the business response.

Only the primary channel is selected for an event. Configure `COMMUNICATION_PRIMARY_CHANNEL=whatsapp` or `sms`; channels are never both sent by default. `COMMUNICATION_DRY_RUN=true` resolves recipients and templates, logs a masked destination and template key, and makes no network request. Production delivery additionally requires `NODE_ENV=production`, `COMMUNICATION_ENABLED=true`, an enabled channel, and valid provider configuration. Customer automation has a separate default-off `CUSTOMER_TRANSACTIONAL_MESSAGES_ENABLED` gate.

## Event matrix

| Event | Recipient | Internal template key | Automated channels | Default |
| --- | --- | --- | --- | --- |
| `ORDER_CREATED` | Customer, Merchant | `customer.order_created`, `merchant.order_created` | Configured primary only | Off |
| `ORDER_ASSIGNED` | Customer, Merchant, assigned Driver | `customer.order_assigned`, `merchant.order_assigned`, `driver.order_assigned` | Configured primary only | Off |
| `ORDER_PICKED_UP` | Customer, Merchant | `customer.order_picked_up`, `merchant.order_picked_up` | Configured primary only | Off |
| `ORDER_DELIVERED` | Customer, Merchant | `customer.order_delivered`, `merchant.order_delivered` | Configured primary only | Off |
| `ORDER_CANCELLED` | Customer, Merchant, assigned Driver | `customer.order_cancelled`, `merchant.order_cancelled`, `driver.order_cancelled` | Configured primary only | Off |
| `ORDER_RETURNED` | Merchant | `merchant.return_recorded` | Configured primary only | Off |
| `DRIVER_COLLECTION_CREATED` | Driver | `driver.collection_recorded` | Configured primary only | Off |
| `MERCHANT_PAYMENT_CREATED` | Merchant | `merchant.payment_recorded` | Configured primary only | Off |
| `PREPAID_ADJUSTMENT_CREATED` | Merchant | `merchant.prepaid_adjustment_recorded` | Configured primary only | Off |
| Other / unsupported event | None | None | None | Off |

Admin external messaging remains disabled; Admin already receives the Phase 11 in-app activity feed. Merchant and Driver automated messages require the global production gate and their channel configuration. Customer messages also require the separate customer gate.

## Templates and data handling

Templates use fixed, event-specific copy and only a recipient name, event reference, and (for customer Order messages) the public tracking link. No balances, settlement values, admin notes, internal status numbers, credentials, or user-supplied message bodies are sent. Financial communication merely states that a payment, prepaid adjustment, collection, or return was recorded; this layer does not calculate finance values.

Phone normalization trims, removes benign formatting, supports `+` and `00` international prefixes, and applies an explicitly configured default country code only to otherwise local numbers. It rejects values outside 8–15 digits and never changes database values. Logs include event, channel, internal template key, masked destination, provider category, and retryability only.

## Provider architecture

Twilio is the single provider adapter for both SMS and WhatsApp. The adapter uses Twilio's existing Messages REST API through Node's `fetch`, so no additional provider dependency is needed. SMS uses the rendered fixed message body. WhatsApp uses `ContentSid` and fixed variables; it requires an approved Twilio WhatsApp Content template. The internal template keys are independent of that provider Content SID.

No credentials are committed. Required environment values are `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM`, `TWILIO_WHATSAPP_FROM`, and `TWILIO_WHATSAPP_CONTENT_SID` for the enabled channel(s). WhatsApp sender format should be Twilio's `whatsapp:+<number>`. `APP_URL` supplies public tracking links. `COMMUNICATION_TIMEOUT_MS` is bounded to 1–15 seconds.

## Manual WhatsApp

Admin and Driver order details show Call and WhatsApp actions. The preview endpoint loads the Order and phone on the server, checks Admin access or assigned-Driver ownership, normalizes the number, and renders the fixed `customer.manual_tracking` message. Flutter shows a masked recipient and message preview. Open WhatsApp is a URL launch only; the user must press Send in WhatsApp. The action never calls a provider or mutates an Order.

The existing SSR Admin Orders table also retains its manual WhatsApp contact shortcut. No public or merchant communication control is added.

## Status, failure, and operational limits

Admin-only `GET /api/communications/status` reports provider name, per-channel configuration state, dry-run state, and whether customer automation is enabled. It does not test provider health and never returns credentials. Admin Settings displays this read-only status.

Twilio requests have a bounded timeout. Errors are classified as timeout, invalid recipient, authentication failure, quota/rate limit, provider rejection, or provider unavailable, with a retryable flag. There is no automatic retry loop, cross-process queue, or durable delivery state. Provider calls are best effort and a failed or timed-out message cannot undo a completed business transaction. A timeout can be ambiguous, so automatic retry/fallback is intentionally not performed. Delivery receipts/webhooks, exactly-once delivery, and persistent message history are not implemented.

## Consent and future persistence

There is no durable per-customer or per-user consent/preference model. Automated customer communication is therefore off by default and requires an explicit deployment gate; operators must enable it only after satisfying applicable provider and consent requirements outside this application. Manual WhatsApp remains user-initiated. The application does not claim persisted opt-in/opt-out or provide marketing features.

Reliable retries, duplicate suppression, delivery receipts, history, and consent enforcement would require a future approved migration for concepts such as a transactional outbox/message attempt record and per-recipient channel preference/consent state. No such schema change is part of Phase 12.

## Verification mode

Automated tests inject fake transports or mock `fetch`. Test runtime detection disables live adapters even if production credentials are present in the environment. Dry-run mode never initializes a real provider call. No test or preview path sends a real message.

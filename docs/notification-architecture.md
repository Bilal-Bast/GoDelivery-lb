# Phase 11 notification architecture

The database schema has no notification, device-token, or preference storage. Production push delivery and registration are disabled. This is intentional: neither a process-memory map nor an unrelated `User` or `Order` field is a safe token store.

## Current path

1. An authenticated order or settlement action validates and commits its existing Prisma transaction.
2. Its controller builds a small domain event and calls `notifications.afterCommit` once.
3. The notification service resolves tokens through a repository boundary. The production repository returns no tokens, so no provider is contacted and the business response is unaffected.
4. A separate authenticated, read-only `/api/notifications/recent` feed derives current-role activity from existing `OrderHistory`, `DriverCollection`, `MerchantPayment`, and `MerchantReturn` rows. No read/unread state is claimed.
5. Flutter polls that feed while signed in, presents new items in a Material snackbar, and lists recent items in Settings. Taps are mapped from a validated event type and current role to existing routes. The backend still authorizes every data fetch.

The feed is a best-effort recent view (30 days, bounded queries), not a durable delivery queue. Multiple processes or missed polls can delay or omit in-app presentation. Transactional outbox, retries, deduplication across processes, persistent preferences, and persistent push registration require future storage.

## Event recipients

| Event | Recipient |
| --- | --- |
| Merchant-created order | Admin |
| New assignment or reassignment | Current driver |
| Picked up, delivered | Merchant |
| Cancelled | Merchant and current driver |
| Driver collection | Driver |
| Postpaid merchant payment | Merchant |
| Prepaid adjustment | Merchant |
| Return | Merchant |

No customer push event is produced. The customer has no account or device association. Password reset stays on the existing SMTP path.

## Future push enablement

Add a durable, authenticated device-token relation tied to `User` with token hash/identifier, platform, timestamps, revocation, and a uniqueness rule; define account-switch/logout unregistration and invalid-token handling. A durable event/outbox and per-user preference storage would be separate schema decisions. Only after those are approved should a Firebase/APNs/web provider adapter, platform configuration, credentials, and registration API be enabled. No Firebase secret belongs in Flutter.

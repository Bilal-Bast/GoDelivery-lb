# Graph Report - GoDelivery-lb  (2026-11-09)

## Corpus Check
- 154 files · ~135,546 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 48 file(s) not represented in the graph (top: .pug 25, .css 19, .example 1)

## Summary
- 1275 nodes · 2969 edges · 63 communities (54 shown, 9 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 257 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4109a753`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- finance.controller.js
- paymentController.js
- user/api.js
- package.json
- merchant.js
- order/api.js
- orders.js
- dashboard.js
- finance.js
- driver.js
- analytics.js
- users.js
- app.js
- settings.js
- dependencies
- return.js
- analytics-report.test.js
- saveOrderChanges
- auth.routes.js
- location.routes.js
- signin.js
- OrderIDValidator
- initManualActions
- pay.js
- track.js
- tracking.routes.js
- collect.js
- DETAILED FINDINGS BY SECTION
- compilerOptions
- dialog.js
- communication.service.js
- loadOrders
- flattenHistoryChanges
- openAdminScanModal
- live-tracking.service.js
- reset-password.js
- initAdminPage
- buildOrderDiff
- Architecture
- dispatch-planning.service.js
- GoDelivery-lb
- scripts
- translateNode
- Phase 12 transactional communication
- orderDeletion.service.js
- manifest.js
- status-multiselect.js
- Phase 11 notification architecture
- Phase 13: live driver tracking
- dispatch.js
- live-tracking.js
- quickUpdateOrder
- driver-live-tracking.js
- updateDeliveryCharge
- authMiddleware
- devDependencies

## God Nodes (most connected - your core abstractions)
1. `createApp()` - 39 edges
2. `prisma` - 31 edges
3. `authMiddleware()` - 23 edges
4. `asyncHandler()` - 18 edges
5. `render()` - 18 edges
6. `authorize()` - 17 edges
7. `SettlementValidationError` - 17 edges
8. `express` - 16 edges
9. `orderFromPrisma()` - 16 edges
10. `notificationEvent()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Auth Endpoints` --references--> `authMiddleware()`  [INFERRED]
  CLAUDE.md → src/middleware/auth.middleware.js
- `Storage and deployment` --references--> `InMemoryLiveLocationRepository`  [INFERRED]
  docs/live-tracking-architecture.md → src/services/live-tracking/live-location-repository.js
- `Coding Style & Naming Conventions` --references--> `updateOrderStatus()`  [INFERRED]
  AGENTS.md → src/controllers/order/api.js
- `Coding Style & Naming Conventions` --references--> `createPayment()`  [INFERRED]
  AGENTS.md → src/controllers/payment/paymentController.js
- `Security & Configuration Tips` --references--> `adminOnly()`  [INFERRED]
  AGENTS.md → src/middleware/admin.middleware.js

## Import Cycles
- None detected.

## Communities (63 total, 9 thin omitted)

### Community 0 - "finance.controller.js"
Cohesion: 0.08
Nodes (65): createApp(), Key services, buildStats(), calculateDriverOutstandingRows(), collectFromDriver(), createFinanceExpense(), createFinanceTransaction(), expenseCategoryMap (+57 more)

### Community 1 - "paymentController.js"
Cohesion: 0.06
Nodes (82): ref_path, ref_url, createCollection(), createGetMyCollections(), deleteCollection(), findDriver(), generateCollectionPDF(), getCollectionById() (+74 more)

### Community 2 - "user/api.js"
Cohesion: 0.07
Nodes (58): Role casing, bcrypt, ref_crypto, nodemailer, changePassword(), createForgotPassword(), createGetMe(), createResetPassword() (+50 more)

### Community 3 - "package.json"
Cohesion: 0.07
Nodes (29): author, bugs, url, description, homepage, keywords, license, main (+21 more)

### Community 4 - "merchant.js"
Cohesion: 0.08
Nodes (40): allOrders, applyFilters(), autoFillDeliveryCharge(), buildSessionOrdersTable(), clearFilters(), countryCodes, districtToCityMap, escapeHtml() (+32 more)

### Community 5 - "order/api.js"
Cohesion: 0.06
Nodes (66): Order model field abbreviations, ref_node_assert, @prisma/client, adapter, prisma, buildDateRangeFilter(), buildRawWhereClauses(), getAnalytics() (+58 more)

### Community 6 - "orders.js"
Cohesion: 0.10
Nodes (16): applyFilters(), clearFilters(), fitBarcodeSvg(), flagEmojiToIso2(), getDriverOptionLabel(), getDriverOptionValue(), loadDrivers(), openPrintSheet() (+8 more)

### Community 7 - "dashboard.js"
Cohesion: 0.16
Nodes (25): bucketByDay(), buildPeriodControl(), countUp(), deltaChip(), exportCsv(), greeting(), init(), inRange() (+17 more)

### Community 8 - "finance.js"
Cohesion: 0.16
Nodes (17): currentPrepaidBalance(), downloadAdvancePDF(), findMerchantBalance(), getFilenameFromResponse(), handleCollectDriver(), handlePayMerchant(), loadPrepaidHistory(), money() (+9 more)

### Community 9 - "driver.js"
Cohesion: 0.12
Nodes (27): buildOrderCard(), buildSessionOrdersList(), closeModalAlert(), closeScanModal(), collectionSessions, currentDriverOrders, escapeHtml(), handleScanResult() (+19 more)

### Community 10 - "analytics.js"
Cohesion: 0.19
Nodes (25): applyFilters(), dayLabel(), escapeHtml(), hideError(), loadAllData(), locale(), populateMerchantFilter(), renderAll() (+17 more)

### Community 11 - "users.js"
Cohesion: 0.11
Nodes (23): apiDelete(), buildBlockerCardHtml(), buildCard(), proceedToDeleteConfirm(), buildDeleteConfirmBody(), closeResolveBlockersModal(), displayName(), fetchDeletePreview() (+15 more)

### Community 12 - "app.js"
Cohesion: 0.17
Nodes (10): currentFilePath, start(), Middleware stack (in order), cors, errorHandler(), requestLogger(), sanitizeRequest(), router (+2 more)

### Community 13 - "settings.js"
Cohesion: 0.07
Nodes (16): allowedHosts, assertDevelopmentDatabase(), drivers, ensureUser(), merchants, orderTemplates, seed(), checkPasswordStrength() (+8 more)

### Community 14 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, bcrypt, claude, cookie-parser, cors, csurf, dotenv, express (+12 more)

### Community 15 - "return.js"
Cohesion: 0.23
Nodes (16): buildOrdersTable(), closeScanModal(), downloadReturnPDF(), flashScan(), getFilenameFromResponse(), handleScan(), initScanner(), loadMerchantData() (+8 more)

### Community 16 - "analytics-report.test.js"
Cohesion: 0.11
Nodes (36): Build, Test, and Development Commands, Coding Style & Naming Conventions, Commit & Pull Request Guidelines, graphify, Project Structure & Module Organization, Repository Guidelines, Testing Guidelines, badRequest() (+28 more)

### Community 17 - "saveOrderChanges"
Cohesion: 0.18
Nodes (16): closeModal(), deleteOrder(), editOrder(), ensureModalDriverOption(), getModalDriverValueForSave(), getModalNumber(), saveOrderChanges(), scheduleModalOrderIdValidation() (+8 more)

### Community 18 - "auth.routes.js"
Cohesion: 0.11
Nodes (20): express-validator, getMe, logout(), validateRequest(), addAdminValidators, addDriverValidators, addLocationValidators, addMerchantValidators (+12 more)

### Community 19 - "location.routes.js"
Cohesion: 0.43
Nodes (6): addLocation(), addLocationSSR(), deleteLocation(), getLocations(), mapDistrictToLocation(), router

### Community 20 - "signin.js"
Cohesion: 0.17
Nodes (9): closeBtn, forgotPasswordForm, forgotPasswordFormBox, lbox, loginBtn, loginFormBox, openForgotPassword, togglePassword (+1 more)

### Community 22 - "initManualActions"
Cohesion: 0.18
Nodes (12): cancelledStatusLabel(), clearActionLog(), displayActionLog(), initManualActions(), initSearchableSelect(), getOptions(), render(), selectOption() (+4 more)

### Community 23 - "pay.js"
Cohesion: 0.33
Nodes (11): downloadPaymentPDF(), getFilenameFromResponse(), getPayout(), getSettleLabel(), loadMerchantData(), loadPaymentSessions(), printPaymentSession(), renderMerchantOrders() (+3 more)

### Community 24 - "track.js"
Cohesion: 0.23
Nodes (12): ACTION_TYPE_LABELS, describeHistoryValue(), escapeHtml(), fetchOrder(), flattenHistoryChanges(), formatHistoryChanges(), HISTORY_FIELD_LABELS, locale() (+4 more)

### Community 25 - "tracking.routes.js"
Cohesion: 0.13
Nodes (20): Security & Configuration Tips, express, express-rate-limit, handlers, getDrivers(), getDriverStats, src_controllers_live_tracking_controller_getadminlivedrivers, src_controllers_live_tracking_controller_publishdriverlocation (+12 more)

### Community 26 - "collect.js"
Cohesion: 0.36
Nodes (10): downloadCollectionPDF(), getCollectibleAmount(), getFilenameFromResponse(), loadCollectionSessions(), loadDriverData(), printCollectionSession(), renderDriverOrders(), saveCollectionToBackend() (+2 more)

### Community 27 - "DETAILED FINDINGS BY SECTION"
Cohesion: 0.11
Nodes (18): 🔴 CRITICAL (This Week), DETAILED FINDINGS BY SECTION, EXECUTIVE SUMMARY, 🟠 HIGH PRIORITY (This Month), 🟡 MEDIUM PRIORITY (This Quarter), PRIORITY ACTION PLAN, ⚠️ SECTION 10: SECRETS & CREDENTIALS MANAGEMENT (5/10), ✅ SECTION 1: ENVIRONMENT & CONFIGURATION (8/10) (+10 more)

### Community 28 - "compilerOptions"
Cohesion: 0.20
Nodes (9): compilerOptions, esModuleInterop, ignoreDeprecations, module, moduleResolution, skipLibCheck, target, types (+1 more)

### Community 29 - "dialog.js"
Cohesion: 0.47
Nodes (8): close(), dialogAlert(), dialogConfirm(), dialogPrompt(), ensureDom(), escapeHtml(), open(), textToHtml()

### Community 30 - "communication.service.js"
Cohesion: 0.07
Nodes (43): activeChannel(), channelRuntimeState(), CHANNELS, communicationConfig, communicationService, configuredChannel(), createCommunicationService(), afterCommit() (+35 more)

### Community 31 - "loadOrders"
Cohesion: 0.22
Nodes (11): buildBarcodeMarkup(), buildLabelMarkup(), buildOrderQueryParams(), changePage(), displayOrders(), escapeHtml(), loadOrders(), loadOrderSummary() (+3 more)

### Community 32 - "flattenHistoryChanges"
Cohesion: 0.29
Nodes (8): describeHistoryEntry(), describeHistoryValue(), fetchAndRenderTimeline(), flattenHistoryChanges(), formatHistoryChanges(), hasRestorableOldValue(), resetUndoState(), setUndoState()

### Community 33 - "openAdminScanModal"
Cohesion: 0.29
Nodes (7): closeAdminScanModal(), flashAdminScan(), handleAdminScan(), initAdminScanner(), loadAdminScanLibrary(), openAdminScanModal(), setAdminScannerZoom()

### Community 34 - "live-tracking.service.js"
Cohesion: 0.08
Nodes (29): createLiveTrackingHandlers(), getAdminLiveDrivers(), getAuthorizedOrderLiveLocation(), getPublicOrderLiveLocation(), publishDriverLocation(), stopDriverLocation(), failure(), handlers (+21 more)

### Community 35 - "reset-password.js"
Cohesion: 0.33
Nodes (4): form, messageEl, submitBtn, token

### Community 37 - "buildOrderDiff"
Cohesion: 0.67
Nodes (3): buildOrderDiff(), flattenForDiff(), setNestedValue()

### Community 41 - "Architecture"
Cohesion: 0.15
Nodes (11): Architecture, Audit & Validation, Auth Endpoints, Authentication & Authorization, Commands, Data Access Control, Environment Setup, Roles (+3 more)

### Community 42 - "dispatch-planning.service.js"
Cohesion: 0.11
Nodes (32): ref_node_test, createDispatchHandlers(), assignOrder(), getBoard(), getMySequence(), sendError(), ACTIVE_STATUSES, areaOrderCompare() (+24 more)

### Community 44 - "GoDelivery-lb"
Cohesion: 0.33
Nodes (5): API, Docs site (Docusaurus), GoDelivery-lb, Next steps, Quickstart

### Community 45 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, dev, postinstall, seed:dev, start, test

### Community 46 - "translateNode"
Cohesion: 0.57
Nodes (7): initialize(), queueTranslation(), restoreEnglish(), shouldSkipTextNode(), translateAttributes(), translateNode(), translateText()

### Community 50 - "Phase 12 transactional communication"
Cohesion: 0.15
Nodes (11): Audit and current data, Consent and future persistence, Event matrix, Event path and policy, Manual WhatsApp, Phase 12 transactional communication, Provider architecture, Status, failure, and operational limits (+3 more)

### Community 52 - "orderDeletion.service.js"
Cohesion: 0.18
Nodes (19): auditTimeWindow(), collectionDirection(), CollectionHistoryError, collectionValue(), findSingleByDescription(), findSingleCollectionAudit(), normalizeAmount(), removeCollectionLink() (+11 more)

### Community 55 - "manifest.js"
Cohesion: 0.33
Nodes (11): dateKey(), formatMoney(), formatPickupDate(), isAwaitingPickup(), matchesFilters(), pickupLabel(), printManifest(), render() (+3 more)

### Community 56 - "status-multiselect.js"
Cohesion: 0.48
Nodes (5): clear(), getSelected(), notifyChange(), setSelected(), updateLabel()

### Community 57 - "Phase 11 notification architecture"
Cohesion: 0.40
Nodes (4): Current path, Event recipients, Future push enablement, Phase 11 notification architecture

### Community 58 - "Phase 13: live driver tracking"
Cohesion: 0.11
Nodes (16): API access, Boundaries, Persistence and future work, Phase 14: website live tracking and dispatch planning, Ranking and driver sequence, Shared dispatch flow, Website live tracking, Backend contracts (+8 more)

### Community 59 - "dispatch.js"
Cohesion: 0.40
Nodes (10): filters(), hideError(), loadBoard(), node(), openReview(), renderBoard(), renderDrivers(), renderGroups() (+2 more)

### Community 60 - "live-tracking.js"
Cohesion: 0.45
Nodes (9): clearMarker(), ensureMap(), initMerchantOrder(), initPublicOrder(), loadAdmin(), loadMerchant(), loadPublic(), putMarker() (+1 more)

### Community 61 - "quickUpdateOrder"
Cohesion: 0.28
Nodes (9): addToActionLog(), cancelOrder(), insertLocalOrder(), patchLocalOrder(), playErrorBeep(), playSuccessBeep(), quickUpdateOrder(), refreshOrdersAfterChange() (+1 more)

### Community 63 - "driver-live-tracking.js"
Cohesion: 0.57
Nodes (7): clearWatch(), distanceMeters(), hasPickedUpOrder(), publish(), render(), start(), stopRemote()

### Community 64 - "updateDeliveryCharge"
Cohesion: 0.25
Nodes (8): applyOrderIdPrefix(), autoFillDeliveryCharge(), fetchMerchants(), loadMerchants(), populateMerchantSelectFromData(), renderLocationOptions(), selectLocation(), updateDeliveryCharge()

### Community 65 - "authMiddleware"
Cohesion: 0.40
Nodes (7): Dual rendering pattern, jsonwebtoken, authMiddleware(), pageAuth(), renewAuthCookie(), setAuthCookie(), signAuthToken()

### Community 66 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, nodemon, prisma, @types/node, typescript

## Knowledge Gaps
- **191 isolated node(s):** `currentFilePath`, `name`, `version`, `description`, `main` (+186 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 319 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `prisma` connect `order/api.js` to `finance.controller.js`, `paymentController.js`, `user/api.js`, `live-tracking.service.js`, `authMiddleware`, `dispatch-planning.service.js`, `app.js`, `settings.js`, `analytics-report.test.js`, `location.routes.js`, `tracking.routes.js`, `communication.service.js`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `InMemoryLiveLocationRepository` connect `live-tracking.service.js` to `Phase 13: live driver tracking`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `isDelivered()` connect `analytics-report.test.js` to `dashboard.js`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `createApp()` (e.g. with `getAnalytics()` and `login()`) actually correct?**
  _`createApp()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `authMiddleware()` (e.g. with `Security & Configuration Tips` and `createApp()`) actually correct?**
  _`authMiddleware()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **What connects `currentFilePath`, `name`, `version` to the rest of the system?**
  _191 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `finance.controller.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07757885763000852 - nodes in this community are weakly interconnected._
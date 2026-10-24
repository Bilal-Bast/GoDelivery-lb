# Graph Report - GoDelivery-lb  (2026-10-24)

## Corpus Check
- 151 files · ~125,443 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 45 file(s) not represented in the graph (top: .pug 24, .css 17, .example 1)

## Summary
- 1234 nodes · 2877 edges · 64 communities (54 shown, 10 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 245 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8a583bdb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- finance.controller.js
- returnController.js
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
- validators.js
- auth.controller.js
- signin.js
- OrderIDValidator
- initManualActions
- pay.js
- track.js
- authMiddleware
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
- page-auth.middleware.js
- GoDelivery-lb
- devDependencies
- translateNode
- Phase 12 transactional communication
- orderDeletion.service.js
- settlement.service.js
- collectionController.js
- paymentController.js
- Phase 11 notification architecture
- Phase 13: live driver tracking
- dispatch.js
- live-tracking.js
- quickUpdateOrder
- driver-live-tracking.js
- updateDeliveryCharge
- self-service.test.js

## God Nodes (most connected - your core abstractions)
1. `createApp()` - 38 edges
2. `prisma` - 30 edges
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
- `Order model field abbreviations` --references--> `orderFromPrisma()`  [INFERRED]
  CLAUDE.md → src/controllers/order/mappers.js
- `Order model field abbreviations` --references--> `normalizeOrderPayload()`  [INFERRED]
  CLAUDE.md → src/controllers/order/mappers.js

## Import Cycles
- None detected.

## Communities (64 total, 10 thin omitted)

### Community 0 - "finance.controller.js"
Cohesion: 0.08
Nodes (62): createApp(), Key services, buildStats(), calculateDriverOutstandingRows(), collectFromDriver(), createFinanceExpense(), createFinanceTransaction(), expenseCategoryMap (+54 more)

### Community 1 - "returnController.js"
Cohesion: 0.15
Nodes (26): ref_path, ref_url, generateCollectionPDF(), generatePaymentPDF(), deleteReturn(), generateReturnPDF(), getReturnableOrders(), getReturnById() (+18 more)

### Community 2 - "user/api.js"
Cohesion: 0.11
Nodes (41): Role casing, bcrypt, accountTypeChangeBlockReason(), addAdmin(), addDriver(), addMerchant(), BLOCKER_DEFS, clearUserBlockers() (+33 more)

### Community 3 - "package.json"
Cohesion: 0.07
Nodes (28): author, bugs, url, description, homepage, keywords, license, main (+20 more)

### Community 4 - "merchant.js"
Cohesion: 0.08
Nodes (37): allOrders, applyFilters(), autoFillDeliveryCharge(), buildSessionOrdersTable(), clearFilters(), countryCodes, districtToCityMap, escapeHtml() (+29 more)

### Community 5 - "order/api.js"
Cohesion: 0.05
Nodes (72): ref_node_test, @prisma/adapter-pg, @prisma/client, adapter, prisma, buildDateRangeFilter(), buildRawWhereClauses(), getAnalytics() (+64 more)

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
Cohesion: 0.13
Nodes (24): buildOrderCard(), buildSessionOrdersList(), closeModalAlert(), closeScanModal(), collectionSessions, currentDriverOrders, escapeHtml(), handleScanResult() (+16 more)

### Community 10 - "analytics.js"
Cohesion: 0.17
Nodes (22): applyFilters(), dayLabel(), escapeHtml(), hideError(), loadAllData(), populateMerchantFilter(), renderAll(), renderLocationsChart() (+14 more)

### Community 11 - "users.js"
Cohesion: 0.11
Nodes (23): apiDelete(), buildBlockerCardHtml(), buildCard(), proceedToDeleteConfirm(), buildDeleteConfirmBody(), closeResolveBlockersModal(), displayName(), fetchDeletePreview() (+15 more)

### Community 12 - "app.js"
Cohesion: 0.18
Nodes (10): currentFilePath, start(), Middleware stack (in order), ref_crypto, errorHandler(), requestLogger(), sanitizeRequest(), validateRequest() (+2 more)

### Community 13 - "settings.js"
Cohesion: 0.09
Nodes (8): checkPasswordStrength(), getPasswordStrengthClass(), getPasswordStrengthText(), initCountryDropdown(), setupFieldValidation(), setupPasswordStrength(), showFieldError(), error()

### Community 14 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, bcrypt, claude, cookie-parser, cors, csurf, dotenv, express (+12 more)

### Community 15 - "return.js"
Cohesion: 0.23
Nodes (16): buildOrdersTable(), closeScanModal(), downloadReturnPDF(), flashScan(), getFilenameFromResponse(), handleScan(), initScanner(), loadMerchantData() (+8 more)

### Community 16 - "analytics-report.test.js"
Cohesion: 0.09
Nodes (40): Build, Test, and Development Commands, Coding Style & Naming Conventions, Commit & Pull Request Guidelines, graphify, Project Structure & Module Organization, Repository Guidelines, Testing Guidelines, pdfkit (+32 more)

### Community 17 - "saveOrderChanges"
Cohesion: 0.18
Nodes (16): closeModal(), deleteOrder(), editOrder(), ensureModalDriverOption(), getModalDriverValueForSave(), getModalNumber(), saveOrderChanges(), scheduleModalOrderIdValidation() (+8 more)

### Community 18 - "validators.js"
Cohesion: 0.11
Nodes (19): express-validator, addLocation(), addLocationSSR(), deleteLocation(), getLocations(), mapDistrictToLocation(), addAdminValidators, addDriverValidators (+11 more)

### Community 19 - "auth.controller.js"
Cohesion: 0.14
Nodes (20): nodemailer, changePassword(), createForgotPassword(), createResetPassword(), forgotPassword, getMe, login(), logout() (+12 more)

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
Cohesion: 0.27
Nodes (11): ACTION_TYPE_LABELS, describeHistoryValue(), escapeHtml(), fetchOrder(), flattenHistoryChanges(), formatHistoryChanges(), HISTORY_FIELD_LABELS, renderOrderSummary() (+3 more)

### Community 25 - "authMiddleware"
Cohesion: 0.18
Nodes (17): Security & Configuration Tips, express, express-rate-limit, src_controllers_live_tracking_controller_getadminlivedrivers, src_controllers_live_tracking_controller_publishdriverlocation, src_controllers_live_tracking_controller_stopdriverlocation, asyncHandler(), authMiddleware() (+9 more)

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
Nodes (44): router, activeChannel(), channelRuntimeState(), CHANNELS, communicationConfig, communicationService, configuredChannel(), createCommunicationService() (+36 more)

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
Cohesion: 0.13
Nodes (13): Architecture, Audit & Validation, Auth Endpoints, Authentication & Authorization, Commands, Data Access Control, Dual rendering pattern, Environment Setup (+5 more)

### Community 42 - "dispatch-planning.service.js"
Cohesion: 0.11
Nodes (32): ref_node_assert, createDispatchHandlers(), assignOrder(), getBoard(), getMySequence(), sendError(), ACTIVE_STATUSES, areaOrderCompare() (+24 more)

### Community 43 - "page-auth.middleware.js"
Cohesion: 0.52
Nodes (5): jsonwebtoken, pageAuth(), renewAuthCookie(), setAuthCookie(), signAuthToken()

### Community 44 - "GoDelivery-lb"
Cohesion: 0.33
Nodes (5): API, Docs site (Docusaurus), GoDelivery-lb, Next steps, Quickstart

### Community 45 - "devDependencies"
Cohesion: 0.18
Nodes (10): devDependencies, nodemon, prisma, @types/node, typescript, scripts, dev, postinstall (+2 more)

### Community 46 - "translateNode"
Cohesion: 0.67
Nodes (6): initialize(), queueTranslation(), shouldSkipTextNode(), translateAttributes(), translateNode(), translateText()

### Community 50 - "Phase 12 transactional communication"
Cohesion: 0.15
Nodes (11): Audit and current data, Consent and future persistence, Event matrix, Event path and policy, Manual WhatsApp, Phase 12 transactional communication, Provider architecture, Status, failure, and operational limits (+3 more)

### Community 52 - "orderDeletion.service.js"
Cohesion: 0.18
Nodes (19): auditTimeWindow(), collectionDirection(), CollectionHistoryError, collectionValue(), findSingleByDescription(), findSingleCollectionAudit(), normalizeAmount(), removeCollectionLink() (+11 more)

### Community 54 - "settlement.service.js"
Cohesion: 0.24
Nodes (18): createCollectionSSR(), createPaymentSSR(), createReturn(), assertReturnNotPreviouslyLinked(), assertSettlementCanBeDeleted(), calculatePrepaidBalance(), collectionOrderDirection(), createCollectionSettlement() (+10 more)

### Community 55 - "collectionController.js"
Cohesion: 0.19
Nodes (18): createCollection(), createGetMyCollections(), deleteCollection(), findDriver(), getCollectionById(), getCollections(), getCollectionsByDriver(), getCollectionStats() (+10 more)

### Community 56 - "paymentController.js"
Cohesion: 0.22
Nodes (16): computePayout(), createGetMyPayments(), createPayment(), deletePayment(), findMerchant(), getEligiblePaymentOrders(), getMyPayments, getPaymentById() (+8 more)

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

## Knowledge Gaps
- **185 isolated node(s):** `currentFilePath`, `name`, `version`, `description`, `main` (+180 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 313 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `prisma` connect `order/api.js` to `finance.controller.js`, `returnController.js`, `live-tracking.service.js`, `user/api.js`, `dispatch-planning.service.js`, `page-auth.middleware.js`, `app.js`, `analytics-report.test.js`, `validators.js`, `auth.controller.js`, `settlement.service.js`, `collectionController.js`, `paymentController.js`, `authMiddleware`, `communication.service.js`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `error()` connect `settings.js` to `communication.service.js`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `createApp()` (e.g. with `getAnalytics()` and `login()`) actually correct?**
  _`createApp()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `authMiddleware()` (e.g. with `Security & Configuration Tips` and `createApp()`) actually correct?**
  _`authMiddleware()` has 19 INFERRED edges - model-reasoned connections that need verification._
- **What connects `currentFilePath`, `name`, `version` to the rest of the system?**
  _185 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `finance.controller.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08158508158508158 - nodes in this community are weakly interconnected._
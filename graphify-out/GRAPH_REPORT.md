# Graph Report - GoDelivery-lb  (2026-10-24)

## Corpus Check
- 151 files · ~125,613 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 45 file(s) not represented in the graph (top: .pug 24, .css 17, .example 1)

## Summary
- 1235 nodes · 2880 edges · 68 communities (59 shown, 9 thin omitted)
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
- tracking.routes.js
- collect.js
- DETAILED FINDINGS BY SECTION
- compilerOptions
- dialog.js
- communication.service.js
- loadOrders
- flattenHistoryChanges
- openAdminScanModal
- prisma.js
- reset-password.js
- initAdminPage
- buildOrderDiff
- CLAUDE.md
- dispatch-planning.service.js
- notification.service.js
- GoDelivery-lb
- devDependencies
- translateNode
- Phase 12 transactional communication
- orderDeletion.service.js
- location.routes.js
- settlement.service.js
- collectionController.js
- paymentController.js
- Phase 11 notification architecture
- Phase 13: live driver tracking
- dispatch.js
- live-tracking.js
- quickUpdateOrder
- Repository Guidelines
- driver-live-tracking.js
- updateDeliveryCharge
- authMiddleware
- scripts
- mailer.service.js

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

## Communities (68 total, 9 thin omitted)

### Community 0 - "finance.controller.js"
Cohesion: 0.08
Nodes (64): createApp(), Key services, @prisma/client, buildDateRangeFilter(), buildRawWhereClauses(), getAnalytics(), buildStats(), calculateDriverOutstandingRows() (+56 more)

### Community 1 - "returnController.js"
Cohesion: 0.16
Nodes (25): ref_path, ref_url, generateCollectionPDF(), generatePaymentPDF(), generateReturnPDF(), getReturnableOrders(), getReturnById(), getReturns() (+17 more)

### Community 2 - "user/api.js"
Cohesion: 0.10
Nodes (43): Role casing, bcrypt, createForgotPassword(), createResetPassword(), accountTypeChangeBlockReason(), addAdmin(), addDriver(), addMerchant() (+35 more)

### Community 3 - "package.json"
Cohesion: 0.07
Nodes (28): author, bugs, url, description, homepage, keywords, license, main (+20 more)

### Community 4 - "merchant.js"
Cohesion: 0.08
Nodes (37): allOrders, applyFilters(), autoFillDeliveryCharge(), buildSessionOrdersTable(), clearFilters(), countryCodes, districtToCityMap, escapeHtml() (+29 more)

### Community 5 - "order/api.js"
Cohesion: 0.08
Nodes (58): ref_node_test, src_controllers_live_tracking_controller_getauthorizedorderlivelocation, src_controllers_live_tracking_controller_getpublicorderlivelocation, cancelOrder(), createOrder(), deleteOrder(), exportOrders(), getCustomerByPhone() (+50 more)

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
Cohesion: 0.16
Nodes (11): currentFilePath, start(), ref_crypto, requestLogger(), sanitizeRequest(), router, router, router (+3 more)

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
Cohesion: 0.12
Nodes (34): pdfkit, badRequest(), download(), getAdminStatement(), getOwnStatement(), getReport(), getStatement(), exportFinanceHistory() (+26 more)

### Community 17 - "saveOrderChanges"
Cohesion: 0.18
Nodes (16): closeModal(), deleteOrder(), editOrder(), ensureModalDriverOption(), getModalDriverValueForSave(), getModalNumber(), saveOrderChanges(), scheduleModalOrderIdValidation() (+8 more)

### Community 18 - "validators.js"
Cohesion: 0.13
Nodes (14): addAdminValidators, addDriverValidators, addMerchantValidators, changePasswordValidators, createCollectionValidators, createOrderValidators, createPaymentValidators, forgotPasswordValidators (+6 more)

### Community 19 - "auth.controller.js"
Cohesion: 0.19
Nodes (17): jsonwebtoken, changePassword(), forgotPassword, getMe, login(), logout(), resetPassword, updateLanguage() (+9 more)

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

### Community 25 - "tracking.routes.js"
Cohesion: 0.13
Nodes (17): Security & Configuration Tips, express, express-rate-limit, createGetDriverStats(), getDriverOrders(), getDrivers(), getDriverStats, src_controllers_live_tracking_controller_getadminlivedrivers (+9 more)

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
Cohesion: 0.10
Nodes (35): activeChannel(), channelRuntimeState(), CHANNELS, communicationConfig, configuredChannel(), createCommunicationService(), afterCommit(), dispatch() (+27 more)

### Community 31 - "loadOrders"
Cohesion: 0.22
Nodes (11): buildBarcodeMarkup(), buildLabelMarkup(), buildOrderQueryParams(), changePage(), displayOrders(), escapeHtml(), loadOrders(), loadOrderSummary() (+3 more)

### Community 32 - "flattenHistoryChanges"
Cohesion: 0.29
Nodes (8): describeHistoryEntry(), describeHistoryValue(), fetchAndRenderTimeline(), flattenHistoryChanges(), formatHistoryChanges(), hasRestorableOldValue(), resetUndoState(), setUndoState()

### Community 33 - "openAdminScanModal"
Cohesion: 0.29
Nodes (7): closeAdminScanModal(), flashAdminScan(), handleAdminScan(), initAdminScanner(), loadAdminScanLibrary(), openAdminScanModal(), setAdminScannerZoom()

### Community 34 - "prisma.js"
Cohesion: 0.06
Nodes (33): @prisma/adapter-pg, adapter, prisma, createLiveTrackingHandlers(), getAdminLiveDrivers(), getAuthorizedOrderLiveLocation(), getPublicOrderLiveLocation(), publishDriverLocation() (+25 more)

### Community 35 - "reset-password.js"
Cohesion: 0.33
Nodes (4): form, messageEl, submitBtn, token

### Community 37 - "buildOrderDiff"
Cohesion: 0.67
Nodes (3): buildOrderDiff(), flattenForDiff(), setNestedValue()

### Community 41 - "CLAUDE.md"
Cohesion: 0.22
Nodes (7): Audit & Validation, Auth Endpoints, Authentication & Authorization, Commands, Data Access Control, Environment Setup, Security Fixes (Recent)

### Community 42 - "dispatch-planning.service.js"
Cohesion: 0.10
Nodes (35): ref_node_assert, createDispatchHandlers(), assignOrder(), getBoard(), getMySequence(), handlers, sendError(), assignmentLimiter (+27 more)

### Community 43 - "notification.service.js"
Cohesion: 0.14
Nodes (9): communicationService, createNotificationService(), afterCommit(), dispatch(), DisabledNotificationTokenRepository, DisabledPushTransport, notifications, NotificationTokenRepository (+1 more)

### Community 44 - "GoDelivery-lb"
Cohesion: 0.33
Nodes (5): API, Docs site (Docusaurus), GoDelivery-lb, Next steps, Quickstart

### Community 45 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, nodemon, prisma, @types/node, typescript

### Community 46 - "translateNode"
Cohesion: 0.57
Nodes (7): initialize(), queueTranslation(), restoreEnglish(), shouldSkipTextNode(), translateAttributes(), translateNode(), translateText()

### Community 50 - "Phase 12 transactional communication"
Cohesion: 0.15
Nodes (11): Audit and current data, Consent and future persistence, Event matrix, Event path and policy, Manual WhatsApp, Phase 12 transactional communication, Provider architecture, Status, failure, and operational limits (+3 more)

### Community 52 - "orderDeletion.service.js"
Cohesion: 0.18
Nodes (19): auditTimeWindow(), collectionDirection(), CollectionHistoryError, collectionValue(), findSingleByDescription(), findSingleCollectionAudit(), normalizeAmount(), removeCollectionLink() (+11 more)

### Community 53 - "location.routes.js"
Cohesion: 0.26
Nodes (9): express-validator, addLocation(), addLocationSSR(), deleteLocation(), getLocations(), mapDistrictToLocation(), validateRequest(), addLocationValidators (+1 more)

### Community 54 - "settlement.service.js"
Cohesion: 0.23
Nodes (19): createCollectionSSR(), createPaymentSSR(), createReturn(), deleteReturn(), assertReturnNotPreviouslyLinked(), assertSettlementCanBeDeleted(), calculatePrepaidBalance(), collectionOrderDirection() (+11 more)

### Community 55 - "collectionController.js"
Cohesion: 0.21
Nodes (17): createCollection(), createGetMyCollections(), deleteCollection(), findDriver(), getCollectionById(), getCollections(), getCollectionsByDriver(), getCollectionStats() (+9 more)

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

### Community 62 - "Repository Guidelines"
Cohesion: 0.25
Nodes (7): Build, Test, and Development Commands, Coding Style & Naming Conventions, Commit & Pull Request Guidelines, graphify, Project Structure & Module Organization, Repository Guidelines, Testing Guidelines

### Community 63 - "driver-live-tracking.js"
Cohesion: 0.57
Nodes (7): clearWatch(), distanceMeters(), hasPickedUpOrder(), publish(), render(), start(), stopRemote()

### Community 64 - "updateDeliveryCharge"
Cohesion: 0.25
Nodes (8): applyOrderIdPrefix(), autoFillDeliveryCharge(), fetchMerchants(), loadMerchants(), populateMerchantSelectFromData(), renderLocationOptions(), selectLocation(), updateDeliveryCharge()

### Community 65 - "authMiddleware"
Cohesion: 0.13
Nodes (11): Architecture, Dual rendering pattern, Middleware stack (in order), Order model field abbreviations, Roles, Static assets, Swagger / OpenAPI, createGetMe() (+3 more)

### Community 66 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, dev, postinstall, start, test

### Community 67 - "mailer.service.js"
Cohesion: 0.67
Nodes (3): nodemailer, getTransporter(), sendPasswordResetEmail()

## Knowledge Gaps
- **185 isolated node(s):** `currentFilePath`, `name`, `version`, `description`, `main` (+180 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 313 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `prisma` connect `prisma.js` to `finance.controller.js`, `returnController.js`, `user/api.js`, `order/api.js`, `dispatch-planning.service.js`, `app.js`, `analytics-report.test.js`, `auth.controller.js`, `location.routes.js`, `settlement.service.js`, `collectionController.js`, `paymentController.js`, `tracking.routes.js`, `communication.service.js`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
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
  _Cohesion score 0.07757885763000852 - nodes in this community are weakly interconnected._
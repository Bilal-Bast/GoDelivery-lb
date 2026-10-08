# Graph Report - GoDelivery-lb  (2026-10-08)

## Corpus Check
- 126 files · ~105,696 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 40 file(s) not represented in the graph (top: .pug 22, .css 14, .example 1)

## Summary
- 982 nodes · 2295 edges · 58 communities (48 shown, 10 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 199 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `353de5a3`
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
- location.routes.js
- notificationEvent
- signin.js
- OrderIDValidator
- quickUpdateOrder
- pay.js
- track.js
- authMiddleware
- collect.js
- DETAILED FINDINGS BY SECTION
- compilerOptions
- dialog.js
- escapeHtml
- applyFilters
- flattenHistoryChanges
- openAdminScanModal
- initSearchableSelect
- reset-password.js
- initAdminPage
- buildOrderDiff
- Architecture
- editOrder
- Repository Guidelines
- GoDelivery-lb
- devDependencies
- scripts
- settlement.service.js
- asyncHandler
- paymentController.js
- collectionController.js
- self-service.test.js
- Phase 11 notification architecture

## God Nodes (most connected - your core abstractions)
1. `createApp()` - 38 edges
2. `prisma` - 23 edges
3. `authMiddleware()` - 19 edges
4. `render()` - 18 edges
5. `SettlementValidationError` - 17 edges
6. `orderFromPrisma()` - 16 edges
7. `formatUserDisplayName()` - 16 edges
8. `asyncHandler()` - 15 edges
9. `notificationEvent()` - 15 edges
10. `serializeUser()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Auth Endpoints` --references--> `authMiddleware()`  [INFERRED]
  CLAUDE.md → src/middleware/auth.middleware.js
- `Coding Style & Naming Conventions` --references--> `updateOrderStatus()`  [INFERRED]
  AGENTS.md → src/controllers/order/api.js
- `Order model field abbreviations` --references--> `orderFromPrisma()`  [INFERRED]
  CLAUDE.md → src/controllers/order/mappers.js
- `Order model field abbreviations` --references--> `normalizeOrderPayload()`  [INFERRED]
  CLAUDE.md → src/controllers/order/mappers.js
- `Coding Style & Naming Conventions` --references--> `createPayment()`  [INFERRED]
  AGENTS.md → src/controllers/payment/paymentController.js

## Import Cycles
- None detected.

## Communities (58 total, 10 thin omitted)

### Community 0 - "finance.controller.js"
Cohesion: 0.08
Nodes (60): createApp(), Key services, buildStats(), calculateDriverOutstandingRows(), collectFromDriver(), createFinanceExpense(), createFinanceTransaction(), expenseCategoryMap (+52 more)

### Community 1 - "returnController.js"
Cohesion: 0.18
Nodes (23): generateCollectionPDF(), generatePaymentPDF(), deleteReturn(), generateReturnPDF(), getReturnableOrders(), getReturnById(), getReturns(), getReturnsByMerchant() (+15 more)

### Community 2 - "user/api.js"
Cohesion: 0.06
Nodes (69): Role casing, bcrypt, nodemailer, changePassword(), createForgotPassword(), createResetPassword(), forgotPassword, getMe (+61 more)

### Community 3 - "package.json"
Cohesion: 0.07
Nodes (28): author, bugs, url, description, homepage, keywords, license, main (+20 more)

### Community 4 - "merchant.js"
Cohesion: 0.08
Nodes (37): allOrders, applyFilters(), autoFillDeliveryCharge(), buildSessionOrdersTable(), clearFilters(), countryCodes, districtToCityMap, escapeHtml() (+29 more)

### Community 5 - "order/api.js"
Cohesion: 0.09
Nodes (53): @prisma/adapter-pg, @prisma/client, adapter, prisma, buildDateRangeFilter(), buildRawWhereClauses(), getAnalytics(), cancelOrder() (+45 more)

### Community 6 - "orders.js"
Cohesion: 0.10
Nodes (18): applyOrderIdPrefix(), autoFillDeliveryCharge(), fetchMerchants(), flagEmojiToIso2(), getDriverOptionLabel(), getDriverOptionValue(), loadDrivers(), loadMerchants() (+10 more)

### Community 7 - "dashboard.js"
Cohesion: 0.16
Nodes (25): bucketByDay(), buildPeriodControl(), countUp(), deltaChip(), exportCsv(), greeting(), init(), inRange() (+17 more)

### Community 8 - "finance.js"
Cohesion: 0.16
Nodes (17): currentPrepaidBalance(), downloadAdvancePDF(), findMerchantBalance(), getFilenameFromResponse(), handleCollectDriver(), handlePayMerchant(), loadPrepaidHistory(), money() (+9 more)

### Community 9 - "driver.js"
Cohesion: 0.13
Nodes (23): buildOrderCard(), buildSessionOrdersList(), closeModalAlert(), closeScanModal(), collectionSessions, currentDriverOrders, escapeHtml(), handleScanResult() (+15 more)

### Community 10 - "analytics.js"
Cohesion: 0.17
Nodes (22): applyFilters(), dayLabel(), escapeHtml(), hideError(), loadAllData(), populateMerchantFilter(), renderAll(), renderLocationsChart() (+14 more)

### Community 11 - "users.js"
Cohesion: 0.11
Nodes (23): apiDelete(), buildBlockerCardHtml(), buildCard(), proceedToDeleteConfirm(), buildDeleteConfirmBody(), closeResolveBlockersModal(), displayName(), fetchDeletePreview() (+15 more)

### Community 12 - "app.js"
Cohesion: 0.10
Nodes (18): currentFilePath, start(), Middleware stack (in order), ref_crypto, helmet, ref_path, ref_url, lebanonDistricts (+10 more)

### Community 13 - "settings.js"
Cohesion: 0.10
Nodes (7): checkPasswordStrength(), getPasswordStrengthClass(), getPasswordStrengthText(), initCountryDropdown(), setupFieldValidation(), setupPasswordStrength(), showFieldError()

### Community 14 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, bcrypt, claude, cookie-parser, cors, csurf, dotenv, express (+12 more)

### Community 15 - "return.js"
Cohesion: 0.23
Nodes (16): buildOrdersTable(), closeScanModal(), downloadReturnPDF(), flashScan(), getFilenameFromResponse(), handleScan(), initScanner(), loadMerchantData() (+8 more)

### Community 16 - "analytics-report.test.js"
Cohesion: 0.09
Nodes (40): Order model field abbreviations, ref_node_assert, ref_node_test, pdfkit, badRequest(), download(), getAdminStatement(), getOwnStatement() (+32 more)

### Community 17 - "saveOrderChanges"
Cohesion: 0.24
Nodes (11): applyDeepLinkFilters(), closeModal(), deleteOrder(), getModalDriverValueForSave(), getModalNumber(), loadOrders(), saveOrderChanges(), setModalNumber() (+3 more)

### Community 18 - "location.routes.js"
Cohesion: 0.26
Nodes (9): express-validator, addLocation(), addLocationSSR(), deleteLocation(), getLocations(), mapDistrictToLocation(), validateRequest(), addLocationValidators (+1 more)

### Community 19 - "notificationEvent"
Cohesion: 0.12
Nodes (14): notificationEvent(), ORDER_STATUS_EVENTS, ORDER_TEXT, historyType(), loadRecentNotifications(), createNotificationService(), afterCommit(), dispatch() (+6 more)

### Community 20 - "signin.js"
Cohesion: 0.17
Nodes (9): closeBtn, forgotPasswordForm, forgotPasswordFormBox, lbox, loginBtn, loginFormBox, openForgotPassword, togglePassword (+1 more)

### Community 22 - "quickUpdateOrder"
Cohesion: 0.19
Nodes (13): addToActionLog(), cancelledStatusLabel(), cancelOrder(), clearActionLog(), displayActionLog(), initManualActions(), loadDriversForActions(), playErrorBeep() (+5 more)

### Community 23 - "pay.js"
Cohesion: 0.33
Nodes (11): downloadPaymentPDF(), getFilenameFromResponse(), getPayout(), getSettleLabel(), loadMerchantData(), loadPaymentSessions(), printPaymentSession(), renderMerchantOrders() (+3 more)

### Community 24 - "track.js"
Cohesion: 0.27
Nodes (11): ACTION_TYPE_LABELS, describeHistoryValue(), escapeHtml(), fetchOrder(), flattenHistoryChanges(), formatHistoryChanges(), HISTORY_FIELD_LABELS, renderOrderSummary() (+3 more)

### Community 25 - "authMiddleware"
Cohesion: 0.27
Nodes (7): Security & Configuration Tips, Dual rendering pattern, jsonwebtoken, adminOnly(), authMiddleware(), authorize(), pageAuth()

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

### Community 30 - "escapeHtml"
Cohesion: 0.33
Nodes (6): buildBarcodeMarkup(), buildLabelMarkup(), escapeHtml(), fitBarcodeSvg(), openPrintSheet(), whenPrintWindowReady()

### Community 31 - "applyFilters"
Cohesion: 0.25
Nodes (8): applyFilters(), changePage(), clearFilters(), displayOrders(), insertLocalOrder(), patchLocalOrder(), updatePagination(), updateStats()

### Community 32 - "flattenHistoryChanges"
Cohesion: 0.29
Nodes (8): describeHistoryEntry(), describeHistoryValue(), fetchAndRenderTimeline(), flattenHistoryChanges(), formatHistoryChanges(), hasRestorableOldValue(), resetUndoState(), setUndoState()

### Community 33 - "openAdminScanModal"
Cohesion: 0.29
Nodes (7): closeAdminScanModal(), flashAdminScan(), handleAdminScan(), initAdminScanner(), loadAdminScanLibrary(), openAdminScanModal(), setAdminScannerZoom()

### Community 34 - "initSearchableSelect"
Cohesion: 0.47
Nodes (5): initSearchableSelect(), getOptions(), render(), selectOption(), setHighlighted()

### Community 35 - "reset-password.js"
Cohesion: 0.33
Nodes (4): form, messageEl, submitBtn, token

### Community 37 - "buildOrderDiff"
Cohesion: 0.67
Nodes (3): buildOrderDiff(), flattenForDiff(), setNestedValue()

### Community 41 - "Architecture"
Cohesion: 0.15
Nodes (11): Architecture, Audit & Validation, Auth Endpoints, Authentication & Authorization, Commands, Data Access Control, Environment Setup, Roles (+3 more)

### Community 42 - "editOrder"
Cohesion: 0.36
Nodes (8): editOrder(), ensureModalDriverOption(), scheduleModalOrderIdValidation(), setModalFieldsReadonly(), setModalOrderIdFeedback(), setModalPricing(), validateModalOrderId(), viewOrder()

### Community 43 - "Repository Guidelines"
Cohesion: 0.25
Nodes (7): Build, Test, and Development Commands, Coding Style & Naming Conventions, Commit & Pull Request Guidelines, graphify, Project Structure & Module Organization, Repository Guidelines, Testing Guidelines

### Community 44 - "GoDelivery-lb"
Cohesion: 0.33
Nodes (5): API, Docs site (Docusaurus), GoDelivery-lb, Next steps, Quickstart

### Community 45 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, nodemon, prisma, @types/node, typescript

### Community 46 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, dev, postinstall, start, test

### Community 52 - "settlement.service.js"
Cohesion: 0.24
Nodes (18): createCollectionSSR(), createPaymentSSR(), createReturn(), assertReturnNotPreviouslyLinked(), assertSettlementCanBeDeleted(), calculatePrepaidBalance(), collectionOrderDirection(), createCollectionSettlement() (+10 more)

### Community 53 - "asyncHandler"
Cohesion: 0.24
Nodes (8): express, getDriverOrders(), getDrivers(), getDriverStats, asyncHandler(), driverOnly(), router, router

### Community 54 - "paymentController.js"
Cohesion: 0.26
Nodes (14): computePayout(), createPayment(), deletePayment(), findMerchant(), getEligiblePaymentOrders(), getMyPayments, getPaymentById(), getPayments() (+6 more)

### Community 55 - "collectionController.js"
Cohesion: 0.28
Nodes (13): createCollection(), deleteCollection(), findDriver(), getCollectionById(), getCollections(), getCollectionsByDriver(), getCollectionStats(), getEligibleCollectionOrders() (+5 more)

### Community 56 - "self-service.test.js"
Cohesion: 0.19
Nodes (8): createGetMe(), createGetMyCollections(), mapSelfCollection(), createGetMyBalance(), createGetMyPayments(), mapSelfPayment(), paginationMeta(), parseBoundedPagination()

### Community 57 - "Phase 11 notification architecture"
Cohesion: 0.40
Nodes (4): Current path, Event recipients, Future push enablement, Phase 11 notification architecture

## Knowledge Gaps
- **147 isolated node(s):** `currentFilePath`, `name`, `version`, `description`, `main` (+142 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 243 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `isDelivered()` connect `analytics-report.test.js` to `dashboard.js`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `renderMoney()` connect `dashboard.js` to `analytics-report.test.js`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `prisma` connect `order/api.js` to `finance.controller.js`, `returnController.js`, `user/api.js`, `app.js`, `analytics-report.test.js`, `location.routes.js`, `settlement.service.js`, `asyncHandler`, `paymentController.js`, `collectionController.js`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `createApp()` (e.g. with `getAnalytics()` and `login()`) actually correct?**
  _`createApp()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 16 inferred relationships involving `authMiddleware()` (e.g. with `Security & Configuration Tips` and `createApp()`) actually correct?**
  _`authMiddleware()` has 16 INFERRED edges - model-reasoned connections that need verification._
- **What connects `currentFilePath`, `name`, `version` to the rest of the system?**
  _147 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `finance.controller.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08482142857142858 - nodes in this community are weakly interconnected._
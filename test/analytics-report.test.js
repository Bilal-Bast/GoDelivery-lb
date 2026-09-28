import test from "node:test";
import assert from "node:assert/strict";
import { normalizeReportRange, isCancelled, isDelivered, isRevenueEligible, summarizeOrders, compare, orderTrend, financeSummary, loadAnalyticsReport } from "../src/services/analytics-report.service.js";
import { reportCsv, statementCsv, statementPdf } from "../src/services/report-export.service.js";
import { loadStatement } from "../src/services/statement.service.js";
import { getAdminStatement, getOwnStatement } from "../src/controllers/analytics-report.controller.js";

const at = (day) => new Date(`${day}T12:00:00.000Z`);
const base = { status: "DELIVERED", cancelledBy: null, collectedBack: false, total: 100, deliveryCharge: 10, isExpress: false, createdAt: at("2026-09-15"), merchantId: "m1", driverId: "d1", district: "Beirut", city: "Hamra" };

test("UTC date range normalizes presets and equal previous period", () => {
	const range = normalizeReportRange({ preset: "last7" }, at("2026-09-27"));
	assert.equal(range.startDate, "2026-09-21");
	assert.equal(range.previousStartDate, "2026-09-14");
	assert.equal(range.previousEndDate, "2026-09-20");
	assert.equal(range.timezone, "UTC");
	assert.throws(() => normalizeReportRange({ startDate: "2026-02-30", endDate: "2026-03-01" }));
	assert.throws(() => normalizeReportRange({ startDate: "2026-09-28", endDate: "2026-09-27" }));
	assert.throws(() => normalizeReportRange({ startDate: "2024-01-01", endDate: "2026-09-27" }));
});

test("business outcomes and revenue exclude cancellations and collected-back orders", () => {
	const cancelledPaid = { ...base, status: "Paid", cancelledBy: "customer" };
	const returned = { ...base, collectedBack: true };
	assert.equal(isDelivered(cancelledPaid), false);
	assert.equal(isCancelled(cancelledPaid), true);
	assert.equal(isRevenueEligible(returned), false);
	const result = summarizeOrders([base, cancelledPaid, returned]);
	assert.equal(result.summary.totalOrders, 3);
	assert.equal(result.summary.deliveredOrders, 2);
	assert.equal(result.summary.cancelledOrders, 1);
	assert.equal(result.summary.grossOrderValueUSD, 100);
	assert.equal(result.statuses.Paid, 1);
});

test("comparison with zero previous has no infinite percentage", () => {
	assert.deepEqual(compare(5, 0), { current: 5, previous: 0, change: 5, percentChange: null });
	assert.equal(compare(0, 0).percentChange, null);
});

test("trend buckets current outcome by order creation date", () => {
	const range = normalizeReportRange({ startDate: "2026-09-01", endDate: "2026-09-30" });
	const trend = orderTrend([{ ...base, createdAt: at("2026-09-15") }, { ...base, createdAt: at("2026-09-15"), status: "Canceled" }], range);
	assert.equal(trend.points[0].orders, 2);
	assert.equal(trend.points[0].cancelled, 1);
	assert.equal(trend.points[0].grossOrderValueUSD, 100);
});

test("finance totals use completed transaction and recorded settlement values", () => {
	const finance = financeSummary([
		{ status: "DELIVERED", type: "DRIVER_COLLECTION", amount: 90, paymentMethod: "CASH", date: at("2026-09-15") },
		{ status: "DELIVERED", type: "MERCHANT_PAYMENT", amount: 70, paymentMethod: "OMT", date: at("2026-09-15") },
		{ status: "Picked_up", type: "CASH_IN", amount: 999, paymentMethod: "CASH", date: at("2026-09-15") },
	], [{ amount: 5, category: "FUEL", date: at("2026-09-15") }], [{ amount: 100, deliveryFee: 10 }], [{ amount: -20, isAdvance: true }]);
	assert.equal(finance.cashInUSD, 90);
	assert.equal(finance.cashOutUSD, 70);
	assert.equal(finance.netCashMovementUSD, 20);
	assert.equal(finance.collectionGrossUSD, 100);
	assert.equal(finance.collectionDriverFeeUSD, 10);
	assert.equal(finance.prepaidNegativeAdjustmentsUSD, -20);
	assert.equal(finance.expenseCategories.FUEL, 5);
});

test("empty report is stable and report CSV guards usernames", async () => {
	const db = {
		order: { findMany: async () => [] }, financeTransaction: { findMany: async () => [] }, financeExpense: { findMany: async () => [] }, driverCollection: { findMany: async () => [] }, merchantPayment: { findMany: async () => [] }, user: { findMany: async () => [] },
	};
	const report = await loadAnalyticsReport(db, normalizeReportRange({ preset: "today" }, at("2026-09-27")));
	assert.equal(report.summary.totalOrders, 0);
	assert.equal(report.finance.netCashMovementUSD, 0);
	assert.match(reportCsv(report, "summary"), /totalOrders/);
	const csv = statementCsv({ kind: "merchant", orders: [], activity: [{ number: 1, date: at("2026-09-27"), type: "ORDER_PAYMENT", amountUSD: 10, orderIds: ["=BAD"] }] });
	assert.match(csv, /'=BAD/);
});

test("merchant statement queries only the requested identity and omits private fields", async () => {
	const calls = [];
	const db = {
		user: { findFirst: async (args) => { calls.push(args); return { id: "m1", username: "shop", firstName: "Shop", lastName: "", accountType: "PREPAID" }; } },
		order: { findMany: async (args) => { calls.push(args); return [{ ...base, id: "A1" }]; } },
		merchantPayment: { findMany: async (args) => { calls.push(args); return [{ number: 4, createdAt: at("2026-09-15"), amount: -5, isAdvance: true, orders: [] }]; } },
	};
	const statement = await loadStatement(db, "merchant", "m1", normalizeReportRange({ preset: "last30" }, at("2026-09-27")));
	assert.equal(calls[0].where.id, "m1");
	assert.equal(calls[0].where.role, "MERCHANT");
	assert.equal(calls[1].where.merchantId, "m1");
	assert.equal(calls[2].where.merchantId, "m1");
	assert.equal(statement.activityTotals.recordedPaymentsUSD, -5);
	assert.equal(statement.activity[0].notes, undefined);
	assert.equal(statement.orders[0].customerPhone, undefined);
});

test("driver statement uses recorded collection values and driver scope", async () => {
	const calls = [];
	const db = {
		user: { findFirst: async (args) => { calls.push(args); return { id: "d1", username: "driver", firstName: "Driver", lastName: "" }; } },
		order: { findMany: async (args) => { calls.push(args); return []; } },
		driverCollection: { findMany: async (args) => { calls.push(args); return [{ number: 7, createdAt: at("2026-09-15"), amount: 100, deliveryFee: 10, orders: [{ orderId: "A1" }] }]; } },
	};
	const statement = await loadStatement(db, "driver", "d1", normalizeReportRange({ preset: "last30" }, at("2026-09-27")));
	assert.equal(calls[0].where.role, "DRIVER");
	assert.equal(calls[1].where.driverId, "d1");
	assert.equal(calls[2].where.driverId, "d1");
	assert.equal(statement.activityTotals.netTransferredUSD, 90);
});

test("A4 statement PDF is generated from prepared read-only data", async () => {
	const pdf = await statementPdf({
		kind: "merchant", identity: { name: "Shop", username: "shop", accountType: "PREPAID" },
		range: { startDate: "2026-09-01", endDate: "2026-09-27" },
		summary: { totalOrders: 0, deliveredOrders: 0, cancelledOrders: 0 },
		orders: [], activity: [], activityTotals: { recordedPaymentsUSD: 0 },
	});
	assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
	assert.ok(pdf.length > 1000);
});

test("filtered admin report scopes order read and omits ambiguous company finance", async () => {
	let where;
	const db = {
		order: { findMany: async (args) => { where = args.where; return [{ ...base, id: "A1" }]; } },
		user: { findMany: async () => [{ id: "m1", username: "shop", accountType: "PREPAID" }] },
	};
	const report = await loadAnalyticsReport(db, normalizeReportRange({ preset: "last30", merchantId: "m1" }, at("2026-09-27")));
	assert.equal(where.merchantId, "m1");
	assert.equal(report.finance, null);
	assert.equal(report.merchants[0].name, "shop");
});

test("statement handlers reject unsupported self/admin roles before data reads", async () => {
	const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } });
	let nextCalled = false;
	const adminOnly = response();
	await getAdminStatement({ user: { role: "merchant", id: "m1" }, params: { kind: "merchant", id: "m2" }, query: {} }, adminOnly, () => { nextCalled = true; });
	assert.equal(adminOnly.code, 403);
	const ownOnly = response();
	await getOwnStatement({ user: { role: "admin", id: "a1" }, params: {}, query: {} }, ownOnly, () => { nextCalled = true; });
	assert.equal(ownOnly.code, 403);
	assert.equal(nextCalled, false);
});

import test from "node:test";
import assert from "node:assert/strict";

import {
	SettlementValidationError,
	assertReturnNotPreviouslyLinked,
	assertSettlementCanBeDeleted,
	calculatePrepaidBalance,
	createCollectionSettlement,
	createPaymentSettlement,
	normalizeOrderIds,
	previewCollectionSettlement,
	previewPaymentSettlement,
	runSerializableWithRetry,
	returnCloseOutIds,
	validateCollectionOrders,
	validatePaymentOrders,
	validateReturnOrders,
} from "../src/services/settlement.service.js";

function order(overrides = {}) {
	return {
		id: "o1",
		driverId: "d1",
		merchantId: "m1",
		status: "DELIVERED",
		cancelledBy: null,
		collectedBack: false,
		total: 100,
		deliveryCharge: 10,
		collectionOrders: [],
		paymentOrders: [],
		...overrides,
	};
}

test("collection calculation preserves delivered and cancellation rules", () => {
	assert.deepEqual(
		validateCollectionOrders({
			orders: [order()],
			requestedIds: ["o1"],
			driverId: "d1",
		}),
		{ grossAmount: 100, feeEarningCount: 1 },
	);
	assert.deepEqual(
		validateCollectionOrders({
			orders: [order({ status: "Canceled", cancelledBy: "customer" })],
			requestedIds: ["o1"],
			driverId: "d1",
		}),
		{ grossAmount: 10, feeEarningCount: 1 },
	);
	assert.deepEqual(
		validateCollectionOrders({
			orders: [order({ status: "Canceled", cancelledBy: "merchant" })],
			requestedIds: ["o1"],
			driverId: "d1",
		}),
		{ grossAmount: 0, feeEarningCount: 0 },
	);
});

test("collection validation rejects wrong driver, collected, missing and invalid orders", () => {
	assert.throws(
		() => validateCollectionOrders({ orders: [order()], requestedIds: ["o1"], driverId: "d2" }),
		/not assigned/,
	);
	assert.throws(
		() => validateCollectionOrders({
			orders: [order({ collectedBack: true })],
			requestedIds: ["o1"],
			driverId: "d1",
		}),
		/already collected/,
	);
	assert.throws(
		() => validateCollectionOrders({ orders: [], requestedIds: ["missing"], driverId: "d1" }),
		/Orders not found/,
	);
	assert.throws(
		() => validateCollectionOrders({
			orders: [order({ status: "NEW" })],
			requestedIds: ["o1"],
			driverId: "d1",
		}),
		/not eligible/,
	);
});

test("duplicate order IDs are de-duplicated before calculation", () => {
	assert.deepEqual(normalizeOrderIds(["o1", "o1", " o2 "]), ["o1", "o2"]);
});

test("collection preview exposes authoritative gross, fee and net semantics", async () => {
	const orders = [
		order(),
		order({ id: "o2", status: "Canceled", cancelledBy: "customer" }),
		order({ id: "o3", status: "Canceled", cancelledBy: "merchant" }),
	];
	const preview = await previewCollectionSettlement({
		prisma: { order: { findMany: async () => orders } },
		driver: { id: "d1", deliveryFee: 5 },
		orderIds: ["o1", "o2", "o3", "o1"],
	});
	assert.equal(preview.grossAmount, 110);
	assert.equal(preview.deliveryFeeTotal, 10);
	assert.equal(preview.netAmount, 100);
	assert.deepEqual(preview.orderIds, ["o1", "o2", "o3"]);
	assert.deepEqual(
		preview.orders.map(({ id, collectionValue, driverFee }) => ({
			id,
			collectionValue,
			driverFee,
		})),
		[
			{ id: "o1", collectionValue: 100, driverFee: 5 },
			{ id: "o2", collectionValue: 10, driverFee: 5 },
			{ id: "o3", collectionValue: 0, driverFee: 0 },
		],
	);
});

test("collection preview rejects a stale already-linked order", async () => {
	await assert.rejects(
		previewCollectionSettlement({
			prisma: {
				order: {
					findMany: async () => [order({ collectionOrders: [{ id: "link" }] })],
				},
			},
			driver: { id: "d1", deliveryFee: 5 },
			orderIds: ["o1"],
		}),
		/already collected/,
	);
});

test("duplicate payment IDs cannot inflate the payout", () => {
	const requestedIds = normalizeOrderIds(["o1", "o1"]);
	assert.deepEqual(
		validatePaymentOrders({
			orders: [order({ status: "COLLECTED" })],
			requestedIds,
			merchantId: "m1",
		}),
		{ amount: 90 },
	);
});

test("mixed valid/invalid collection performs zero writes", async () => {
	let writes = 0;
	const tx = {
		order: { findMany: async () => [order()] },
		driverCollection: { create: async () => { writes += 1; } },
	};
	const prisma = { $transaction: async (operation) => operation(tx) };
	await assert.rejects(
		createCollectionSettlement({
			prisma,
			driver: { id: "d1", username: "driver", deliveryFee: 5 },
			admin: { id: "a1", username: "admin" },
			orderIds: ["o1", "missing"],
		}),
		/Orders not found/,
	);
	assert.equal(writes, 0);
});

test("postpaid payment calculation and validation remain unchanged", () => {
	assert.deepEqual(
		validatePaymentOrders({
			orders: [order({ status: "COLLECTED" })],
			requestedIds: ["o1"],
			merchantId: "m1",
		}),
		{ amount: 90 },
	);
	assert.throws(
		() => validatePaymentOrders({
			orders: [order({ status: "COLLECTED" })],
			requestedIds: ["o1"],
			merchantId: "m2",
		}),
		/does not belong/,
	);
	assert.throws(
		() => validatePaymentOrders({ orders: [], requestedIds: ["missing"], merchantId: "m1" }),
		/Orders not found/,
	);
	assert.throws(
		() => validatePaymentOrders({
			orders: [order({ status: "DELIVERED" })],
			requestedIds: ["o1"],
			merchantId: "m1",
		}),
		/not eligible/,
	);
	assert.throws(
		() => validatePaymentOrders({
			orders: [order({ status: "Paid" })],
			requestedIds: ["o1"],
			merchantId: "m1",
		}),
		/already paid/,
	);
	assert.throws(
		() => validatePaymentOrders({
			orders: [order({ status: "COLLECTED", paymentOrders: [{ id: "link-1" }] })],
			requestedIds: ["o1"],
			merchantId: "m1",
		}),
		/already paid/,
	);
});

test("payment preview exposes gross, charges and final authoritative payout", async () => {
	const preview = await previewPaymentSettlement({
		prisma: {
			order: {
				findMany: async () => [
					order({ status: "COLLECTED" }),
					order({ id: "o2", status: "COLLECTED", total: 70, deliveryCharge: 8 }),
				],
			},
		},
		merchant: { id: "m1", accountType: "POSTPAID" },
		orderIds: ["o1", "o2"],
	});
	assert.equal(preview.grossAmount, 170);
	assert.equal(preview.deliveryCharges, 18);
	assert.equal(preview.amount, 152);
});

test("mixed valid/invalid payment performs zero writes", async () => {
	let writes = 0;
	const tx = {
		order: { findMany: async () => [order({ status: "COLLECTED" })] },
		merchantPayment: { create: async () => { writes += 1; } },
	};
	const prisma = { $transaction: async (operation) => operation(tx) };
	await assert.rejects(
		createPaymentSettlement({
			prisma,
			merchant: { id: "m1", username: "merchant", accountType: "POSTPAID" },
			admin: { id: "a1", username: "admin" },
			orderIds: ["o1", "missing"],
		}),
		/Orders not found/,
	);
	assert.equal(writes, 0);
});

test("prepaid merchants remain excluded from per-order payment", async () => {
	await assert.rejects(
		createPaymentSettlement({
			prisma: {},
			merchant: { id: "m1", accountType: "PREPAID" },
			admin: { id: "a1" },
			orderIds: ["o1"],
		}),
		/prepaid/,
	);
});

test("prepaid entitlement calculation remains legacy plus live orders minus payments", () => {
	assert.deepEqual(
		calculatePrepaidBalance({ legacyBalance: 20, ordersValue: 180, paid: 75 }),
		{ entitled: 200, paid: 75, balance: 125 },
	);
	assert.deepEqual(
		calculatePrepaidBalance({ legacyBalance: -10, ordersValue: 40, paid: 50 }),
		{ entitled: 30, paid: 50, balance: -20 },
	);
});

test("returns reject stale/duplicate selections before writes", () => {
	assert.throws(
		() => assertReturnNotPreviouslyLinked({ id: "return-link" }),
		(error) => error instanceof SettlementValidationError && error.statusCode === 409,
	);
	assert.throws(
		() => validateReturnOrders({ orders: [order()], requestedIds: ["o1", "o2"] }),
		/Not returnable.*o2/,
	);
});

test("return close-out preserves POSTPAID and PREPAID status effects", () => {
	const orders = [
		order({ id: "cancelled", cancelledBy: "customer" }),
		order({ id: "exchange", cancelledBy: null, isExpress: true }),
	];
	assert.deepEqual(returnCloseOutIds({ orders, isPrepaid: false }), ["cancelled"]);
	assert.deepEqual(returnCloseOutIds({ orders, isPrepaid: true }), []);
});

test("unsafe settlement deletion is blocked", () => {
	assert.throws(() => assertSettlementCanBeDeleted("collection", 1), SettlementValidationError);
	assert.throws(() => assertSettlementCanBeDeleted("payment", 1), /safe automatic reversal/);
	assert.throws(() => assertSettlementCanBeDeleted("return", 1), /safe automatic reversal/);
	assert.doesNotThrow(() => assertSettlementCanBeDeleted("collection", 0));
});

test("serializable numbering retries transaction conflicts", async () => {
	let attempts = 0;
	const prisma = {
		$transaction: async (operation, options) => {
			assert.equal(options.isolationLevel, "Serializable");
			attempts += 1;
			if (attempts === 1) throw Object.assign(new Error("retry"), { code: "P2034" });
			return operation({});
		},
	};
	assert.equal(await runSerializableWithRetry(prisma, async () => "ok"), "ok");
	assert.equal(attempts, 2);
});

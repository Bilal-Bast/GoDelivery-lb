import test from "node:test";
import assert from "node:assert/strict";

import { createGetMyCollections } from "../src/controllers/collection/collectionController.js";
import { createGetMyPayments } from "../src/controllers/payment/paymentController.js";
import {
	calculateDriverOutstandingRows,
	createGetMyBalance,
} from "../src/controllers/finance.controller.js";
import { createGetMe } from "../src/controllers/auth.controller.js";
import authMiddleware, { authorize } from "../src/middleware/auth.middleware.js";

function response() {
	return {
		statusCode: 200,
		body: undefined,
		status(code) {
			this.statusCode = code;
			return this;
		},
		json(body) {
			this.body = body;
			return this;
		},
	};
}

function collection(id, driverId = "driver-1") {
	return {
		id,
		driverId,
		number: Number(id.replace(/\D/g, "")) || 1,
		amount: 100,
		deliveryFee: 5,
		createdAt: new Date("2026-09-01T00:00:00Z"),
		admin: { id: "admin-1", username: "admin", firstName: "A", lastName: "" },
		orders: [{ order: { id: `order-${id}`, total: 100, deliveryCharge: 10 } }],
	};
}

function payment(id, merchantId = "merchant-1", orders = []) {
	return {
		id,
		merchantId,
		number: Number(id.replace(/\D/g, "")) || 1,
		amount: 75,
		isAdvance: true,
		notes: "Advance",
		status: "DELIVERED",
		createdAt: new Date("2026-09-01T00:00:00Z"),
		admin: { id: "admin-1", username: "admin", firstName: "A", lastName: "" },
		orders,
	};
}

test("driver collection history is scoped, paginated, and maps linked orders", async () => {
	let findArgs;
	const db = {
		driverCollection: {
			findMany: async (args) => {
				findArgs = args;
				return [collection("c2")];
			},
			count: async ({ where }) => {
				assert.deepEqual(where, { driverId: "driver-1" });
				return 3;
			},
		},
	};
	const res = response();
	await createGetMyCollections(db)(
		{ user: { id: "driver-1" }, query: { page: "2", limit: "1" } },
		res,
	);

	assert.deepEqual(findArgs.where, { driverId: "driver-1" });
	assert.equal(findArgs.skip, 1);
	assert.equal(findArgs.take, 1);
	assert.deepEqual(findArgs.orderBy, [{ createdAt: "desc" }, { id: "desc" }]);
	assert.equal(res.body.data[0].orders[0].id, "order-c2");
	assert.deepEqual(res.body.pagination, {
		page: 2,
		limit: 1,
		total: 3,
		totalPages: 3,
	});
});

test("driver collection history returns an empty stable page", async () => {
	const db = {
		driverCollection: {
			findMany: async () => [],
			count: async () => 0,
		},
	};
	const res = response();
	await createGetMyCollections(db)({ user: { id: "driver-1" }, query: {} }, res);
	assert.deepEqual(res.body.data, []);
	assert.equal(res.body.pagination.totalPages, 0);
});

test("merchant payment history is scoped and includes an unlinked prepaid advance", async () => {
	let findArgs;
	const db = {
		merchantPayment: {
			findMany: async (args) => {
				findArgs = args;
				return [payment("p1")];
			},
			count: async () => 1,
		},
	};
	const res = response();
	await createGetMyPayments(db)(
		{ user: { id: "merchant-1" }, query: { page: "1", limit: "20" } },
		res,
	);
	assert.deepEqual(findArgs.where, { merchantId: "merchant-1" });
	assert.equal(res.body.data[0].isAdvance, true);
	assert.deepEqual(res.body.data[0].orders, []);
	assert.equal(res.body.pagination.total, 1);
});

test("merchant payment history pagination and empty state are stable", async () => {
	const db = {
		merchantPayment: {
			findMany: async ({ skip, take }) => {
				assert.equal(skip, 100);
				assert.equal(take, 100);
				return [];
			},
			count: async ({ where }) => {
				assert.deepEqual(where, { merchantId: "merchant-2" });
				return 0;
			},
		},
	};
	const res = response();
	await createGetMyPayments(db)(
		{ user: { id: "merchant-2" }, query: { page: "2", limit: "999" } },
		res,
	);
	assert.deepEqual(res.body.data, []);
	assert.deepEqual(res.body.pagination, {
		page: 2,
		limit: 100,
		total: 0,
		totalPages: 0,
	});
});

test("role middleware rejects cross-role access and missing authentication", () => {
	for (const [role, requiredRole] of [
		["merchant", "driver"],
		["driver", "merchant"],
	]) {
		const res = response();
		authorize(requiredRole)({ user: { role } }, res, () => assert.fail("unexpected next"));
		assert.equal(res.statusCode, 403);
	}

	const res = response();
	authMiddleware({ cookies: {}, headers: {} }, res, () => assert.fail("unexpected next"));
	assert.equal(res.statusCode, 401);
});

test("my balance scopes driver calculation to the authenticated account", async () => {
	let scopedUsername;
	const handler = createGetMyBalance({
		db: {
			user: {
				findUnique: async () => ({ username: "driver-one", role: "DRIVER" }),
			},
		},
		getDriverBalance: async (username) => {
			scopedUsername = username;
			return [
				{ driverUsername: "other", gross: 999, feeTotal: 0, outstanding: 999, orderCount: 1 },
				{ driverUsername: username, gross: 110, feeTotal: 10, outstanding: 100, orderCount: 2 },
			];
		},
	});
	const res = response();
	await handler({ user: { id: "driver-1" } }, res, assert.fail);
	assert.equal(scopedUsername, "driver-one");
	assert.deepEqual(res.body, {
		role: "driver",
		gross: 110,
		feeTotal: 10,
		outstanding: 100,
		orderCount: 2,
	});
});

test("my balance preserves prepaid and postpaid authoritative semantics", async (t) => {
	await t.test("prepaid", async () => {
		const res = response();
		await createGetMyBalance({
			db: { user: { findUnique: async () => ({ username: "m1", role: "MERCHANT", accountType: "PREPAID" }) } },
			getPrepaidBalance: async () => [{ entitled: 200, paid: 75, balance: 125, orderCount: 3 }],
		})({ user: { id: "merchant-1" } }, res, assert.fail);
		assert.deepEqual(res.body, {
			role: "merchant", accountType: "PREPAID", entitled: 200, paid: 75, balance: 125, orderCount: 3,
		});
	});

	await t.test("postpaid", async () => {
		const res = response();
		await createGetMyBalance({
			db: { user: { findUnique: async () => ({ username: "m2", role: "MERCHANT", accountType: "POSTPAID" }) } },
			getPostpaidBalance: async () => [{ merchantUsername: "m2", grossAmount: 90, amount: 90, orderIds: ["o1"] }],
		})({ user: { id: "merchant-2" } }, res, assert.fail);
		assert.deepEqual(res.body, {
			role: "merchant", accountType: "POSTPAID", entitled: 90, paid: 0, balance: 90, orderCount: 1,
		});
	});
});

test("driver cancellation rules remain part of outstanding balance", () => {
	const driver = { username: "driver", firstName: "D", lastName: "", deliveryFee: 5 };
	const rows = calculateDriverOutstandingRows([
		{ id: "delivered", status: "DELIVERED", total: 100, deliveryCharge: 10, cancelledBy: null, driver },
		{ id: "customer", status: "Canceled", total: 100, deliveryCharge: 10, cancelledBy: "customer", driver },
		{ id: "merchant", status: "Canceled", total: 100, deliveryCharge: 10, cancelledBy: "merchant", driver },
	]);
	assert.equal(rows[0].gross, 110);
	assert.equal(rows[0].feeTotal, 10);
	assert.equal(rows[0].outstanding, 100);
});

test("my balance rejects unsupported database roles", async () => {
	const res = response();
	await createGetMyBalance({
		db: { user: { findUnique: async () => ({ username: "admin", role: "ADMIN" }) } },
	})({ user: { id: "admin-1" } }, res, assert.fail);
	assert.equal(res.statusCode, 403);
});

test("auth me returns additive profile fields and strips security fields", async () => {
	let query;
	const res = response();
	await createGetMe({
		user: {
			findUnique: async (args) => {
				query = args;
				return {
					id: "m1", username: "merchant", role: "MERCHANT", email: null,
					firstName: "M", lastName: "", phone: "", accountType: "PREPAID",
					paymentDay: null, orderIdPrefix: "go", deliveryFee: null,
					legacyBalance: -20, deliveryCharges: [{ region: "Beirut", price: 5 }],
					password: "hash", resetPasswordToken: "secret", resetPasswordExpires: new Date(),
				};
			},
		},
	})({ user: { id: "m1" } }, res, assert.fail);
	assert.equal(query.where.id, "m1");
	assert.equal(query.select.password, undefined);
	assert.deepEqual(res.body.deliveryCharges, { Beirut: 5 });
	assert.equal(res.body.orderIdPrefix, "go");
	assert.equal(res.body.legacyBalance, -20);
	assert.equal("password" in res.body, false);
	assert.equal("resetPasswordToken" in res.body, false);
	assert.equal("resetPasswordExpires" in res.body, false);
});

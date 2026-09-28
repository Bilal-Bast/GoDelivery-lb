import test from "node:test";
import assert from "node:assert/strict";
import { notificationEvent, orderEvents } from "../src/services/notification-events.service.js";
import { DisabledNotificationTokenRepository, createNotificationService } from "../src/services/notification.service.js";
import { loadRecentNotifications } from "../src/services/notification-feed.service.js";

const order = { id: "A1", merchantId: "m1", driverId: "d1", status: "NEW" };

test("order events map only committed changes to intended roles", () => {
	assert.deepEqual(orderEvents(null, order, { createdByMerchant: true }).map((event) => event.type), ["ORDER_CREATED", "ORDER_ASSIGNED"]);
	assert.deepEqual(orderEvents(order, { ...order, status: "DELIVERED" }).map((event) => event.recipients), [[{ role: "MERCHANT", id: "m1" }]]);
	assert.deepEqual(orderEvents(order, order), []);
	assert.deepEqual(orderEvents(order, { ...order, status: "Canceled" })[0].recipients, [{ role: "MERCHANT", id: "m1" }, { role: "DRIVER", id: "d1" }]);
});

test("payload excludes sensitive fields and customer recipients", () => {
	const event = notificationEvent("MERCHANT_PAYMENT_CREATED", "payment", "p1", [{ role: "MERCHANT", id: "m1" }, { role: "CUSTOMER", id: "c1" }]);
	assert.equal(event.entityId, "p1");
	assert.equal(JSON.stringify(event).includes("balance"), false);
	assert.equal(JSON.stringify(event).includes("token"), false);
	assert.deepEqual(event.recipients, [{ role: "MERCHANT", id: "m1" }]);
});

test("disabled token registration never creates in-memory production state", async () => {
	const repo = new DisabledNotificationTokenRepository();
	assert.equal((await repo.register({ role: "DRIVER", id: "d1" }, "token")).supported, false);
	assert.deepEqual(await repo.tokensFor({ role: "DRIVER", id: "d1" }), []);
});

test("provider failures remain secondary and do not expose tokens in logs", async () => {
	const logs = [];
	const service = createNotificationService({
		tokenRepository: { tokensFor: async () => ["secret-token", "secret-token"] },
		transport: { send: async () => { throw Object.assign(new Error("secret-token"), { code: "unavailable" }); } },
		logger: { error: (...args) => logs.push(args) },
	});
	const result = await service.dispatch(notificationEvent("ORDER_ASSIGNED", "order", "A1", [{ role: "DRIVER", id: "d1" }]));
	assert.equal(result.status, "failed");
	assert.equal(logs[0][1].targets, 1);
	assert.equal(JSON.stringify(logs).includes("secret-token"), false);
});

test("recent feed reads only current role ownership and omits finance details", async () => {
	let historyWhere;
	let paymentWhere;
	const db = {
		orderHistory: { findMany: async (args) => { historyWhere = args.where; return [{ id: "h1", orderId: "A1", actionType: "status_change", newValue: 3, createdAt: new Date(), order: { createdBy: "shop", driverId: "d1", merchant: { username: "shop" } } }]; } },
		merchantPayment: { findMany: async (args) => { paymentWhere = args.where; return [{ id: "p1", isAdvance: true, createdAt: new Date() }]; } },
		merchantReturn: { findMany: async () => [] },
	};
	const rows = await loadRecentNotifications(db, { role: "merchant", id: "m1" });
	assert.equal(historyWhere.order.merchantId, "m1");
	assert.equal(paymentWhere.merchantId, "m1");
	assert.deepEqual(rows.map((row) => row.type).sort(), ["ORDER_DELIVERED", "PREPAID_ADJUSTMENT_CREATED"]);
	assert.equal(JSON.stringify(rows).includes("amount"), false);
});

test("driver feed scopes assignment and collection to the authenticated ID", async () => {
	let historyWhere;
	let collectionWhere;
	const db = {
		orderHistory: { findMany: async (args) => { historyWhere = args.where; return [{ id: "h2", orderId: "A2", actionType: "creation", createdAt: new Date(), order: { createdBy: "admin", driverId: "d1", merchant: { username: "shop" } } }]; } },
		driverCollection: { findMany: async (args) => { collectionWhere = args.where; return []; } },
	};
	const rows = await loadRecentNotifications(db, { role: "driver", id: "d1" });
	assert.equal(historyWhere.order.driverId, "d1");
	assert.equal(collectionWhere.driverId, "d1");
	assert.deepEqual(rows.map((row) => row.type), ["ORDER_ASSIGNED"]);
});

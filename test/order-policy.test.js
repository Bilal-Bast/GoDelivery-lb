import test from "node:test";
import assert from "node:assert/strict";

import {
	ORDER_STATUS,
	applyOrderCreationPolicy,
	buildOrderAccessWhere,
	canManagePassword,
	validateOrderTransition,
} from "../src/services/order-policy.service.js";

test("order ownership scopes merchants and drivers to authenticated IDs", () => {
	assert.deepEqual(buildOrderAccessWhere({ role: "admin", id: "a" }, "o1"), {
		id: "o1",
	});
	assert.deepEqual(buildOrderAccessWhere({ role: "merchant", id: "m1" }, "o1"), {
		id: "o1",
		merchantId: "m1",
	});
	assert.deepEqual(buildOrderAccessWhere({ role: "driver", id: "d1" }, "o1"), {
		id: "o1",
		driverId: "d1",
	});
});

test("merchant creation ignores spoofed identity and always starts NEW", () => {
	const result = applyOrderCreationPolicy(
		{ m: "other-merchant", s: 3, cb: "spoofed" },
		{ role: "merchant", username: "merchant-one" },
	);
	assert.equal(result.m, "merchant-one");
	assert.equal(result.s, 1);
	assert.equal(result.cb, "merchant-one");
});

test("admin creation preserves selected merchant and requested status", () => {
	const input = { m: "merchant-two", s: 0 };
	assert.deepEqual(applyOrderCreationPolicy(input, { role: "admin" }), input);
});

test("drivers must pick up before delivery", () => {
	assert.match(
		validateOrderTransition({
			role: "driver",
			currentStatus: ORDER_STATUS.NEW,
			nextStatus: ORDER_STATUS.DELIVERED,
		}),
		/Invalid driver status transition/,
	);
	assert.match(
		validateOrderTransition({
			role: "driver",
			currentStatus: ORDER_STATUS.WAREHOUSE,
			nextStatus: ORDER_STATUS.DELIVERED,
		}),
		/Invalid driver status transition/,
	);
	assert.equal(
		validateOrderTransition({
			role: "driver",
			currentStatus: ORDER_STATUS.NEW,
			nextStatus: ORDER_STATUS.PICKED_UP,
		}),
		null,
	);
	assert.equal(
		validateOrderTransition({
			role: "driver",
			currentStatus: ORDER_STATUS.PICKED_UP,
			nextStatus: ORDER_STATUS.DELIVERED,
		}),
		null,
	);
});

test("driver cancellation is valid after pickup but not before pickup", () => {
	assert.equal(
		validateOrderTransition({
			role: "driver",
			currentStatus: ORDER_STATUS.PICKED_UP,
			nextStatus: ORDER_STATUS.CANCELED,
		}),
		null,
	);
	assert.match(
		validateOrderTransition({
			role: "driver",
			currentStatus: ORDER_STATUS.NEW,
			nextStatus: ORDER_STATUS.CANCELED,
		}),
		/Invalid driver status transition/,
	);
});

test("admins retain existing operational status overrides", () => {
	assert.equal(
		validateOrderTransition({
			role: "admin",
			currentStatus: ORDER_STATUS.WAREHOUSE,
			nextStatus: ORDER_STATUS.PAID,
		}),
		null,
	);
});

test("non-admin password management is self-only", () => {
	assert.equal(canManagePassword({ role: "driver", id: "d1" }, "d1"), true);
	assert.equal(canManagePassword({ role: "driver", id: "d1" }, "d2"), false);
	assert.equal(canManagePassword({ role: "merchant", id: "m1" }, "m2"), false);
	assert.equal(canManagePassword({ role: "admin", id: "a1" }, "d2"), true);
});

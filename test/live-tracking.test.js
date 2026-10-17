import assert from "node:assert/strict";
import test from "node:test";

import { createLiveTrackingHandlers } from "../src/controllers/live-tracking.controller.js";
import {
	createLiveTrackingService,
	getLiveTrackingConfig,
	validateLocationPayload,
} from "../src/services/live-tracking/live-tracking.service.js";
import { InMemoryLiveLocationRepository } from "../src/services/live-tracking/live-location-repository.js";

const baseTime = new Date("2026-10-17T12:00:00.000Z");

function fixture({ enabled = true, ttlMs = 120_000, freshMs = 45_000 } = {}) {
	let currentTime = new Date(baseTime);
	const repository = new InMemoryLiveLocationRepository();
	const activeOrders = new Map([["driver-1", 1]]);
	const db = {
		order: {
			count: async ({ where }) => activeOrders.get(where.driverId) || 0,
			findUnique: async ({ where }) => db.orders.get(where.id) || null,
			findFirst: async ({ where }) => {
				const order = db.orders.get(where.id);
				if (!order || (where.merchantId && order.merchantId !== where.merchantId)) return null;
				return order;
			},
			findMany: async ({ where }) => [...db.orders.values()].filter((order) =>
				where.driverId.in.includes(order.driverId) && order.status === where.status,
			).map(({ id, driverId }) => ({ id, driverId })),
		},
		user: {
			findMany: async ({ where }) => where.id.in.flatMap((id) =>
				db.users.has(id) ? [db.users.get(id)] : [],
			),
		},
		orders: new Map(),
		users: new Map(),
	};
	const service = createLiveTrackingService({
		repository,
		db,
		config: () => ({ enabled, ttlMs, freshMs, maxCapturedAgeMs: 120_000, maxFutureSkewMs: 30_000 }),
		now: () => new Date(currentTime),
	});
	return {
		db,
		repository,
		service,
		activeOrders,
		setNow(value) { currentTime = new Date(value); },
	};
}

function location(overrides = {}) {
	return {
		latitude: 33.8938,
		longitude: 35.5018,
		accuracy: 18,
		capturedAt: baseTime.toISOString(),
		...overrides,
	};
}

function responseRecorder() {
	return {
		statusCode: 200,
		headers: {},
		body: null,
		set(headers) { Object.assign(this.headers, headers); return this; },
		status(code) { this.statusCode = code; return this; },
		json(body) { this.body = body; return this; },
	};
}

test("location payload accepts bounded coordinates and rejects malformed or extra data", () => {
	assert.deepEqual(validateLocationPayload(location(), baseTime, {
		maxCapturedAgeMs: 120_000,
		maxFutureSkewMs: 30_000,
	}).latitude, 33.8938);
	for (const invalid of [
		location({ latitude: 91 }),
		location({ longitude: 181 }),
		location({ accuracy: 100.1 }),
		location({ latitude: Number.NaN }),
		location({ capturedAt: "not-a-date" }),
		location({ capturedAt: "2026-10-17T10:00:00.000Z" }),
		{ ...location(), driverId: "someone-else" },
	]) {
		assert.throws(() => validateLocationPayload(invalid, baseTime, {
			maxCapturedAgeMs: 120_000,
			maxFutureSkewMs: 30_000,
		}));
	}
});

test("runtime configuration defaults to disabled and bounds TTL settings", () => {
	const config = getLiveTrackingConfig({});
	assert.equal(config.enabled, false);
	assert.equal(config.freshMs, 45_000);
	assert.equal(config.ttlMs, 120_000);
	assert.equal(getLiveTrackingConfig({
		LIVE_TRACKING_ENABLED: "true",
		LIVE_LOCATION_FRESH_SECONDS: "5",
		LIVE_LOCATION_TTL_SECONDS: "99999",
	}).enabled, true);
	assert.equal(getLiveTrackingConfig({ LIVE_LOCATION_TTL_SECONDS: "99999" }).ttlMs, 3_600_000);
});

test("only a driver can publish their own location and an active Picked_up order is required", async () => {
	const f = fixture();
	const created = await f.service.publish({ id: "driver-1", role: "driver" }, location());
	assert.equal(created.isLive, true);
	assert.equal(f.repository.get("driver-1").latitude, 33.8938);
	await assert.rejects(f.service.publish({ id: "admin-1", role: "admin" }, location()), { statusCode: 403 });
	await assert.rejects(f.service.publish({ id: "driver-2", role: "driver" }, location()), { statusCode: 409 });
	await assert.rejects(f.service.publish({ id: "driver-1", role: "driver" }, {
		...location(), driverId: "driver-2",
	}), /Unexpected location payload field/);
});

test("disabled tracking accepts no point and doesn't retain location", async () => {
	const f = fixture({ enabled: false });
	await assert.rejects(f.service.publish({ id: "driver-1", role: "driver" }, location()), { statusCode: 503 });
	assert.equal(f.repository.list().length, 0);
	assert.equal(f.service.forOrder({ status: "Picked_up", driverId: "driver-1" }).available, false);
});

test("public live payload is order-scoped and contains no driver identity", async () => {
	const f = fixture();
	await f.service.publish({ id: "driver-1", role: "driver" }, location());
	const result = f.service.forOrder({ status: "Picked_up", driverId: "driver-1" });
	assert.equal(result.isLive, true);
	assert.equal(result.latitude, 33.8938);
	assert.equal("driverId" in result, false);
	assert.equal("phone" in result, false);
	assert.equal("email" in result, false);
	assert.equal(f.service.forOrder({ status: "Picked_up", driverId: "driver-2" }).locationAvailable, false);
});

test("delivered, cancelled, collected and reassigned orders hide old location immediately", async () => {
	const f = fixture();
	await f.service.publish({ id: "driver-1", role: "driver" }, location());
	for (const status of ["DELIVERED", "Canceled", "COLLECTED", "Paid", "NEW", "WAREHOUSE"]) {
		assert.equal(f.service.forOrder({ status, driverId: "driver-1" }).locationAvailable, false);
	}
	assert.equal(f.service.forOrder({ status: "Picked_up", driverId: "driver-2" }).locationAvailable, false);
});

test("freshness and TTL hide coordinates and expire the latest point", async () => {
	const f = fixture({ ttlMs: 120_000, freshMs: 45_000 });
	await f.service.publish({ id: "driver-1", role: "driver" }, location());
	f.setNow(new Date(baseTime.getTime() + 60_000));
	const stale = f.service.forOrder({ status: "Picked_up", driverId: "driver-1" });
	assert.equal(stale.isStale, true);
	assert.equal("latitude" in stale, false);
	f.setNow(new Date(baseTime.getTime() + 121_000));
	assert.equal(f.service.forOrder({ status: "Picked_up", driverId: "driver-1" }).isStale, false);
	assert.equal(f.repository.get("driver-1"), null);
});

test("stop removes the driver's only current point", async () => {
	const f = fixture();
	await f.service.publish({ id: "driver-1", role: "driver" }, location());
	assert.deepEqual(f.service.stop("driver-1"), { stopped: true });
	assert.equal(f.service.forOrder({ status: "Picked_up", driverId: "driver-1" }).locationAvailable, false);
});

test("admin live list includes only fresh drivers with current picked-up work", async () => {
	const f = fixture();
	f.db.users.set("driver-1", { id: "driver-1", username: "driver", firstName: "Live", lastName: "Driver" });
	f.db.orders.set("active-order", { id: "active-order", driverId: "driver-1", status: "Picked_up" });
	await f.service.publish({ id: "driver-1", role: "driver" }, location());
	const handlers = createLiveTrackingHandlers({ db: f.db, service: f.service });
	const res = responseRecorder();
	await handlers.getAdminLiveDrivers({ user: { id: "admin", role: "admin" } }, res);
	assert.equal(res.statusCode, 200);
	assert.equal(res.body.drivers.length, 1);
	assert.deepEqual(res.body.drivers[0].activeOrderIds, ["active-order"]);
	assert.equal("phone" in res.body.drivers[0], false);
	const denied = responseRecorder();
	await handlers.getAdminLiveDrivers({ user: { id: "driver-1", role: "driver" } }, denied);
	assert.equal(denied.statusCode, 403);
});

test("merchant endpoint scopes its order query to the authenticated merchant", async () => {
	const f = fixture();
	const queried = [];
	f.db.order.findFirst = async ({ where }) => {
		queried.push(where);
		return where.merchantId === "merchant-1"
			? { id: "order-1", driverId: null, status: "Picked_up" }
			: null;
	};
	const handlers = createLiveTrackingHandlers({ db: f.db, service: f.service });
	const allowed = responseRecorder();
	await handlers.getAuthorizedOrderLiveLocation({ params: { id: "order-1" }, user: { id: "merchant-1", role: "merchant" } }, allowed);
	assert.equal(allowed.statusCode, 200);
	assert.deepEqual(queried[0], { id: "order-1", merchantId: "merchant-1" });
	const notOwned = responseRecorder();
	await handlers.getAuthorizedOrderLiveLocation({ params: { id: "order-1" }, user: { id: "merchant-2", role: "merchant" } }, notOwned);
	assert.equal(notOwned.statusCode, 404);
});

test("public handler is order-id-only, no-store, and unknown orders are hidden", async () => {
	const f = fixture();
	f.db.orders.set("order-1", { id: "order-1", driverId: "driver-1", status: "Picked_up" });
	await f.service.publish({ id: "driver-1", role: "driver" }, location());
	const handlers = createLiveTrackingHandlers({ db: f.db, service: f.service });
	const res = responseRecorder();
	await handlers.getPublicOrderLiveLocation({ params: { id: "order-1" } }, res);
	assert.equal(res.body.isLive, true);
	assert.equal(res.body.deliveryActive, true);
	assert.match(res.headers["Cache-Control"], /no-store/);
	const missing = responseRecorder();
	await handlers.getPublicOrderLiveLocation({ params: { id: "unknown" } }, missing);
	assert.equal(missing.statusCode, 404);
});

test("public lookup follows reassignment instead of exposing the old driver's point", async () => {
	const f = fixture();
	f.db.orders.set("order-1", { id: "order-1", driverId: "driver-1", status: "Picked_up" });
	await f.service.publish({ id: "driver-1", role: "driver" }, location());
	const handlers = createLiveTrackingHandlers({ db: f.db, service: f.service });
	const assignedToOldDriver = responseRecorder();
	await handlers.getPublicOrderLiveLocation({ params: { id: "order-1" } }, assignedToOldDriver);
	assert.equal(assignedToOldDriver.body.isLive, true);
	f.db.orders.set("order-1", { id: "order-1", driverId: "driver-2", status: "Picked_up" });
	const reassigned = responseRecorder();
	await handlers.getPublicOrderLiveLocation({ params: { id: "order-1" } }, reassigned);
	assert.equal(reassigned.body.deliveryActive, true);
	assert.equal(reassigned.body.locationAvailable, false);
});

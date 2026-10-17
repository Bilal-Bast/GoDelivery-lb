import assert from "node:assert/strict";
import test from "node:test";

import { createDispatchHandlers } from "../src/controllers/dispatch.controller.js";
import {
	createDispatchPlanningService,
	parseDispatchBoardQuery,
	startOfTodayInTimeZone,
} from "../src/services/dispatch-planning.service.js";

const now = new Date("2026-10-17T12:00:00.000Z");

function boardFixture() {
	const orders = [
		{ id: "A", status: "WAREHOUSE", driverId: null, merchantId: "m1", merchant: { username: "shop", firstName: "Shop", lastName: "One" }, driver: null, district: "North", city: "Tripoli", isExpress: true, createdAt: new Date("2026-10-17T08:00:00Z"), updatedAt: new Date("2026-10-17T08:00:00Z") },
		{ id: "B", status: "NEW", driverId: null, merchantId: "m1", merchant: { username: "shop", firstName: "Shop", lastName: "One" }, driver: null, district: "North", city: "Tripoli", isExpress: false, createdAt: new Date("2026-10-17T09:00:00Z"), updatedAt: new Date("2026-10-17T09:00:00Z") },
		{ id: "C", status: "Picked_up", driverId: "d1", district: "North", city: "Tripoli", isExpress: true },
	];
	const drivers = [
		{ id: "d1", username: "driver-a", firstName: "A", lastName: "Driver" },
		{ id: "d2", username: "driver-b", firstName: "B", lastName: "Driver" },
	];
	const db = {
		order: {
			count: async ({ where }) => orders.filter((order) => where.status.in.includes(order.status) && (where.driverId === null ? order.driverId === null : true)).length,
			findMany: async ({ where, skip = 0, take = Infinity }) => {
				if (typeof where.driverId === "string") return orders.filter((order) => order.driverId === where.driverId && where.status.in.includes(order.status));
				if (where.status.in?.includes("Picked_up")) return orders.filter((order) => where.driverId.not === null && where.status.in.includes(order.status));
				return orders.filter((order) => where.status.in.includes(order.status) && (where.driverId === null ? order.driverId === null : true)).slice(skip, skip + take);
			},
			groupBy: async () => [{ driverId: "d1", status: "Picked_up", district: "North", city: "Tripoli", isExpress: true, _count: { _all: 1 } }],
		},
		user: {
			findMany: async () => drivers,
			findFirst: async ({ where }) => drivers.find((driver) => driver.id === where.id) || null,
		},
	};
	const tracking = {
		isEnabled: () => true,
		freshLocations: () => [{ driverId: "d1", latitude: 33.9, longitude: 35.5, receivedAt: now.toISOString() }],
	};
	return { db, tracking, orders, drivers };
}

test("dispatch filters accept bounded values and use Beirut's local day boundary", () => {
	const parsed = parseDispatchBoardQuery({ page: "2", limit: "25", status: "NEW", assignment: "unassigned", scope: "today", express: "true" }, now);
	assert.equal(parsed.page, 2);
	assert.equal(parsed.limit, 25);
	assert.equal(parsed.where.status, "NEW");
	assert.equal(parsed.where.driverId, null);
	assert.equal(parsed.where.isExpress, true);
	assert.equal(parsed.where.createdAt.gte.toISOString(), startOfTodayInTimeZone(now).toISOString());
	assert.throws(() => parseDispatchBoardQuery({ limit: "10000" }, now), /between/);
});

test("board groups waiting orders, ranks workload deterministically, and exposes only live status", async () => {
	const { db, tracking } = boardFixture();
	const planning = createDispatchPlanningService({ db, tracking, now: () => now });
	const board = await planning.getBoard({});
	assert.equal(board.groups.length, 1);
	assert.equal(board.groups[0].cities[0].orderCount, 2);
	const orders = board.groups[0].cities[0].orders;
	assert.deepEqual(orders.map((order) => order.id), ["A", "B"]);
	assert.equal(orders[0].recommendation.recommendedDriver.username, "driver-b");
	assert.equal(board.drivers.find((driver) => driver.id === "d1").workload.pickedUpCount, 1);
	assert.deepEqual(board.drivers.find((driver) => driver.id === "d1").liveTracking, { isLive: true, updatedAt: now.toISOString() });
	assert.equal(JSON.stringify(board).includes("latitude"), false);
	assert.equal(JSON.stringify(board).includes("longitude"), false);
});

test("driver sequence is deterministic, Express-first, and scoped to the authenticated driver ID", async () => {
	const { db, tracking } = boardFixture();
	const planning = createDispatchPlanningService({ db, tracking, now: () => now });
	const sequence = await planning.getDriverSequence("d1");
	assert.deepEqual(sequence.sequence.map((order) => order.id), ["C"]);
	assert.equal(sequence.sequence[0].sequence, 1);
	assert.equal(sequence.sequenceMethod, "express, area group, order age, order ID");
	assert.deepEqual((await planning.getDriverSequence("d2")).sequence, []);
});

test("dispatch endpoints enforce role boundaries and assignment version checks", async () => {
	let updated;
	const handlers = createDispatchHandlers({
		db: { order: { findUnique: async () => ({ id: "A", status: "NEW", driverId: null, updatedAt: now }) } },
		planning: { getBoard: async () => ({ groups: [] }), getDriverSequence: async () => ({ sequence: [] }) },
		update: async (req, res) => { updated = { guard: req.dispatchAssignmentGuard, body: req.body }; return res.json({ order: { id: "A" } }); },
	});
	const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
	const unauthorized = response();
	await handlers.getBoard({ user: { role: "merchant" }, query: {} }, unauthorized);
	assert.equal(unauthorized.statusCode, 403);
	let sequenceDriverId;
	const sequenceHandlers = createDispatchHandlers({
		db: {},
		planning: {
			getBoard: async () => ({ groups: [] }),
			getDriverSequence: async (driverId) => { sequenceDriverId = driverId; return { sequence: [] }; },
		},
		update: async () => {},
	});
	const sequenceResponse = response();
	await sequenceHandlers.getMySequence({ user: { role: "driver", id: "authenticated-driver" }, query: { driverId: "attacker-driver" } }, sequenceResponse);
	assert.equal(sequenceDriverId, "authenticated-driver");
	const badBody = response();
	await handlers.assignOrder({ user: { role: "admin" }, params: { id: "A" }, body: { driverUsername: "x", expectedUpdatedAt: now.toISOString(), message: "arbitrary" } }, badBody, () => {});
	assert.equal(badBody.statusCode, 400);
	const accepted = response();
	await handlers.assignOrder({ user: { role: "admin", username: "admin" }, params: { id: "A" }, body: { driverUsername: "driver-b", expectedUpdatedAt: now.toISOString() } }, accepted, () => {});
	assert.equal(updated.body.driver, "driver-b");
	assert.deepEqual(updated.guard, { expectedUpdatedAt: now, expectedStatus: "NEW" });
	const stale = response();
	await handlers.assignOrder({ user: { role: "admin" }, params: { id: "A" }, body: { driverUsername: "driver-b", expectedUpdatedAt: "2026-10-16T00:00:00.000Z" } }, stale, () => {});
	assert.equal(stale.statusCode, 409);
});

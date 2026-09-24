import test from "node:test";
import assert from "node:assert/strict";

import { createGetDriverStats } from "../src/controllers/driver.controller.js";

test("driver stats are scoped only by the authenticated driver ID", async () => {
	const queries = [];
	const db = {
		order: {
			count: async (query) => {
				queries.push(query);
				return queries.length;
			},
		},
	};
	const res = {
		body: null,
		json(value) {
			this.body = value;
			return this;
		},
	};

	await createGetDriverStats(db)(
		{
			user: { id: "driver-1", username: "driver-one" },
			query: { driverId: "driver-2", username: "other-driver" },
		},
		res,
		assert.fail,
	);

	assert.deepEqual(res.body, {
		totalDeliveries: 1,
		todaysDeliveries: 2,
		activeOrders: 3,
	});
	assert.equal(queries.length, 3);
	for (const query of queries) {
		assert.equal(query.where.driverId, "driver-1");
		assert.equal("driver" in query.where, false);
	}
});

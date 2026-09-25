import test from "node:test";
import assert from "node:assert/strict";

import {
	buildOrderUpdateData,
	normalizeOrderPayload,
} from "../src/controllers/order/mappers.js";

test("admin create contract preserves express and driver fields", () => {
	const payload = normalizeOrderPayload({
		id: "GD-100",
		m: "merchant-one",
		driver: "driver-one",
		c: { f: "Maya", p: "70123456", loc: { d: "Beirut", cty: "Hamra" } },
		pr: { t: 100, d: 10 },
		s: 0,
		e: true,
		eN: "Call first",
	});

	assert.equal(payload.driverUsername, "driver-one");
	assert.equal(payload.isExpress, true);
	assert.equal(payload.expressNote, "Call first");
});

test("admin update mapper accepts permitted fields and drops unknown fields", () => {
	const update = buildOrderUpdateData({
		driver: "driver-two",
		c: { f: "Nour", l: "K", p: "03123456", loc: { d: "Metn", cty: "Jdeideh" } },
		pr: { t: 200, d: 20 },
		e: true,
		eN: "Urgent",
		merchantId: "forged-id",
		pickedUpByDriverId: "forged-driver",
	});

	assert.deepEqual(update, {
		driverUsername: "driver-two",
		customerFirstName: "Nour",
		customerLastName: "K",
		customerPhone: "03123456",
		district: "Metn",
		city: "Jdeideh",
		total: 200,
		deliveryCharge: 20,
		isExpress: true,
		expressNote: "Urgent",
	});
});

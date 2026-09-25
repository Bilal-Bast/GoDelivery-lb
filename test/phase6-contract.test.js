import test from "node:test";
import assert from "node:assert/strict";

import { publicTrackingFromPrisma } from "../src/controllers/order/mappers.js";
import {
	accountTypeChangeBlockReason,
	getRetentionBlockers,
} from "../src/controllers/user/api.js";
import { serializeUser } from "../src/controllers/user/serializers.js";
import {
	createForgotPassword,
	createResetPassword,
} from "../src/controllers/auth.controller.js";

function response() {
	return {
		statusCode: 200,
	body: null,
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

test("public tracking exposes delivery fields but no internal audit or finance data", () => {
	const result = publicTrackingFromPrisma(
		{
			id: "order-1",
			status: "DELIVERED",
			customerFirstName: "Maya",
			customerLastName: "Haddad",
			customerPhone: "70123456",
			district: "Beirut",
			city: "Hamra",
			total: 25,
			deliveryCharge: 5,
			merchant: { username: "secret-merchant" },
			driver: { username: "driver-one" },
			isExpress: false,
			createdAt: new Date("2026-01-01"),
			statusUpdatedAt: new Date("2026-01-02"),
		},
		[
			{
				actionType: "status_change",
				newValue: { status: "DELIVERED" },
				performedBy: "admin-secret",
				metadata: { note: "internal" },
				createdAt: new Date("2026-01-02"),
			},
			{ actionType: "note", metadata: { secret: true } },
		],
	);
	assert.equal(result.s, 3);
	assert.equal(result.pr.t, 25);
	assert.equal(result.pr.d, undefined);
	assert.equal(result.m, undefined);
	assert.equal(result.cancelledBy, undefined);
	assert.deepEqual(result.history[0].new_value, 3);
	assert.equal(result.history[0].performed_by, undefined);
	assert.equal(result.history[0].metadata, undefined);
	assert.equal(result.history.length, 1);
});

test("user serialization never exposes password or reset-token fields", () => {
	const result = serializeUser({
		id: "u1",
		username: "driver",
		role: "DRIVER",
		password: "hash",
		resetPasswordToken: "token-hash",
		resetPasswordExpires: new Date(),
		deliveryCharges: [],
	});
	assert.equal(result.role, "driver");
	assert.equal(result.password, undefined);
	assert.equal(result.resetPasswordToken, undefined);
	assert.equal(result.resetPasswordExpires, undefined);
});

test("account type changes are blocked once order or payment history exists", () => {
	assert.match(
		accountTypeChangeBlockReason({
			currentType: "PREPAID",
			requestedType: "POSTPAID",
			orderCount: 1,
			paymentCount: 0,
		}),
		/cannot be changed/,
	);
	assert.equal(
		accountTypeChangeBlockReason({
			currentType: "PREPAID",
			requestedType: "POSTPAID",
			orderCount: 0,
			paymentCount: 0,
		}),
		null,
	);
});

test("merchant deletion retention guard detects orders and financial history", async () => {
	const count = (value) => async () => value;
	const blockers = await getRetentionBlockers(
		{ id: "m1", role: "MERCHANT" },
		{
			order: { count: count(2) },
			merchantPayment: { count: count(1) },
			merchantReturn: { count: count(0) },
			financeTransaction: { count: count(1) },
		},
	);
	assert.deepEqual(
		blockers.map((item) => item.type),
		["merchantOrders", "merchantPayments", "merchantTransactions"],
	);
});

test("forgot password is non-enumerating and stores only a hashed token", async () => {
	const writes = [];
	const emails = [];
	const handler = createForgotPassword({
		db: {
			user: {
				findUnique: async ({ where }) =>
					where.email === "known@example.com"
						? { email: "known@example.com" }
						: null,
				update: async (operation) => writes.push(operation),
			},
		},
		createToken: () => "raw-token",
		sendEmail: async (email, url) => emails.push({ email, url }),
		now: () => 1_000,
	});
	const known = response();
	await handler(
		{
			body: { email: "KNOWN@EXAMPLE.COM" },
			protocol: "https",
			get: () => "example.com",
		},
		known,
		assert.fail,
	);
	const unknown = response();
	await handler(
		{
			body: { email: "missing@example.com" },
			protocol: "https",
			get: () => "example.com",
		},
		unknown,
		assert.fail,
	);
	assert.deepEqual(known.body, unknown.body);
	assert.equal(writes.length, 1);
	assert.notEqual(writes[0].data.resetPasswordToken, "raw-token");
	assert.match(emails[0].url, /token=raw-token/);
});

test("reset password rejects expired tokens and clears a used token", async () => {
	const updates = [];
	let valid = false;
	const handler = createResetPassword({
		db: {
			user: {
				findFirst: async () => (valid ? { id: "u1" } : null),
				update: async (operation) => updates.push(operation),
			},
		},
		hashPassword: async () => "bcrypt-hash",
		now: () => new Date("2026-01-01"),
	});
	const expired = response();
	await handler(
		{ body: { token: "expired", newPassword: "Secret1!" } },
		expired,
		assert.fail,
	);
	assert.equal(expired.statusCode, 400);
	valid = true;
	const accepted = response();
	await handler(
		{ body: { token: "valid", newPassword: "Secret1!" } },
		accepted,
		assert.fail,
	);
	assert.equal(updates[0].data.password, "bcrypt-hash");
	assert.equal(updates[0].data.resetPasswordToken, null);
	assert.equal(updates[0].data.resetPasswordExpires, null);
});

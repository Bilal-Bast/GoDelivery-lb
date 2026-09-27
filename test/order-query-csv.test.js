import test from "node:test";
import assert from "node:assert/strict";
import { parseOrderQuery } from "../src/services/order-query.service.js";
import { csvDocument } from "../src/services/csv.service.js";

const admin = { role: "admin", id: "admin-1" };
const merchant = { role: "merchant", id: "merchant-1" };

test("order query combines bounded search, filters, sort and paging", () => {
	const query = parseOrderQuery({ page: "2", limit: "25", search: "  Ali  ", status: "DELIVERED", express: "false", district: "Beirut", sort: "id", order: "asc" }, admin);
	assert.equal(query.skip, 25);
	assert.equal(query.where.status, "DELIVERED");
	assert.equal(query.where.isExpress, false);
	assert.equal(query.where.district.equals, "Beirut");
	assert.equal(query.where.OR[0].id.contains, "Ali");
	assert.deepEqual(query.orderBy, [{ id: "asc" }]);
});

test("merchant query is scoped by authenticated ID and cannot expand scope", () => {
	assert.equal(parseOrderQuery({ search: "customer" }, merchant).where.merchantId, "merchant-1");
	assert.throws(() => parseOrderQuery({ merchantId: "other" }, merchant), /Unsupported merchant filter/);
	assert.throws(() => parseOrderQuery({ driverUsername: "driver" }, merchant), /Unsupported merchant filter/);
});

test("order query rejects unchecked Prisma fields, bad dates and pagination", () => {
	for (const query of [{ orderBy: "password" }, { sort: "password" }, { order: "delete" }, { status: "unknown" }, { express: "yes" }, { dateFrom: "2026-02-30" }, { limit: "1000" }, { search: "x".repeat(101) }]) {
		assert.throws(() => parseOrderQuery(query, admin));
	}
});

test("CSV export quotes text and guards formulas without changing numbers", () => {
	const csv = csvDocument(["text", "amount"], [[{ value: "=2+2" }, { value: -4.5, text: false }], [{ value: 'Hello, "world"' }, { value: 0, text: false }]]);
	assert.match(csv, /^\uFEFF/);
	assert.match(csv, /"'=2\+2","-4.5"/);
	assert.match(csv, /"Hello, ""world"""/);
});

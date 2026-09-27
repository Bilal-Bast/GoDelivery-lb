import { statusNumberToEnum } from "../utils/orderStatus.js";

const allowed = new Set(["page", "limit", "search", "status", "merchantId", "merchantUsername", "driverId", "driverUsername", "district", "city", "express", "dateFrom", "dateTo", "sort", "order"]);
const sorts = new Set(["createdAt", "updatedAt", "id", "total", "status"]);

function parseOrderQuery(query, user) {
	for (const key of Object.keys(query)) {
		if (!allowed.has(key)) throw new Error(`Unsupported order filter: ${key}`);
	}
	const scalar = (key, max = 100) => {
		const value = query[key];
		if (value === undefined || value === "") return undefined;
		if (typeof value !== "string" || value.trim().length > max) throw new Error(`Invalid ${key}`);
		return value.trim();
	};
	const integer = (key, fallback, max) => {
		const value = scalar(key, 10);
		if (value === undefined) return fallback;
		if (!/^[1-9]\d*$/.test(value) || Number(value) > max) throw new Error(`Invalid ${key}`);
		return Number(value);
	};
	const page = integer("page", 1, 1000000);
	const limit = integer("limit", 20, 100);
	const search = scalar("search", 100);
	const status = scalar("status", 20);
	const validStatuses = new Set(statusNumberToEnum);
	if (status && !validStatuses.has(status)) throw new Error("Invalid status");
	const express = scalar("express", 5);
	if (express && !["true", "false"].includes(express)) throw new Error("Invalid express");
	const sort = scalar("sort", 20) || "createdAt";
	const order = scalar("order", 4) || "desc";
	if (!sorts.has(sort) || !["asc", "desc"].includes(order)) throw new Error("Invalid sort");
	const date = (key, end) => {
		const value = scalar(key, 10);
		if (!value) return undefined;
		if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid ${key}`);
		const parsed = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
		if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(`Invalid ${key}`);
		return parsed;
	};
	const dateFrom = date("dateFrom", false);
	const dateTo = date("dateTo", true);
	if (dateFrom && dateTo && dateFrom > dateTo) throw new Error("Invalid date range");
	const where = {};
	if (status) where.status = status;
	if (express) where.isExpress = express === "true";
	if (dateFrom || dateTo) where.createdAt = { ...(dateFrom && { gte: dateFrom }), ...(dateTo && { lte: dateTo }) };
	for (const field of ["district", "city"]) {
		const value = scalar(field, 80);
		if (value) where[field] = { equals: value, mode: "insensitive" };
	}
	if (user.role === "merchant") {
		if (["merchantId", "merchantUsername", "driverId", "driverUsername"].some((key) => query[key] !== undefined)) throw new Error("Unsupported merchant filter");
		where.merchantId = user.id;
	} else {
		const merchantId = scalar("merchantId", 100);
		const merchantUsername = scalar("merchantUsername", 100);
		const driverId = scalar("driverId", 100);
		const driverUsername = scalar("driverUsername", 100);
		if (merchantId) where.merchantId = merchantId;
		if (merchantUsername) where.merchant = { username: { equals: merchantUsername, mode: "insensitive" } };
		if (driverId) where.driverId = driverId;
		if (driverUsername) where.driver = { username: { equals: driverUsername, mode: "insensitive" } };
	}
	if (search) {
		const contains = { contains: search, mode: "insensitive" };
		where.OR = ["id", "customerFirstName", "customerLastName", "customerPhone", "district", "city"].map((field) => ({ [field]: contains }));
		if (user.role === "admin") where.OR.push({ merchant: { username: contains } }, { driver: { username: contains } });
	}
	return { where, page, limit, skip: (page - 1) * limit, orderBy: [{ [sort]: order }, ...(sort === "id" ? [] : [{ id: "asc" }])] };
}

export { parseOrderQuery };

import { statusNumberToEnum } from "../utils/orderStatus.js";

const allowed = new Set(["page", "limit", "search", "location", "status", "statuses", "merchantId", "merchantUsername", "merchantUsernames", "driverId", "driverUsername", "driverUsernames", "district", "city", "express", "dateFrom", "dateTo", "minTotal", "maxTotal", "sort", "order"]);
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
	const statusesQuery = scalar("statuses", 150);
	const legacyStatusQuery = scalar("status", 150);
	if (statusesQuery !== undefined && legacyStatusQuery !== undefined) throw new Error("Use either status or statuses, not both");
	const statusQuery = statusesQuery ?? legacyStatusQuery;
	const validStatuses = new Set(statusNumberToEnum);
	const statuses = statusQuery === undefined ? [] : statusQuery.split(",").map((value) => value.trim());
	if (
		statuses.length > statusNumberToEnum.length ||
		statuses.some((status) => !validStatuses.has(status)) ||
		new Set(statuses).size !== statuses.length
	) throw new Error("Invalid status");
	const usernameList = (key) => {
		const value = scalar(key, 2000);
		if (value === undefined) return [];
		const values = value.split(",").map((item) => item.trim());
		if (values.length > 100 || values.some((item) => !item || item.length > 100) || new Set(values).size !== values.length) {
			throw new Error(`Invalid ${key}`);
		}
		return values;
	};
	const merchantUsernames = usernameList("merchantUsernames");
	const driverUsernames = usernameList("driverUsernames");
	if ((merchantUsernames.length && query.merchantUsername !== undefined) || (driverUsernames.length && query.driverUsername !== undefined)) {
		throw new Error("Use either singular or plural merchant and driver filters");
	}
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
	const amount = (key) => {
		const value = scalar(key, 20);
		if (value === undefined || value === "") return undefined;
		const parsed = Number(value);
		if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`Invalid ${key}`);
		return parsed;
	};
	const minTotal = amount("minTotal");
	const maxTotal = amount("maxTotal");
	if (minTotal !== undefined && maxTotal !== undefined && minTotal > maxTotal) {
		throw new Error("Minimum total cannot exceed maximum total");
	}
	const where = {};
	if (statuses.length === 1) where.status = statuses[0];
	else if (statuses.length > 1) where.status = { in: statuses };
	if (express) where.isExpress = express === "true";
	if (dateFrom || dateTo) where.createdAt = { ...(dateFrom && { gte: dateFrom }), ...(dateTo && { lte: dateTo }) };
	if (minTotal !== undefined || maxTotal !== undefined) {
		where.total = { ...(minTotal !== undefined && { gte: minTotal }), ...(maxTotal !== undefined && { lte: maxTotal }) };
	}
	for (const field of ["district", "city"]) {
		const value = scalar(field, 80);
		if (value) where[field] = { equals: value, mode: "insensitive" };
	}
	if (user.role === "merchant") {
		if (["merchantId", "merchantUsername", "merchantUsernames", "driverId", "driverUsername", "driverUsernames"].some((key) => query[key] !== undefined)) throw new Error("Unsupported merchant filter");
		where.merchantId = user.id;
	} else {
		const merchantId = scalar("merchantId", 100);
		const merchantUsername = scalar("merchantUsername", 100);
		const driverId = scalar("driverId", 100);
		const driverUsername = scalar("driverUsername", 100);
		if (merchantId) where.merchantId = merchantId;
		if (merchantUsernames.length) where.merchant = { username: { in: merchantUsernames, mode: "insensitive" } };
		else if (merchantUsername) where.merchant = { username: { equals: merchantUsername, mode: "insensitive" } };
		if (driverId) where.driverId = driverId;
		if (driverUsernames.length) where.driver = { username: { in: driverUsernames, mode: "insensitive" } };
		else if (driverUsername) where.driver = { username: { equals: driverUsername, mode: "insensitive" } };
	}
	const searchConditions = [];
	if (search) {
		const contains = { contains: search, mode: "insensitive" };
		const searchOr = ["id", "customerFirstName", "customerLastName", "customerPhone", "district", "city"].map((field) => ({ [field]: contains }));
		if (user.role === "admin") searchOr.push({ merchant: { username: contains } }, { driver: { username: contains } });
		const nameTokens = search.split(/\s+/).filter(Boolean);
		if (nameTokens.length > 1) {
			searchOr.push({
				AND: nameTokens.map((token) => ({
					OR: ["customerFirstName", "customerLastName"].map((field) => ({
						[field]: { contains: token, mode: "insensitive" },
					})),
				})),
			});
		}
		searchConditions.push({ OR: searchOr });
	}
	const location = scalar("location", 100);
	if (location) {
		const locationTokens = location.split(/\s+/).filter(Boolean);
		searchConditions.push({
			AND: locationTokens.map((token) => ({
				OR: ["district", "city"].map((field) => ({
					[field]: { contains: token, mode: "insensitive" },
				})),
			})),
		});
	}
	if (searchConditions.length) where.AND = searchConditions;
	return { where, page, limit, skip: (page - 1) * limit, orderBy: [{ [sort]: order }, ...(sort === "id" ? [] : [{ id: "asc" }])] };
}

export { parseOrderQuery };

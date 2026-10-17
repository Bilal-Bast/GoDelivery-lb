import prisma from "../config/prisma.js";
import { liveTracking } from "./live-tracking/live-tracking.service.js";

const DISPATCH_STATUSES = Object.freeze(["WAREHOUSE", "NEW"]);
const ACTIVE_STATUSES = Object.freeze(["WAREHOUSE", "NEW", "Picked_up"]);
const TIME_ZONE = "Asia/Beirut";
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 1000;

// Lower scores rank first. One waiting order is one workload unit; an order
// already picked up weighs two. Area affinity can break close choices without
// outweighing one full workload unit.
const DISPATCH_SCORE_WEIGHTS = Object.freeze({
	waitingOrder: 1,
	pickedUpOrder: 2,
	workloadUnit: 100,
	expressLoad: 20,
	sameDistrict: 25,
	sameCity: 40,
});

class DispatchPlanningError extends Error {
	constructor(message, statusCode = 400) {
		super(message);
		this.name = "DispatchPlanningError";
		this.statusCode = statusCode;
	}
}

function normalizedText(value) {
	return String(value ?? "").trim().normalize("NFKC").toLocaleLowerCase("en");
}

function displayArea(value, fallback) {
	const text = String(value ?? "").trim();
	return text || fallback;
}

function dateParts(date, timeZone, withTime = false) {
	const options = {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		...(withTime
			? { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }
			: {}),
	};
	return Object.fromEntries(
		new Intl.DateTimeFormat("en-US", options)
			.formatToParts(date)
			.filter((part) => part.type !== "literal")
			.map((part) => [part.type, Number(part.value)]),
	);
}

function startOfTodayInTimeZone(now = new Date(), timeZone = TIME_ZONE) {
	const localDate = dateParts(now, timeZone);
	const targetMidnight = Date.UTC(localDate.year, localDate.month - 1, localDate.day);
	let guess = targetMidnight;
	for (let attempt = 0; attempt < 3; attempt++) {
		const localAtGuess = dateParts(new Date(guess), timeZone, true);
		const representedAsUtc = Date.UTC(
			localAtGuess.year,
			localAtGuess.month - 1,
			localAtGuess.day,
			localAtGuess.hour,
			localAtGuess.minute,
			localAtGuess.second,
		);
		guess = targetMidnight - (representedAsUtc - guess);
	}
	return new Date(guess);
}

function boundedInteger(value, fallback, min, max, name) {
	if (value === undefined || value === null || value === "") return fallback;
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
		throw new DispatchPlanningError(`${name} must be between ${min} and ${max}`);
	}
	return parsed;
}

function optionalFilterText(value, name, maxLength = 100) {
	if (value === undefined || value === null || value === "") return null;
	if (typeof value !== "string" || value.trim().length > maxLength) {
		throw new DispatchPlanningError(`Invalid ${name} filter`);
	}
	return value.trim() || null;
}

function parseDispatchBoardQuery(query = {}, now = new Date()) {
	const status = String(query.status ?? "ALL").trim().toUpperCase();
	if (!["ALL", ...DISPATCH_STATUSES].includes(status)) {
		throw new DispatchPlanningError("Status must be ALL, WAREHOUSE, or NEW");
	}
	const assignment = String(query.assignment ?? "unassigned").trim().toLowerCase();
	if (!["unassigned", "assigned", "all"].includes(assignment)) {
		throw new DispatchPlanningError("Invalid assignment filter");
	}
	const scope = String(query.scope ?? "all").trim().toLowerCase();
	if (!["today", "all"].includes(scope)) {
		throw new DispatchPlanningError("Scope must be today or all");
	}
	let express = null;
	if (query.express !== undefined && query.express !== "") {
		if (!["true", "false", true, false].includes(query.express)) {
			throw new DispatchPlanningError("Express filter must be true or false");
		}
		express = query.express === true || query.express === "true";
	}
	const page = boundedInteger(query.page, 1, 1, MAX_PAGE, "page");
	const limit = boundedInteger(query.limit, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE, "limit");
	const district = optionalFilterText(query.district, "district", 120);
	const city = optionalFilterText(query.city, "city", 120);
	const merchantUsername = optionalFilterText(query.merchantUsername, "merchant", 80);
	const where = {
		status: status === "ALL" ? { in: DISPATCH_STATUSES } : status,
		...(assignment === "unassigned"
			? { driverId: null }
			: assignment === "assigned"
				? { driverId: { not: null } }
				: {}),
		...(express === null ? {} : { isExpress: express }),
		...(district ? { district: { equals: district, mode: "insensitive" } } : {}),
		...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
		...(merchantUsername ? { merchant: { username: merchantUsername } } : {}),
		...(scope === "today" ? { createdAt: { gte: startOfTodayInTimeZone(now) } } : {}),
	};
	return {
		page,
		limit,
		skip: (page - 1) * limit,
		status,
		assignment,
		scope,
		express,
		district,
		city,
		merchantUsername,
		where,
	};
}

function orderPriorityCompare(a, b) {
	if (Boolean(a.isExpress) !== Boolean(b.isExpress)) return a.isExpress ? -1 : 1;
	const age = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
	if (age) return age;
	const districtOrder = normalizedText(a.district).localeCompare(normalizedText(b.district));
	if (districtOrder) return districtOrder;
	const cityOrder = normalizedText(a.city).localeCompare(normalizedText(b.city));
	if (cityOrder) return cityOrder;
	return String(a.id).localeCompare(String(b.id));
}

function areaOrderCompare(a, b) {
	const districtOrder = normalizedText(a.district).localeCompare(normalizedText(b.district));
	if (districtOrder) return districtOrder;
	const cityOrder = normalizedText(a.city).localeCompare(normalizedText(b.city));
	if (cityOrder) return cityOrder;
	return orderPriorityCompare(a, b);
}

function createWorkload(driver, activeOrders) {
	const orders = activeOrders.filter((order) => order.driverId === driver.id);
	const areas = new Map();
	let waitingCount = 0;
	let pickedUpCount = 0;
	let expressActiveCount = 0;
	for (const order of orders) {
		const count = Number(order._count?._all ?? 1);
		if (order.status === "Picked_up") pickedUpCount += count;
		else waitingCount += count;
		if (order.isExpress) expressActiveCount += count;
		const district = displayArea(order.district, "Unknown District");
		const city = displayArea(order.city, "Unknown City");
		const key = `${normalizedText(district)}\u0000${normalizedText(city)}`;
		const current = areas.get(key) || { district, city, count: 0 };
		current.count += count;
		areas.set(key, current);
	}
	const newCount = orders.filter((order) => order.status === "NEW").reduce((sum, order) => sum + Number(order._count?._all ?? 1), 0);
	const warehouseCount = orders.filter((order) => order.status === "WAREHOUSE").reduce((sum, order) => sum + Number(order._count?._all ?? 1), 0);
	return {
		activeCount: orders.length,
		waitingCount,
		warehouseCount,
		newCount,
		pickedUpCount,
		expressActiveCount,
		weightedUnits:
			waitingCount * DISPATCH_SCORE_WEIGHTS.waitingOrder +
			pickedUpCount * DISPATCH_SCORE_WEIGHTS.pickedUpOrder,
		areas: [...areas.values()].sort(
			(a, b) => b.count - a.count || normalizedText(a.district).localeCompare(normalizedText(b.district)) || normalizedText(a.city).localeCompare(normalizedText(b.city)),
		),
	};
}

function scoreDriverForOrder(driver, workload, order) {
	const districtKey = normalizedText(order.district);
	const cityKey = normalizedText(order.city);
	const matchingArea = workload.areas.find(
		(area) => normalizedText(area.district) === districtKey && normalizedText(area.city) === cityKey,
	);
	const sameDistrictCount = workload.areas
		.filter((area) => normalizedText(area.district) === districtKey)
		.reduce((total, area) => total + area.count, 0);
	const sameCityCount = matchingArea?.count || 0;
	const score =
		workload.weightedUnits * DISPATCH_SCORE_WEIGHTS.workloadUnit +
		workload.expressActiveCount * DISPATCH_SCORE_WEIGHTS.expressLoad -
		(sameDistrictCount ? DISPATCH_SCORE_WEIGHTS.sameDistrict : 0) -
		(sameCityCount ? DISPATCH_SCORE_WEIGHTS.sameCity : 0);
	const reasons = [
		`${workload.activeCount} active order${workload.activeCount === 1 ? "" : "s"}; ${workload.weightedUnits} weighted workload unit${workload.weightedUnits === 1 ? "" : "s"}`,
	];
	if (workload.pickedUpCount) {
		reasons.push(`${workload.pickedUpCount} picked-up order${workload.pickedUpCount === 1 ? "" : "s"} (weighted twice)`);
	}
	if (sameDistrictCount) reasons.push(`Already serving ${displayArea(order.district, "Unknown District")} (${sameDistrictCount} active order${sameDistrictCount === 1 ? "" : "s"})`);
	if (sameCityCount) reasons.push(`Already serving ${displayArea(order.city, "Unknown City")} (${sameCityCount} active order${sameCityCount === 1 ? "" : "s"})`);
	if (workload.expressActiveCount) reasons.push(`${workload.expressActiveCount} active Express order${workload.expressActiveCount === 1 ? "" : "s"}`);
	return {
		driver,
		score,
		workload: {
			activeCount: workload.activeCount,
			waitingCount: workload.waitingCount,
			pickedUpCount: workload.pickedUpCount,
			expressActiveCount: workload.expressActiveCount,
			weightedUnits: workload.weightedUnits,
		},
		reasons,
	};
}

function candidateCompare(a, b) {
	return (
		a.score - b.score ||
		a.workload.weightedUnits - b.workload.weightedUnits ||
		a.workload.activeCount - b.workload.activeCount ||
		normalizedText(a.driver.username).localeCompare(normalizedText(b.driver.username)) ||
		String(a.driver.id).localeCompare(String(b.driver.id))
	);
}

function incrementPlannedWorkload(workload, order) {
	workload.activeCount++;
	workload.waitingCount++;
	workload.weightedUnits += DISPATCH_SCORE_WEIGHTS.waitingOrder;
	if (order.status === "NEW") workload.newCount++;
	if (order.status === "WAREHOUSE") workload.warehouseCount++;
	if (order.isExpress) workload.expressActiveCount++;
	const district = displayArea(order.district, "Unknown District");
	const city = displayArea(order.city, "Unknown City");
	const existing = workload.areas.find(
		(area) => normalizedText(area.district) === normalizedText(district) && normalizedText(area.city) === normalizedText(city),
	);
	if (existing) existing.count++;
	else workload.areas.push({ district, city, count: 1 });
}

function driverSummary(driver, workload, liveLocation) {
	return {
		id: driver.id,
		username: driver.username,
		displayName: `${driver.firstName || ""} ${driver.lastName || ""}`.trim() || driver.username,
		workload,
		liveTracking: liveLocation
			? { isLive: true, updatedAt: liveLocation.receivedAt }
			: { isLive: false, updatedAt: null },
	};
}

function makeRecommendation(order, drivers, plannedWorkloads) {
	if (!drivers.length) {
		return {
			recommendedDriver: null,
			alternatives: [],
			reasons: ["No eligible drivers available"],
		};
	}
	const candidates = drivers
		.map((driver) => scoreDriverForOrder(driver, plannedWorkloads.get(driver.id), order))
		.sort(candidateCompare);
	const toResponse = (candidate) => ({
			...candidate.driver,
			score: candidate.score,
			workload: candidate.workload,
			reasons: candidate.reasons,
		});
	const chosen = candidates[0];
	const result = {
		recommendedDriver: toResponse(chosen),
		alternatives: candidates.slice(1, 4).map(toResponse),
		reasons: chosen.reasons,
	};
	incrementPlannedWorkload(plannedWorkloads.get(chosen.driver.id), order);
	return result;
}

function groupOrders(orders) {
	const districts = new Map();
	for (const order of [...orders].sort(areaOrderCompare)) {
		const district = displayArea(order.district, "Unknown District");
		const city = displayArea(order.city, "Unknown City");
		const districtKey = normalizedText(district);
		const cityKey = normalizedText(city);
		if (!districts.has(districtKey)) districts.set(districtKey, { district, cities: new Map() });
		const districtGroup = districts.get(districtKey);
		if (!districtGroup.cities.has(cityKey)) {
			districtGroup.cities.set(cityKey, {
				city,
				orders: [],
				expressCount: 0,
				oldestWaitingAt: null,
			});
		}
		const cityGroup = districtGroup.cities.get(cityKey);
		cityGroup.orders.push(order);
		if (order.isExpress) cityGroup.expressCount++;
		if (!cityGroup.oldestWaitingAt || new Date(order.createdAt) < new Date(cityGroup.oldestWaitingAt)) {
			cityGroup.oldestWaitingAt = order.createdAt;
		}
	}
	return [...districts.values()]
		.sort((a, b) => normalizedText(a.district).localeCompare(normalizedText(b.district)))
		.map(({ district, cities }) => ({
			district,
			cities: [...cities.values()]
				.sort((a, b) => normalizedText(a.city).localeCompare(normalizedText(b.city)))
				.map((group) => ({
					...group,
					orderCount: group.orders.length,
					orders: group.orders,
				})),
		}));
}

function buildSuggestedSequence(orders) {
	return [...orders]
		.filter((order) => ACTIVE_STATUSES.includes(order.status))
		.sort((a, b) => {
			if (Boolean(a.isExpress) !== Boolean(b.isExpress)) return a.isExpress ? -1 : 1;
			const districtOrder = normalizedText(a.district).localeCompare(normalizedText(b.district));
			if (districtOrder) return districtOrder;
			const cityOrder = normalizedText(a.city).localeCompare(normalizedText(b.city));
			if (cityOrder) return cityOrder;
			const age = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
			return age || String(a.id).localeCompare(String(b.id));
		})
		.map((order, index) => ({
			sequence: index + 1,
			id: order.id,
			status: order.status,
			district: displayArea(order.district, "Unknown District"),
			city: displayArea(order.city, "Unknown City"),
			isExpress: Boolean(order.isExpress),
			createdAt: order.createdAt,
		}));
}

function createDispatchPlanningService({ db = prisma, tracking = liveTracking, now = () => new Date() } = {}) {
	async function getBoard(query = {}) {
		const parsed = parseDispatchBoardQuery(query, now());
		const where = parsed.where;
		const [totalOrders, pageOrders, driverAccounts, activeOrders] = await Promise.all([
			db.order.count({ where }),
			db.order.findMany({
				where,
				orderBy: [{ isExpress: "desc" }, { createdAt: "asc" }, { id: "asc" }],
				skip: parsed.skip,
				take: parsed.limit,
				select: {
					id: true,
					status: true,
					driverId: true,
					merchantId: true,
					merchant: { select: { username: true, firstName: true, lastName: true } },
					driver: { select: { id: true, username: true, firstName: true, lastName: true } },
					district: true,
					city: true,
					isExpress: true,
					createdAt: true,
					updatedAt: true,
				},
			}),
			db.user.findMany({
				where: { role: "DRIVER" },
				orderBy: [{ username: "asc" }, { id: "asc" }],
				select: { id: true, username: true, firstName: true, lastName: true },
			}),
				db.order.groupBy({
					by: ["driverId", "status", "district", "city", "isExpress"],
				where: { status: { in: ACTIVE_STATUSES }, driverId: { not: null } },
					_count: { _all: true },
			}),
		]);
		const liveByDriver = new Map(
			(tracking.freshLocations?.() || []).map((location) => [location.driverId, location]),
		);
		const workloads = new Map(
			driverAccounts.map((driver) => [driver.id, createWorkload(driver, activeOrders)]),
		);
		const drivers = driverAccounts.map((driver) => driverSummary(
			driver,
			workloads.get(driver.id),
			liveByDriver.get(driver.id),
		));
		const driversById = new Map(drivers.map((driver) => [driver.id, driver]));
		const plannedWorkloads = new Map(
			drivers.map((driver) => [driver.id, {
				...driver.workload,
				areas: driver.workload.areas.map((area) => ({ ...area })),
			}]),
		);
		const enriched = pageOrders.map((order) => ({
			id: order.id,
			status: order.status,
			currentDriver: order.driverId ? driversById.get(order.driverId) || (order.driver ? {
				id: order.driver.id,
				username: order.driver.username,
				displayName: `${order.driver.firstName || ""} ${order.driver.lastName || ""}`.trim() || order.driver.username,
			} : { id: order.driverId, username: "Driver unavailable", displayName: "Driver unavailable" }) : null,
			merchant: {
				id: order.merchantId,
				username: order.merchant.username,
				displayName: `${order.merchant.firstName || ""} ${order.merchant.lastName || ""}`.trim() || order.merchant.username,
			},
			district: displayArea(order.district, "Unknown District"),
			city: displayArea(order.city, "Unknown City"),
			isExpress: Boolean(order.isExpress),
			createdAt: order.createdAt,
			updatedAt: order.updatedAt,
		})).sort(orderPriorityCompare);
		for (const order of enriched) {
			order.recommendation = order.currentDriver
				? null
				: makeRecommendation(order, drivers, plannedWorkloads);
		}
		const totalPages = Math.max(1, Math.ceil(totalOrders / parsed.limit));
		return {
			generatedAt: now().toISOString(),
			timeZone: TIME_ZONE,
			page: parsed.page,
			pageSize: parsed.limit,
			totalOrders,
			totalPages,
			hasPrevious: parsed.page > 1,
			hasNext: parsed.page < totalPages,
			filters: {
				status: parsed.status,
				assignment: parsed.assignment,
				scope: parsed.scope,
				express: parsed.express,
				district: parsed.district,
				city: parsed.city,
				merchantUsername: parsed.merchantUsername,
			},
			liveTrackingEnabled: tracking.isEnabled?.() === true,
			drivers,
			groups: groupOrders(enriched),
		};
	}

	async function getDriverSequence(driverId) {
	if (!driverId || typeof driverId !== "string") {
		throw new DispatchPlanningError("Driver identity is required", 401);
	}
	const [orders, driver] = await Promise.all([
		db.order.findMany({
			where: { driverId, status: { in: ACTIVE_STATUSES } },
			orderBy: [{ isExpress: "desc" }, { district: "asc" }, { city: "asc" }, { createdAt: "asc" }, { id: "asc" }],
			select: { id: true, status: true, district: true, city: true, isExpress: true, createdAt: true },
		}),
		db.user.findFirst({ where: { id: driverId, role: "DRIVER" }, select: { id: true } }),
	]);
	if (!driver) throw new DispatchPlanningError("Driver account not found", 404);
	return {
		generatedAt: now().toISOString(),
		sequenceMethod: "express, area group, order age, order ID",
		sequence: buildSuggestedSequence(orders),
	};
	}

	return { getBoard, getDriverSequence };
}

const dispatchPlanning = createDispatchPlanningService();

export {
	ACTIVE_STATUSES,
	DISPATCH_SCORE_WEIGHTS,
	DISPATCH_STATUSES,
	DispatchPlanningError,
	MAX_PAGE_SIZE,
	TIME_ZONE,
	buildSuggestedSequence,
	createDispatchPlanningService,
	displayArea,
	groupOrders,
	makeRecommendation,
	normalizedText,
	orderPriorityCompare,
	parseDispatchBoardQuery,
	dispatchPlanning,
	startOfTodayInTimeZone,
};

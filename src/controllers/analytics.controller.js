import { Prisma } from "@prisma/client";
import prisma from "../config/prisma.js";
import { statusNumberToEnum } from "../utils/orderStatus.js";
import { formatUserDisplayName } from "../utils/userDisplay.js";

function buildDateRangeFilter(startDate, endDate) {
	const createdAt = {};
	if (startDate) createdAt.gte = new Date(startDate);
	if (endDate) {
		const end = new Date(endDate);
		end.setHours(23, 59, 59, 999);
		createdAt.lte = end;
	}
	return Object.keys(createdAt).length ? createdAt : undefined;
}

function buildRawWhereClauses({ startDate, endDate, statuses, merchant }) {
	const clauses = [];
	if (startDate) clauses.push(Prisma.sql`"createdAt" >= ${new Date(startDate)}`);
	if (endDate) {
		const end = new Date(endDate);
		end.setHours(23, 59, 59, 999);
		clauses.push(Prisma.sql`"createdAt" <= ${end}`);
	}
	if (statuses.length) {
		const enumStatuses = statuses.map((status) => Prisma.sql`${statusNumberToEnum[status]}`);
		clauses.push(Prisma.sql`"status" IN (${Prisma.join(enumStatuses)})`);
	}
	if (merchant) {
		clauses.push(Prisma.sql`"merchantId" IN (SELECT id FROM "User" WHERE username = ${merchant})`);
	}
	return clauses;
}

async function getAnalytics(req, res, next) {
	try {
		const { startDate, endDate, merchant } = req.query;
		if (req.query.status !== undefined && req.query.statuses !== undefined) {
			return res.status(400).json({ error: "Use either status or statuses, not both" });
		}
		const rawStatuses = req.query.statuses ?? req.query.status;
		let selectedStatuses = [];
		if (rawStatuses !== undefined && rawStatuses !== "") {
			if (typeof rawStatuses !== "string") {
				return res.status(400).json({ error: "Invalid status filter" });
			}
			const values = rawStatuses.split(",");
			if (
				values.length > statusNumberToEnum.length ||
				values.some((value) => !/^[0-6]$/.test(value)) ||
				new Set(values).size !== values.length
			) {
				return res.status(400).json({ error: "Invalid status filter" });
			}
			selectedStatuses = values.map(Number);
		}
		const selectedStatusEnums = selectedStatuses.map((status) => statusNumberToEnum[status]);

		const where = {};
		const createdAtFilter = buildDateRangeFilter(startDate, endDate);
		if (createdAtFilter) where.createdAt = createdAtFilter;
		if (selectedStatusEnums.length) where.status = { in: selectedStatusEnums };
		if (merchant) {
			where.merchant = { is: { username: merchant } };
		}

		// Revenue filter: exclude cancelled orders (status !== CANCELLED AND cancelledBy is null)
		const revenueWhere = {
			...where,
			status: selectedStatusEnums.length
				? { in: selectedStatusEnums.filter((status) => status !== statusNumberToEnum[4]) }
				: { not: statusNumberToEnum[4] }, // Exclude cancelled orders from revenue.
			cancelledBy: null,
		};

		const startOfToday = new Date();
		startOfToday.setHours(0, 0, 0, 0);

		const clauses = buildRawWhereClauses({ startDate, endDate, statuses: selectedStatuses, merchant });
		const whereSql =
    	clauses.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(clauses, Prisma.sql` AND `)}`
        : Prisma.empty;

		// Revenue clauses - add cancelled exclusion
		// When there are NO base filters, still generate a WHERE clause for revenue
		let revenueSql = Prisma.empty;
		if (clauses.length > 0) {
		revenueSql = Prisma.sql`WHERE ${Prisma.join(clauses, Prisma.sql` AND `)} AND "status" != ${statusNumberToEnum[4]} AND "cancelledBy" IS NULL`;
		} else {
		revenueSql = Prisma.sql`WHERE "status" != ${statusNumberToEnum[4]} AND "cancelledBy" IS NULL`;
		}

		const [totals, ordersToday, statusGroups, revenueByDay, ordersByDay, topLocations, topMerchantsGroups, topDriversGroups, activeDriversGroups, recentOrders, merchantDocs] =
			await Promise.all([
				prisma.order.aggregate({
					where: revenueWhere,
					_sum: { total: true },
				}),
				prisma.order.count({
					where: {
						...where,
						createdAt: { gte: startOfToday },
					},
				}),
				prisma.order.groupBy({
					by: ["status"],
					where,
					_count: { _all: true },
				}),
				prisma.$queryRaw(
					Prisma.sql`
						SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS date,
						SUM(COALESCE("total", 0)) AS value
						FROM "Order"
						${revenueSql}
						GROUP BY date
						ORDER BY date ASC
					`,
				),
				prisma.$queryRaw(
					Prisma.sql`
						SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS date,
						COUNT(*) AS count
						FROM "Order"
						${whereSql}
						GROUP BY date
						ORDER BY date ASC
					`,
				),
				prisma.order.groupBy({
					by: ["district"],
					where,
					_count: { _all: true },
					orderBy: { _count: { district: "desc" } },
					take: 10,
				}),
				prisma.order.groupBy({
					by: ["merchantId"],
					where: revenueWhere,
					_count: { _all: true },
					_sum: { total: true },
					orderBy: { _count: { merchantId: "desc" } },
					take: 10,
				}),
				prisma.order.groupBy({
					by: ["driverId"],
					where: { ...revenueWhere, driverId: { not: null } },
					_count: { _all: true },
					_sum: { total: true },
					orderBy: { _count: { driverId: "desc" } },
					take: 10,
				}),
				prisma.order.groupBy({
					by: ["driverId"],
					where: {
						...where,
						driverId: { not: null },
						status: {
							in: ["WAREHOUSE", "NEW", "Picked_up"].filter(
								(status) => !selectedStatusEnums.length || selectedStatusEnums.includes(status),
							),
						},
					},
					_count: { _all: true },
				}),
				prisma.order.findMany({
					where,
					orderBy: { createdAt: "desc" },
					take: 20,
					select: {
						id: true,
						merchant: { select: { username: true } },
						driver: { select: { username: true } },
						status: true,
						createdAt: true,
						total: true,
						customerFirstName: true,
						customerLastName: true,
						district: true,
						city: true,
					},
				}),
				prisma.user.findMany({
					where: { role: "MERCHANT" },
					select: { id: true, username: true, firstName: true, lastName: true },
				}),
			]);

		const statusCounts = [0, 0, 0, 0, 0, 0, 0];
		statusGroups.forEach((group) => {
			const index = statusNumberToEnum.indexOf(group.status);
			if (index >= 0) statusCounts[index] = group._count._all;
		});

		const driverIds = topDriversGroups.map((group) => group.driverId).filter(Boolean);
		const driverDocs = driverIds.length
			? await prisma.user.findMany({
				where: { id: { in: driverIds } },
				select: { id: true, username: true, firstName: true, lastName: true },
			})
			: [];
		const driverNameMap = {};
		driverDocs.forEach((driver) => {
			driverNameMap[driver.id] = formatUserDisplayName(driver);
		});

		const merchantMap = new Map();
		merchantDocs.forEach((merchantDoc) => {
			merchantMap.set(merchantDoc.id, formatUserDisplayName(merchantDoc));
		});

		const totalsData = {
			totalOrders: statusGroups.reduce((count, group) => count + group._count._all, 0),
			totalRevenue: totals._sum.total || 0,
		};

		res.json({
			summary: {
				totalOrders: totalsData.totalOrders,
				totalRevenue: totalsData.totalRevenue,
				ordersToday,
				activeDrivers: activeDriversGroups.length,
				statusCounts,
			},
			revenueByDay: revenueByDay.map((row) => ({
				date: row.date,
				value: Number(row.value || 0),
			})),
			ordersByDay: ordersByDay.map((row) => ({
				date: row.date,
				count: Number(row.count || 0),
			})),
			topLocations: topLocations.map((group) => ({
				district: group.district,
				count: group._count._all,
			})),
			topMerchants: topMerchantsGroups.map((group) => ({
				name: merchantMap.get(group.merchantId) || group.merchantId || "Unknown",
				orders: group._count._all,
				revenue: group._sum.total || 0,
			})),
			topDrivers: topDriversGroups.map((group) => ({
				username: driverNameMap[group.driverId] ? driverDocs.find((d) => d.id === group.driverId).username : group.driverId,
				name: driverNameMap[group.driverId] || group.driverId,
				deliveries: group._count._all,
				revenue: group._sum.total || 0,
			})),
			recentOrders: recentOrders.map((order) => ({
				id: order.id,
				m: order.merchant?.username || null,
				driver: order.driver?.username || null,
				c: {
					f: order.customerFirstName || "",
					l: order.customerLastName || "",
					p: order.customerPhone || "",
					loc: {
						d: order.district || "",
						cty: order.city || "",
					},
				},
				pr: {
					t: order.total ?? 0,
					d: order.deliveryCharge ?? 0,
				},
				cb: order.createdBy || "admin",
				s: statusNumberToEnum.indexOf(order.status),
				cancelledBy: order.cancelledBy,
				cancelledFromStatus: order.cancelledFromStatus,
				collectedBack: order.collectedBack,
				statusUpdatedAt: order.statusUpdatedAt,
				e: order.isExpress ?? false,
				eN: order.expressNote || "",
				createdAt: order.createdAt,
				updatedAt: order.updatedAt,
			})),
			merchants: merchantDocs.map((m) => ({
				username: m.username,
				name: formatUserDisplayName(m),
			})),
		});
	} catch (error) {
		next(error);
	}
}

export { getAnalytics };

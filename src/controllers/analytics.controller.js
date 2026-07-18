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

function buildRawWhereClauses({ startDate, endDate, status, merchant }) {
	const clauses = [];
	if (startDate) clauses.push(Prisma.sql`"createdAt" >= ${new Date(startDate)}`);
	if (endDate) {
		const end = new Date(endDate);
		end.setHours(23, 59, 59, 999);
		clauses.push(Prisma.sql`"createdAt" <= ${end}`);
	}
	if (status !== undefined && status !== "") {
		const statusNumber = Number(status);
		if (!Number.isNaN(statusNumber) && statusNumber >= 0 && statusNumber <= 6) {
			clauses.push(Prisma.sql`"status" = ${statusNumberToEnum[statusNumber]}`);
		} else {
			clauses.push(Prisma.sql`1 = 0`);
		}
	}
	if (merchant) {
		clauses.push(Prisma.sql`"merchantId" IN (SELECT id FROM "User" WHERE username = ${merchant})`);
	}
	return clauses;
}

async function getAnalytics(req, res, next) {
	try {
		const { startDate, endDate, status, merchant } = req.query;

		const where = {};
		const createdAtFilter = buildDateRangeFilter(startDate, endDate);
		if (createdAtFilter) where.createdAt = createdAtFilter;
		if (status !== undefined && status !== "") {
			const statusNumber = Number(status);
			if (!Number.isNaN(statusNumber) && statusNumber >= 0 && statusNumber <= 6) {
				where.status = statusNumberToEnum[statusNumber];
			} else {
				where.status = "__INVALID__";
			}
		}
		if (merchant) {
			where.merchant = { is: { username: merchant } };
		}

		const startOfToday = new Date();
		startOfToday.setHours(0, 0, 0, 0);

		const clauses = buildRawWhereClauses({ startDate, endDate, status, merchant });
		const whereSql =
    	clauses.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(clauses, Prisma.sql` AND `)}`
        : Prisma.empty;

		const [totals, ordersToday, statusGroups, revenueByDay, ordersByDay, topLocations, topMerchantsGroups, topDriversGroups, activeDriversGroups, recentOrders, merchantDocs] =
			await Promise.all([
				prisma.order.aggregate({
					where,
					_count: { _all: true },
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
						${whereSql}
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
					where,
					_count: { _all: true },
					_sum: { total: true },
					orderBy: { _count: { merchantId: "desc" } },
					take: 10,
				}),
				prisma.order.groupBy({
					by: ["driverId"],
					where: { ...where, driverId: { not: null } },
					_count: { _all: true },
					_sum: { total: true },
					orderBy: { _count: { driverId: "desc" } },
					take: 10,
				}),
				prisma.order.groupBy({
					by: ["driverId"],
					where: { ...where, driverId: { not: null }, status: { in: ["WAREHOUSE", "NEW", "Picked_up"] } },
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
			totalOrders: totals._count._all || 0,
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
				s: statusNumberToEnum.indexOf(order.status),
				createdAt: order.createdAt,
				"pr.t": order.total ?? 0,
				"c.f": order.customerFirstName || "",
				"c.l": order.customerLastName || "",
				"c.loc.d": order.district || "",
				"c.loc.cty": order.city || "",
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

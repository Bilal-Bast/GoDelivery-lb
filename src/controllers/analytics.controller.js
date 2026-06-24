import Order from "../models/order.model.js";
import User from "../models/user.model.js";

/**
 * GET /api/analytics
 * Server-side aggregation for the analytics dashboard.
 * Accepts optional filters: startDate, endDate (YYYY-MM-DD), status (0-6), merchant (username).
 * Returns pre-computed summary, chart series, top lists, recent orders and the
 * merchant list for the filter dropdown — no raw order dump.
 */
async function getAnalytics(req, res, next) {
	try {
		const { startDate, endDate, status, merchant } = req.query;

		// Build the match stage from filters
		const match = {};
		if (startDate || endDate) {
			match.createdAt = {};
			if (startDate) match.createdAt.$gte = new Date(startDate);
			if (endDate) {
				const end = new Date(endDate);
				end.setHours(23, 59, 59, 999);
				match.createdAt.$lte = end;
			}
		}
		if (status !== undefined && status !== "") {
			match.s = Number(status);
		}
		if (merchant) {
			match.m = merchant;
		}

		const startOfToday = new Date();
		startOfToday.setHours(0, 0, 0, 0);

		const dayKey = {
			$dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
		};
		const revenueExpr = { $ifNull: ["$pr.t", 0] };

		const [facet] = await Order.aggregate([
			{ $match: match },
			{
				$facet: {
					totals: [
						{
							$group: {
								_id: null,
								totalOrders: { $sum: 1 },
								totalRevenue: { $sum: revenueExpr },
							},
						},
					],
					ordersToday: [
						{ $match: { createdAt: { $gte: startOfToday } } },
						{ $count: "count" },
					],
					statusCounts: [
						{ $group: { _id: "$s", count: { $sum: 1 } } },
					],
					revenueByDay: [
						{ $group: { _id: dayKey, value: { $sum: revenueExpr } } },
						{ $sort: { _id: 1 } },
					],
					ordersByDay: [
						{ $group: { _id: dayKey, count: { $sum: 1 } } },
						{ $sort: { _id: 1 } },
					],
					topLocations: [
						{ $match: { "c.loc.d": { $ne: null } } },
						{ $group: { _id: "$c.loc.d", count: { $sum: 1 } } },
						{ $sort: { count: -1 } },
						{ $limit: 10 },
					],
					topMerchants: [
						{
							$group: {
								_id: "$m",
								orders: { $sum: 1 },
								revenue: { $sum: revenueExpr },
							},
						},
						{ $sort: { orders: -1 } },
						{ $limit: 10 },
					],
					topDrivers: [
						{ $match: { driver: { $ne: null } } },
						{
							$group: {
								_id: "$driver",
								deliveries: { $sum: 1 },
								revenue: { $sum: revenueExpr },
							},
						},
						{ $sort: { deliveries: -1 } },
						{ $limit: 10 },
					],
					activeDrivers: [
						{ $match: { driver: { $ne: null }, s: { $lt: 3 } } },
						{ $group: { _id: "$driver" } },
						{ $count: "count" },
					],
					recentOrders: [
						{ $sort: { createdAt: -1 } },
						{ $limit: 20 },
						{
							$project: {
								_id: 0,
								id: 1,
								m: 1,
								driver: 1,
								s: 1,
								createdAt: 1,
								"pr.t": 1,
								"c.f": 1,
								"c.l": 1,
								"c.loc.d": 1,
								"c.loc.cty": 1,
							},
						},
					],
				},
			},
		]);

		// Normalize status counts into a fixed-length array [0..6]
		const statusCounts = [0, 0, 0, 0, 0, 0, 0];
		(facet.statusCounts || []).forEach((s) => {
			if (s._id >= 0 && s._id <= 6) statusCounts[s._id] = s.count;
		});

		// Resolve driver display names for the top-drivers list
		const driverUsernames = (facet.topDrivers || []).map((d) => d._id);
		const driverDocs = driverUsernames.length
			? await User.find({ username: { $in: driverUsernames } })
					.select("username firstName lastName")
					.lean()
			: [];
		const driverNameMap = {};
		driverDocs.forEach((d) => {
			driverNameMap[d.username] =
				`${d.firstName || ""} ${d.lastName || ""}`.trim() || d.username;
		});

		// Merchant list for the dropdown (unfiltered, stable across filter changes)
		const merchantDocs = await User.find({ role: "merchant" })
			.select("username firstName lastName")
			.lean();
		const merchants = merchantDocs.map((m) => ({
			username: m.username,
			name:
				`${m.firstName || ""} ${m.lastName || ""}`.trim() || m.username,
		}));

		const totals = facet.totals[0] || { totalOrders: 0, totalRevenue: 0 };

		res.json({
			summary: {
				totalOrders: totals.totalOrders,
				totalRevenue: totals.totalRevenue,
				ordersToday: facet.ordersToday[0]?.count || 0,
				activeDrivers: facet.activeDrivers[0]?.count || 0,
				statusCounts,
			},
			revenueByDay: (facet.revenueByDay || []).map((d) => ({
				date: d._id,
				value: d.value,
			})),
			ordersByDay: (facet.ordersByDay || []).map((d) => ({
				date: d._id,
				count: d.count,
			})),
			topLocations: (facet.topLocations || []).map((l) => ({
				district: l._id,
				count: l.count,
			})),
			topMerchants: (facet.topMerchants || []).map((m) => ({
				name: m._id || "Unknown",
				orders: m.orders,
				revenue: m.revenue,
			})),
			topDrivers: (facet.topDrivers || []).map((d) => ({
				username: d._id,
				name: driverNameMap[d._id] || d._id,
				deliveries: d.deliveries,
				revenue: d.revenue,
			})),
			recentOrders: facet.recentOrders || [],
			merchants,
		});
	} catch (error) {
		next(error);
	}
}

export { getAnalytics };

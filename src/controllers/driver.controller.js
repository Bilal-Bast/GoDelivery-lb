import prisma from "../config/prisma.js";
import { orderFromPrisma } from "./order/mappers.js";

async function getDrivers(req, res, next) {
	try {
		const drivers = await prisma.user.findMany({
			where: { role: "DRIVER" },
			select: {
				username: true,
				firstName: true,
				lastName: true,
				phone: true,
			},
		});

		const formattedDrivers = drivers.map((driver) => ({
			id: driver.username,
			name:
				`${driver.firstName || ""} ${driver.lastName || ""}`.trim() ||
				driver.username,
		}));

		res.json(formattedDrivers);
	} catch (error) {
		next(error);
	}
}

async function getDriverOrders(req, res, next) {
	try {
		const oneDayAgo = new Date();
		oneDayAgo.setDate(oneDayAgo.getDate() - 1);

		const orders = await prisma.order.findMany({
			where: {
				driverId: req.user.id,
				OR: [
					// Not yet picked up — still needs the driver's action.
					{ status: { in: ["WAREHOUSE", "NEW", "Picked_up"] } },
					{
						status: { in: ["DELIVERED", "Canceled"] },
						statusUpdatedAt: { gte: oneDayAgo },
					},
				],
			},
			orderBy: { updatedAt: "desc" },
			include: {
				merchant: { select: { username: true } },
				driver: { select: { username: true } },
			},
		});

		res.json(orders.map((order) => orderFromPrisma(order)));
	} catch (error) {
		next(error);
	}
}

function createGetDriverStats(db = prisma) {
	return async (req, res, next) => {
		try {
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const [totalDeliveries, todaysDeliveries, activeOrders] =
				await Promise.all([
					db.order.count({
						where: { driverId: req.user.id, status: "DELIVERED" },
					}),
					db.order.count({
						where: {
							driverId: req.user.id,
							status: "DELIVERED",
							createdAt: { gte: today },
						},
					}),
					db.order.count({
						where: {
							driverId: req.user.id,
							status: { in: ["WAREHOUSE", "NEW", "Picked_up"] },
						},
					}),
				]);

			return res.json({ totalDeliveries, todaysDeliveries, activeOrders });
		} catch (error) {
			next(error);
		}
	};
}

const getDriverStats = createGetDriverStats();

export { createGetDriverStats, getDrivers, getDriverOrders, getDriverStats };

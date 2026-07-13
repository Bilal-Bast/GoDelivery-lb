import prisma from "../config/prisma.js";

const statusEnumToNumber = {
	WAREHOUSE: 0,
	NEW: 1,
	Picked_up: 2,
	DELIVERED: 3,
	Canceled: 4,
	Paid: 5,
	COLLECTED: 6,
};

function orderFromPrisma(order) {
	return {
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
		s: statusEnumToNumber[order.status] ?? 0,
		statusUpdatedAt: order.statusUpdatedAt,
		e: order.isExpress ?? false,
		eN: order.expressNote || "",
		createdAt: order.createdAt,
		updatedAt: order.updatedAt,
	};
}

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
				driver: { username: req.user.username },
				OR: [
					{ status: "Picked_up" },
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

		res.json(orders.map(orderFromPrisma));
	} catch (error) {
		next(error);
	}
}

async function getDriverStats(req, res, next) {
	try {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const totalDeliveries = await prisma.order.count({
			where: {
				driver: { username: req.user.username },
				status: "DELIVERED",
			},
		});

		const todaysDeliveries = await prisma.order.count({
			where: {
				driver: { username: req.user.username },
				status: "DELIVERED",
				createdAt: { gte: today },
			},
		});

		const activeOrders = await prisma.order.count({
			where: {
				driver: { username: req.user.username },
				status: "Picked_up",
			},
		});

		res.json({ totalDeliveries, todaysDeliveries, activeOrders });
	} catch (error) {
		next(error);
	}
}

export { getDrivers, getDriverOrders, getDriverStats };

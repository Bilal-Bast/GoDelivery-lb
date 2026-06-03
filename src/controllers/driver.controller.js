import User from "../models/user.model.js";
import Order from "../models/order.model.js";

async function getDrivers(req, res, next) {
	try {
		const drivers = await User.find(
			{ role: "driver" },
			"username firstName lastName phone",
		);
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

		const orders = await Order.find({
			driver: req.user.username,
			$or: [
				{ s: { $in: [2] } },
				{ s: { $in: [3, 4] }, statusUpdatedAt: { $gte: oneDayAgo } },
			],
		}).sort({ updatedAt: -1 });

		res.json(orders);
	} catch (error) {
		next(error);
	}
}

async function getDriverStats(req, res, next) {
	try {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const allOrders = await Order.find({ driver: req.user.username });

		const totalDeliveries = allOrders.filter(
			(order) => order.s === 3,
		).length;
		const todaysDeliveries = allOrders.filter(
			(order) => order.s === 3 && new Date(order.createdAt) >= today,
		).length;
		const activeOrders = allOrders.filter((order) => order.s === 2).length;

		res.json({ totalDeliveries, todaysDeliveries, activeOrders });
	} catch (error) {
		next(error);
	}
}

export { getDrivers, getDriverOrders, getDriverStats };

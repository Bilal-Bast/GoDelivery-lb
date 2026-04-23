import User from "../models/user.model.js";
import Order from "../models/order.model.js";

async function getDrivers(req, res) {
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
		res.status(500).json({ error: "Failed to fetch drivers" });
	}
}

async function getDriverOrders(req, res) {
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
		res.status(500).json({ error: "Failed to fetch orders" });
	}
}

async function getDriverStats(req, res) {
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
		res.status(500).json({ error: "Failed to fetch stats" });
	}
}

export { getDrivers, getDriverOrders, getDriverStats };

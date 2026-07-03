import User from "../models/user.model.js";
import Order from "../models/order.model.js";
import OrderHistory from "../models/orderHistory.model.js";
import DriverCollection from "../models/driverCollection.model.js";
import MerchantPayment from "../models/merchantPayment.model.js";
import Location from "../models/location.model.js";

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function fetchOrders(filter = {}) {
	return Order.find(filter).sort({ createdAt: -1 }).lean();
}

async function fetchMerchants() {
	return User.find({ role: "merchant" }).select("-password").lean();
}

async function fetchDrivers() {
	return User.find({ role: "driver" })
		.select("username firstName lastName phone")
		.lean()
		.then((ds) =>
			ds.map((d) => ({
				id: d.username,
				name:
					`${d.firstName || ""} ${d.lastName || ""}`.trim() ||
					d.username,
				username: d.username,
				phone: d.phone,
			})),
		);
}

async function fetchLocations() {
	return Location.find().lean();
}

// ─── Per-page data functions ──────────────────────────────────────────────────

export async function getAdminPageData() {
	const [orders, merchants] = await Promise.all([
		fetchOrders(),
		fetchMerchants(),
	]);
	return { orders, merchants };
}

export async function getOrdersPageData() {
	const [orders, merchants, drivers, locations] = await Promise.all([
		fetchOrders(),
		fetchMerchants(),
		fetchDrivers(),
		fetchLocations(),
	]);
	return { orders, merchants, drivers, locations };
}

export async function getUsersPageData() {
	const users = await User.find().select("-password").lean();
	return { users };
}

export async function getSettingsPageData() {
	const [locations, merchants] = await Promise.all([
		fetchLocations(),
		fetchMerchants(),
	]);
	return { locations, merchants };
}

export async function getCollectPageData(driverUsername) {
	const driversPromise = fetchDrivers();
	const collectionsPromise = DriverCollection.find()
		.sort({ createdAt: -1 })
		.lean();
	let ordersPromise = Promise.resolve([]);
	if (driverUsername) {
		// lazy import Order to avoid circular requires
		const Order = (await import("../models/order.model.js")).default;
		// Fetch orders for the driver - all statuses to see what's available
		ordersPromise = Order.find({ driver: driverUsername })
			.sort({ createdAt: -1 })
			.lean();
	}

	const [drivers, collections, orders] = await Promise.all([
		driversPromise,
		collectionsPromise,
		ordersPromise,
	]);

	return { drivers, collections, orders };
}

export async function getPayPageData(merchantUsername) {
	const merchantsPromise = fetchMerchants();
	const paymentsPromise = MerchantPayment.find()
		.sort({ createdAt: -1 })
		.lean();
	let ordersPromise = Promise.resolve([]);
	if (merchantUsername) {
		ordersPromise = Order.find({ m: merchantUsername, s: 6 })
			.sort({ createdAt: -1 })
			.lean();
	}

	const [merchants, payments, orders] = await Promise.all([
		merchantsPromise,
		paymentsPromise,
		ordersPromise,
	]);

	return { merchants, payments, orders };
}

export async function getDriverPageData(username) {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

	const [allOrders, user] = await Promise.all([
		fetchOrders({ driver: username }),
		User.findOne({ username }).select("-password").lean(),
	]);

	const activeOrders = allOrders.filter(
		(o) =>
			o.s === 2 ||
			([3, 4].includes(o.s) && new Date(o.statusUpdatedAt) >= oneDayAgo),
	);

	const stats = {
		totalDeliveries: allOrders.filter((o) => o.s === 3).length,
		todaysDeliveries: allOrders.filter(
			(o) => o.s === 3 && new Date(o.createdAt) >= today,
		).length,
		activeOrders: allOrders.filter((o) => o.s === 2).length,
	};

	return { orders: activeOrders, stats, profile: user };
}

export async function getMerchantPageData(username) {
	const [orders, locations, user] = await Promise.all([
		fetchOrders({ m: username }),
		fetchLocations(),
		User.findOne({ username }).select("-password").lean(),
	]);
	return { orders, locations, profile: user };
}

export async function getTrackPageData(orderId) {
	if (!orderId) return { order: null };
	const order = await Order.findOne({ id: orderId }).lean();
	if (!order) return { order: null };

	const history = await OrderHistory.find({ order_id: order.id })
		.sort({ created_at: 1 })
		.lean();

	return { order: { ...order, history } };
}

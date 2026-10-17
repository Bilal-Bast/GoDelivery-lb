import prisma from "../config/prisma.js";
import { LiveTrackingError, liveTracking } from "../services/live-tracking/live-tracking.service.js";

function noStore(res) {
	res.set({
		"Cache-Control": "private, no-store, no-cache, max-age=0, must-revalidate",
		Pragma: "no-cache",
		Expires: "0",
	});
}

function failure(res, error) {
	if (error instanceof LiveTrackingError) {
		return res.status(error.statusCode).json({ error: error.message });
	}
	return res.status(503).json({ error: "Live tracking is temporarily unavailable" });
}

function createLiveTrackingHandlers({ db = prisma, service = liveTracking } = {}) {
	async function publishDriverLocation(req, res) {
		noStore(res);
		try {
			return res.json(await service.publish(req.user, req.body));
		} catch (error) {
			return failure(res, error);
		}
	}

	function stopDriverLocation(req, res) {
		noStore(res);
		try {
			if (req.user?.role !== "driver") {
				throw new LiveTrackingError("Driver access required", req.user ? 403 : 401);
			}
			return res.json(service.stop(req.user.id));
		} catch (error) {
			return failure(res, error);
		}
	}

	async function getAdminLiveDrivers(req, res) {
		noStore(res);
		try {
			if (req.user?.role !== "admin") {
				throw new LiveTrackingError("Admin access required", req.user ? 403 : 401);
			}
			if (!service.isEnabled()) return res.json({ enabled: false, drivers: [] });
			const locations = service.freshLocations();
			if (!locations.length) return res.json({ enabled: true, drivers: [] });
			const driverIds = locations.map(({ driverId }) => driverId);
			const [users, activeOrders] = await Promise.all([
				db.user.findMany({
					where: { id: { in: driverIds }, role: "DRIVER" },
					select: { id: true, username: true, firstName: true, lastName: true },
				}),
				db.order.findMany({
					where: { driverId: { in: driverIds }, status: "Picked_up" },
					select: { id: true, driverId: true },
				}),
			]);
			const usersById = new Map(users.map((user) => [user.id, user]));
			const ordersByDriver = new Map();
			for (const order of activeOrders) {
				if (!ordersByDriver.has(order.driverId)) ordersByDriver.set(order.driverId, []);
				ordersByDriver.get(order.driverId).push(order.id);
			}
			const drivers = locations.flatMap((location) => {
				const user = usersById.get(location.driverId);
				const orderIds = ordersByDriver.get(location.driverId) || [];
				if (!user || !orderIds.length) return [];
				return [{
					driverId: user.id,
					username: user.username,
					displayName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username,
					latitude: location.latitude,
					longitude: location.longitude,
					accuracy: location.accuracy,
					...(location.heading === undefined ? {} : { heading: location.heading }),
					updatedAt: location.receivedAt,
					capturedAt: location.capturedAt,
					activeOrderIds: orderIds,
				}];
			});
			return res.json({ enabled: true, drivers });
		} catch (error) {
			return failure(res, error);
		}
	}

	async function getPublicOrderLiveLocation(req, res) {
		noStore(res);
		try {
			if (!req.params.id || req.params.id.length > 50) {
				return res.status(400).json({ error: "Invalid order ID" });
			}
			const order = await db.order.findUnique({
				where: { id: req.params.id },
				select: { id: true, driverId: true, status: true },
			});
			if (!order) return res.status(404).json({ error: "Order not found" });
			return res.json(service.forOrder(order));
		} catch (error) {
			return failure(res, error);
		}
	}

	async function getAuthorizedOrderLiveLocation(req, res) {
		noStore(res);
		try {
			if (!req.user?.id || !["admin", "merchant"].includes(req.user.role)) {
				throw new LiveTrackingError("Forbidden", req.user ? 403 : 401);
			}
			if (!req.params.id || req.params.id.length > 50) {
				return res.status(400).json({ error: "Invalid order ID" });
			}
			const where = { id: req.params.id };
			if (req.user.role === "merchant") where.merchantId = req.user.id;
			const order = await db.order.findFirst({
				where,
				select: { id: true, driverId: true, status: true },
			});
			if (!order) return res.status(404).json({ error: "Order not found" });
			return res.json(service.forOrder(order));
		} catch (error) {
			return failure(res, error);
		}
	}

	return {
		publishDriverLocation,
		stopDriverLocation,
		getAdminLiveDrivers,
		getPublicOrderLiveLocation,
		getAuthorizedOrderLiveLocation,
	};
}

const handlers = createLiveTrackingHandlers();
const {
	publishDriverLocation,
	stopDriverLocation,
	getAdminLiveDrivers,
	getPublicOrderLiveLocation,
	getAuthorizedOrderLiveLocation,
} = handlers;

export {
	createLiveTrackingHandlers,
	handlers,
	publishDriverLocation,
	stopDriverLocation,
	getAdminLiveDrivers,
	getPublicOrderLiveLocation,
	getAuthorizedOrderLiveLocation,
};

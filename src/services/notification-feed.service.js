import { statusNumberToEnum } from "../utils/orderStatus.js";
import { notificationEvent } from "./notification-events.service.js";

function historyType(row, role) {
	if (row.actionType === "creation" && role === "admin" && row.order.createdBy === row.order.merchant.username) return "ORDER_CREATED";
	if (row.actionType === "creation" && role === "driver" && row.order.driverId) return "ORDER_ASSIGNED";
	if (row.actionType === "cancellation") return "ORDER_CANCELLED";
	if (row.actionType === "update" && role === "driver" && row.oldValue?.driverId !== row.order.driverId && row.newValue?.driverUsername) return "ORDER_ASSIGNED";
	const value = row.actionType === "status_change" ? statusNumberToEnum[Number(row.newValue)] : row.actionType === "update" ? row.newValue?.status : null;
	if (value === "Canceled") return "ORDER_CANCELLED";
	if (role === "merchant" && value === "Picked_up") return "ORDER_PICKED_UP";
	if (role === "merchant" && value === "DELIVERED") return "ORDER_DELIVERED";
	return null;
}

async function loadRecentNotifications(db, user, since = new Date(Date.now() - 30 * 86400000)) {
	const role = user.role.toLowerCase();
	if (!["admin", "driver", "merchant"].includes(role)) return [];
	const where = {
		createdAt: { gte: since },
		...(role === "admin" ? {} : { order: { [role === "driver" ? "driverId" : "merchantId"]: user.id } }),
	};
	const histories = await db.orderHistory.findMany({ where, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, orderId: true, actionType: true, oldValue: true, newValue: true, createdAt: true, order: { select: { createdBy: true, driverId: true, merchant: { select: { username: true } } } } } });
	const rows = histories.flatMap((row) => {
		const type = historyType(row, role);
		if (!type) return [];
		const event = notificationEvent(type, "order", row.orderId, [{ role: role.toUpperCase(), id: user.id }]);
		return [{ id: `order:${row.id}`, type, entityType: event.entityType, entityId: event.entityId, title: event.title, body: event.body, createdAt: row.createdAt }];
	});
	if (role === "driver") {
		const collections = await db.driverCollection.findMany({ where: { driverId: user.id, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, createdAt: true } });
		for (const record of collections) rows.push({ id: `collection:${record.id}`, type: "DRIVER_COLLECTION_CREATED", entityType: "collection", entityId: record.id, title: "GoDelivery update", body: "A driver collection was recorded", createdAt: record.createdAt });
	}
	if (role === "merchant") {
		const [payments, returns] = await Promise.all([
			db.merchantPayment.findMany({ where: { merchantId: user.id, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, createdAt: true, isAdvance: true } }),
			db.merchantReturn.findMany({ where: { merchantId: user.id, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, createdAt: true } }),
		]);
		for (const record of payments) rows.push({ id: `payment:${record.id}`, type: record.isAdvance ? "PREPAID_ADJUSTMENT_CREATED" : "MERCHANT_PAYMENT_CREATED", entityType: "payment", entityId: record.id, title: "GoDelivery update", body: record.isAdvance ? "A prepaid adjustment was recorded" : "A merchant payment was recorded", createdAt: record.createdAt });
		for (const record of returns) rows.push({ id: `return:${record.id}`, type: "ORDER_RETURNED", entityType: "return", entityId: record.id, title: "GoDelivery update", body: "A return was recorded", createdAt: record.createdAt });
	}
	return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
}

export { loadRecentNotifications };

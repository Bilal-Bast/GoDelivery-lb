import { statusNumberToEnum } from "../utils/orderStatus.js";

const ORDER_STATUS = Object.freeze({
	WAREHOUSE: statusNumberToEnum[0],
	NEW: statusNumberToEnum[1],
	PICKED_UP: statusNumberToEnum[2],
	DELIVERED: statusNumberToEnum[3],
	CANCELED: statusNumberToEnum[4],
	PAID: statusNumberToEnum[5],
	COLLECTED: statusNumberToEnum[6],
});

function buildOrderAccessWhere(user, orderId) {
	const where = { id: orderId };
	if (user?.role === "merchant") where.merchantId = user.id;
	if (user?.role === "driver") where.driverId = user.id;
	return where;
}

function applyOrderCreationPolicy(orderData, user) {
	const data = { ...orderData };
	if (user?.role === "merchant") {
		data.m = user.username;
		data.s = 1;
		data.cb = user.username;
	}
	return data;
}

function validateOrderTransition({ role, currentStatus, nextStatus }) {
	if (currentStatus === nextStatus) return null;

	// The existing admin order-management UI intentionally exposes every
	// status as an operational override. Keep that behavior while preventing
	// non-admin clients from bypassing the driver workflow.
	if (role === "admin") return null;

	if (role !== "driver") {
		return "This role cannot update order status";
	}

	const allowed = {
		[ORDER_STATUS.WAREHOUSE]: [ORDER_STATUS.PICKED_UP],
		[ORDER_STATUS.NEW]: [ORDER_STATUS.PICKED_UP],
		[ORDER_STATUS.PICKED_UP]: [
			ORDER_STATUS.DELIVERED,
			ORDER_STATUS.CANCELED,
		],
	};

	if (allowed[currentStatus]?.includes(nextStatus)) return null;
	return `Invalid driver status transition from ${currentStatus} to ${nextStatus}`;
}

function cancellationAttribution(role, requestedCancelledBy) {
	if (
		role === "admin" &&
		["merchant", "customer"].includes(requestedCancelledBy)
	) {
		return requestedCancelledBy;
	}
	return role === "merchant" ? "merchant" : "customer";
}

function canManagePassword(actor, targetUserId) {
	return actor?.role === "admin" || actor?.id === targetUserId;
}

export {
	ORDER_STATUS,
	applyOrderCreationPolicy,
	buildOrderAccessWhere,
	canManagePassword,
	cancellationAttribution,
	validateOrderTransition,
};

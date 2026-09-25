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

	// COLLECTED and Paid are settlement outcomes. They may only be written by
	// the collection/payment services, never by the generic order endpoints.
	if (
		role === "admin" &&
		[ORDER_STATUS.COLLECTED, ORDER_STATUS.PAID].includes(nextStatus)
	) {
		return "Collected and Paid statuses are created by settlement workflows";
	}
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

function orderDeletionBlockReason(order) {
	const links = order?._count || {};
	if (
		links.collectionOrders ||
		links.paymentOrders ||
		links.returnOrders ||
		links.transactions
	) {
		return "Order cannot be deleted because it is linked to financial or return records";
	}
	return null;
}

function orderCancellationBlockReason(order) {
	const links = order?._count || {};
	if (
		[ORDER_STATUS.COLLECTED, ORDER_STATUS.PAID].includes(order?.status) ||
		links.collectionOrders ||
		links.paymentOrders
	) {
		return "Settled orders cannot be cancelled from order management";
	}
	return null;
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
	orderCancellationBlockReason,
	orderDeletionBlockReason,
	validateOrderTransition,
};

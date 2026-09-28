const ORDER_STATUS_EVENTS = Object.freeze({
	Picked_up: "ORDER_PICKED_UP",
	DELIVERED: "ORDER_DELIVERED",
	Canceled: "ORDER_CANCELLED",
});

const ORDER_TEXT = Object.freeze({
	ORDER_CREATED: "A new order was created",
	ORDER_ASSIGNED: "An order was assigned to you",
	ORDER_PICKED_UP: "An order was picked up",
	ORDER_DELIVERED: "An order was delivered",
	ORDER_CANCELLED: "An order was cancelled",
	ORDER_RETURNED: "An order was returned",
});

function notificationEvent(type, entityType, entityId, recipients) {
	if (!Object.hasOwn(ORDER_TEXT, type) && !["DRIVER_COLLECTION_CREATED", "MERCHANT_PAYMENT_CREATED", "PREPAID_ADJUSTMENT_CREATED"].includes(type)) throw new Error("Unsupported notification event");
	if (typeof entityId !== "string" || !entityId || entityId.length > 100) throw new Error("Invalid notification entity");
	const body = ORDER_TEXT[type] || (type === "DRIVER_COLLECTION_CREATED" ? "A driver collection was recorded" : type === "MERCHANT_PAYMENT_CREATED" ? "A merchant payment was recorded" : "A prepaid adjustment was recorded");
	return Object.freeze({ type, entityType, entityId, title: "GoDelivery update", body, recipients: recipients.filter((recipient) => ["ADMIN", "DRIVER", "MERCHANT"].includes(recipient?.role) && (recipient.role === "ADMIN" || recipient.id)) });
}

function orderEvents(before, after, { createdByMerchant = false } = {}) {
	const events = [];
	if (!before && createdByMerchant) events.push(notificationEvent("ORDER_CREATED", "order", after.id, [{ role: "ADMIN" }]));
	if (after.driverId && before?.driverId !== after.driverId) events.push(notificationEvent("ORDER_ASSIGNED", "order", after.id, [{ role: "DRIVER", id: after.driverId }]));
	if (before && before.status !== after.status && ORDER_STATUS_EVENTS[after.status]) {
		const recipients = [{ role: "MERCHANT", id: after.merchantId }];
		if (after.status === "Canceled" && after.driverId) recipients.push({ role: "DRIVER", id: after.driverId });
		events.push(notificationEvent(ORDER_STATUS_EVENTS[after.status], "order", after.id, recipients));
	}
	return events;
}

export { notificationEvent, orderEvents };

import { normalizePhoneNumber } from "./phone-normalization.js";

const EVENT_POLICY = Object.freeze({
	ORDER_CREATED: Object.freeze({ roles: ["CUSTOMER", "MERCHANT"], customer: true, templates: { CUSTOMER: "customer.order_created", MERCHANT: "merchant.order_created" } }),
	ORDER_ASSIGNED: Object.freeze({ roles: ["CUSTOMER", "MERCHANT", "DRIVER"], customer: true, templates: { CUSTOMER: "customer.order_assigned", MERCHANT: "merchant.order_assigned", DRIVER: "driver.order_assigned" } }),
	ORDER_PICKED_UP: Object.freeze({ roles: ["CUSTOMER", "MERCHANT"], customer: true, templates: { CUSTOMER: "customer.order_picked_up", MERCHANT: "merchant.order_picked_up" } }),
	ORDER_DELIVERED: Object.freeze({ roles: ["CUSTOMER", "MERCHANT"], customer: true, templates: { CUSTOMER: "customer.order_delivered", MERCHANT: "merchant.order_delivered" } }),
	ORDER_CANCELLED: Object.freeze({ roles: ["CUSTOMER", "MERCHANT", "DRIVER"], customer: true, templates: { CUSTOMER: "customer.order_cancelled", MERCHANT: "merchant.order_cancelled", DRIVER: "driver.order_cancelled" } }),
	ORDER_RETURNED: Object.freeze({ roles: ["MERCHANT"], templates: { MERCHANT: "merchant.return_recorded" } }),
	DRIVER_COLLECTION_CREATED: Object.freeze({ roles: ["DRIVER"], templates: { DRIVER: "driver.collection_recorded" } }),
	MERCHANT_PAYMENT_CREATED: Object.freeze({ roles: ["MERCHANT"], templates: { MERCHANT: "merchant.payment_recorded" } }),
	PREPAID_ADJUSTMENT_CREATED: Object.freeze({ roles: ["MERCHANT"], templates: { MERCHANT: "merchant.prepaid_adjustment_recorded" } }),
});

const COPY = Object.freeze({
	ORDER_CREATED: Object.freeze({ CUSTOMER: "Your GoDelivery order has been received.", MERCHANT: "A new GoDelivery order was received." }),
	ORDER_ASSIGNED: Object.freeze({ CUSTOMER: "A driver has been assigned to your GoDelivery order.", MERCHANT: "A driver has been assigned to the order.", DRIVER: "A GoDelivery order has been assigned to you." }),
	ORDER_PICKED_UP: Object.freeze({ CUSTOMER: "Your GoDelivery order has been picked up and is on the way.", MERCHANT: "An order was picked up by its driver." }),
	ORDER_DELIVERED: Object.freeze({ CUSTOMER: "Your GoDelivery order was marked delivered.", MERCHANT: "An order was marked delivered." }),
	ORDER_CANCELLED: Object.freeze({ CUSTOMER: "Your GoDelivery order was cancelled.", MERCHANT: "An order was cancelled.", DRIVER: "An assigned GoDelivery order was cancelled." }),
	ORDER_RETURNED: Object.freeze({ MERCHANT: "A return was recorded for an order." }),
	DRIVER_COLLECTION_CREATED: Object.freeze({ DRIVER: "A driver collection was recorded." }),
	MERCHANT_PAYMENT_CREATED: Object.freeze({ MERCHANT: "A merchant payment was recorded." }),
	PREPAID_ADJUSTMENT_CREATED: Object.freeze({ MERCHANT: "A prepaid account adjustment was recorded." }),
});

const PUBLIC_FIELDS = Object.freeze({
	CUSTOMER: Object.freeze(["recipient.firstName", "event.entityId", "publicTrackingUrl"]),
	MERCHANT: Object.freeze(["recipient.firstName", "event.entityId"]),
	DRIVER: Object.freeze(["recipient.firstName", "event.entityId"]),
});

function cleanPart(value, fallback = "") {
	const text = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
	return text.slice(0, 160) || fallback;
}

function publicTrackingUrl(appUrl, orderId) {
	try {
		const base = new URL(appUrl);
		if (!["https:", "http:"].includes(base.protocol) || base.username || base.password) return null;
		const url = new URL("/track", base);
		url.searchParams.set("id", String(orderId));
		return url.toString();
	} catch {
		return null;
	}
}

function communicationPolicy(eventType) {
	return EVENT_POLICY[eventType] || null;
}

function communicationDecision(eventType, recipientRole, channel = "configured_primary") {
	const role = String(recipientRole || "").toUpperCase();
	const policy = communicationPolicy(eventType);
	const templateId = policy?.templates?.[role];
	if (!policy || !templateId || !PUBLIC_FIELDS[role]) return null;
	return Object.freeze({
		eventType,
		recipientRole: role,
		channel,
		templateId,
		publicFields: PUBLIC_FIELDS[role],
	});
}

function renderTransactionalTemplate({ event, recipient, appUrl, channel = "configured_primary" }) {
	const policy = communicationPolicy(event?.type);
	const role = String(recipient?.role || "").toUpperCase();
	const summary = COPY[event?.type]?.[role];
	const decision = communicationDecision(event?.type, role, channel);
	if (!policy || !policy.roles.includes(role) || !summary || !decision) return null;

	const reference = cleanPart(event.entityId, "GoDelivery");
	const recipientName = cleanPart(recipient?.firstName || recipient?.username, "there");
	const trackingUrl = event.entityType === "order" && policy.customer
		? publicTrackingUrl(appUrl, reference)
		: null;
	const link = trackingUrl || "GoDelivery";
	const text = `GoDelivery: ${summary} Reference ${reference}.${trackingUrl ? ` Track: ${trackingUrl}` : ""}`.slice(0, 640);

	return Object.freeze({
		templateId: decision.templateId,
		variables: Object.freeze({
			"1": recipientName,
			"2": summary,
			"3": reference,
			"4": link,
		}),
		text,
		trackingUrl,
	});
}

function buildManualWhatsAppPreview(order, { appUrl, defaultCountryCode = "" } = {}) {
	const phone = normalizePhoneNumber(order?.customerPhone, { defaultCountryCode });
	if (!phone) return { available: false, reason: "invalid_phone", templateId: "customer.manual_tracking" };
	const orderId = cleanPart(order?.id);
	if (!orderId) return { available: false, reason: "invalid_order", templateId: "customer.manual_tracking" };
	const name = cleanPart(order?.customerFirstName, "there");
	const trackingUrl = publicTrackingUrl(appUrl, orderId);
	const text = trackingUrl
		? `Hello ${name}, you can follow GoDelivery order ${orderId} here: ${trackingUrl}`
		: `Hello ${name}, you can contact GoDelivery about order ${orderId}.`;
	return {
		available: true,
		channel: "whatsapp",
		templateId: "customer.manual_tracking",
		phone,
		trackingUrl,
		text: text.slice(0, 640),
	};
}

export { EVENT_POLICY, communicationPolicy, communicationDecision, renderTransactionalTemplate, publicTrackingUrl, buildManualWhatsAppPreview };

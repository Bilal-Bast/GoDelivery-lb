import test from "node:test";
import assert from "node:assert/strict";
import { notificationEvent, orderEvents } from "../src/services/notification-events.service.js";
import { createNotificationService } from "../src/services/notification.service.js";
import {
	createCommunicationService,
	createConfiguredTransports,
	getCommunicationRuntimeStatus,
	loadManualWhatsAppPreview,
	resolveEventReference,
	readCommunicationConfig,
} from "../src/services/communication/communication.service.js";
import { maskPhoneNumber, normalizePhoneNumber } from "../src/services/communication/phone-normalization.js";
import { communicationPolicy, communicationDecision, buildManualWhatsAppPreview, publicTrackingUrl, renderTransactionalTemplate } from "../src/services/communication/templates.js";
import { classifyProviderError, ProviderRequestError, TwilioTransport } from "../src/services/communication/twilio-transport.js";

const productionConfig = (values = {}) => readCommunicationConfig({
	NODE_ENV: "production",
	COMMUNICATION_ENABLED: "true",
	WHATSAPP_ENABLED: "true",
	SMS_ENABLED: "false",
	CUSTOMER_TRANSACTIONAL_MESSAGES_ENABLED: "true",
	COMMUNICATION_PRIMARY_CHANNEL: "whatsapp",
	DEFAULT_PHONE_COUNTRY_CODE: "961",
	APP_URL: "https://www.godelivery-lb.com",
	TWILIO_ACCOUNT_SID: "AC-test-account",
	TWILIO_AUTH_TOKEN: "test-auth-token",
	TWILIO_WHATSAPP_FROM: "whatsapp:+15550000001",
	TWILIO_WHATSAPP_CONTENT_SID: "HX-test-template",
	...values,
}, { testRuntime: false });

const order = {
	id: "AB/C 123",
	customerFirstName: "Nadia",
	customerPhone: "+961 70 123 456",
	merchant: { id: "m1", username: "shop", firstName: "Shop", phone: "+961 1 234 567", role: "MERCHANT" },
	driver: { id: "d1", username: "driver", firstName: "Sam", phone: "+961 3 234 567", role: "DRIVER" },
};

test("Phase 12 consumes the existing Phase 11 event vocabulary", () => {
	assert.deepEqual(
		orderEvents(null, { ...order, driverId: "d1" }, { createdByMerchant: true }).map((event) => event.type),
		["ORDER_CREATED", "ORDER_ASSIGNED"],
	);
	assert.equal(communicationPolicy("ORDER_DELIVERED").templates.CUSTOMER, "customer.order_delivered");
	assert.equal(communicationPolicy("MERCHANT_PAYMENT_CREATED").templates.MERCHANT, "merchant.payment_recorded");
	assert.deepEqual(communicationDecision("ORDER_DELIVERED", "CUSTOMER", "whatsapp"), {
		eventType: "ORDER_DELIVERED",
		recipientRole: "CUSTOMER",
		channel: "whatsapp",
		templateId: "customer.order_delivered",
		publicFields: ["recipient.firstName", "event.entityId", "publicTrackingUrl"],
	});
	assert.equal(communicationPolicy("ORDER_PAID"), null);
	assert.equal(communicationPolicy("UNSUPPORTED"), null);
});

test("phone normalization supports international and configured local formats without changing source values", () => {
	const original = "+961 (70) 123-456";
	assert.equal(normalizePhoneNumber(original, { defaultCountryCode: "961" }), "+96170123456");
	assert.equal(normalizePhoneNumber("00961 70 123 456", { defaultCountryCode: "961" }), "+96170123456");
	assert.equal(normalizePhoneNumber("03 123456", { defaultCountryCode: "961" }), "+9613123456");
	assert.equal(normalizePhoneNumber("03 123456"), null);
	assert.equal(normalizePhoneNumber("not a phone", { defaultCountryCode: "961" }), null);
	assert.equal(normalizePhoneNumber("+123", { defaultCountryCode: "961" }), null);
	assert.equal(original, "+961 (70) 123-456");
	assert.equal(maskPhoneNumber(original), "+96170***456");
});

test("customer template uses the public tracking URL contract and excludes private fields", () => {
	assert.equal(publicTrackingUrl("https://www.godelivery-lb.com", "A/B 1"), "https://www.godelivery-lb.com/track?id=A%2FB+1");
	const rendered = renderTransactionalTemplate({
		event: notificationEvent("ORDER_DELIVERED", "order", "A1", [{ role: "MERCHANT", id: "m1" }]),
		recipient: { role: "CUSTOMER", firstName: "Nadia" },
		appUrl: "https://www.godelivery-lb.com",
	});
	assert.equal(rendered.templateId, "customer.order_delivered");
	assert.equal(rendered.variables["1"], "Nadia");
	assert.match(rendered.text, /\/track\?id=A1/);
	assert.doesNotMatch(rendered.text, /\b[0-6]\b|balance|password|token|private|notes/i);
	assert.ok(rendered.text.length < 640);
});

test("manual WhatsApp preview is a fixed template and rejects invalid phone values", () => {
	const preview = buildManualWhatsAppPreview({ ...order, customerPhone: "00961 70 123 456" }, {
		appUrl: "https://www.godelivery-lb.com",
		defaultCountryCode: "961",
	});
	assert.equal(preview.available, true);
	assert.equal(preview.phone, "+96170123456");
	assert.equal(preview.templateId, "customer.manual_tracking");
	assert.match(preview.text, /https:\/\/www\.godelivery-lb\.com\/track\?id=/);
	assert.equal(buildManualWhatsAppPreview({ ...order, customerPhone: "bad" }, { defaultCountryCode: "961" }).available, false);
});

test("manual preview is limited to Admin or an assigned Driver order", async () => {
	let where;
	const db = { order: { findFirst: async (args) => { where = args.where; return { ...order, id: "A1" }; } } };
	assert.equal(await loadManualWhatsAppPreview(db, { role: "merchant", id: "m1" }, "A1"), null);
	assert.equal(where, undefined);
	const driverPreview = await loadManualWhatsAppPreview(db, { role: "driver", id: "d1" }, "A1", { appUrl: "https://www.godelivery-lb.com" });
	assert.deepEqual(where, { id: "A1", driverId: "d1" });
	assert.equal(driverPreview.available, true);
	const adminPreview = await loadManualWhatsAppPreview(db, { role: "admin", id: "a1" }, "A1");
	assert.deepEqual(where, { id: "A1" });
	assert.equal(adminPreview.available, true);
});

test("test runtime disables configured live transports and dry-run never calls fetch", async () => {
	const liveWithCredentials = readCommunicationConfig({
		NODE_ENV: "production",
		COMMUNICATION_ENABLED: "true",
		WHATSAPP_ENABLED: "true",
		TWILIO_ACCOUNT_SID: "AC-test",
		TWILIO_AUTH_TOKEN: "test-only",
		TWILIO_WHATSAPP_FROM: "whatsapp:+15550000001",
		TWILIO_WHATSAPP_CONTENT_SID: "HX-test",
	}, { testRuntime: true });
	assert.equal(liveWithCredentials.liveAllowed, false);
	let calls = 0;
	const disabled = createConfiguredTransports(liveWithCredentials, { fetchImpl: async () => { calls += 1; } });
	assert.equal((await disabled.whatsapp.send({})).status, "disabled");
	assert.equal(calls, 0);

	const dryRunConfig = readCommunicationConfig({
		COMMUNICATION_DRY_RUN: "true",
		WHATSAPP_ENABLED: "true",
	}, { testRuntime: true });
	const dryRun = createConfiguredTransports(dryRunConfig, { fetchImpl: async () => { calls += 1; } });
	assert.equal((await dryRun.whatsapp.send({})).status, "dry_run");
	assert.equal(calls, 0);
	assert.equal(getCommunicationRuntimeStatus(dryRunConfig).whatsapp, "Dry Run");
});

test("event resolution uses authoritative order phones and dispatches one configured channel", async () => {
	const sent = [];
	const db = { order: { findUnique: async () => order } };
	const service = createCommunicationService({
		db,
		config: productionConfig(),
		transports: { whatsapp: { send: async (value) => { sent.push(value); } }, sms: { send: async () => assert.fail("SMS should not be selected") } },
		logger: { info() {}, error() {} },
	});
	const result = await service.dispatch(notificationEvent("ORDER_ASSIGNED", "order", order.id, [
		{ role: "DRIVER", id: "d1", phone: "+19999999999" },
	]));
	assert.equal(result.status, "accepted");
	assert.equal(result.attempted, 3);
	assert.deepEqual(sent.map((item) => item.recipient.role), ["CUSTOMER", "MERCHANT", "DRIVER"]);
	assert.deepEqual(sent.map((item) => item.to), ["+96170123456", "+9611234567", "+9613234567"]);
	assert.equal(sent[0].template.templateId, "customer.order_assigned");
	assert.equal(sent[1].template.templateId, "merchant.order_assigned");
	assert.equal(sent[2].template.templateId, "driver.order_assigned");
	assert.match(sent[0].template.text, /\/track\?id=/);
});

test("customer automation is separately disabled and unsupported events never resolve recipients", async () => {
	let lookups = 0;
	const sent = [];
	const db = { order: { findUnique: async () => { lookups += 1; return order; } } };
	const service = createCommunicationService({
		db,
		config: productionConfig({ CUSTOMER_TRANSACTIONAL_MESSAGES_ENABLED: "false" }),
		transports: { whatsapp: { send: async (message) => sent.push(message) }, sms: { send: async () => {} } },
		logger: { info() {}, error() {} },
	});
	const result = await service.dispatch(notificationEvent("ORDER_DELIVERED", "order", order.id, [{ role: "MERCHANT", id: "m1" }]));
	assert.equal(result.status, "accepted");
	assert.equal(sent.length, 1);
	assert.equal(sent[0].recipient.role, "MERCHANT");
	assert.equal((await service.dispatch({ type: "ORDER_PAID", entityType: "order", entityId: order.id, recipients: [] })).status, "ignored");
	assert.equal(lookups, 1);
});

test("merchant finance messages use existing transaction numbers without balance data", async () => {
	const sent = [];
	const db = {
		merchantPayment: { findUnique: async () => ({ number: 42 }) },
		user: { findUnique: async () => ({ id: "m1", role: "MERCHANT", firstName: "Shop", phone: "+961 1 234 567" }) },
	};
	assert.equal(await resolveEventReference(db, { type: "MERCHANT_PAYMENT_CREATED", entityType: "payment", entityId: "p1" }), "Payment #42");
	const service = createCommunicationService({
		db,
		config: productionConfig(),
		transports: { whatsapp: { send: async (message) => sent.push(message) }, sms: { send: async () => {} } },
		logger: { info() {}, error() {} },
	});
	const event = notificationEvent("MERCHANT_PAYMENT_CREATED", "payment", "p1", [{ role: "MERCHANT", id: "m1" }]);
	await service.dispatch(event);
	assert.match(sent[0].template.text, /Payment #42/);
	assert.doesNotMatch(sent[0].template.text, /balance|amount|notes/i);
});

test("provider failure is classified, masked in logs, and stays secondary to the event", async () => {
	const logs = [];
	const service = createCommunicationService({
		db: { order: { findUnique: async () => ({ ...order, merchant: null, driver: null }) } },
		config: productionConfig(),
		transports: { whatsapp: { send: async () => { throw new ProviderRequestError("timeout", 408); } }, sms: { send: async () => {} } },
		logger: { info() {}, error: (...args) => logs.push(args) },
	});
	const result = await service.dispatch(notificationEvent("ORDER_DELIVERED", "order", order.id, []));
	assert.equal(result.status, "failed");
	assert.deepEqual(classifyProviderError(new ProviderRequestError("timeout", 408)), { category: "timeout", retryable: true });
	assert.equal(JSON.stringify(logs).includes("+96170123456"), false);
	assert.equal(JSON.stringify(logs).includes("Track:"), false);
});

test("Twilio SMS and WhatsApp adapters use mocked fetch and fixed provider fields", async () => {
	const requests = [];
	const transport = new TwilioTransport({
		accountSid: "AC-test-account",
		authToken: "test-auth-token",
		fetchImpl: async (url, options) => {
			requests.push({ url, options });
			return { ok: true, status: 201 };
		},
	});
	const template = { variables: { "1": "Nadia", "2": "Your order was delivered.", "3": "A1", "4": "https://example.test/track?id=A1" }, text: "GoDelivery: Your order was delivered. Reference A1." };
	await transport.send({ channel: "whatsapp", to: "+96170123456", from: "whatsapp:+15550000001", whatsappContentSid: "HX-approved-test", template });
	await transport.send({ channel: "sms", to: "+96170123456", from: "+15550000002", template });
	assert.equal(requests.length, 2);
	assert.equal(new URLSearchParams(requests[0].options.body).get("To"), "whatsapp:+96170123456");
	assert.equal(new URLSearchParams(requests[0].options.body).get("ContentSid"), "HX-approved-test");
	assert.equal(new URLSearchParams(requests[1].options.body).get("Body"), template.text);
	assert.match(requests[0].options.headers.Authorization, /^Basic /);
	assert.equal(classifyProviderError(new ProviderRequestError("authentication_failure", 401)).category, "authentication_failure");
});

test("notification afterCommit scheduling failure cannot change the business result", () => {
	const logs = [];
	const notifications = createNotificationService({
		communicationService: { afterCommit() { throw new Error("provider detail"); } },
		logger: { error: (...args) => logs.push(args) },
	});
	assert.doesNotThrow(() => notifications.afterCommit([notificationEvent("ORDER_DELIVERED", "order", "A1", [])]));
	assert.equal(JSON.stringify(logs).includes("provider detail"), false);
});

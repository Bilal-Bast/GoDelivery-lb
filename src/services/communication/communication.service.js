import { normalizePhoneNumber, maskPhoneNumber } from "./phone-normalization.js";
import { buildManualWhatsAppPreview, communicationPolicy, renderTransactionalTemplate } from "./templates.js";
import { TwilioTransport, classifyProviderError } from "./twilio-transport.js";
import prisma from "../../config/prisma.js";
import { buildOrderAccessWhere } from "../order-policy.service.js";

const CHANNELS = Object.freeze(["whatsapp", "sms"]);

function enabled(value) {
	return String(value || "").toLowerCase() === "true";
}

function isAutomatedTestRuntime() {
	const args = [...(process.argv || []), ...(process.execArgv || [])];
	return process.env.NODE_ENV === "test" ||
		Boolean(process.env.JEST_WORKER_ID || process.env.VITEST_WORKER_ID) ||
		args.some((arg) => arg === "--test" || arg.startsWith("--test-"));
}

function readCommunicationConfig(env = process.env, { testRuntime = isAutomatedTestRuntime() } = {}) {
	const primaryChannel = String(env.COMMUNICATION_PRIMARY_CHANNEL || "whatsapp").toLowerCase();
	const config = {
		production: env.NODE_ENV === "production",
		testRuntime,
		dryRun: enabled(env.COMMUNICATION_DRY_RUN),
		masterEnabled: enabled(env.COMMUNICATION_ENABLED),
		customerEnabled: enabled(env.CUSTOMER_TRANSACTIONAL_MESSAGES_ENABLED),
		whatsappEnabled: enabled(env.WHATSAPP_ENABLED),
		smsEnabled: enabled(env.SMS_ENABLED),
		primaryChannel: CHANNELS.includes(primaryChannel) ? primaryChannel : "whatsapp",
		defaultCountryCode: String(env.DEFAULT_PHONE_COUNTRY_CODE || "").trim(),
		appUrl: String(env.APP_URL || "").trim(),
		timeoutMs: Math.min(15000, Math.max(1000, Number(env.COMMUNICATION_TIMEOUT_MS) || 5000)),
		twilio: {
			accountSid: String(env.TWILIO_ACCOUNT_SID || "").trim(),
			authToken: String(env.TWILIO_AUTH_TOKEN || "").trim(),
			smsFrom: String(env.TWILIO_SMS_FROM || "").trim(),
			whatsappFrom: String(env.TWILIO_WHATSAPP_FROM || "").trim(),
			whatsappContentSid: String(env.TWILIO_WHATSAPP_CONTENT_SID || "").trim(),
		},
	};
	config.liveAllowed = config.production && config.masterEnabled && !testRuntime && !config.dryRun;
	return config;
}

class DisabledTransport {
	async send() { return { status: "disabled" }; }
}

class DryRunTransport {
	async send() { return { status: "dry_run" }; }
}

function configuredChannel(config, channel) {
	if (channel === "whatsapp") {
		return config.whatsappEnabled && config.twilio.accountSid && config.twilio.authToken &&
			config.twilio.whatsappFrom && config.twilio.whatsappContentSid;
	}
	return config.smsEnabled && config.twilio.accountSid && config.twilio.authToken && config.twilio.smsFrom;
}

function createConfiguredTransports(config, { fetchImpl = globalThis.fetch } = {}) {
	const disabled = new DisabledTransport();
	const dryRun = new DryRunTransport();
	const transports = { whatsapp: disabled, sms: disabled };
	if (config.dryRun) {
		transports.whatsapp = dryRun;
		transports.sms = dryRun;
		return transports;
	}
	if (!config.liveAllowed) return transports;
	const twilio = new TwilioTransport({
		accountSid: config.twilio.accountSid,
		authToken: config.twilio.authToken,
		timeoutMs: config.timeoutMs,
		fetchImpl,
	});
	if (configuredChannel(config, "whatsapp")) transports.whatsapp = {
		send: (message) => twilio.send({
			...message,
			from: config.twilio.whatsappFrom.startsWith("whatsapp:")
				? config.twilio.whatsappFrom
				: `whatsapp:${config.twilio.whatsappFrom}`,
			whatsappContentSid: config.twilio.whatsappContentSid,
		}),
	};
	if (configuredChannel(config, "sms")) transports.sms = {
		send: (message) => twilio.send({ ...message, from: config.twilio.smsFrom }),
	};
	return transports;
}

function channelRuntimeState(config, channel) {
	const enabledForChannel = channel === "whatsapp" ? config.whatsappEnabled : config.smsEnabled;
	if (config.dryRun) return enabledForChannel ? "Dry Run" : "Disabled";
	if (!config.liveAllowed || !enabledForChannel) return "Disabled";
	return configuredChannel(config, channel) ? "Configured" : "Unavailable";
}

function getCommunicationRuntimeStatus(config) {
	const whatsapp = channelRuntimeState(config, "whatsapp");
	const sms = channelRuntimeState(config, "sms");
	return Object.freeze({
		provider: config.twilio.accountSid && config.twilio.authToken ? "Twilio" : "None",
		whatsapp,
		sms,
		dryRun: config.dryRun,
		configured: whatsapp === "Configured" || sms === "Configured",
		customerAutomation: config.customerEnabled && config.liveAllowed && channelRuntimeState(config, config.primaryChannel) === "Configured",
	});
}

async function loadManualWhatsAppPreview(db, user, orderId, { appUrl, defaultCountryCode = "" } = {}) {
	if (!["admin", "driver"].includes(user?.role)) return null;
	const order = await db.order.findFirst({
		where: buildOrderAccessWhere(user, orderId),
		select: { id: true, customerFirstName: true, customerPhone: true },
	});
	if (!order) return null;
	return buildManualWhatsAppPreview(order, { appUrl, defaultCountryCode });
}

function referencedRecipientIds(event, role) {
	return new Set((event?.recipients || [])
		.filter((recipient) => recipient?.role === role && typeof recipient.id === "string")
		.map((recipient) => recipient.id));
}

async function resolveEventRecipients(db, event, policy) {
	if (event?.entityType === "order") {
		const order = await db.order.findUnique({
			where: { id: event.entityId },
			select: {
				id: true,
				customerFirstName: true,
				customerPhone: true,
				merchant: { select: { id: true, username: true, firstName: true, phone: true, role: true } },
				driver: { select: { id: true, username: true, firstName: true, phone: true, role: true } },
			},
		});
		if (!order) return [];
		const targets = [];
		if (policy.customer) targets.push({ role: "CUSTOMER", firstName: order.customerFirstName, phone: order.customerPhone });
		if (policy.roles.includes("MERCHANT") && order.merchant?.role === "MERCHANT") targets.push({ ...order.merchant, role: "MERCHANT" });
		if (policy.roles.includes("DRIVER") && order.driver?.role === "DRIVER" && referencedRecipientIds(event, "DRIVER").has(order.driver.id)) {
			targets.push({ ...order.driver, role: "DRIVER" });
		}
		return targets;
	}

	const targets = [];
	for (const role of policy.roles) {
		for (const id of referencedRecipientIds(event, role)) {
			const user = await db.user.findUnique({
				where: { id },
				select: { id: true, role: true, firstName: true, username: true, phone: true },
			});
			if (user?.role === role) targets.push(user);
		}
	}
	return targets;
}

async function resolveEventReference(db, event) {
	if (event?.entityType === "order") return event.entityId;
	const lookup = {
		DRIVER_COLLECTION_CREATED: ["driverCollection", "Collection"],
		MERCHANT_PAYMENT_CREATED: ["merchantPayment", "Payment"],
		PREPAID_ADJUSTMENT_CREATED: ["merchantPayment", "Prepaid adjustment"],
		ORDER_RETURNED: ["merchantReturn", "Return"],
	}[event?.type];
	if (!lookup) return event?.entityId;
	const [delegateName, label] = lookup;
	const delegate = db?.[delegateName];
	if (!delegate?.findUnique) return event?.entityId;
	const record = await delegate.findUnique({ where: { id: event.entityId }, select: { number: true } });
	return record?.number != null && Number.isFinite(Number(record.number))
		? `${label} #${record.number}`
		: event.entityId;
}

function activeChannel(config) {
	if (config.dryRun) return channelRuntimeState(config, config.primaryChannel) === "Dry Run" ? config.primaryChannel : null;
	if (!config.liveAllowed) return null;
	return channelRuntimeState(config, config.primaryChannel) === "Configured" ? config.primaryChannel : null;
}

function createCommunicationService({ db, config = readCommunicationConfig(), transports, logger = console } = {}) {
	const transportMap = transports || createConfiguredTransports(config);

	async function dispatch(event) {
		const policy = communicationPolicy(event?.type);
		if (!policy) return { status: "ignored", reason: "unsupported_event", attempted: 0 };
		if (!config.dryRun && !config.liveAllowed) return { status: "disabled", attempted: 0 };
		if (!db) return { status: "disabled", reason: "recipient_resolver_unavailable", attempted: 0 };
		const channel = activeChannel(config);
		if (!channel) return { status: "disabled", attempted: 0 };
		let recipients;
		let reference;
		try {
			recipients = await resolveEventRecipients(db, event, policy);
			reference = await resolveEventReference(db, event);
		} catch (error) {
			logger.error("communication recipient resolution failed", { type: event.type, category: "recipient_resolution_error" });
			return { status: "failed", reason: "recipient_resolution_error", attempted: 0 };
		}

		let attempted = 0;
		let accepted = 0;
		let skipped = 0;
		const destinations = new Set();
		for (const recipient of recipients) {
			if (recipient.role === "CUSTOMER" && !config.dryRun && !config.customerEnabled) {
				skipped += 1;
				continue;
			}
			const phone = normalizePhoneNumber(recipient.phone, { defaultCountryCode: config.defaultCountryCode });
			if (!phone) { skipped += 1; continue; }
			const dedupeKey = `${channel}:${phone}`;
			if (destinations.has(dedupeKey)) { skipped += 1; continue; }
			destinations.add(dedupeKey);
			const template = renderTransactionalTemplate({
				event: { ...event, entityId: reference },
				recipient,
				appUrl: config.appUrl,
				channel,
			});
			if (!template) { skipped += 1; continue; }
			attempted += 1;
			try {
				await transportMap[channel].send({
					channel,
					to: phone,
					recipient: { role: recipient.role },
					template,
					metadata: { eventType: event.type, templateId: template.templateId },
				});
				accepted += 1;
				if (config.dryRun) logger.info("communication dry run", { type: event.type, channel, templateId: template.templateId, destination: maskPhoneNumber(phone) });
			} catch (error) {
				const classification = classifyProviderError(error);
				logger.error("communication delivery failed", {
					type: event.type,
					channel,
					templateId: template.templateId,
					destination: maskPhoneNumber(phone),
					category: classification.category,
					retryable: classification.retryable,
				});
			}
		}
		return { status: attempted === 0 ? "skipped" : accepted === attempted ? "accepted" : accepted ? "partial" : "failed", attempted, accepted, skipped };
	}

	function afterCommit(events) {
		if (!Array.isArray(events)) return;
		for (const event of events) void dispatch(event).catch(() => {});
	}

	return { dispatch, afterCommit, config, status: () => getCommunicationRuntimeStatus(config) };
}

const communicationConfig = readCommunicationConfig();
const communicationService = createCommunicationService({ db: prisma, config: communicationConfig });

export {
	DisabledTransport,
	DryRunTransport,
	createCommunicationService,
	createConfiguredTransports,
	getCommunicationRuntimeStatus,
	readCommunicationConfig,
	resolveEventRecipients,
	resolveEventReference,
	loadManualWhatsAppPreview,
	communicationConfig,
	communicationService,
};

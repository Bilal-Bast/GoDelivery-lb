// Current schema has no device-token or notification-preference storage.
// This boundary intentionally performs no production push delivery.
class NotificationTokenRepository {
	async tokensFor(_recipient) { throw new Error("Token repository is not configured"); }
	async register(_recipient, _token) { throw new Error("Token repository is not configured"); }
	async unregister(_recipient, _token) { throw new Error("Token repository is not configured"); }
}

class DisabledNotificationTokenRepository extends NotificationTokenRepository {
	async tokensFor() { return []; }
	async register() { return { supported: false, reason: "Persistent device registration is unavailable" }; }
	async unregister() { return { supported: false, reason: "Persistent device registration is unavailable" }; }
}

class PushTransport {
	async send(_event, _tokens) { throw new Error("Push transport is not configured"); }
}

class DisabledPushTransport extends PushTransport {
	async send() { return { status: "disabled", delivered: 0 }; }
}

function createNotificationService({ tokenRepository = new DisabledNotificationTokenRepository(), transport = new DisabledPushTransport(), logger = console } = {}) {
	async function dispatch(event) {
		let targets = 0;
		try {
			const tokens = new Set();
			for (const recipient of event.recipients) {
				for (const token of await tokenRepository.tokensFor(recipient)) tokens.add(token);
			}
			targets = tokens.size;
			if (!targets) return { status: "disabled", delivered: 0 };
			return await transport.send(event, [...tokens]);
		} catch (error) {
			logger.error("notification delivery failed", { type: event.type, category: error?.code || "provider_error", targets });
			return { status: "failed", delivered: 0 };
		}
	}
	function afterCommit(events) {
		for (const event of events) {
			void dispatch(event).catch(() => {});
		}
	}
	return { dispatch, afterCommit, tokenRepository };
}

const notifications = createNotificationService();
export { NotificationTokenRepository, DisabledNotificationTokenRepository, PushTransport, DisabledPushTransport, createNotificationService, notifications };

class ProviderRequestError extends Error {
	constructor(category, status = null) {
		super(category);
		this.name = "ProviderRequestError";
		this.category = category;
		this.status = status;
	}
}

function classifyProviderError(error) {
	if (error?.name === "AbortError" || error?.name === "TimeoutError") return { category: "timeout", retryable: true };
	if (error instanceof ProviderRequestError) {
		if (error.category === "invalid_recipient") return { category: "invalid_recipient", retryable: false };
		if (error.category === "authentication_failure") return { category: "authentication_failure", retryable: false };
		if (error.category === "quota_or_rate_limit") return { category: "quota_or_rate_limit", retryable: error.status === 429 };
		if (error.category === "provider_rejected") return { category: "provider_rejected", retryable: false };
		if (error.category === "timeout" || error.category === "provider_unavailable") return { category: error.category, retryable: true };
	}
	return { category: "provider_unavailable", retryable: true };
}

function twilioErrorCategory(status, code) {
	if (status === 401 || status === 403) return "authentication_failure";
	if (status === 402 || status === 429 || code === 20429) return "quota_or_rate_limit";
	if (code === 21211 || code === 21610 || code === 63003) return "invalid_recipient";
	if (status >= 500 || status === 408) return "provider_unavailable";
	return "provider_rejected";
}

class TwilioTransport {
	constructor({ accountSid, authToken, timeoutMs = 5000, fetchImpl = globalThis.fetch } = {}) {
		this.accountSid = accountSid;
		this.authToken = authToken;
		this.timeoutMs = timeoutMs;
		this.fetchImpl = fetchImpl;
	}

	async send({ channel, to, template, from, whatsappContentSid }) {
		if (!this.accountSid || !this.authToken || !from || !this.fetchImpl) {
			throw new ProviderRequestError("provider_rejected");
		}
		const form = new URLSearchParams({
			To: channel === "whatsapp" ? `whatsapp:${to}` : to,
			From: from,
		});
		if (channel === "whatsapp") {
			if (!whatsappContentSid) throw new ProviderRequestError("provider_rejected");
			form.set("ContentSid", whatsappContentSid);
			form.set("ContentVariables", JSON.stringify(template.variables));
		} else {
			form.set("Body", template.text);
		}

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.timeoutMs);
		try {
			const response = await this.fetchImpl(
				`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(this.accountSid)}/Messages.json`,
				{
					method: "POST",
					headers: {
						Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64")}`,
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: form.toString(),
					signal: controller.signal,
				},
			);
			if (!response.ok) {
				let code = null;
				try { code = (await response.json())?.code; } catch {}
				throw new ProviderRequestError(twilioErrorCategory(response.status, code), response.status);
			}
			return { status: "accepted" };
		} catch (error) {
			if (error instanceof ProviderRequestError) throw error;
			if (error?.name === "AbortError") throw new ProviderRequestError("timeout", 408);
			throw new ProviderRequestError("provider_unavailable");
		} finally {
			clearTimeout(timer);
		}
	}
}

export { TwilioTransport, ProviderRequestError, classifyProviderError };

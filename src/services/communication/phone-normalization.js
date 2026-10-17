function normalizePhoneNumber(value, { defaultCountryCode = "" } = {}) {
	if (typeof value !== "string") return null;
	const input = value.trim();
	if (!input) return null;

	const international = input.startsWith("+") || input.startsWith("00");
	let digits = input.replace(/\D/g, "");
	if (input.startsWith("00")) digits = digits.slice(2);
	if (!digits) return null;

	const countryCode = String(defaultCountryCode).replace(/\D/g, "");
	if (!international) {
		if (!countryCode) return null;
		if (digits.startsWith(countryCode)) {
			const national = digits.slice(countryCode.length).replace(/^0/, "");
			digits = `${countryCode}${national}`;
		} else {
			digits = `${countryCode}${digits.replace(/^0/, "")}`;
		}
	} else if (countryCode && digits.startsWith(countryCode)) {
		const national = digits.slice(countryCode.length).replace(/^0/, "");
		digits = `${countryCode}${national}`;
	}

	if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) return null;
	return `+${digits}`;
}

function maskPhoneNumber(value) {
	const digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
	if (digits.length < 7) return "***";
	return `+${digits.slice(0, Math.min(5, digits.length - 3))}***${digits.slice(-3)}`;
}

export { normalizePhoneNumber, maskPhoneNumber };

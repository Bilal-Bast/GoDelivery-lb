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

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function toLatinDigits(text) {
	return String(text).replace(/[٠-٩۰-۹]/g, (ch) => {
		const i = ARABIC_DIGITS.indexOf(ch);
		return String(i >= 0 ? i : PERSIAN_DIGITS.indexOf(ch));
	});
}

// Finds a phone number embedded in free text (e.g. "Hamra, bldg 4, floor 3 71 123 456").
// Returns { phone, address }: phone is normalized (+countrycode digits) or null,
// address is the text with the phone removed and separators tidied.
function extractPhoneFromText(value, { defaultCountryCode = "" } = {}) {
	const text = toLatinDigits(typeof value === "string" ? value : "");
	// A phone-like run: optional +/00, then digits separated by single spaces, dashes, dots or parentheses.
	const pattern = /(?:\+|00)?\(?\d[\d\s()./-]{5,}\d/g;
	const candidates = [];
	for (const match of text.matchAll(pattern)) {
		const raw = match[0];
		const digitCount = raw.replace(/\D/g, "").length;
		if (digitCount < 7 || digitCount > 15) continue;
		const phone = normalizePhoneNumber(raw.trim(), { defaultCountryCode });
		if (!phone) continue;
		candidates.push({ phone, start: match.index, end: match.index + raw.length });
	}
	if (!candidates.length) return { phone: null, address: text.trim() };

	// Merchants usually append the phone at the end, so the last candidate wins.
	const chosen = candidates[candidates.length - 1];
	const address = `${text.slice(0, chosen.start)} ${text.slice(chosen.end)}`
		.replace(/\s+/g, " ")
		.replace(/\s+([,;/-])/g, "$1")
		.replace(/^[\s,;:/-]+|[\s,;:/-]+$/g, "")
		.replace(/(?:tel|phone|mobile|mob|هاتف|رقم)\s*:?\s*$/i, "")
		.replace(/[\s,;:/-]+$/g, "")
		.trim();
	return { phone: chosen.phone, address };
}

export { normalizePhoneNumber, maskPhoneNumber, extractPhoneFromText };

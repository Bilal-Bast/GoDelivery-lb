// Validate and sanitize common query parameters
export function validatePaginationParams(req) {
	let page = parseInt(req.query.page) || 1;
	let limit = parseInt(req.query.limit) || 20;

	// Prevent invalid values
	if (isNaN(page) || page < 1) page = 1;
	if (isNaN(limit) || limit < 1) limit = 20;

	// Cap the limit to prevent DoS
	if (limit > 100) limit = 100;

	return { page, limit };
}

export function sanitizeString(str, maxLength = 100) {
	if (typeof str !== "string") return "";
	return str.slice(0, maxLength).trim();
}

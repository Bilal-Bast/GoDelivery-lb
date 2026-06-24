// Safely encode redirect URLs and prevent open redirect vulnerabilities
export function safeRedirect(baseUrl, params = {}) {
	// Only allow redirects to same-origin paths
	if (!baseUrl.startsWith("/")) {
		throw new Error("Redirect URL must be a relative path starting with /");
	}

	const url = new URL(baseUrl, "http://localhost"); // Use dummy origin for validation
	Object.entries(params).forEach(([key, value]) => {
		if (value !== null && value !== undefined) {
			// Sanitize values to prevent XSS
			const sanitized = String(value)
				.replace(/[<>\"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
			url.searchParams.set(key, sanitized);
		}
	});

	// Return only the pathname and search, not the full URL
	return url.pathname + url.search;
}

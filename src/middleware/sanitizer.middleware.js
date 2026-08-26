// Middleware to remove sensitive fields from request body
export default function sanitizeRequest(req, res, next) {
	if (!req.body) {
		return next();
	}

	// Fields that should NEVER be user-settable
	const alwaysSensitiveFields = [
		"_id",
		"role",
		"createdAt",
		"updatedAt",
		"__v",
	];

	if (!req.path.startsWith("/orders")) {
		alwaysSensitiveFields.push("id");
	}

	// Fields that are sensitive only on update (PUT/PATCH). accountType and
	// paymentDay used to be stripped here too, but every route that accepts
	// them (PUT /api/users/:id, /merchants/:id) is already admin-only-gated,
	// so stripping them here just silently broke legitimate merchant edits
	// with no actual security benefit.
	const updateSensitiveFields =
		req.method === "PUT" || req.method === "PATCH"
			? [
					"m", // merchant (order field)
					"cb", // created by
				]
			: [];

	const allSensitiveFields = [...alwaysSensitiveFields, ...updateSensitiveFields];

	allSensitiveFields.forEach((field) => {
		delete req.body[field];
	});

	next();
}

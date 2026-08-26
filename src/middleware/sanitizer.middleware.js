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

	// Fields that are sensitive only on update (PUT/PATCH)
	const updateSensitiveFields =
		req.method === "PUT" || req.method === "PATCH"
			? [
					"m", // merchant (order field)
					"cb", // created by
					"accountType", // user account type
					"paymentDay", // merchant payment day
				]
			: [];

	const allSensitiveFields = [...alwaysSensitiveFields, ...updateSensitiveFields];

	allSensitiveFields.forEach((field) => {
		delete req.body[field];
	});

	next();
}

export default function errorHandler(err, req, res, next) {
	const status = err?.status || 500;

	// Minimal structured log - don't log sensitive data
	const errorLog = {
		level: "error",
		message:
			process.env.NODE_ENV === "production"
				? "Internal Server Error"
				: err?.message || "Internal Server Error",
		path: req?.path,
		user: req?.user?.username || null,
		stack:
			process.env.NODE_ENV === "production" ? undefined : err?.stack,
	};
	console.error(JSON.stringify(errorLog));

	if (req.path && req.path.startsWith("/api/")) {
		// Never expose detailed error messages in production
		const errorMessage =
			process.env.NODE_ENV === "production"
				? "Internal Server Error"
				: err?.message || "Internal Server Error";
		return res.status(status).json({ error: errorMessage });
	}

	// For SSR pages render a simple error page fallback. The repo doesn't include a dedicated
	// error view, so render the index page with an error title.
	try {
		return res
			.status(status)
			.render("index", { title: "Server Error | Go Delivery" });
	} catch (_) {
		return res.status(status).send("Server Error");
	}
}

export default function errorHandler(err, req, res, next) {
	const status = err?.status || 500;

	// Minimal structured log
	console.error(
		JSON.stringify({
			level: "error",
			message: err?.message || "Internal Server Error",
			path: req?.path,
			user: req?.user?.id || req?.user?.username || null,
			stack:
				process.env.NODE_ENV === "production" ? undefined : err?.stack,
		}),
	);

	if (req.path && req.path.startsWith("/api/")) {
		return res
			.status(status)
			.json({ error: err?.message || "Internal Server Error" });
	}

	// For SSR pages render a simple error page fallback. The repo doesn't include a dedicated
	// error view, so render the signin page with an error title.
	try {
		return res
			.status(status)
			.render("signin", { title: "Server Error | Go Delivery" });
	} catch (_) {
		return res.status(status).send("Server Error");
	}
}

import { randomUUID } from "crypto";

export default function requestLogger(req, res, next) {
	const id =
		req.headers["x-request-id"] ||
		randomUUID?.() ||
		`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
	res.setHeader("X-Request-Id", id);
	req.requestId = id;
	const start = Date.now();
	res.on("finish", () => {
		const payload = {
			reqId: id,
			method: req.method,
			path: req.originalUrl,
			status: res.statusCode,
			durationMs: Date.now() - start,
			user: req.user?.username || null,
		};
		// Keep logging simple and JSON-formatted for easy integration with log collectors
		console.log(JSON.stringify(payload));
	});
	next();
}

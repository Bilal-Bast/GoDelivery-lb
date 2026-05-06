import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
	let token = null;

	// Accept cookie (browser SSR flow) or Authorization header (API clients)
	if (req.cookies && req.cookies.token) {
		token = req.cookies.token;
	} else {
		const authHeader = req.headers.authorization;
		if (authHeader && authHeader.startsWith("Bearer ")) {
			token = authHeader.split(" ")[1];
		}
	}

	if (!token) {
		return res.status(401).json({ error: "Unauthorized" });
	}

	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		req.user = decoded;
		next();
	} catch {
		res.status(401).json({ error: "Invalid token" });
	}
}

export function authorize(...roles) {
	return (req, res, next) => {
		if (!req.user) {
			return res.status(401).json({ error: "Unauthorized" });
		}
		if (!roles.includes(req.user.role)) {
			return res.status(403).json({ error: "Forbidden" });
		}
		next();
	};
}

export default authMiddleware;

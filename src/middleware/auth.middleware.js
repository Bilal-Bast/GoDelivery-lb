import jwt from "jsonwebtoken";

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
	console.warn("JWT_SECRET not set — using development fallback (insecure)");
	JWT_SECRET = "dev-secret";
}

function authMiddleware(req, res, next) {
	const authHeader = req.headers.authorization || "";
	let token = null;
	if (authHeader.startsWith("Bearer ")) {
		token = authHeader.slice("Bearer ".length);
	} else if (authHeader) {
		token = authHeader;
	}
	if (!token) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	try {
		const decoded = jwt.verify(token, JWT_SECRET);
		req.user = decoded;
		next();
	} catch (error) {
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

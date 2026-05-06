import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Protects SSR pages. Reads JWT from cookie, sets req.user.
 * Redirects to /signin on missing or invalid token.
 * Optionally restricts to specific roles.
 */
export function pageAuth(...allowedRoles) {
	return (req, res, next) => {
		const token = req.cookies?.token;

		if (!token) {
			return res.redirect("/signin");
		}

		try {
			const decoded = jwt.verify(token, JWT_SECRET);
			req.user = decoded;

			if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
				return res.redirect("/signin");
			}

			next();
		} catch {
			res.clearCookie("token");
			res.redirect("/signin");
		}
	};
}

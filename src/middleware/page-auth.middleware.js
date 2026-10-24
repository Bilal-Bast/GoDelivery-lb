import jwt from "jsonwebtoken";
import { renewAuthCookie } from "../utils/auth-token.js";
import prisma from "../config/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Protects SSR pages. Reads JWT from cookie, sets req.user.
 * Redirects to /signin on missing or invalid token.
 * Optionally restricts to specific roles.
 */
export function pageAuth(...allowedRoles) {
	return async (req, res, next) => {
		const token = req.cookies?.token;

		if (!token) {
			return res.redirect("/signin");
		}

		let decoded;
		try {
			decoded = jwt.verify(token, JWT_SECRET);
		} catch {
			res.clearCookie("token");
			return res.redirect("/signin");
		}

		if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
			return res.redirect("/signin");
		}

		try {
			const preferences = await prisma.user.findUnique({
				where: { id: decoded.id },
				select: { language: true },
			});
			if (!preferences) {
				res.clearCookie("token");
				return res.redirect("/signin");
			}

			req.user = { ...decoded, language: preferences.language || "en" };
			res.locals.language = req.user.language;
			renewAuthCookie(res, decoded);
			return next();
		} catch (error) {
			return next(error);
		}
	};
}

import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import {
	recordFailedAttempt,
	resetAttempts,
	getAttempts,
} from "../utils/loginAttemptTracker.js";
import { sendPasswordResetEmail } from "../services/mailer.service.js";
import { normalizeRoleForOutput } from "../utils/roleMapper.js";

const JWT_SECRET = process.env.JWT_SECRET;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

async function login(req, res, next) {
	try {
		const { username, password } = req.body;
		if (!username || !password) {
			return res
				.status(400)
				.json({ error: "Username and password are required" });
		}

		// Check if account is locked
		const attempts = getAttempts(username);
		if (attempts.locked) {
			return res.status(429).json({
				error: `Account locked due to too many failed login attempts. Try again in ${attempts.remainingTime} seconds.`,
			});
		}

		const user = await prisma.user.findUnique({ where: { username } });
		if (!user) {
			recordFailedAttempt(username);
			return res
				.status(401)
				.json({ error: "Invalid username or password" });
		}
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			const isLocked = recordFailedAttempt(username);
			if (isLocked) {
				return res.status(429).json({
					error: "Account locked due to too many failed login attempts. Try again in 15 minutes.",
				});
			}
			return res
				.status(401)
				.json({ error: "Invalid username or password" });
		}

		// Reset attempts on successful login
		resetAttempts(username);
		const role = normalizeRoleForOutput(user.role);
		const token = jwt.sign(
			{
				id: user.id,
				role,
				username: user.username,
			},
			JWT_SECRET,
			{ expiresIn: "30m" },
		);
		// Set HTTP-only cookie for SSR pages
		res.cookie("token", token, {
			httpOnly: true,
			sameSite: "strict",
			maxAge: 30 * 60 * 1000, // 30 minutes
			secure: process.env.NODE_ENV === "production",
		});

		res.json({
			token,
			role,
			username: user.username,
			user: {
				id: user.id,
				role,
				username: user.username,
			},
		});
	} catch (error) {
		console.error("Login error:", error);
		next(error);
	}
}

async function getMe(req, res, next) {
	try {
		const user = await prisma.user.findUnique({
			where: { id: req.user.id },
			select: {
				id: true,
				username: true,
				role: true,
				email: true,
				firstName: true,
				lastName: true,
				phone: true,
				accountType: true,
				cashPercentage: true,
				paymentDay: true,
				createdAt: true,
				updatedAt: true,
			},
		});
		if (!user) return res.status(404).json({ error: "User not found" });
		res.json({ ...user, role: normalizeRoleForOutput(user.role) });
	} catch (error) {
		next(error);
	}
}

function logout(req, res) {
	res.clearCookie("token");
	res.redirect("/signin");
}

// Self-service: logged-in user changes their own password
async function changePassword(req, res, next) {
	try {
		const { currentPassword, newPassword } = req.body;
		if (!currentPassword || !newPassword) {
			return res.status(400).json({
				error: "currentPassword and newPassword are required",
			});
		}

		const user = await prisma.user.findUnique({
			where: { id: req.user.id },
		});
		if (!user) return res.status(404).json({ error: "User not found" });

		const isMatch = await bcrypt.compare(currentPassword, user.password);
		if (!isMatch) {
			return res.status(401).json({ error: "Current password is incorrect" });
		}

		await prisma.user.update({
			where: { id: req.user.id },
			data: { password: await bcrypt.hash(newPassword, 10) },
		});

		res.json({ message: "Password changed successfully" });
	} catch (error) {
		next(error);
	}
}

// Public: request a password reset email
async function forgotPassword(req, res, next) {
	try {
		const { email } = req.body;
		if (!email) return res.status(400).json({ error: "email is required" });

		const normalizedEmail = email.toLowerCase();
		const user = await prisma.user.findUnique({
			where: { email: normalizedEmail },
		});

		// Always respond the same way so we don't leak which emails are registered
		if (user) {
			const rawToken = crypto.randomBytes(32).toString("hex");
			const hashedToken = crypto
				.createHash("sha256")
				.update(rawToken)
				.digest("hex");

			await prisma.user.update({
				where: { email: normalizedEmail },
				data: {
					resetPasswordToken: hashedToken,
					resetPasswordExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
				},
			});

			const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
			const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

			await sendPasswordResetEmail(user.email, resetUrl);
		}

		res.json({
			message:
				"If an account with that email exists, a password reset link has been sent.",
		});
	} catch (error) {
		next(error);
	}
}

// Public: complete a password reset using the emailed token
async function resetPassword(req, res, next) {
	try {
		const { token, newPassword } = req.body;
		if (!token || !newPassword) {
			return res
				.status(400)
				.json({ error: "token and newPassword are required" });
		}

		const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

		const user = await prisma.user.findFirst({
			where: {
				resetPasswordToken: hashedToken,
				resetPasswordExpires: { gt: new Date() },
			},
		});

		if (!user) {
			return res.status(400).json({ error: "Invalid or expired reset link" });
		}

		await prisma.user.update({
			where: { id: user.id },
			data: {
				password: await bcrypt.hash(newPassword, 10),
				resetPasswordToken: null,
				resetPasswordExpires: null,
			},
		});

		res.json({ message: "Password reset successfully" });
	} catch (error) {
		next(error);
	}
}

export {
	login,
	getMe,
	logout,
	changePassword,
	forgotPassword,
	resetPassword,
};

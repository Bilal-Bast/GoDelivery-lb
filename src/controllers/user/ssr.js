import bcrypt from "bcrypt";

import prisma from "../../config/prisma.js";
import { safeRedirect } from "../../utils/urlSafeRedirect.js";
import { mapAccountTypeToPrisma } from "../../utils/roleMapper.js";
import {
	isSuperAdminUsername,
	normalizeDeliveryCharges,
	deliveryChargesRelationData,
} from "./serializers.js";

async function addAdminSSR(req, res, next) {
	try {
		let payload = req.body;
		if (payload.payload) {
			try {
				payload = JSON.parse(payload.payload);
			} catch {}
		}

		const { username, email, password, firstName, lastName, phone } = payload;
		if (!username || !email || !password || !firstName || !phone) {
			return res.redirect("/settings?error=Missing+required+fields");
		}
		if (password.length < 6) {
			return res.redirect("/settings?error=Password+too+short");
		}

		const existing = await prisma.user.findUnique({
			where: { username },
		});
		if (existing) return res.redirect("/settings?error=Username+exists");

		const hashed = await bcrypt.hash(password, 10);
		await prisma.user.create({
			data: {
				username,
				email,
				password: hashed,
				role: "ADMIN",
				firstName,
				lastName,
				phone,
			},
		});
		return res.redirect("/settings?success=1");
	} catch (err) {
		console.error("addAdminSSR error:", err);
		return res.redirect("/settings?error=Failed+to+create+admin");
	}
}

async function addDriverSSR(req, res, next) {
	try {
		let payload = req.body;
		if (payload.payload) {
			try {
				payload = JSON.parse(payload.payload);
			} catch {}
		}
		const { username, email, password, firstName, lastName, phone } = payload;
		if (!username || !email || !password || !firstName || !phone) {
			return res.redirect("/settings?error=Missing+required+fields");
		}
		if (password.length < 6) {
			return res.redirect("/settings?error=Password+too+short");
		}
		const existing = await prisma.user.findUnique({
			where: { username },
		});
		if (existing) return res.redirect("/settings?error=Username+exists");

		const hashed = await bcrypt.hash(password, 10);
		await prisma.user.create({
			data: {
				username,
				email,
				password: hashed,
				role: "DRIVER",
				firstName,
				lastName,
				phone,
			},
		});
		return res.redirect("/settings?success=1");
	} catch (err) {
		console.error("addDriverSSR error:", err);
		return res.redirect("/settings?error=Failed+to+create+driver");
	}
}

async function addMerchantSSR(req, res, next) {
	try {
		let payload = req.body;
		if (payload.payload) {
			try {
				payload = JSON.parse(payload.payload);
			} catch {}
		}
		const {
			username,
			email,
			password,
			firstName,
			lastName,
			phone,
			accountType,
			cashPercentage,
			paymentDay,
			deliveryCharges,
		} = payload;

		if (!username || !email || !password || !firstName || !phone) {
			return res.redirect("/settings?error=Missing+required+fields");
		}
		if (password.length < 6) {
			return res.redirect("/settings?error=Password+too+short");
		}
		const prismaAccountType = mapAccountTypeToPrisma(accountType);
		if (
			prismaAccountType === "PREPAID" &&
			(cashPercentage == null || cashPercentage < 0 || cashPercentage > 100)
		) {
			return res.redirect("/settings?error=Invalid+cash+percentage");
		}
		if (prismaAccountType === "POSTPAID" && !paymentDay) {
			return res.redirect("/settings?error=Payment+day+required");
		}
		const existing = await prisma.user.findUnique({
			where: { username },
		});
		if (existing) return res.redirect("/settings?error=Username+exists");

		const hashed = await bcrypt.hash(password, 10);
		const charges = normalizeDeliveryCharges(deliveryCharges);
		await prisma.user.create({
			data: {
				username,
				email,
				password: hashed,
				role: "MERCHANT",
				firstName,
				lastName,
				phone,
				accountType: prismaAccountType,
				cashPercentage:
					prismaAccountType === "PREPAID"
						? Number(cashPercentage)
						: null,
				paymentDay:
					prismaAccountType === "POSTPAID" ? paymentDay : null,
				deliveryCharges:
					Object.keys(charges).length > 0
						? { create: deliveryChargesRelationData(charges) }
						: undefined,
			},
		});
		return res.redirect("/settings?success=1");
	} catch (err) {
		console.error("addMerchantSSR error:", err);
		return res.redirect("/settings?error=Failed+to+create+merchant");
	}
}

async function deleteUserSSR(req, res, next) {
	try {
		const id = req.body.id || req.body.userId;
		if (!id)
			return res.redirect(
				safeRedirect("/users", { error: "Missing user id" }),
			);

		const target = await prisma.user.findUnique({
			where: { id },
		});
		if (!target)
			return res.redirect(
				safeRedirect("/users", { error: "User not found" }),
			);
		if (
			isSuperAdminUsername(target.username) &&
			!isSuperAdminUsername(req.user?.username)
		) {
			return res.redirect(
				safeRedirect("/users", { error: "Forbidden" }),
			);
		}

		await prisma.user.delete({ where: { id } });
		return res.redirect(safeRedirect("/users", { success: "1" }));
	} catch (error) {
		console.error("deleteUserSSR error:", error);
		return res.redirect(
			safeRedirect("/users", { error: "Failed to delete user" }),
		);
	}
}

async function updateMerchantSSR(req, res, next) {
	try {
		const merchantId = req.body.merchantId || req.body.id;
		if (!merchantId)
			return res.redirect("/settings?error=Missing+merchant+id");

		const merchant = await prisma.user.findUnique({
			where: { id: merchantId },
		});
		if (!merchant || merchant.role !== "MERCHANT")
			return res.redirect("/settings?error=Merchant+not+found");

		let deliveryCharges = req.body.deliveryCharges || req.body.deliveryChargesJson;
		try {
			deliveryCharges = normalizeDeliveryCharges(deliveryCharges);
		} catch (e) {
			console.error("Invalid deliveryCharges JSON", e);
			return res.redirect("/settings?error=Invalid+delivery+charges");
		}

		await prisma.user.update({
			where: { id: merchantId },
			data: {
				deliveryCharges: {
					deleteMany: {},
					create: deliveryChargesRelationData(deliveryCharges),
				},
			},
		});
		return res.redirect("/settings?success=1");
	} catch (err) {
		console.error("updateMerchantSSR error:", err);
		return res.redirect("/settings?error=Failed+to+update+merchant");
	}
}

export { addAdminSSR, addDriverSSR, addMerchantSSR, deleteUserSSR, updateMerchantSSR };

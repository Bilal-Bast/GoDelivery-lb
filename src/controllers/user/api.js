import bcrypt from "bcrypt";

import prisma from "../../config/prisma.js";
import { mapAccountTypeToPrisma } from "../../utils/roleMapper.js";
import {
	isSuperAdminUsername,
	serializeUser,
	serializeUsers,
	normalizeDeliveryCharges,
	deliveryChargesRelationData,
} from "./serializers.js";

async function addAdmin(req, res, next) {
	try {
		const { username, email, password, firstName, lastName, phone } = req.body;

		if (!username || !email || !password || !firstName || !phone) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		const existing = await prisma.user.findFirst({
			where: {
				OR: [{ username }, { email }],
			},
		});
		if (existing)
			return res
				.status(400)
				.json({ error: "Username or email already exists" });

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

		res.status(201).json({
			message: `Admin "${username}" created successfully`,
		});
	} catch (error) {
		next(error);
	}
}

async function addMerchant(req, res, next) {
	try {
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
		} = req.body;

		if (!username || !email || !password || !firstName || !phone) {
			return res.status(400).json({ error: "Missing required fields" });
		}
		const prismaAccountType = mapAccountTypeToPrisma(accountType);
		if (
			prismaAccountType === "PREPAID" &&
			(cashPercentage == null || cashPercentage < 0 || cashPercentage > 100)
		) {
			return res.status(400).json({ error: "Invalid cash percentage" });
		}
		if (prismaAccountType === "POSTPAID" && !paymentDay) {
			return res.status(400).json({
				error: "Payment day is required for postpaid accounts",
			});
		}

		const existing = await prisma.user.findFirst({
			where: {
				OR: [{ username }, { email }],
			},
		});
		if (existing)
			return res
				.status(400)
				.json({ error: "Username or email already exists" });

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

		res.status(201).json({
			message: `Merchant "${username}" created successfully`,
		});
	} catch (error) {
		next(error);
	}
}

async function addDriver(req, res, next) {
	try {
		const { username, email, password, firstName, lastName, phone, deliveryFee } =
			req.body;

		if (!username || !email || !password || !firstName || !phone) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		let parsedDeliveryFee = null;
		if (deliveryFee != null && deliveryFee !== "") {
			parsedDeliveryFee = Number(deliveryFee);
			if (!Number.isFinite(parsedDeliveryFee) || parsedDeliveryFee < 0) {
				return res.status(400).json({ error: "Invalid delivery fee" });
			}
		}

		const existing = await prisma.user.findFirst({
			where: {
				OR: [{ username }, { email }],
			},
		});
		if (existing)
			return res
				.status(400)
				.json({ error: "Username or email already exists" });

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
				deliveryFee: parsedDeliveryFee,
			},
		});

		res.status(201).json({
			message: `Driver "${username}" created successfully`,
		});
	} catch (error) {
		next(error);
	}
}

async function getUsers(req, res, next) {
	try {
		let users = await prisma.user.findMany({
			include: {
				deliveryCharges: true,
			},
		});
		if (!isSuperAdminUsername(req.user?.username)) {
			users = users.filter((u) => !isSuperAdminUsername(u.username));
		}
		res.json(serializeUsers(users));
	} catch (error) {
		next(error);
	}
}

async function getMerchants(req, res, next) {
	try {
		const where = { role: "MERCHANT" };
		if (req.query.username) {
			where.username = req.query.username;
		}
		const merchants = await prisma.user.findMany({
			where,
			include: {
				deliveryCharges: true,
			},
		});
		res.json(serializeUsers(merchants));
	} catch (error) {
		next(error);
	}
}

async function getMerchantByUsername(req, res, next) {
	try {
		const merchant = await prisma.user.findFirst({
			where: {
				username: req.params.username,
				role: "MERCHANT",
			},
			include: {
				deliveryCharges: true,
			},
		});
		if (!merchant)
			return res.status(404).json({ error: "Merchant not found" });
		res.json(serializeUser(merchant));
	} catch (error) {
		next(error);
	}
}

async function deleteUser(req, res, next) {
	try {
		if (!req.params.id) {
			return res.status(400).json({ error: "Invalid user ID" });
		}
		const target = await prisma.user.findUnique({
			where: { id: req.params.id },
		});
		if (!target) return res.status(404).json({ error: "User not found" });
		if (
			isSuperAdminUsername(target.username) &&
			!isSuperAdminUsername(req.user?.username)
		) {
			return res.status(403).json({ error: "Forbidden" });
		}

		await prisma.user.delete({ where: { id: req.params.id } });
		res.json({ message: "User deleted" });
	} catch (error) {
		next(error);
	}
}

async function getUser(req, res, next) {
	try {
		if (!req.params.id) {
			return res.status(400).json({ error: "Invalid user ID" });
		}
		const user = await prisma.user.findUnique({
			where: { id: req.params.id },
			include: { deliveryCharges: true },
		});
		if (!user) return res.status(404).json({ error: "User not found" });
		if (
			isSuperAdminUsername(user.username) &&
			!isSuperAdminUsername(req.user?.username)
		) {
			return res.status(403).json({ error: "Forbidden" });
		}
		res.json(serializeUser(user));
	} catch (error) {
		next(error);
	}
}

async function updateUser(req, res, next) {
	try {
		if (!req.params.id) {
			return res.status(400).json({ error: "Invalid user ID" });
		}
		const user = await prisma.user.findUnique({
			where: { id: req.params.id },
		});
		if (!user) return res.status(404).json({ error: "User not found" });
		if (
			isSuperAdminUsername(user.username) &&
			!isSuperAdminUsername(req.user?.username)
		) {
			return res.status(403).json({ error: "Forbidden" });
		}

		const data = {};
		if (req.body.username) {
			data.username = req.body.username;
		}
		if (req.body.password) {
			data.password = await bcrypt.hash(req.body.password, 10);
		}

		await prisma.user.update({
			where: { id: req.params.id },
			data,
		});
		res.json({ message: "Profile updated" });
	} catch (error) {
		next(error);
	}
}

export async function updatePassword(req, res, next) {
	try {
		const { id } = req.params;
		const { password } = req.body;

		if (!password || password.length < 6) {
			return res.status(400).json({
				error: "Password must be at least 6 characters",
			});
		}

		// Merchant can only change their own password
		if (req.user.role === "merchant" && req.user.id !== id) {
			return res.status(403).json({
				error: "Forbidden",
			});
		}

		const bcrypt = await import("bcrypt");

		const hashedPassword = await bcrypt.hash(password, 10);

		await prisma.user.update({
			where: { id },
			data: {
				password: hashedPassword,
			},
		});

		res.json({
			message: "Password updated successfully",
		});
	} catch (error) {
		next(error);
	}
}

async function updateMerchant(req, res, next) {
	try {
		if (!req.params.id) {
			return res.status(400).json({ error: "Invalid user ID" });
		}
		const merchant = await prisma.user.findUnique({
			where: { id: req.params.id },
		});
		if (!merchant || merchant.role !== "MERCHANT") {
			return res.status(404).json({ message: "Merchant not found" });
		}

		const data = {};
		if (req.body.deliveryCharges != null) {
			let charges;
			try {
				charges = normalizeDeliveryCharges(req.body.deliveryCharges);
			} catch (error) {
				return res
					.status(400)
					.json({ error: "Invalid deliveryCharges JSON" });
			}
			data.deliveryCharges = {
				deleteMany: {},
				create: deliveryChargesRelationData(charges),
			};
		}

		const updatedMerchant = await prisma.user.update({
			where: { id: req.params.id },
			data,
			include: { deliveryCharges: true },
		});

		res.json({
			message: "Merchant updated successfully",
			merchant: serializeUser(updatedMerchant),
		});
	} catch (error) {
		next(error);
	}
}

async function updateDriver(req, res, next) {
	try {
		if (!req.params.id) {
			return res.status(400).json({ error: "Invalid user ID" });
		}
		const driver = await prisma.user.findUnique({
			where: { id: req.params.id },
		});
		if (!driver || driver.role !== "DRIVER") {
			return res.status(404).json({ message: "Driver not found" });
		}

		const data = {};
		if ("deliveryFee" in req.body) {
			const raw = req.body.deliveryFee;
			if (raw == null || raw === "") {
				data.deliveryFee = null;
			} else {
				const fee = Number(raw);
				if (!Number.isFinite(fee) || fee < 0) {
					return res.status(400).json({ error: "Invalid delivery fee" });
				}
				data.deliveryFee = fee;
			}
		}

		const updated = await prisma.user.update({
			where: { id: req.params.id },
			data,
		});

		res.json({
			message: "Driver updated successfully",
			driver: serializeUser(updated),
		});
	} catch (error) {
		next(error);
	}
}

export {
	addAdmin,
	addMerchant,
	addDriver,
	getUsers,
	getMerchants,
	getMerchantByUsername,
	deleteUser,
	getUser,
	updateUser,
	updateMerchant,
	updateDriver,
};

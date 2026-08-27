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
import {
	getPrepaidMerchantBalances,
	getMerchantPayments,
	getDriverOutstanding,
} from "../finance.controller.js";
import { formatUserDisplayName } from "../../utils/userDisplay.js";

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
			paymentDay,
			deliveryCharges,
		} = req.body;

		if (!username || !email || !password || !firstName || !phone) {
			return res.status(400).json({ error: "Missing required fields" });
		}
		const prismaAccountType = mapAccountTypeToPrisma(accountType);
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

// Money DriverCollection/MerchantPayment record actually changing hands, tied
// to the admin who ran the register — that attribution has to stay intact, so
// deleting an admin/driver who recorded one is blocked (real DB-level RESTRICT
// constraints on driverId/adminId). Everything else touching a user (finance
// transactions, audit log, expenses) is a nullable FK and clears itself
// automatically on delete — no need to block on those.
async function getHardDeleteBlockers(target) {
	const blockers = [];

	if (target.role === "DRIVER") {
		const driverCollections = await prisma.driverCollection.count({
			where: { driverId: target.id },
		});
		if (driverCollections > 0) {
			blockers.push(
				`${driverCollections} cash collection(s) recorded against them — reassign or clear these on the Finance page first`,
			);
		}
	}

	if (target.role === "ADMIN") {
		const [adminCollections, adminPayments] = await Promise.all([
			prisma.driverCollection.count({ where: { adminId: target.id } }),
			prisma.merchantPayment.count({ where: { adminId: target.id } }),
		]);
		if (adminCollections > 0) {
			blockers.push(`${adminCollections} driver collection(s) they recorded`);
		}
		if (adminPayments > 0) {
			blockers.push(`${adminPayments} merchant payment(s) they recorded`);
		}
		if (blockers.length > 0) {
			blockers.push(
				"— this financial history has to stay attributed to the admin who recorded it, so this account can't be deleted",
			);
		}
	}

	return blockers;
}

async function getMerchantBalanceInfo(target) {
	if (target.accountType === "PREPAID") {
		const [balance] = await getPrepaidMerchantBalances(target.username);
		return balance ? { balance: balance.balance, accountType: "prepaid" } : { balance: 0, accountType: "prepaid" };
	}
	const payments = await getMerchantPayments();
	const entry = payments.find((p) => p.merchantUsername === target.username);
	return { balance: entry ? entry.amount : 0, accountType: "postpaid" };
}

async function getDriverBalanceInfo(target) {
	const outstanding = await getDriverOutstanding();
	const entry = outstanding.find((d) => d.driverUsername === target.username);
	return { outstanding: entry ? entry.outstanding : 0 };
}

// GET /api/users/:id/delete-preview — lets the confirmation dialog show what
// deleting this account actually does (orders removed/unassigned, payments
// removed, money owed either way) before the admin commits to it.
async function getUserDeletePreview(req, res, next) {
	try {
		if (!req.params.id) {
			return res.status(400).json({ error: "Invalid user ID" });
		}
		const target = await prisma.user.findUnique({ where: { id: req.params.id } });
		if (!target) return res.status(404).json({ error: "User not found" });
		if (
			isSuperAdminUsername(target.username) &&
			!isSuperAdminUsername(req.user?.username)
		) {
			return res.status(403).json({ error: "Forbidden" });
		}

		const blockers = await getHardDeleteBlockers(target);
		const preview = {
			id: target.id,
			username: target.username,
			name: formatUserDisplayName(target),
			role: target.role.toLowerCase(),
			blockers,
			canDelete: blockers.length === 0,
		};

		if (target.role === "MERCHANT") {
			const [orderCount, paymentCount, balanceInfo] = await Promise.all([
				prisma.order.count({ where: { merchantId: target.id } }),
				prisma.merchantPayment.count({ where: { merchantId: target.id } }),
				getMerchantBalanceInfo(target),
			]);
			preview.ordersToDelete = orderCount;
			preview.paymentsToDelete = paymentCount;
			preview.balance = balanceInfo.balance;
			preview.accountType = balanceInfo.accountType;
		} else if (target.role === "DRIVER") {
			const [orderCount, balanceInfo] = await Promise.all([
				prisma.order.count({ where: { driverId: target.id } }),
				getDriverBalanceInfo(target),
			]);
			preview.ordersToUnassign = orderCount;
			preview.outstanding = balanceInfo.outstanding;
		}

		res.json(preview);
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
		if (target.id === req.user?.id) {
			return res.status(400).json({ error: "You cannot delete your own account" });
		}
		if (
			isSuperAdminUsername(target.username) &&
			!isSuperAdminUsername(req.user?.username)
		) {
			return res.status(403).json({ error: "Forbidden" });
		}

		const blockers = await getHardDeleteBlockers(target);
		if (blockers.length > 0) {
			return res.status(409).json({
				error: `Cannot delete this user — they have existing records: ${blockers.join(", ")}.`,
			});
		}

		const operations = [];

		if (target.role === "MERCHANT") {
			// Deleting a merchant wipes their order history and any recorded
			// payouts along with the account, per the admin's request — none of
			// it is meaningful once the merchant itself is gone.
			const orders = await prisma.order.findMany({
				where: { merchantId: target.id },
				select: { id: true },
			});
			const orderIds = orders.map((o) => o.id);

			operations.push(
				prisma.paymentOrder.deleteMany({ where: { orderId: { in: orderIds } } }),
				prisma.collectionOrder.deleteMany({ where: { orderId: { in: orderIds } } }),
				prisma.orderHistory.deleteMany({ where: { orderId: { in: orderIds } } }),
				prisma.order.deleteMany({ where: { id: { in: orderIds } } }),
				prisma.paymentOrder.deleteMany({ where: { payment: { merchantId: target.id } } }),
				prisma.merchantPayment.deleteMany({ where: { merchantId: target.id } }),
			);
		}
		// Drivers: their assigned orders are unassigned (driverId set to null)
		// automatically by the database when the account is deleted below —
		// nothing to do here explicitly.

		// DeliveryCharge rows are just a merchant's per-region pricing config,
		// not financial history — safe to clean up along with the account.
		operations.push(
			prisma.deliveryCharge.deleteMany({ where: { userId: target.id } }),
			prisma.user.delete({ where: { id: target.id } }),
		);

		await prisma.$transaction(operations);

		await prisma.financeAudit.create({
			data: {
				user: req.user?.id ? { connect: { id: req.user.id } } : undefined,
				action: "User Deleted",
				description: `Deleted ${target.role.toLowerCase()} "${target.username}" (${formatUserDisplayName(target)})`,
				ip: req.ip || "",
			},
		});

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
		if (req.body.email != null) {
			data.email = req.body.email || null;
		}
		if (req.body.firstName) {
			data.firstName = req.body.firstName;
		}
		if (req.body.lastName) {
			data.lastName = req.body.lastName;
		}
		if (req.body.phone != null) {
			data.phone = req.body.phone;
		}
		if (req.body.password) {
			data.password = await bcrypt.hash(req.body.password, 10);
		}

		const updated = await prisma.user.update({
			where: { id: req.params.id },
			data,
			include: { deliveryCharges: true },
		});
		res.json({ message: "Profile updated", user: serializeUser(updated) });
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

		if (req.body.accountType != null) {
			const prismaAccountType = mapAccountTypeToPrisma(req.body.accountType);
			if (!prismaAccountType) {
				return res.status(400).json({ error: "Invalid account type" });
			}
			data.accountType = prismaAccountType;

			if (prismaAccountType === "PREPAID") {
				// Prepaid merchants are paid by advance against a running
				// balance — no per-account rate to configure.
				data.paymentDay = null;
			} else if (prismaAccountType === "POSTPAID") {
				const paymentDay = req.body.paymentDay;
				if (paymentDay == null || paymentDay === "") {
					return res.status(400).json({
						error: "Payment day is required for postpaid accounts",
					});
				}
				data.paymentDay = paymentDay;
			}
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
	getUserDeletePreview,
	getUser,
	updateUser,
	updateMerchant,
	updateDriver,
};

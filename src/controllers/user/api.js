import bcrypt from "bcrypt";

import prisma from "../../config/prisma.js";
import { mapAccountTypeToPrisma } from "../../utils/roleMapper.js";
import {
	isSuperAdminUsername,
	serializeUser,
	serializeUsers,
	normalizeDeliveryCharges,
	deliveryChargesRelationData,
	normalizeOrderIdPrefix,
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
			orderIdPrefix,
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
				orderIdPrefix: normalizeOrderIdPrefix(orderIdPrefix) || null,
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
// to the driver/admin who handled it — that attribution has to stay intact, so
// deleting a driver/admin who has one is blocked (real DB-level RESTRICT
// constraints on driverId/adminId). Everything else touching a user (finance
// transactions, audit log, expenses) is a nullable FK and clears itself
// automatically on delete — no need to block on those.
//
// Single source of truth for each blocker "type": how to count it, who a
// replacement has to be, and how to reassign/clear it — shared by the
// delete-preview, reassign, and clear endpoints below.
const BLOCKER_DEFS = {
	driverCollectionsAsDriver: {
		appliesToRole: "DRIVER",
		label: (n) => `${n} cash collection(s) recorded against them as the driver`,
		count: (id) => prisma.driverCollection.count({ where: { driverId: id } }),
		reassignRole: "DRIVER",
		reassign: (id, toUserId) =>
			prisma.driverCollection.updateMany({ where: { driverId: id }, data: { driverId: toUserId } }),
		clear: async (id) => {
			const ids = (await prisma.driverCollection.findMany({ where: { driverId: id }, select: { id: true } })).map((c) => c.id);
			await prisma.collectionOrder.deleteMany({ where: { collectionId: { in: ids } } });
			await prisma.driverCollection.deleteMany({ where: { id: { in: ids } } });
		},
	},
	driverCollectionsAsAdmin: {
		appliesToRole: "ADMIN",
		label: (n) => `${n} driver collection(s) they recorded as the admin`,
		count: (id) => prisma.driverCollection.count({ where: { adminId: id } }),
		reassignRole: "ADMIN",
		reassign: (id, toUserId) =>
			prisma.driverCollection.updateMany({ where: { adminId: id }, data: { adminId: toUserId } }),
		clear: async (id) => {
			const ids = (await prisma.driverCollection.findMany({ where: { adminId: id }, select: { id: true } })).map((c) => c.id);
			await prisma.collectionOrder.deleteMany({ where: { collectionId: { in: ids } } });
			await prisma.driverCollection.deleteMany({ where: { id: { in: ids } } });
		},
	},
	merchantPaymentsAsAdmin: {
		appliesToRole: "ADMIN",
		label: (n) => `${n} merchant payment(s) they recorded as the admin`,
		count: (id) => prisma.merchantPayment.count({ where: { adminId: id } }),
		reassignRole: "ADMIN",
		reassign: (id, toUserId) =>
			prisma.merchantPayment.updateMany({ where: { adminId: id }, data: { adminId: toUserId } }),
		clear: async (id) => {
			const ids = (await prisma.merchantPayment.findMany({ where: { adminId: id }, select: { id: true } })).map((p) => p.id);
			await prisma.paymentOrder.deleteMany({ where: { paymentId: { in: ids } } });
			await prisma.merchantPayment.deleteMany({ where: { id: { in: ids } } });
		},
	},
};

async function getHardDeleteBlockers(target) {
	const defs = Object.entries(BLOCKER_DEFS).filter(([, def]) => def.appliesToRole === target.role);
	const counts = await Promise.all(defs.map(([, def]) => def.count(target.id)));

	return defs
		.map(([type, def], i) => ({ type, count: counts[i], label: def.label(counts[i]) }))
		.filter((b) => b.count > 0);
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

// POST /api/users/:id/blockers/reassign — Body: { type, toUserId }
// Moves every blocking record of the given type from :id onto another user
// of the appropriate role, preserving the financial history intact (just
// re-attributed) so the original account can then be deleted.
async function reassignUserBlockers(req, res, next) {
	try {
		const { type, toUserId } = req.body;
		const def = BLOCKER_DEFS[type];
		if (!def) return res.status(400).json({ error: "Invalid blocker type" });
		if (!toUserId) return res.status(400).json({ error: "toUserId is required" });
		if (toUserId === req.params.id) {
			return res.status(400).json({ error: "Choose a different user to reassign to" });
		}

		const target = await prisma.user.findUnique({ where: { id: req.params.id } });
		if (!target) return res.status(404).json({ error: "User not found" });
		if (def.appliesToRole !== target.role) {
			return res.status(400).json({ error: "This blocker type doesn't apply to this user" });
		}

		const toUser = await prisma.user.findUnique({ where: { id: toUserId } });
		if (!toUser || toUser.role !== def.reassignRole) {
			return res.status(400).json({
				error: `Choose a valid ${def.reassignRole.toLowerCase()} to reassign these records to`,
			});
		}

		const { count } = await def.reassign(target.id, toUserId);

		await prisma.financeAudit.create({
			data: {
				user: req.user?.id ? { connect: { id: req.user.id } } : undefined,
				action: "Records Reassigned",
				description: `Reassigned ${count} record(s) (${type}) from ${target.username} to ${toUser.username}`,
				ip: req.ip || "",
			},
		});

		res.json({ message: `Reassigned ${count} record(s)`, count });
	} catch (error) {
		next(error);
	}
}

// POST /api/users/:id/blockers/clear — Body: { type }
// Permanently deletes every blocking record of the given type for :id. The
// underlying orders/cash-in-hand ledger are untouched — only the collection
// or payment "batch" record itself (and its order links) is removed, so this
// is meant for erroneous/duplicate records, not routine cleanup.
async function clearUserBlockers(req, res, next) {
	try {
		const { type } = req.body;
		const def = BLOCKER_DEFS[type];
		if (!def) return res.status(400).json({ error: "Invalid blocker type" });

		const target = await prisma.user.findUnique({ where: { id: req.params.id } });
		if (!target) return res.status(404).json({ error: "User not found" });
		if (def.appliesToRole !== target.role) {
			return res.status(400).json({ error: "This blocker type doesn't apply to this user" });
		}

		const count = await def.count(target.id);
		await def.clear(target.id);

		await prisma.financeAudit.create({
			data: {
				user: req.user?.id ? { connect: { id: req.user.id } } : undefined,
				action: "Records Cleared",
				description: `Permanently deleted ${count} record(s) (${type}) for ${target.username}`,
				ip: req.ip || "",
			},
		});

		res.json({ message: `Deleted ${count} record(s)`, count });
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
				error: `Cannot delete this user — they have existing records: ${blockers.map((b) => b.label).join(", ")}.`,
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

		if ("orderIdPrefix" in req.body) {
			data.orderIdPrefix = normalizeOrderIdPrefix(req.body.orderIdPrefix) ?? null;
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
	reassignUserBlockers,
	clearUserBlockers,
	getUser,
	updateUser,
	updateMerchant,
	updateDriver,
};

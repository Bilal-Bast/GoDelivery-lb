import bcrypt from "bcrypt";

import User from "../models/user.model.js";
import { safeRedirect } from "../utils/urlSafeRedirect.js";
import { validateMongoId } from "../utils/queryValidator.js";

const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME;

function isSuperAdminUsername(username) {
	return Boolean(SUPER_ADMIN_USERNAME && username === SUPER_ADMIN_USERNAME);
}

async function addAdmin(req, res, next) {
	try {
		const { username, email, password, firstName, lastName, phone } = req.body;

		if (!username || !email || !password || !firstName || !phone) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		const existing = await User.findOne({
			$or: [{ username }, { email }],
		});
		if (existing)
			return res
				.status(400)
				.json({ error: "Username or email already exists" });

		const hashed = await bcrypt.hash(password, 10);
		const user = new User({
			username,
			email,
			password: hashed,
			role: "admin",
			firstName,
			lastName,
			phone,
		});
		await user.save();

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
		if (
			accountType === "prepaid" &&
			(cashPercentage == null ||
				cashPercentage < 0 ||
				cashPercentage > 100)
		) {
			return res.status(400).json({ error: "Invalid cash percentage" });
		}
		if (accountType === "postpaid" && !paymentDay) {
			return res.status(400).json({
				error: "Payment day is required for postpaid accounts",
			});
		}

		const existing = await User.findOne({
			$or: [{ username }, { email }],
		});
		if (existing)
			return res
				.status(400)
				.json({ error: "Username or email already exists" });

		const hashed = await bcrypt.hash(password, 10);
		const user = new User({
			username,
			email,
			password: hashed,
			role: "merchant",
			firstName,
			lastName,
			phone,
			accountType,
			cashPercentage:
				accountType === "prepaid" ? Number(cashPercentage) : null,
			paymentDay: accountType === "postpaid" ? paymentDay : null,
			deliveryCharges: deliveryCharges || {},
		});

		await user.save();
		res.status(201).json({
			message: `Merchant "${username}" created successfully`,
		});
	} catch (error) {
		next(error);
	}
}

async function addDriver(req, res, next) {
	try {
		const { username, email, password, firstName, lastName, phone } = req.body;

		if (!username || !email || !password || !firstName || !phone) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		const existing = await User.findOne({
			$or: [{ username }, { email }],
		});
		if (existing)
			return res
				.status(400)
				.json({ error: "Username or email already exists" });

		const hashed = await bcrypt.hash(password, 10);
		const user = new User({
			username,
			email,
			password: hashed,
			role: "driver",
			firstName,
			lastName,
			phone,
		});
		await user.save();

		res.status(201).json({
			message: `Driver "${username}" created successfully`,
		});
	} catch (error) {
		next(error);
	}
}

async function getUsers(req, res, next) {
	try {
		let users = await User.find().select("-password");
		if (!isSuperAdminUsername(req.user?.username)) {
			users = users.filter((u) => !isSuperAdminUsername(u.username));
		}
		res.json(users);
	} catch (error) {
		next(error);
	}
}

async function getMerchants(req, res, next) {
	try {
		const query = { role: "merchant" };
		if (req.query.username) {
			query.username = req.query.username;
		}
		const merchants = await User.find(query).select("-password");
		res.json(merchants);
	} catch (error) {
		next(error);
	}
}

async function getMerchantByUsername(req, res, next) {
	try {
		const merchant = await User.findOne({
			username: req.params.username,
			role: "merchant",
		}).select("-password");
		if (!merchant)
			return res.status(404).json({ error: "Merchant not found" });
		res.json(merchant);
	} catch (error) {
		next(error);
	}
}

async function deleteUser(req, res, next) {
	try {
		// Validate MongoDB ID format
		if (!validateMongoId(req.params.id)) {
			return res.status(400).json({ error: "Invalid user ID" });
		}
		const target = await User.findById(req.params.id);
		if (!target) return res.status(404).json({ error: "User not found" });
		if (
			isSuperAdminUsername(target.username) &&
			!isSuperAdminUsername(req.user?.username)
		) {
			return res.status(403).json({ error: "Forbidden" });
		}

		await target.deleteOne();
		res.json({ message: "User deleted" });
	} catch (error) {
		next(error);
	}
}

async function getUser(req, res, next) {
	try {
		// Validate MongoDB ID format
		if (!validateMongoId(req.params.id)) {
			return res.status(400).json({ error: "Invalid user ID" });
		}
		const user = await User.findById(req.params.id).select("-password");
		if (!user) return res.status(404).json({ error: "User not found" });
		if (
			isSuperAdminUsername(user.username) &&
			!isSuperAdminUsername(req.user?.username)
		) {
			return res.status(403).json({ error: "Forbidden" });
		}
		res.json(user);
	} catch (error) {
		next(error);
	}
}

async function updateUser(req, res, next) {
	try {
		// Validate MongoDB ID format
		if (!validateMongoId(req.params.id)) {
			return res.status(400).json({ error: "Invalid user ID" });
		}
		const user = await User.findById(req.params.id);
		if (!user) return res.status(404).json({ error: "User not found" });
		if (
			isSuperAdminUsername(user.username) &&
			!isSuperAdminUsername(req.user?.username)
		) {
			return res.status(403).json({ error: "Forbidden" });
		}

		user.username = req.body.username || user.username;

		if (req.body.password) {
			user.password = await bcrypt.hash(req.body.password, 10);
		}

		await user.save();
		res.json({ message: "Profile updated" });
	} catch (error) {
		next(error);
	}
}

async function updateMerchant(req, res, next) {
	try {
		// Validate MongoDB ID format
		if (!validateMongoId(req.params.id)) {
			return res.status(400).json({ error: "Invalid user ID" });
		}
		const merchant = await User.findById(req.params.id);
		if (!merchant || merchant.role !== "merchant") {
			return res.status(404).json({ message: "Merchant not found" });
		}

		if (req.body.deliveryCharges) {
			merchant.deliveryCharges = req.body.deliveryCharges;
		}

		await merchant.save();
		res.json({ message: "Merchant updated successfully", merchant });
	} catch (error) {
		next(error);
	}
}

async function updateMerchantSSR(req, res, next) {
	try {
		const merchantId = req.body.merchantId || req.body.id;
		if (!merchantId)
			return res.redirect("/settings?error=Missing+merchant+id");

		const merchant = await User.findById(merchantId);
		if (!merchant || merchant.role !== "merchant")
			return res.redirect("/settings?error=Merchant+not+found");

		let deliveryCharges =
			req.body.deliveryCharges || req.body.deliveryChargesJson;
		if (typeof deliveryCharges === "string") {
			try {
				deliveryCharges = JSON.parse(deliveryCharges);
			} catch (e) {
				console.error("Invalid deliveryCharges JSON", e);
				return res.redirect("/settings?error=Invalid+delivery+charges");
			}
		}

		merchant.deliveryCharges = deliveryCharges || {};
		await merchant.save();
		return res.redirect("/settings?success=1");
	} catch (err) {
		console.error("updateMerchantSSR error:", err);
		return res.redirect("/settings?error=Failed+to+update+merchant");
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
};

// SSR wrappers for creating users via server-rendered forms
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

		const existing = await User.findOne({ username });
		if (existing) return res.redirect("/settings?error=Username+exists");

		const hashed = await bcrypt.hash(password, 10);
		const user = new User({
			username,
			email,
			password: hashed,
			role: "admin",
			firstName,
			lastName,
			phone,
		});
		await user.save();
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
		const existing = await User.findOne({ username });
		if (existing) return res.redirect("/settings?error=Username+exists");

		const hashed = await bcrypt.hash(password, 10);
		const user = new User({
			username,
			email,
			password: hashed,
			role: "driver",
			firstName,
			lastName,
			phone,
		});
		await user.save();
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
		if (
			accountType === "prepaid" &&
			(cashPercentage == null ||
				cashPercentage < 0 ||
				cashPercentage > 100)
		) {
			return res.redirect("/settings?error=Invalid+cash+percentage");
		}
		if (accountType === "postpaid" && !paymentDay) {
			return res.redirect("/settings?error=Payment+day+required");
		}

		const existing = await User.findOne({ username });
		if (existing) return res.redirect("/settings?error=Username+exists");

		const hashed = await bcrypt.hash(password, 10);
		const user = new User({
			username,
			email,
			password: hashed,
			role: "merchant",
			firstName,
			lastName,
			phone,
			accountType,
			cashPercentage:
				accountType === "prepaid" ? Number(cashPercentage) : null,
			paymentDay: accountType === "postpaid" ? paymentDay : null,
			deliveryCharges: deliveryCharges || {},
		});
		await user.save();
		return res.redirect("/settings?success=1");
	} catch (err) {
		console.error("addMerchantSSR error:", err);
		return res.redirect("/settings?error=Failed+to+create+merchant");
	}
}

export { addAdminSSR, addDriverSSR, addMerchantSSR };

// SSR delete wrapper used by POST /users/delete
async function deleteUserSSR(req, res, next) {
	try {
		const id = req.body.id || req.body.userId;
		if (!id) return res.redirect(safeRedirect("/users", { error: "Missing user id" }));

		const target = await User.findById(id);
		if (!target) return res.redirect(safeRedirect("/users", { error: "User not found" }));
		if (
			isSuperAdminUsername(target.username) &&
			!isSuperAdminUsername(req.user?.username)
		) {
			return res.redirect(safeRedirect("/users", { error: "Forbidden" }));
		}

		await target.deleteOne();
		return res.redirect(safeRedirect("/users", { success: "1" }));
	} catch (error) {
		console.error("deleteUserSSR error:", error);
		return res.redirect(safeRedirect("/users", { error: "Failed to delete user" }));
	}
}

export { deleteUserSSR, updateMerchantSSR };

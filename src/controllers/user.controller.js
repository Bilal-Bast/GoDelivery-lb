import bcrypt from "bcrypt";

import User from "../models/user.model.js";

async function addAdmin(req, res) {
	try {
		const { username, password, firstName, lastName, phone } = req.body;

		if (!username || !password || !firstName || !phone) {
			return res.status(400).json({ error: "Missing required fields" });
		}
		if (password.length < 6) {
			return res
				.status(400)
				.json({ error: "Password must be at least 6 characters" });
		}

		const existing = await User.findOne({ username });
		if (existing)
			return res.status(400).json({ error: "Username already exists" });

		const hashed = await bcrypt.hash(password, 10);
		const user = new User({
			username,
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
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
}

async function addMerchant(req, res) {
	try {
		const {
			username,
			password,
			firstName,
			lastName,
			phone,
			accountType,
			cashPercentage,
			paymentDay,
			deliveryCharges,
		} = req.body;

		if (!username || !password || !firstName || !phone) {
			return res.status(400).json({ error: "Missing required fields" });
		}
		if (password.length < 6) {
			return res
				.status(400)
				.json({ error: "Password must be at least 6 characters" });
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

		const existing = await User.findOne({ username });
		if (existing)
			return res.status(400).json({ error: "Username already exists" });

		const hashed = await bcrypt.hash(password, 10);
		const user = new User({
			username,
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
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
}

async function addDriver(req, res) {
	try {
		const { username, password, firstName, lastName, phone } = req.body;

		if (!username || !password || !firstName || !phone) {
			return res.status(400).json({ error: "Missing required fields" });
		}
		if (password.length < 6) {
			return res
				.status(400)
				.json({ error: "Password must be at least 6 characters" });
		}

		const existing = await User.findOne({ username });
		if (existing)
			return res.status(400).json({ error: "Username already exists" });

		const hashed = await bcrypt.hash(password, 10);
		const user = new User({
			username,
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
		console.error(error);
		res.status(500).json({ error: "Server error" });
	}
}

async function getUsers(req, res) {
	try {
		const users = await User.find().select("-password");
		res.json(users);
	} catch (error) {
		res.status(500).json({ error: "Server error" });
	}
}

async function getMerchants(req, res) {
	try {
		const query = { role: "merchant" };
		if (req.query.username) {
			query.username = req.query.username;
		}
		const merchants = await User.find(query).select("-password");
		res.json(merchants);
	} catch (error) {
		res.status(500).json({ error: "Server error" });
	}
}

async function getMerchantByUsername(req, res) {
	try {
		const merchant = await User.findOne({
			username: req.params.username,
			role: "merchant",
		}).select("-password");
		if (!merchant) return res.status(404).json({ error: "Merchant not found" });
		res.json(merchant);
	} catch (error) {
		res.status(500).json({ error: "Server error" });
	}
}

async function deleteUser(req, res) {
	try {
		const deleted = await User.findByIdAndDelete(req.params.id);
		if (!deleted) return res.status(404).json({ error: "User not found" });
		res.json({ message: "User deleted" });
	} catch (error) {
		res.status(500).json({ error: "Server error" });
	}
}

async function getUser(req, res) {
	try {
		const user = await User.findById(req.params.id).select("-password");
		if (!user) return res.status(404).json({ error: "User not found" });
		res.json(user);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

async function updateUser(req, res) {
	try {
		const user = await User.findById(req.params.id);
		if (!user) return res.status(404).json({ error: "User not found" });

		user.username = req.body.username || user.username;

		if (req.body.password) {
			user.password = await bcrypt.hash(req.body.password, 10);
		}

		await user.save();
		res.json({ message: "Profile updated" });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
}

async function updateMerchant(req, res) {
	try {
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
		res.status(500).json({ message: error.message });
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

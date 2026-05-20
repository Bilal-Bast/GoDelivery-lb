import bcrypt from "bcrypt";

import User from "../models/user.model.js";

const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME;
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
const SUPER_ADMIN_FIRST_NAME = process.env.SUPER_ADMIN_FIRST_NAME || "";
const SUPER_ADMIN_LAST_NAME = process.env.SUPER_ADMIN_LAST_NAME || "";
const SUPER_ADMIN_PHONE = process.env.SUPER_ADMIN_PHONE || "";

export default async function seedSuperAdmin() {
	if (!SUPER_ADMIN_USERNAME || !SUPER_ADMIN_PASSWORD) {
		console.warn(
			"SUPER_ADMIN_USERNAME or SUPER_ADMIN_PASSWORD not set — skipping super admin seed",
		);
		return;
	}

	const existing = await User.findOne({ username: SUPER_ADMIN_USERNAME });
	if (existing) {
		if (existing.role !== "admin") {
			console.warn(
				"Super admin username exists but role is not admin. Update it manually if needed.",
			);
		}
		return;
	}

	const hashed = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
	const user = new User({
		username: SUPER_ADMIN_USERNAME,
		password: hashed,
		role: "admin",
		firstName: SUPER_ADMIN_FIRST_NAME,
		lastName: SUPER_ADMIN_LAST_NAME,
		phone: SUPER_ADMIN_PHONE,
	});

	await user.save();
	console.log(`Super admin "${SUPER_ADMIN_USERNAME}" seeded successfully`);
}

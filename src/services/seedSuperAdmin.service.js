import bcrypt from "bcrypt";

import prisma from "../config/prisma.js";

const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME;
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;
const SUPER_ADMIN_FIRST_NAME = process.env.SUPER_ADMIN_FIRST_NAME || "";
const SUPER_ADMIN_LAST_NAME = process.env.SUPER_ADMIN_LAST_NAME || "";
const SUPER_ADMIN_PHONE = process.env.SUPER_ADMIN_PHONE || "";

export default async function seedSuperAdmin() {
	if (!SUPER_ADMIN_USERNAME || !SUPER_ADMIN_PASSWORD || !SUPER_ADMIN_EMAIL) {
		console.warn(
			"SUPER_ADMIN_USERNAME, SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD not set — skipping super admin seed",
		);
		return;
	}

	const existing = await prisma.user.findUnique({
		where: {
			username: SUPER_ADMIN_USERNAME,
		},
	});

	if (existing) {
		if (existing.role !== "ADMIN") {
			console.warn(
				"Super admin username exists but role is not ADMIN. Update it manually if needed.",
			);
		}
		return;
	}

	const hashed = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

	await prisma.user.create({
		data: {
			username: SUPER_ADMIN_USERNAME,
			email: SUPER_ADMIN_EMAIL,
			password: hashed,
			role: "ADMIN",
			firstName: SUPER_ADMIN_FIRST_NAME,
			lastName: SUPER_ADMIN_LAST_NAME,
			phone: SUPER_ADMIN_PHONE,
		},
	});

	console.log(`Super admin "${SUPER_ADMIN_USERNAME}" seeded successfully`);
}
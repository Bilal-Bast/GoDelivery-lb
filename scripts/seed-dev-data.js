import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../src/config/prisma.js";

const expectedDatabase = "godelivery-dev";
const allowedHosts = new Set(["localhost", "127.0.0.1", "::1"]);
const password = process.env.DEV_SEED_PASSWORD;

function assertDevelopmentDatabase() {
	if (process.env.NODE_ENV === "production") {
		throw new Error("Refusing to seed while NODE_ENV=production.");
	}

	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL is required.");
	}

	const databaseUrl = new URL(process.env.DATABASE_URL);
	const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\/+/, ""));
	if (
		!new Set(["postgres:", "postgresql:"]).has(databaseUrl.protocol) ||
		!allowedHosts.has(databaseUrl.hostname) ||
		databaseName !== expectedDatabase
	) {
		throw new Error(
			`Refusing to seed: expected local database ${expectedDatabase}; received ${databaseUrl.hostname}/${databaseName}.`,
		);
	}

	if (!password || password.length < 12) {
		throw new Error("Set DEV_SEED_PASSWORD to a password of at least 12 characters.");
	}
}

const merchants = [
	{
		username: "dev-merchant-cedar",
		email: "cedar@example.test",
		firstName: "Layla",
		lastName: "Haddad",
		phone: "+961705550101",
		accountType: "PREPAID",
		paymentDay: null,
		orderIdPrefix: "CED",
		charges: [
			{ region: "Beirut", price: 3 },
			{ region: "Mount Lebanon - Baabda", price: 4 },
		],
	},
	{
		username: "dev-merchant-olive",
		email: "olive@example.test",
		firstName: "Nour",
		lastName: "Khoury",
		phone: "+961705550102",
		accountType: "POSTPAID",
		paymentDay: "Friday",
		orderIdPrefix: "OLV",
		charges: [
			{ region: "Beirut", price: 3.5 },
			{ region: "Mount Lebanon - Aley", price: 4.5 },
		],
	},
	{
		username: "dev-merchant-urban",
		email: "urban@example.test",
		firstName: "Rami",
		lastName: "Saad",
		phone: "+961705550103",
		accountType: "POSTPAID",
		paymentDay: "Monday",
		orderIdPrefix: "URB",
		charges: [
			{ region: "Beirut", price: 3 },
			{ region: "Mount Lebanon - Baabda", price: 4 },
		],
	},
];

const drivers = [
	{
		username: "dev-driver-karim",
		email: "karim.driver@example.test",
		firstName: "Karim",
		lastName: "Mansour",
		phone: "+961705550201",
		deliveryFee: 1.5,
	},
	{
		username: "dev-driver-lina",
		email: "lina.driver@example.test",
		firstName: "Lina",
		lastName: "Nasser",
		phone: "+961705550202",
		deliveryFee: 1.75,
	},
	{
		username: "dev-driver-omar",
		email: "omar.driver@example.test",
		firstName: "Omar",
		lastName: "Saleh",
		phone: "+961705550203",
		deliveryFee: 2,
	},
];

const orderTemplates = [
	{ merchant: 0, driver: null, status: "WAREHOUSE", customer: ["Maya", "Khalil"], district: "Beirut", city: "Beirut", total: 24, delivery: 3 },
	{ merchant: 0, driver: 0, status: "NEW", customer: ["Tarek", "Nader"], district: "Beirut", city: "Ras Beirut", total: 36, delivery: 3, express: true, note: "Call on arrival" },
	{ merchant: 0, driver: 0, status: "Picked_up", customer: ["Jana", "Fares"], district: "Mount Lebanon - Baabda", city: "Baabda", total: 18, delivery: 4 },
	{ merchant: 1, driver: 1, status: "DELIVERED", customer: ["Samer", "Aoun"], district: "Beirut", city: "El Hamra", total: 42, delivery: 3.5 },
	{ merchant: 1, driver: null, status: "Canceled", customer: ["Dalia", "Rizk"], district: "Beirut", city: "Beirut", total: 29, delivery: 3.5, cancelledBy: "customer" },
	{ merchant: 1, driver: 1, status: "Paid", customer: ["Hadi", "Matar"], district: "Mount Lebanon - Aley", city: "Aley", total: 55, delivery: 4.5 },
	{ merchant: 1, driver: 2, status: "COLLECTED", customer: ["Rana", "Younes"], district: "Beirut", city: "Ras Beirut", total: 31, delivery: 3.5 },
	{ merchant: 2, driver: 1, status: "NEW", customer: ["Jad", "Boulos"], district: "Mount Lebanon - Baabda", city: "Baabda", total: 21, delivery: 4 },
	{ merchant: 2, driver: 2, status: "Picked_up", customer: ["Mira", "Elias"], district: "Beirut", city: "Beirut", total: 64, delivery: 3 },
	{ merchant: 2, driver: 2, status: "DELIVERED", customer: ["Fadi", "Hanna"], district: "Mount Lebanon - Baabda", city: "Baabda", total: 33, delivery: 4, express: true, note: "Fragile package" },
	{ merchant: 2, driver: null, status: "WAREHOUSE", customer: ["Tala", "Azar"], district: "Beirut", city: "Beirut", total: 17, delivery: 3 },
	{ merchant: 0, driver: 0, status: "DELIVERED", customer: ["Nabil", "Farah"], district: "Beirut", city: "Ras Beirut", total: 48, delivery: 3 },
];

async function ensureUser(data, role, hashedPassword) {
	const existing = await prisma.user.findUnique({ where: { username: data.username } });
	if (existing) {
		if (existing.role !== role) {
			throw new Error(`Seed username ${data.username} already exists with a different role.`);
		}
		return existing;
	}

	const { charges, ...userData } = data;
	return prisma.user.create({
		data: {
			...userData,
			password: hashedPassword,
			role,
			language: "en",
			...(role === "MERCHANT" && {
				deliveryCharges: { create: charges },
			}),
		},
	});
}

async function seed() {
	assertDevelopmentDatabase();
	const hashedPassword = await bcrypt.hash(password, 10);
	const merchantUsers = [];
	const driverUsers = [];

	for (const merchant of merchants) {
		merchantUsers.push(await ensureUser(merchant, "MERCHANT", hashedPassword));
	}
	for (const driver of drivers) {
		driverUsers.push(await ensureUser(driver, "DRIVER", hashedPassword));
	}

	let ordersCreated = 0;
	const now = Date.now();
	for (let index = 0; index < orderTemplates.length; index++) {
		const orderId = `DEV-2026-${String(index + 1).padStart(3, "0")}`;
		if (await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } })) {
			continue;
		}

		const template = orderTemplates[index];
		const merchant = merchantUsers[template.merchant];
		const driver = template.driver == null ? null : driverUsers[template.driver];
		const createdAt = new Date(now - index * 8 * 60 * 60 * 1000);
		const customerPhone = `+961705551${String(index + 1).padStart(3, "0")}`;
		const statusNumber = ["WAREHOUSE", "NEW", "Picked_up", "DELIVERED", "Canceled", "Paid", "COLLECTED"].indexOf(template.status);
		const newValue = {
			id: orderId,
			m: merchant.username,
			driver: driver?.username || null,
			c: { f: template.customer[0], l: template.customer[1], p: customerPhone, loc: { d: template.district, cty: template.city } },
			pr: { t: template.total, d: template.delivery },
			s: statusNumber,
			e: Boolean(template.express),
			eN: template.note || "",
		};

		await prisma.order.create({
			data: {
				id: orderId,
				merchantId: merchant.id,
				driverId: driver?.id || null,
				customerFirstName: template.customer[0],
				customerLastName: template.customer[1],
				customerPhone,
				district: template.district,
				city: template.city,
				total: template.total,
				deliveryCharge: template.delivery,
				createdBy: "admin",
				status: template.status,
				statusUpdatedAt: createdAt,
				isExpress: Boolean(template.express),
				expressNote: template.note || "",
				cancelledBy: template.cancelledBy || null,
				createdAt,
				updatedAt: createdAt,
				histories: {
					create: [{
						actionType: "creation",
						newValue,
						performedBy: "admin",
						metadata: { message: "Development seed order" },
						createdAt,
					}],
				},
			},
		});
		ordersCreated++;
	}

	const [availableMerchants, availableDrivers, availableOrders] = await Promise.all([
		prisma.user.count({ where: { username: { in: merchants.map(({ username }) => username) }, role: "MERCHANT" } }),
		prisma.user.count({ where: { username: { in: drivers.map(({ username }) => username) }, role: "DRIVER" } }),
		prisma.order.count({ where: { id: { in: orderTemplates.map((_, index) => `DEV-2026-${String(index + 1).padStart(3, "0")}`) } } }),
	]);
	console.log(`Local ${expectedDatabase} now has ${availableMerchants} seed merchants, ${availableDrivers} seed drivers, and ${availableOrders} seed orders (${ordersCreated} new orders this run).`);
	console.log(`All seeded account usernames use the password supplied in DEV_SEED_PASSWORD.`);
}

seed()
	.catch((error) => {
		console.error("Development seed failed:", error.message);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});

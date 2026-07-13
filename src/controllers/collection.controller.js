import prisma from "../config/prisma.js";

function formatUserDisplayName(user) {
	if (!user) return null;
	const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
	return name || user.username;
}

async function getCollections(req, res, next) {
	try {
		const collections = await prisma.driverCollection.findMany({
			orderBy: { number: "desc" },
			include: {
				driver: { select: { username: true, firstName: true, lastName: true } },
				admin: { select: { username: true } },
				orders: {
					select: { order: { select: { id: true } } },
				},
			},
		});

		res.json(
			collections.map((collection) => ({
				id: collection.id,
				number: collection.number,
				driverUsername: collection.driver.username,
				driverName: formatUserDisplayName(collection.driver),
				adminUsername: collection.admin.username,
				amount: collection.amount,
				orderIds: collection.orders.map((co) => co.order.id),
				createdAt: collection.createdAt,
			})),
		);
	} catch (error) {
		next(error);
	}
}

async function createCollection(req, res, next) {
	try {
		const { driverUsername, amount, orderIds } = req.body;

		const parsedAmount = amount == null || amount === "" ? null : Number(amount);
		if (!driverUsername || parsedAmount == null || !orderIds || !orderIds.length) {
			return res
				.status(400)
				.json({ error: "Driver, amount, and orderIds are required" });
		}
		if (!Number.isFinite(parsedAmount)) {
			return res
				.status(400)
				.json({ error: "Amount must be a valid number" });
		}

		const driver = await prisma.user.findFirst({
			where: { username: driverUsername, role: "DRIVER" },
			select: { username: true, firstName: true, lastName: true },
		});
		const driverName = driver ? formatUserDisplayName(driver) : driverUsername;

		const adminUsername = req.user.username;

		const existing = await prisma.driverCollection.findFirst({
			where: {
				orders: { some: { orderId: { in: orderIds } } },
			},
		});
		if (existing) {
			return res
				.status(400)
				.json({ error: "Some orders already collected" });
		}

		const last = await prisma.driverCollection.findFirst({
			orderBy: { number: "desc" },
		});
		const nextNumber = last ? last.number + 1 : 1;

		const collection = await prisma.driverCollection.create({
			data: {
				number: nextNumber,
				driver: { connect: { username: driverUsername } },
				admin: { connect: { username: adminUsername } },
				amount: parsedAmount,
				orders: {
					create: orderIds.map((orderId) => ({
						order: { connect: { id: orderId } },
					})),
				},
			},
			include: {
				driver: { select: { username: true, firstName: true, lastName: true } },
				admin: { select: { username: true } },
				orders: { select: { order: { select: { id: true } } } },
			},
		});

		res.status(201).json({
			message: "Collection created successfully",
			collection: {
				id: collection.id,
				number: collection.number,
				driverUsername: collection.driver.username,
				driverName: formatUserDisplayName(collection.driver),
				adminUsername: collection.admin.username,
				amount: collection.amount,
				orderIds: collection.orders.map((co) => co.order.id),
				createdAt: collection.createdAt,
			},
		});
	} catch (error) {
		next(error);
	}
}

// Note: API endpoints removed — SSR flow uses `createCollectionSSR` and server-rendered pages.

// Server-side collection creation for SSR flow (used by POST /collect)
async function createCollectionSSR(req, res, next) {
	try {
		let { driverUsername, orderIds } = req.body;

		if (!driverUsername || !orderIds) {
			// if driver passed as query param, accept it
			driverUsername = req.body.driver || driverUsername;
		}

		if (!driverUsername) {
			return res.status(400).render("collect", {
				title: "Collect Money | Go Delivery",
				initData: JSON.stringify({ drivers: [], collections: [] }),
				currentUser: req.user,
				selectedDriver: "",
				error: "Driver is required",
			});
		}

		if (typeof orderIds === "string") {
			orderIds = orderIds
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
		}

		if (!orderIds || !orderIds.length) {
			return res.redirect(
				`/collect?driver=${encodeURIComponent(driverUsername)}`,
			);
		}

		const existing = await prisma.driverCollection.findFirst({
			where: {
				orders: { some: { orderId: { in: orderIds } } },
			},
		});
		if (existing) {
			return res.redirect(
				`/collect?driver=${encodeURIComponent(driverUsername)}&error=Some+orders+already+collected`,
			);
		}

		const orders = await prisma.order.findMany({
			where: { id: { in: orderIds } },
			select: { total: true },
		});
		const total = orders.reduce((s, o) => s + (o.total ?? 0), 0);

		const driver = await prisma.user.findFirst({
			where: { username: driverUsername, role: "DRIVER" },
			select: { username: true, firstName: true, lastName: true },
		});
		const driverName = driver ? formatUserDisplayName(driver) : driverUsername;

		const adminUsername = req.user.username;

		const last = await prisma.driverCollection.findFirst({
			orderBy: { number: "desc" },
		});
		const nextNumber = last ? last.number + 1 : 1;

		await prisma.driverCollection.create({
			data: {
				number: nextNumber,
				driver: { connect: { username: driverUsername } },
				admin: { connect: { username: adminUsername } },
				amount: Number(total),
				orders: {
					create: orderIds.map((orderId) => ({
						order: { connect: { id: orderId } },
					})),
				},
			},
		});

		await prisma.order.updateMany({
			where: { id: { in: orderIds } },
			data: {
				status: "COLLECTED",
				statusUpdatedAt: new Date(),
			},
		});

		return res.redirect(
			`/collect?driver=${encodeURIComponent(driverUsername)}&success=1`,
		);
	} catch (error) {
		console.error("createCollectionSSR error:", error);
		return res.status(500).render("collect", {
			title: "Collect Money | Go Delivery",
			initData: JSON.stringify({ drivers: [], collections: [] }),
			currentUser: req.user,
			selectedDriver: "",
			error: "Failed to create collection",
		});
	}
}

export { getCollections, createCollection, createCollectionSSR };


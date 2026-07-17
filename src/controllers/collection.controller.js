import prisma from "../config/prisma.js";

// Server-side collection creation for SSR flow (used by POST /collect)
async function createCollectionSSR(req, res, next) {
	try {
		let { driverUsername, orderIds } = req.body;

		if (!driverUsername || !orderIds) {
			// if driver passed as query param, accept it
			driverUsername = req.body.driver || driverUsername;
		}

		if (!driverUsername) {
			return res.status(400).render("admin/collect", {
				title: "Collect Money | Go Delivery",
				initData: JSON.stringify({ drivers: [], collections: [] }),
				currentUser: req.user,
				selectedDriver: "",
				error: "Driver is required",
				csrfToken: req.csrfToken(),
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
		return res.status(500).render("admin/collect", {
			title: "Collect Money | Go Delivery",
			initData: JSON.stringify({ drivers: [], collections: [] }),
			currentUser: req.user,
			selectedDriver: "",
			error: "Failed to create collection",
			csrfToken: req.csrfToken(),
		});
	}
}

export { createCollectionSSR };


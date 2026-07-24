import prisma from "../config/prisma.js";

// Server-side collection creation for SSR flow (used by POST /collect)
async function createCollectionSSR(req, res, next) {
	try {
		let { driverUsername, orderIds } = req.body;
 
		if (!driverUsername) {
			driverUsername = req.body.driver;
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
			orderIds = orderIds.split(",").map((s) => s.trim()).filter(Boolean);
		}
 
		if (!orderIds || !orderIds.length) {
			return res.redirect(`/collect?driver=${encodeURIComponent(driverUsername)}`);
		}
 
		// Guard: don't double-collect
		const existing = await prisma.driverCollection.findFirst({
			where: { orders: { some: { orderId: { in: orderIds } } } },
		});
		if (existing) {
			return res.redirect(
				`/collect?driver=${encodeURIComponent(driverUsername)}&error=Some+orders+already+collected`,
			);
		}
 
		// Fetch full order details so we can split by status
		const orders = await prisma.order.findMany({
			where: { id: { in: orderIds } },
			select: { id: true, total: true, status: true, cancelledBy: true },
		});

		console.log("Collect orders fetched:", JSON.stringify(orders, null, 2));
 
		const deliveredIds = orders
			.filter((o) => o.status === "DELIVERED")
			.map((o) => o.id);
		
		const cancelledIds = orders
			.filter((o) => o.status === "Canceled")
			.map((o) => o.id);
	
		// Cancelled orders where customer cancelled — driver returning goods
		const cancelledCustomerIds = orders
			.filter((o) => o.status === "Canceled" && o.cancelledBy === "customer")
			.map((o) => o.id);
 
		// Cancelled by merchant — no money involved, but driver may still be
		// returning the physical goods; we record the collection but no cash moves
		const cancelledMerchantIds = orders
			.filter((o) => o.status === "Canceled" && o.cancelledBy === "merchant")
			.map((o) => o.id);
 
		const total = orders.reduce((s, o) => s + (o.total ?? 0), 0);
 
		const adminUsername = req.user.username;
		const last = await prisma.driverCollection.findFirst({ orderBy: { number: "desc" } });
		const nextNumber = last ? last.number + 1 : 1;
 
		// Create the DriverCollection record (covers all selected orders)
		await prisma.driverCollection.create({
			data: {
				number: nextNumber,
				driver: { connect: { username: driverUsername } },
				admin:  { connect: { username: adminUsername } },
				amount: Number(total),
				orders: {
					create: orderIds.map((orderId) => ({
						order: { connect: { id: orderId } },
					})),
				},
			},
		});
 
		// DELIVERED orders → COLLECTED (normal flow, finance will pay merchant)
		if (deliveredIds.length > 0) {
			await prisma.order.updateMany({
				where: { id: { in: deliveredIds } },
				data: { status: "COLLECTED", statusUpdatedAt: new Date() },
			});
		}

		// All cancelled orders get collectedBack: true
		if (cancelledIds.length > 0) {
			await prisma.order.updateMany({
				where: { id: { in: cancelledIds } },
				data: { collectedBack: true, statusUpdatedAt: new Date() },
			});
		}

		// Record a DRIVER_COLLECTION finance transaction so the finance
		// dashboard's cash figures reflect this collection. Amount = cash the
		// driver actually hands over (sum of DELIVERED order totals).
		const collectedAmount = orders
			.filter((o) => o.status === "DELIVERED")
			.reduce((s, o) => s + (o.total ?? 0), 0);
		if (collectedAmount > 0) {
			await prisma.financeTransaction.create({
				data: {
					type: "DRIVER_COLLECTION",
					amount: collectedAmount,
					paymentMethod: "CASH",
					status: "DELIVERED",
					driver: { connect: { username: driverUsername } },
					admin: { connect: { username: adminUsername } },
					description: `Collected cash from driver ${driverUsername} — ${deliveredIds.length} orders`,
					date: new Date(),
				},
			});
		}
 
		return res.redirect(`/collect?driver=${encodeURIComponent(driverUsername)}&success=1`);
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
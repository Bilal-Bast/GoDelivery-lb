import prisma from "../config/prisma.js";

function formatUserDisplayName(user) {
	if (!user) return null;
	const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
	return name || user.username;
}

async function getPayments(req, res, next) {
	try {
		const payments = await prisma.merchantPayment.findMany({
			orderBy: { createdAt: "desc" },
			include: {
				merchant: { select: { username: true, firstName: true, lastName: true } },
				admin: { select: { username: true } },
				orders: { select: { order: { select: { id: true } } } },
			},
		});

		res.json(
			payments.map((payment) => ({
				id: payment.id,
				number: payment.number,
				merchantUsername: payment.merchant.username,
				merchantName: formatUserDisplayName(payment.merchant),
				adminUsername: payment.admin.username,
				amount: payment.amount,
				orderIds: payment.orders.map((po) => po.order.id),
				createdAt: payment.createdAt,
			})),
		);
	} catch (error) {
		next(error);
	}
}

async function createPayment(req, res, next) {
	try {
		const { merchantUsername, amount, orderIds } = req.body;

		const parsedAmount = amount == null || amount === "" ? null : Number(amount);
		if (!merchantUsername || parsedAmount == null || !orderIds || !orderIds.length) {
			return res.status(400).json({ error: "Merchant, amount, and orderIds are required" });
		}
		if (!Number.isFinite(parsedAmount)) {
			return res.status(400).json({ error: "Amount must be a valid number" });
		}

		const merchant = await prisma.user.findFirst({
			where: { username: merchantUsername, role: "MERCHANT" },
			select: { username: true, firstName: true, lastName: true },
		});
		if (!merchant) {
			return res.status(400).json({ error: "Merchant not found" });
		}

		const adminUsername = req.user.username;

		const existing = await prisma.merchantPayment.findFirst({
			where: {
				orders: { some: { orderId: { in: orderIds } } },
			},
		});
		if (existing) {
			return res.status(400).json({ error: "Some orders already collected" });
		}

		const last = await prisma.merchantPayment.findFirst({
			orderBy: { number: "desc" },
		});
		const nextNumber = last ? last.number + 1 : 1;

		const payment = await prisma.merchantPayment.create({
			data: {
				number: nextNumber,
				merchant: { connect: { username: merchantUsername } },
				admin: { connect: { username: adminUsername } },
				amount: parsedAmount,
				orders: {
					create: orderIds.map((orderId) => ({
						order: { connect: { id: orderId } },
					})),
				},
			},
			include: {
				merchant: { select: { username: true, firstName: true, lastName: true } },
				admin: { select: { username: true } },
				orders: { select: { order: { select: { id: true } } } },
			},
		});

		res.status(201).json({
			message: "Payment created successfully",
			payment: {
				id: payment.id,
				number: payment.number,
				merchantUsername: payment.merchant.username,
				merchantName: formatUserDisplayName(payment.merchant),
				adminUsername: payment.admin.username,
				amount: payment.amount,
				orderIds: payment.orders.map((po) => po.order.id),
				createdAt: payment.createdAt,
			},
		});
	} catch (error) {
		next(error);
	}
}

// Note: API endpoints removed — SSR flow uses `createPaymentSSR` and server-rendered pages.

async function createPaymentSSR(req, res, next) {
	try {
		let { merchantUsername, orderIds } = req.body;

		if (typeof orderIds === "string") {
			orderIds = orderIds
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
		}

		if (!merchantUsername) {
			return res.redirect("/pay?error=Merchant+is+required");
		}

		if (!orderIds || !orderIds.length) {
			return res.redirect(
				`/pay?merchant=${encodeURIComponent(merchantUsername)}&error=Select+at+least+one+order`,
			);
		}

		const existing = await prisma.merchantPayment.findFirst({
			where: {
				orders: { some: { orderId: { in: orderIds } } },
			},
		});
		if (existing) {
			return res.redirect(
				`/pay?merchant=${encodeURIComponent(merchantUsername)}&error=Some+orders+already+paid`,
			);
		}

		const orders = await prisma.order.findMany({
			where: {
				id: { in: orderIds },
				merchant: { is: { username: merchantUsername } },
				status: "COLLECTED",
			},
			select: { total: true },
		});
		if (!orders.length) {
			return res.redirect(
				`/pay?merchant=${encodeURIComponent(merchantUsername)}&error=No+collectible+orders+found`,
			);
		}

		const amount = orders.reduce((sum, order) => sum + (order.total ?? 0), 0);
		const merchant = await prisma.user.findFirst({
			where: { username: merchantUsername, role: "MERCHANT" },
			select: { username: true, firstName: true, lastName: true },
		});
		if (!merchant) {
			return res.redirect("/pay?error=Merchant+not+found");
		}

		const adminUsername = req.user.username;

		const last = await prisma.merchantPayment.findFirst({
			orderBy: { number: "desc" },
		});
		const nextNumber = last ? last.number + 1 : 1;

		await prisma.merchantPayment.create({
			data: {
				number: nextNumber,
				merchant: { connect: { username: merchantUsername } },
				admin: { connect: { username: adminUsername } },
				amount: Number(amount),
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
				status: "Paid",
				statusUpdatedAt: new Date(),
			},
		});

		return res.redirect(
			`/pay?merchant=${encodeURIComponent(merchantUsername)}&success=1`,
		);
	} catch (error) {
		console.error("createPaymentSSR error:", error);
		return res.redirect("/pay?error=Failed+to+create+payment");
	}
}

export { createPaymentSSR };


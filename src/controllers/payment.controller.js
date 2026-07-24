import prisma from "../config/prisma.js";

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

		// Collected orders → admin owes merchant (total − delivery charge).
		const collectedOrders = await prisma.order.findMany({
			where: {
				id: { in: orderIds },
				merchant: { is: { username: merchantUsername } },
				status: "COLLECTED",
			},
			select: { id: true, total: true, deliveryCharge: true },
		});

		// Customer-cancelled, collected-back orders → merchant owes admin the
		// delivery charge (a deduction from the payout).
		const cancelledOrders = await prisma.order.findMany({
			where: {
				id: { in: orderIds },
				merchant: { is: { username: merchantUsername } },
				status: "Canceled",
				cancelledBy: "customer",
				collectedBack: true,
			},
			select: { id: true, deliveryCharge: true },
		});

		if (!collectedOrders.length && !cancelledOrders.length) {
			return res.redirect(
				`/pay?merchant=${encodeURIComponent(merchantUsername)}&error=No+settleable+orders+found`,
			);
		}

		// What admin pays out for collected orders (total minus delivery kept).
		const payoutAmount = collectedOrders.reduce(
			(sum, order) => sum + ((order.total ?? 0) - (order.deliveryCharge ?? 0)),
			0,
		);
		// Delivery charges the merchant owes on cancelled orders.
		const deductionTotal = cancelledOrders.reduce(
			(sum, order) => sum + (order.deliveryCharge ?? 0),
			0,
		);
		// Net: positive = we pay merchant, negative = we collect from merchant.
		const netAmount = payoutAmount - deductionTotal;
		const absAmount = Math.abs(netAmount);

		// Only the orders we actually matched get settled (ignore any stray ids).
		const settledOrderIds = [
			...collectedOrders.map((o) => o.id),
			...cancelledOrders.map((o) => o.id),
		];

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
				amount: Number(netAmount),
				orders: {
					create: settledOrderIds.map((orderId) => ({
						order: { connect: { id: orderId } },
					})),
				},
			},
		});

		await prisma.order.updateMany({
			where: { id: { in: settledOrderIds } },
			data: {
				status: "Paid",
				statusUpdatedAt: new Date(),
			},
		});

		// Record a finance transaction so the dashboard's cash figures move.
		// Positive net = money out (MERCHANT_PAYMENT); negative = money in
		// (CASH_IN, collecting delivery charges from the merchant).
		if (absAmount > 0) {
			await prisma.financeTransaction.create({
				data: {
					type: netAmount >= 0 ? "MERCHANT_PAYMENT" : "CASH_IN",
					amount: absAmount,
					paymentMethod: "CASH",
					status: "DELIVERED",
					merchant: { connect: { username: merchantUsername } },
					admin: { connect: { username: adminUsername } },
					description:
						netAmount >= 0
							? `Paid merchant ${merchantUsername} — ${settledOrderIds.length} orders`
							: `Collected delivery charges from merchant ${merchantUsername} — ${cancelledOrders.length} cancelled orders`,
					date: new Date(),
				},
			});
		}

		return res.redirect(
			`/pay?merchant=${encodeURIComponent(merchantUsername)}&success=1`,
		);
	} catch (error) {
		console.error("createPaymentSSR error:", error);
		return res.redirect("/pay?error=Failed+to+create+payment");
	}
}

export { createPaymentSSR };


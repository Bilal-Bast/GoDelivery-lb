import MerchantPayment from "../models/merchantPayment.model.js";
import User from "../models/user.model.js";
import Order from "../models/order.model.js";

async function getPayments(req, res, next) {
	try {
		const payments = await MerchantPayment.find().sort({ date: -1 });
		res.json(payments);
	} catch (error) {
		next(error);
	}
}

async function createPayment(req, res, next) {
	try {
		const { merchantUsername, amount, orderIds } = req.body;

		const parsedAmount =
			amount == null || amount === "" ? null : Number(amount);
		if (
			!merchantUsername ||
			parsedAmount == null ||
			!orderIds ||
			!orderIds.length
		) {
			return res
				.status(400)
				.json({ error: "Merchant, amount, and orderIds are required" });
		}
		if (!Number.isFinite(parsedAmount)) {
			return res
				.status(400)
				.json({ error: "Amount must be a valid number" });
		}

		const merchant = await User.findOne({
			username: merchantUsername,
			role: "merchant",
		});
		const merchantName = merchant
			? `${merchant.firstName || ""} ${merchant.lastName || ""}`.trim() ||
				merchantUsername
			: merchantUsername;

		const adminUsername = req.user.username;

		const existing = await MerchantPayment.findOne({
			orderIds: { $in: orderIds },
		});
		if (existing) {
			return res
				.status(400)
				.json({ error: "Some orders already collected" });
		}

		const last = await MerchantPayment.findOne().sort({ number: -1 });
		const nextNumber = last ? last.number + 1 : 1;

		const payment = new MerchantPayment({
			number: nextNumber,
			merchantUsername,
			merchantName,
			adminUsername,
			amount: parsedAmount,
			orderIds,
		});

		await payment.save();

		res.status(201).json({
			message: "Payment created successfully",
			payment,
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

		const existing = await MerchantPayment.findOne({
			orderIds: { $in: orderIds },
		});
		if (existing) {
			return res.redirect(
				`/pay?merchant=${encodeURIComponent(merchantUsername)}&error=Some+orders+already+paid`,
			);
		}

		const orders = await Order.find({
			id: { $in: orderIds },
			m: merchantUsername,
			s: 6,
		}).lean();
		if (!orders.length) {
			return res.redirect(
				`/pay?merchant=${encodeURIComponent(merchantUsername)}&error=No+collectible+orders+found`,
			);
		}

		const amount = orders.reduce(
			(sum, order) => sum + (order.pr?.t || 0),
			0,
		);
		const merchant = await User.findOne({
			username: merchantUsername,
			role: "merchant",
		});
		const merchantName = merchant
			? `${merchant.firstName || ""} ${merchant.lastName || ""}`.trim() ||
				merchantUsername
			: merchantUsername;
		const adminUsername = req.user.username;

		const last = await MerchantPayment.findOne().sort({ number: -1 });
		const nextNumber = last ? last.number + 1 : 1;

		const payment = new MerchantPayment({
			number: nextNumber,
			merchantUsername,
			merchantName,
			adminUsername,
			amount: Number(amount),
			orderIds,
		});

		await payment.save();
		await Order.updateMany(
			{ id: { $in: orderIds } },
			{ $set: { s: 5, statusUpdatedAt: new Date() } },
		);

		return res.redirect(
			`/pay?merchant=${encodeURIComponent(merchantUsername)}&success=1`,
		);
	} catch (error) {
		console.error("createPaymentSSR error:", error);
		return res.redirect("/pay?error=Failed+to+create+payment");
	}
}

export { createPaymentSSR };

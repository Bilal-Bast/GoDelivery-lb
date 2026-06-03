import MerchantPayment from "../models/merchantPayment.model.js";
import User from "../models/user.model.js";

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

		if (!merchantUsername || !amount || !orderIds || !orderIds.length) {
			return res
				.status(400)
				.json({ error: "Merchant, amount, and orderIds are required" });
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
			amount: Number(amount),
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

export { getPayments, createPayment };

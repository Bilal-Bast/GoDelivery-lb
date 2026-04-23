import mongoose from "mongoose";

const merchantPaymentSchema = new mongoose.Schema(
	{
		number: { type: Number, unique: true },
		merchantUsername: { type: String, required: true },
		merchantName: { type: String, default: "" },
		adminUsername: { type: String, required: true },
		amount: { type: Number, required: true },
		orderIds: [{ type: String }],
		createdAt: { type: Date, default: Date.now },
	},
	{ versionKey: false },
);

export default mongoose.model("MerchantPayment", merchantPaymentSchema);

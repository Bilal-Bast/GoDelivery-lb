import mongoose from "mongoose";

const financeTransactionSchema = new mongoose.Schema(
	{
		type: {
			type: String,
			enum: ["Cash In", "Cash Out", "Merchant Payment", "Driver Collection", "Expense", "Refund"],
			required: true,
		},
		amount: { type: Number, required: true },
		paymentMethod: {
			type: String,
			enum: ["Cash", "OMT", "Whish"],
			default: "Cash",
		},
		status: {
			type: String,
			enum: ["Completed", "Pending", "Cancelled"],
			default: "Completed",
		},
		relatedOrder: { type: String, default: "" },
		driver: { type: String, default: "" },
		merchant: { type: String, default: "" },
		description: { type: String, default: "" },
		notes: { type: String, default: "" },
		date: { type: Date, default: Date.now },
		adminUsername: { type: String, default: "" },
		createdAt: { type: Date, default: Date.now },
	},
	{ versionKey: false },
);

export default mongoose.model("FinanceTransaction", financeTransactionSchema);

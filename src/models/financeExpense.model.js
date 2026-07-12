import mongoose from "mongoose";

const financeExpenseSchema = new mongoose.Schema(
	{
		amount: { type: Number, required: true },
		category: {
			type: String,
			enum: [
				"Fuel",
				"Rent",
				"Electricity",
				"Water",
				"Internet",
				"Office Supplies",
				"Equipment",
				"Maintenance",
				"Marketing",
				"Refunds",
				"Salaries",
				"Other",
			],
			required: true,
		},
		description: { type: String, default: "" },
		date: { type: Date, default: Date.now },
		receipt: { type: String, default: "" },
		createdBy: { type: String, default: "" },
		createdAt: { type: Date, default: Date.now },
	},
	{ versionKey: false },
);

export default mongoose.model("FinanceExpense", financeExpenseSchema);

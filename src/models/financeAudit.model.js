import mongoose from "mongoose";

const financeAuditSchema = new mongoose.Schema(
	{
		user: { type: String, default: "" },
		date: { type: Date, default: Date.now },
		action: { type: String, required: true },
		description: { type: String, default: "" },
		ip: { type: String, default: "" },
		createdAt: { type: Date, default: Date.now },
	},
	{ versionKey: false },
);

export default mongoose.model("FinanceAudit", financeAuditSchema);

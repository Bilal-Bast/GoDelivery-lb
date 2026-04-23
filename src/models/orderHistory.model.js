import mongoose from "mongoose";

const orderHistorySchema = new mongoose.Schema(
	{
		order_id: { type: String, required: true, index: true },
		action_type: { type: String, required: true },
		old_value: { type: mongoose.Schema.Types.Mixed },
		new_value: { type: mongoose.Schema.Types.Mixed },
		performed_by: { type: String, default: "admin" },
		location: { type: mongoose.Schema.Types.Mixed },
		metadata: { type: mongoose.Schema.Types.Mixed },
	},
	{
		timestamps: { createdAt: "created_at", updatedAt: false },
		versionKey: false,
	},
);

export default mongoose.model("OrderHistory", orderHistorySchema);

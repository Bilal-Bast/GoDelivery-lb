import mongoose from "mongoose";

const driverCollectionSchema = new mongoose.Schema(
	{
		number: { type: Number, unique: true },
		driverUsername: { type: String, required: true },
		driverName: { type: String, default: "" },
		adminUsername: { type: String, required: true },
		amount: { type: Number, required: true },
		orderIds: [{ type: String }],
		createdAt: { type: Date, default: Date.now },
	},
	{ versionKey: false },
);

export default mongoose.model("DriverCollection", driverCollectionSchema);

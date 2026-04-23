import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
	{
		username: { type: String, required: true, unique: true, trim: true },
		password: { type: String, required: true },
		role: {
			type: String,
			enum: ["admin", "driver", "merchant"],
			required: true,
		},
		firstName: { type: String, default: "" },
		lastName: { type: String, default: "" },
		phone: { type: String, default: "" },
		accountType: {
			type: String,
			enum: ["prepaid", "postpaid", null],
			default: null,
		},
		cashPercentage: { type: Number, default: null },
		paymentDay: { type: String, default: null },
		deliveryCharges: {
			Akkar: { type: Number, default: 0 },
			"Baalbek-Hermel": { type: Number, default: 0 },
			Beirut: { type: Number, default: 0 },
			Bekaa: { type: Number, default: 0 },
			"El Nabatieh": { type: Number, default: 0 },
			"Mount Lebanon": { type: Number, default: 0 },
			North: { type: Number, default: 0 },
			South: { type: Number, default: 0 },
		},
	},
	{ timestamps: true },
);

export default mongoose.model("User", userSchema);

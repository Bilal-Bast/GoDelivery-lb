import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
	{
		district: {
			en: { type: String, required: true },
			ar: { type: String, required: true },
		},
		cities: [
			{
				en: { type: String, required: true },
				ar: { type: String, required: true },
			},
		],
	},
	{ timestamps: true },
);

export default mongoose.model("Location", locationSchema);

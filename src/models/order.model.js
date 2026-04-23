import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
	{
		id: { type: String, required: true, unique: true },
		m: { type: String, required: true },
		driver: { type: String, default: null },
		c: {
			f: { type: String, required: true },
			l: { type: String },
			p: { type: String, required: true },
			loc: {
				d: { type: String, required: true },
				cty: { type: String, required: true },
			},
		},
		pr: {
			t: { type: Number, required: true },
			d: { type: Number, required: true },
		},
		cb: { type: String, default: "admin" },
		s: { type: Number, enum: [0, 1, 2, 3, 4, 5, 6], default: 0 },
		statusUpdatedAt: { type: Date, default: Date.now },
		e: { type: Boolean, default: false },
		eN: { type: String, default: "" },
		history: [
			{
				action: String,
				details: mongoose.Schema.Types.Mixed,
				by: String,
				timestamp: { type: Date, default: Date.now },
			},
		],
	},
	{ timestamps: true, versionKey: false },
);

export default mongoose.model("Order", orderSchema);

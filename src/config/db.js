import mongoose from "mongoose";

async function connectDB(mongoUrl) {
	try {
		await mongoose.connect(mongoUrl);
		console.log("MongoDB connected");
	} catch (error) {
		console.error("MongoDB connection error:", error);
		process.exit(1);
	}
}

export default connectDB;

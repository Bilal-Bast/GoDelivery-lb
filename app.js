import express from "express";
import cors from "cors";
import "dotenv/config";
import { fileURLToPath } from "url";
import { resolve } from "path";

import authRoutes from "./src/routes/auth.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import locationRoutes from "./src/routes/location.routes.js";
import orderRoutes from "./src/routes/order.routes.js";
import driverRoutes from "./src/routes/driver.routes.js";
import collectionRoutes from "./src/routes/collection.routes.js";
import paymentRoutes from "./src/routes/payment.routes.js";
import connectDB from "./src/config/db.js";
import seedLocations from "./src/services/seedLocations.service.js";

const PORT = process.env.PORT || 3000;
const MONGO_URL =
	process.env.MONGO_URL ||
	"mongodb+srv://bilalbast03:kretIr28C9Nc7JEm@cluster0.ux77pl4.mongodb.net/?appName=Cluster0";

function createApp() {
	const app = express();

	app.use(express.json());
	app.use(cors());

	app.use(authRoutes);
	app.use(userRoutes);
	app.use(locationRoutes);
	app.use(orderRoutes);
	app.use(driverRoutes);
	app.use(collectionRoutes);
	app.use(paymentRoutes);

	return app;
}

async function start() {
	await connectDB(MONGO_URL);
	await seedLocations();

	const app = createApp();
	app.listen(PORT, () => {
		console.log(`Server running on port ${PORT}`);
	});
}

const currentFilePath = fileURLToPath(import.meta.url);
const entryFilePath = process.argv[1] ? resolve(process.argv[1]) : "";

if (currentFilePath === entryFilePath) {
	start();
}

export default createApp;

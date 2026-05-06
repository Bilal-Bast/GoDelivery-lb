import express from "express";
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
const MONGO_URL = process.env.MONGO_URL;

function createApp() {
	const app = express();

	app.set("view engine", "pug");
	app.set("views", resolve("src/views"));

	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));
	app.use("/assets", express.static(resolve("src/public/assets")));
	app.use("/css", express.static(resolve("src/public/css")));
	app.use("/js", express.static(resolve("src/public/js")));
	app.use("/components", express.static(resolve("src/public/components")));

	app.get(["/", "/signin", "/login"], (req, res) => {
		res.render("signin", { title: "Go Delivery" });
	});
	app.get(["/index.html", "/signin.html"], (req, res) => {
		res.render("signin", { title: "Go Delivery" });
	});

	// Public SSR pages
	app.get(["/about", "/about.html"], (req, res) => {
		res.render("about", { title: "About | Go Delivery" });
	});

	app.get(["/track", "/track.html"], (req, res) => {
		res.render("track", { title: "Track Order | Go Delivery" });
	});

	// Dashboard aliases - serve the existing client-side dashboard HTML
	app.get(["/admin", "/admin.html"], (req, res) => {
		res.render("admin", { title: "Admin Dashboard | Go Delivery" });
	});

	app.get(["/merchant", "/merchant.html"], (req, res) => {
		res.render("merchant", { title: "Merchant Dashboard | Go Delivery" });
	});

	app.get(["/driver", "/driver.html"], (req, res) => {
		res.render("driver", { title: "Driver Dashboard | Go Delivery" });
	});
	// Admin/Finance pages
	app.get(["/orders", "/orders.html"], (req, res) => {
		res.render("orders", { title: "Orders Management | Go Delivery" });
	});

	app.get(["/users", "/users.html"], (req, res) => {
		res.render("users", { title: "Users Management | Go Delivery" });
	});

	app.get(["/analytics", "/analytics.html"], (req, res) => {
		res.render("analytics", { title: "Analytics | Go Delivery" });
	});

	app.get(["/settings", "/settings.html"], (req, res) => {
		res.render("settings", { title: "Settings | Go Delivery" });
	});

	app.get(["/collect", "/collect.html"], (req, res) => {
		res.render("collect", { title: "Collect Money | Go Delivery" });
	});

	app.get(["/pay", "/pay.html"], (req, res) => {
		res.render("pay", { title: "Pay Merchants | Go Delivery" });
	});

	app.get(["/test", "/test.html"], (req, res) => {
		res.render("test", { title: "Test | Go Delivery" });
	});
	app.use("/", authRoutes);
	app.use("/", userRoutes);
	app.use("/", locationRoutes);
	app.use("/", orderRoutes);
	app.use("/", driverRoutes);
	app.use("/", collectionRoutes);
	app.use("/", paymentRoutes);

	return app;
}

async function start() {
	if (MONGO_URL) {
		await connectDB(MONGO_URL);
		await seedLocations();
	} else {
		console.warn(
			"MONGO_URL not set — skipping DB connection and seeding (development mode)",
		);
	}

	const app = createApp();
	app.listen(PORT, () => {
		console.log(`Server running on port ${PORT}`);
	});
}

const currentFilePath = fileURLToPath(import.meta.url);
const entryFilePath = process.argv[1] ? resolve(process.argv[1]) : "";

if (currentFilePath === entryFilePath) {
	process.on("unhandledRejection", (err) => {
		console.error("Unhandled Rejection:", err);
		process.exit(1);
	});
	process.on("uncaughtException", (err) => {
		console.error("Uncaught Exception:", err);
		process.exit(1);
	});
	start();
}

export default createApp;

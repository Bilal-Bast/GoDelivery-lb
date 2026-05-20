import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
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

import { login, getMe, logout } from "./src/controllers/auth.controller.js";
import { getMerchants, getMerchantByUsername } from "./src/controllers/user.controller.js";
import { pageAuth } from "./src/middleware/page-auth.middleware.js";
import authMiddleware from "./src/middleware/auth.middleware.js";

import {
	getAdminPageData,
	getOrdersPageData,
	getUsersPageData,
	getAnalyticsPageData,
	getSettingsPageData,
	getCollectPageData,
	getPayPageData,
	getDriverPageData,
	getMerchantPageData,
	getTrackPageData,
} from "./src/services/page-data.service.js";

import connectDB from "./src/config/db.js";
import seedLocations from "./src/services/seedLocations.service.js";
import seedSuperAdmin from "./src/services/seedSuperAdmin.service.js";

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL;

function createApp() {
	const app = express();

	app.set("view engine", "pug");
	app.set("views", resolve("src/views"));

	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));
	app.use(cookieParser());
	app.use("/assets", express.static(resolve("src/public/assets")));
	app.use("/css", express.static(resolve("src/public/css")));
	app.use("/js", express.static(resolve("src/public/js")));
	app.use("/components", express.static(resolve("src/public/components")));
	app.use(cors());

	// ─── Public pages ────────────────────────────────────────────────────────

	app.get(["/", "/signin", "/login", "/index.html", "/signin.html"], (req, res) => {
		res.render("signin", { title: "Go Delivery" });
	});

	app.get(["/about", "/about.html"], (req, res) => {
		res.render("about", { title: "About | Go Delivery" });
	});

	app.get(["/track", "/track.html"], async (req, res) => {
		try {
			const data = await getTrackPageData(req.query.id);
			res.render("track", {
				title: "Track Order | Go Delivery",
				initData: JSON.stringify(data),
			});
		} catch {
			res.render("track", { title: "Track Order | Go Delivery", initData: "{}" });
		}
	});

	// ─── Auth ────────────────────────────────────────────────────────────────

	app.post("/login", login);
	app.post("/logout", logout);
	app.get("/logout", logout);

	// ─── Protected SSR pages ─────────────────────────────────────────────────

	app.get(["/admin", "/admin.html"], pageAuth("admin"), async (req, res) => {
		try {
			const data = await getAdminPageData();
			res.render("admin", {
				title: "Admin Dashboard | Go Delivery",
				initData: JSON.stringify(data),
				currentUser: req.user,
			});
		} catch (err) {
			console.error(err);
			res.render("admin", { title: "Admin Dashboard | Go Delivery", initData: "{}", currentUser: req.user });
		}
	});

	app.get(["/orders", "/orders.html"], pageAuth("admin"), async (req, res) => {
		try {
			const data = await getOrdersPageData();
			res.render("orders", {
				title: "Orders Management | Go Delivery",
				initData: JSON.stringify(data),
				currentUser: req.user,
			});
		} catch (err) {
			console.error(err);
			res.render("orders", { title: "Orders Management | Go Delivery", initData: "{}", currentUser: req.user });
		}
	});

	app.get(["/users", "/users.html"], pageAuth("admin"), async (req, res) => {
		try {
			const data = await getUsersPageData();
			res.render("users", {
				title: "Users Management | Go Delivery",
				initData: JSON.stringify(data),
				currentUser: req.user,
			});
		} catch (err) {
			console.error(err);
			res.render("users", { title: "Users Management | Go Delivery", initData: "{}", currentUser: req.user });
		}
	});

	app.get(["/analytics", "/analytics.html"], pageAuth("admin"), async (req, res) => {
		try {
			const data = await getAnalyticsPageData();
			res.render("analytics", {
				title: "Analytics | Go Delivery",
				initData: JSON.stringify(data),
				currentUser: req.user,
			});
		} catch (err) {
			console.error(err);
			res.render("analytics", { title: "Analytics | Go Delivery", initData: "{}", currentUser: req.user });
		}
	});

	app.get(["/settings", "/settings.html"], pageAuth("admin"), async (req, res) => {
		try {
			const data = await getSettingsPageData();
			res.render("settings", {
				title: "Settings | Go Delivery",
				initData: JSON.stringify(data),
				currentUser: req.user,
			});
		} catch (err) {
			console.error(err);
			res.render("settings", { title: "Settings | Go Delivery", initData: "{}", currentUser: req.user });
		}
	});

	app.get(["/collect", "/collect.html"], pageAuth("admin"), async (req, res) => {
		try {
			const data = await getCollectPageData();
			res.render("collect", {
				title: "Collect Money | Go Delivery",
				initData: JSON.stringify(data),
				currentUser: req.user,
			});
		} catch (err) {
			console.error(err);
			res.render("collect", { title: "Collect Money | Go Delivery", initData: "{}", currentUser: req.user });
		}
	});

	app.get(["/pay", "/pay.html"], pageAuth("admin"), async (req, res) => {
		try {
			const data = await getPayPageData();
			res.render("pay", {
				title: "Pay Merchants | Go Delivery",
				initData: JSON.stringify(data),
				currentUser: req.user,
			});
		} catch (err) {
			console.error(err);
			res.render("pay", { title: "Pay Merchants | Go Delivery", initData: "{}", currentUser: req.user });
		}
	});

	app.get(["/driver", "/driver.html"], pageAuth("driver"), async (req, res) => {
		try {
			const data = await getDriverPageData(req.user.username);
			res.render("driver", {
				title: "Driver Dashboard | Go Delivery",
				initData: JSON.stringify(data),
				currentUser: req.user,
			});
		} catch (err) {
			console.error(err);
			res.render("driver", { title: "Driver Dashboard | Go Delivery", initData: "{}", currentUser: req.user });
		}
	});

	app.get(["/merchant", "/merchant.html"], pageAuth("merchant"), async (req, res) => {
		try {
			const data = await getMerchantPageData(req.user.username);
			res.render("merchant", {
				title: "Merchant Dashboard | Go Delivery",
				initData: JSON.stringify(data),
				currentUser: req.user,
			});
		} catch (err) {
			console.error(err);
			res.render("merchant", { title: "Merchant Dashboard | Go Delivery", initData: "{}", currentUser: req.user });
		}
	});

	app.get(["/test", "/test.html"], pageAuth("admin"), (req, res) => {
		res.render("test", { title: "Test | Go Delivery", currentUser: req.user });
	});

	// ─── REST API ────────────────────────────────────────────────────────────

	app.use("/api/auth", authRoutes);
	app.use("/api/users", userRoutes);
	app.use("/api/locations", locationRoutes);
	app.use("/api/orders", orderRoutes);
	app.use("/api/drivers", driverRoutes);
	app.use("/api/driver", driverRoutes);
	app.use("/api/collections", collectionRoutes);
	app.use("/api/payments", paymentRoutes);

	app.get("/api/me", authMiddleware, getMe);
	app.get("/api/merchants", getMerchants);
	app.get("/api/merchants/:username", getMerchantByUsername);

	// ─── 404 ─────────────────────────────────────────────────────────────────

	app.use((req, res) => {
		if (req.path.startsWith("/api/")) {
			return res.status(404).json({ error: "Not found" });
		}
		res.status(404).render("signin", { title: "Not Found | Go Delivery" });
	});

	return app;
}

async function start() {
	if (MONGO_URL) {
		await connectDB(MONGO_URL);
		await seedLocations();
		await seedSuperAdmin();
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
	if (!process.env.JWT_SECRET) {
		console.error("FATAL: JWT_SECRET environment variable is not set.");
		process.exit(1);
	}
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

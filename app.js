import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import csrf from "csurf";
import mongoose from "mongoose";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import "dotenv/config";
import { fileURLToPath } from "url";
import { resolve } from "path";

import authRoutes from "./src/routes/auth.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import locationRoutes from "./src/routes/location.routes.js";
import orderRoutes from "./src/routes/order.routes.js";
import driverRoutes from "./src/routes/driver.routes.js";

import { login, getMe, logout } from "./src/controllers/auth.controller.js";
import {
	getMerchants,
	getMerchantByUsername,
} from "./src/controllers/user.controller.js";
import { getAnalytics } from "./src/controllers/analytics.controller.js";
import { pageAuth } from "./src/middleware/page-auth.middleware.js";
import authMiddleware, { authorize } from "./src/middleware/auth.middleware.js";
import sanitizeRequest from "./src/middleware/sanitizer.middleware.js";

import {
	getAdminPageData,
	getOrdersPageData,
	getUsersPageData,
	getSettingsPageData,
	getCollectPageData,
	getPayPageData,
	getDriverPageData,
	getMerchantPageData,
	getTrackPageData,
} from "./src/services/page-data.service.js";
import {
	deleteUserSSR,
	addAdminSSR,
	addDriverSSR,
	addMerchantSSR,
	updateMerchantSSR,
} from "./src/controllers/user.controller.js";

import connectDB from "./src/config/db.js";
import { addLocationSSR } from "./src/controllers/location.controller.js";
import seedLocations from "./src/services/seedLocations.service.js";
import seedSuperAdmin from "./src/services/seedSuperAdmin.service.js";
import errorHandler from "./src/middleware/error.middleware.js";
import requestLogger from "./src/middleware/request-logger.middleware.js";
import asyncHandler from "./src/middleware/asyncHandler.js";
import { createPaymentSSR } from "./src/controllers/payment.controller.js";
import validateRequest from "./src/middleware/validation.middleware.js";
import {
	createCollectionValidators,
	createPaymentValidators,
} from "./src/middleware/validators.js";
import { createOrderSSR } from "./src/controllers/order.controller.js";

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL;

function createApp() {
	const app = express();

	app.set("view engine", "pug");
	app.set("views", resolve("src/views"));

	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));
	app.use(cookieParser());

	// Request logger (adds X-Request-Id and logs basic request metadata)
	app.use(requestLogger);

	// Security middleware with comprehensive headers
	app.use(
		helmet({
			contentSecurityPolicy: {
				directives: {
					defaultSrc: ["'self'"],
					scriptSrc: [
						"'self'",
						"'unsafe-inline'",
						"https://cdn.tailwindcss.com",
						"https://cdn.jsdelivr.net",
					],
					styleSrc: [
						"'self'",
						"'unsafe-inline'",
						"https://fonts.googleapis.com",
						"https://cdn.tailwindcss.com",
						"https://unpkg.com",
					],
					fontSrc: ["'self'", "https://fonts.gstatic.com", "https://unpkg.com"],
					connectSrc: ["'self'"],
					imgSrc: ["'self'", "data:", "https://flagcdn.com"],
					frameSrc: ["'none'"],
				},
			},
			frameGuard: { action: "deny" }, // Prevent clickjacking
			xssFilter: true,
			noSniff: true, // Prevent MIME sniffing
			referrerPolicy: { policy: "strict-origin-when-cross-origin" },
		}),
	);

	// Basic rate limiter for API routes
	const apiLimiter = rateLimit({
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: 200, // limit each IP to 200 requests per windowMs
		standardHeaders: true,
		legacyHeaders: false,
	});
	app.use("/api/", apiLimiter);

	// Strict rate limiter for login endpoint (prevent brute force)
	const loginLimiter = rateLimit({
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: 5, // limit each IP to 5 login attempts per windowMs
		message: "Too many login attempts, please try again after 15 minutes",
		standardHeaders: true,
		legacyHeaders: false,
		skip: (req) => req.method !== "POST", // only count POST requests
	});
	app.use("/login", loginLimiter);

	// CSRF protection - use cookie-based tokens
	const csrfProtection = csrf({
		cookie: {
			httpOnly: true,
			sameSite: "strict",
			secure: process.env.NODE_ENV === "production",
		},
	});

	app.use("/assets", express.static(resolve("src/public/assets")));
	app.use("/css", express.static(resolve("src/public/css")));
	app.use("/js", express.static(resolve("src/public/js")));
	app.use("/components", express.static(resolve("src/public/components")));

	// Restrict CORS to allowed origins
	const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(",");
	app.use(
		cors({
			origin: allowedOrigins,
			credentials: true,
			methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
			allowedHeaders: ["Content-Type", "Authorization"],
		}),
	);

	// ─── Public pages ────────────────────────────────────────────────────────

	app.get(
		["/", "/signin", "/login", "/index.html", "/signin.html"],
		(req, res) => {
			res.render("public/index", { title: "Go Delivery" });
		},
	);

	app.get(["/about", "/about.html"], (req, res) => {
		res.render("public/about", { title: "About | Go Delivery" });
	});

	app.get(
		["/track", "/track.html"],
		asyncHandler(async (req, res) => {
			const data = await getTrackPageData(req.query.id);
			res.render("public/track", {
				title: "Track Order | Go Delivery",
				initData: JSON.stringify(data),
			});
		}),
	);

	app.get("/reset-password", (req, res) => {
		res.render("public/reset-password", {
			title: "Reset Password | Go Delivery",
		});
	});

	// ─── Auth ────────────────────────────────────────────────────────────────

	app.post("/login", csrfProtection, login);
	app.post("/logout", csrfProtection, logout);
	app.get("/logout", logout);

	// ─── Protected SSR pages ─────────────────────────────────────────────────

	app.get(
		["/admin", "/admin.html"],
		pageAuth("admin"),
		asyncHandler(async (req, res) => {
			const data = await getAdminPageData();
			res.render("admin/admin", {
				title: "Admin Dashboard | Go Delivery",
				initData: JSON.stringify(data),
				currentUser: req.user,
			});
		}),
	);

	app.get(
		["/orders", "/orders.html"],
		pageAuth("admin"),
		asyncHandler(async (req, res) => {
			const data = await getOrdersPageData();
			res.render("admin/orders", {
				title: "Orders Management | Go Delivery",
				initData: JSON.stringify(data),
				currentUser: req.user,
			});
		}),
	);

	app.get(
		["/users", "/users.html"],
		pageAuth("admin"),
		asyncHandler(async (req, res) => {
			const data = await getUsersPageData();
			res.render("admin/users", {
				title: "Users Management | Go Delivery",
				initData: JSON.stringify(data),
				currentUser: req.user,
			});
		}),
	);

	app.get(
		["/analytics", "/analytics.html"],
		pageAuth("admin"),
		(req, res) => {
			// Data is loaded client-side from GET /api/analytics (server-aggregated)
			res.render("admin/analytics", {
				title: "Analytics | Go Delivery",
				initData: "{}",
				currentUser: req.user,
			});
		},
	);

	app.get(
		["/settings", "/settings.html"],
		pageAuth("admin"),
		asyncHandler(async (req, res) => {
			const data = await getSettingsPageData();
			res.render("admin/settings", {
				title: "Settings | Go Delivery",
				initData: JSON.stringify(data),
				currentUser: req.user,
			});
		}),
	);

	app.get(
		["/collect", "/collect.html"],
		pageAuth("admin"),
		asyncHandler(async (req, res) => {
			const selectedDriver = req.query.driver || "";
			const data = await getCollectPageData(selectedDriver);
			const success = req.query.success === "1";
			const error = req.query.error || null;
			res.render("admin/collect", {
				title: "Collect Money | Go Delivery",
				initData: JSON.stringify(data),
				pageData: data,
				currentUser: req.user,
				selectedDriver,
				success,
				error,
			});
		}),
	);

	// Handle SSR POST collection submissions
	app.post(
		"/collect",
		pageAuth("admin"),
		createCollectionValidators,
		validateRequest,
		asyncHandler(async (req, res) => {
			// Delegate to controller logic for creating collection server-side
			const { createCollectionSSR } =
				await import("./src/controllers/collection.controller.js");
			await createCollectionSSR(req, res);
		}),
	);

	// Server-side create order (SSR) — replaces client API create
	app.post(
		"/orders",
		pageAuth("admin"),
		asyncHandler(async (req, res) => {
			await createOrderSSR(req, res);
		}),
	);

	// SSR user delete (from users UI)
	app.post(
		"/users/delete",
		pageAuth("admin"),
		asyncHandler(async (req, res) => {
			await deleteUserSSR(req, res);
		}),
	);

	app.post(
		"/users/add-admin",
		pageAuth("admin"),
		asyncHandler(async (req, res) => {
			await addAdminSSR(req, res);
		}),
	);

	app.post(
		"/users/add-driver",
		pageAuth("admin"),
		asyncHandler(async (req, res) => {
			await addDriverSSR(req, res);
		}),
	);

	app.post(
		"/users/add-merchant",
		pageAuth("admin"),
		asyncHandler(async (req, res) => {
			await addMerchantSSR(req, res);
		}),
	);

	// SSR add location from settings page
	app.post(
		"/settings/add-location",
		pageAuth("admin"),
		asyncHandler(async (req, res) => {
			await addLocationSSR(req, res);
		}),
	);

	// SSR update merchant delivery charges from settings page
	app.post(
		"/settings/update-charges",
		pageAuth("admin"),
		asyncHandler(async (req, res) => {
			await updateMerchantSSR(req, res);
		}),
	);

	app.get(
		["/pay", "/pay.html"],
		pageAuth("admin"),
		asyncHandler(async (req, res) => {
			const selectedMerchant = req.query.merchant || "";
			const data = await getPayPageData(selectedMerchant);
			res.render("admin/pay", {
				title: "Pay Merchants | Go Delivery",
				initData: JSON.stringify(data),
				pageData: data,
				currentUser: req.user,
				selectedMerchant,
				success: req.query.success === "1",
				error: req.query.error || null,
			});
		}),
	);

	app.post(
		"/pay",
		pageAuth("admin"),
		createPaymentValidators,
		validateRequest,
		asyncHandler(createPaymentSSR),
	);

	app.get(
		["/driver", "/driver.html"],
		pageAuth("driver"),
		asyncHandler(async (req, res) => {
			const data = await getDriverPageData(req.user.username);
			res.render("dashboards/driver", {
				title: "Driver Dashboard | Go Delivery",
				initData: JSON.stringify(data),
				currentUser: req.user,
			});
		}),
	);

	app.get(
		["/merchant", "/merchant.html"],
		pageAuth("merchant"),
		asyncHandler(async (req, res) => {
			const data = await getMerchantPageData(req.user.username);
			res.render("dashboards/merchant", {
				title: "Merchant Dashboard | Go Delivery",
				initData: JSON.stringify(data),
				currentUser: req.user,
			});
		}),
	);

	app.get(["/test", "/test.html"], pageAuth("admin"), (req, res) => {
		res.render("admin/test", {
			title: "Test | Go Delivery",
			currentUser: req.user,
		});
	});

	// ─── REST API ────────────────────────────────────────────────────────────

	// Health endpoints
	app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

	app.get("/ready", async (req, res) => {
		// 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
		const state = mongoose.connection.readyState;
		if (state === 1) return res.json({ ready: true });
		return res.status(503).json({ ready: false, state });
	});

	// Apply request sanitizer to all API routes
	app.use("/api/", sanitizeRequest);

	app.use("/api/auth", authRoutes);
	app.use("/api/users", userRoutes);
	app.use("/api/locations", locationRoutes);
	app.use("/api/orders", orderRoutes);
	app.use("/api/drivers", driverRoutes);

	app.get("/api/me", authMiddleware, getMe);
	app.get(
		"/api/analytics",
		authMiddleware,
		authorize("admin"),
		asyncHandler(getAnalytics),
	);
	app.get("/api/merchants", authMiddleware, authorize("admin"), getMerchants);
	app.get(
		"/api/merchants/:username",
		authMiddleware,
		authorize("admin"),
		getMerchantByUsername,
	);

	// ─── 404 ─────────────────────────────────────────────────────────────────

	// Dev-only Swagger UI serving the OpenAPI spec
	if (process.env.NODE_ENV !== "production") {
		try {
			const specPath = resolve("docs/openapi.yaml");
			const swaggerDocument = YAML.load(specPath);
			app.use(
				"/docs/api",
				swaggerUi.serve,
				swaggerUi.setup(swaggerDocument),
			);
			console.log("Mounted Swagger UI at /docs/api (dev-only)");
		} catch (err) {
			console.error("Failed to load OpenAPI spec for Swagger UI:", err);
		}
	}

	app.use((req, res) => {
		if (req.path.startsWith("/api/")) {
			return res.status(404).json({ error: "Not found" });
		}
		res.status(404).render("public/index", { title: "Not Found | Go Delivery" });
	});

	// Global error handler (must be after all routes and handlers)
	app.use(errorHandler);

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

function validateEnv() {
	const required = ["JWT_SECRET", "MONGO_URL"];
	const missing = required.filter((k) => !process.env[k]);
	if (missing.length) {
		console.error(
			`FATAL: Missing required environment variable(s): ${missing.join(", ")}`,
		);
		process.exit(1);
	}
}

if (currentFilePath === entryFilePath) {
	validateEnv();
	if (!process.env.NODE_ENV) process.env.NODE_ENV = "development";

	process.on("unhandledRejection", (err) => {
		console.error("Unhandled Rejection:", err);
		process.exit(1);
	});
	process.on("uncaughtException", (err) => {
		console.error("Uncaught Exception:", err);
		process.exit(1);
	});

	console.log(
		`Starting GoDelivery-lb in ${process.env.NODE_ENV} mode on port ${PORT}`,
	);

	start().catch((err) => {
		console.error("Startup failed:", err);
		process.exit(1);
	});
}

export default createApp;

import { Router } from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import driverOnly from "../middleware/driver.middleware.js";
import {
	getDrivers,
	getDriverOrders,
	getDriverStats,
} from "../controllers/driver.controller.js";

const router = Router();

// Mounted at /api/drivers → GET /api/drivers
router.get("/", asyncHandler(getDrivers));

// Mounted at both /api/drivers and /api/driver → /api/driver/orders, /api/driver/stats
router.get(
	"/orders",
	authMiddleware,
	driverOnly,
	asyncHandler(getDriverOrders),
);
router.get("/stats", authMiddleware, driverOnly, asyncHandler(getDriverStats));

export default router;

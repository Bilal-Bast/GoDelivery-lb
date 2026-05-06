import { Router } from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import adminOnly from "../middleware/admin.middleware.js";
import driverOnly from "../middleware/driver.middleware.js";
import {
	getDrivers,
	getDriverOrders,
	getDriverStats,
} from "../controllers/driver.controller.js";

const router = Router();

router.get("/drivers", authMiddleware, adminOnly, getDrivers);
router.get("/api/driver/orders", authMiddleware, driverOnly, getDriverOrders);
router.get("/api/driver/stats", authMiddleware, driverOnly, getDriverStats);

export default router;

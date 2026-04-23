import { Router } from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import driverOnly from "../middleware/driver.middleware.js";
import {
	getDrivers,
	getDriverOrders,
	getDriverStats,
} from "../controllers/driver.controller.js";

const router = Router();

router.get("/drivers", getDrivers);
router.get("/api/driver/orders", authMiddleware, driverOnly, getDriverOrders);
router.get("/api/driver/stats", authMiddleware, driverOnly, getDriverStats);

export default router;

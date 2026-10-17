import { Router } from "express";
import rateLimit from "express-rate-limit";

import authMiddleware, { authorize } from "../middleware/auth.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import driverOnly from "../middleware/driver.middleware.js";
import {
	getAdminLiveDrivers,
	publishDriverLocation,
	stopDriverLocation,
} from "../controllers/live-tracking.controller.js";

const router = Router();

const publishLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 30,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: "Location updates are temporarily rate limited" },
});

router.post(
	"/location",
	authMiddleware,
	driverOnly,
	publishLimiter,
	asyncHandler(publishDriverLocation),
);
router.delete("/location", authMiddleware, driverOnly, asyncHandler(stopDriverLocation));
router.get("/drivers/live", authMiddleware, authorize("admin"), asyncHandler(getAdminLiveDrivers));

export default router;

import { Router } from "express";

import authMiddleware, { authorize } from "../middleware/auth.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { getManifestDriverOrders } from "../services/page-data.service.js";

const router = Router();

// GET /api/manifest/orders?driver=<driverId|all> — admin only.
router.get(
	"/orders",
	authMiddleware,
	authorize("admin"),
	asyncHandler(async (req, res) => {
		const driver = typeof req.query.driver === "string" ? req.query.driver.trim() : "";
		if (!driver || driver.length > 100) {
			return res.status(400).json({ error: "driver is required" });
		}
		res.json(await getManifestDriverOrders(driver));
	}),
);

export default router;

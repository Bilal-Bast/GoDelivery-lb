import { Router } from "express";
import prisma from "../config/prisma.js";
import authMiddleware, { authorize } from "../middleware/auth.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { loadRecentNotifications } from "../services/notification-feed.service.js";

const router = Router();
router.get("/recent", authMiddleware, authorize("admin", "driver", "merchant"), asyncHandler(async (req, res) => {
	res.set("Cache-Control", "private, no-store");
	res.json({ items: await loadRecentNotifications(prisma, req.user) });
}));
export default router;

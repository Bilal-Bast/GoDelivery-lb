import { Router } from "express";
import rateLimit from "express-rate-limit";

import authMiddleware, { authorize } from "../middleware/auth.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { handlers } from "../controllers/dispatch.controller.js";

const router = Router();
const assignmentLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 30,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: "Dispatch assignment is temporarily rate limited" },
});

router.get("/board", authMiddleware, authorize("admin"), asyncHandler(handlers.getBoard));
router.get("/my-sequence", authMiddleware, authorize("driver"), asyncHandler(handlers.getMySequence));
router.post(
	"/orders/:id/assign",
	authMiddleware,
	authorize("admin"),
	assignmentLimiter,
	asyncHandler(handlers.assignOrder),
);

export default router;

import { Router } from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import adminOnly from "../middleware/admin.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
	getPayments,
	createPayment,
} from "../controllers/payment.controller.js";

const router = Router();

router.get("/payments", authMiddleware, adminOnly, asyncHandler(getPayments));
router.post(
	"/payments",
	authMiddleware,
	adminOnly,
	asyncHandler(createPayment),
);

export default router;

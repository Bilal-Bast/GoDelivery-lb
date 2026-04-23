import { Router } from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import adminOnly from "../middleware/admin.middleware.js";
import {
	getPayments,
	createPayment,
} from "../controllers/payment.controller.js";

const router = Router();

router.get("/payments", authMiddleware, adminOnly, getPayments);
router.post("/payments", authMiddleware, adminOnly, createPayment);

export default router;

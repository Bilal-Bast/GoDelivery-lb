import { Router } from "express";

import authMiddleware, { authorize } from "../middleware/auth.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";

import {
	createFinanceTransaction,
	createFinanceExpense,
	getFinanceAudit,
} from "../controllers/finance.controller.js";

const router = Router();

router.post(
	"/transaction",
	authMiddleware,
	authorize("admin"),
	asyncHandler(createFinanceTransaction),
);

router.post(
	"/expense",
	authMiddleware,
	authorize("admin"),
	asyncHandler(createFinanceExpense),
);

router.get(
	"/audit",
	authMiddleware,
	authorize("admin"),
	asyncHandler(getFinanceAudit),
);

export default router;
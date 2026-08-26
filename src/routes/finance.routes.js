import { Router } from "express";
import authMiddleware, { authorize } from "../middleware/auth.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
	createFinanceTransaction,
	createFinanceExpense,
	getFinanceAudit,
	collectFromDriver,
	payMerchant,
	payPrepaidMerchant,
	setMerchantLegacyBalance,
	getBalances,
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

// Smart collect/pay — derive everything from order statuses
router.post(
	"/collect-driver",
	authMiddleware,
	authorize("admin"),
	asyncHandler(collectFromDriver),
);

router.post(
	"/pay-merchant",
	authMiddleware,
	authorize("admin"),
	asyncHandler(payMerchant),
);

// Prepaid merchants: pay any amount up front against a running balance
router.post(
	"/pay-prepaid-merchant",
	authMiddleware,
	authorize("admin"),
	asyncHandler(payPrepaidMerchant),
);

// Prepaid merchants: set/correct a pre-system debt carried over from before
// this app tracked orders — pure bookkeeping, never moves cash
router.put(
	"/prepaid-merchant/:username/legacy-balance",
	authMiddleware,
	authorize("admin"),
	asyncHandler(setMerchantLegacyBalance),
);

// Receivables/payables snapshot
router.get(
	"/balances",
	authMiddleware,
	authorize("admin"),
	asyncHandler(getBalances),
);

export default router;
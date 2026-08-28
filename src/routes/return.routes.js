import { Router } from "express";
import authMiddleware, { authorize } from "../middleware/auth.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
	getReturns,
	getReturnById,
	getReturnsByMerchant,
	getReturnableOrders,
	createReturn,
	updateReturn,
	deleteReturn,
	generateReturnPDF,
} from "../controllers/return/returnController.js";

const router = Router();

// Get all returns (paginated)
router.get("/", authMiddleware, authorize("admin"), asyncHandler(getReturns));

// Orders still awaiting hand-back for a merchant
router.get(
	"/merchant/:merchantUsername/returnable",
	authMiddleware,
	authorize("admin"),
	asyncHandler(getReturnableOrders),
);

// Returns already recorded for a merchant
router.get(
	"/merchant/:merchantUsername",
	authMiddleware,
	authorize("admin"),
	asyncHandler(getReturnsByMerchant),
);

// Download PDF for return
router.get(
	"/:id/pdf",
	authMiddleware,
	authorize("admin"),
	asyncHandler(generateReturnPDF),
);

// Get single return
router.get(
	"/:id",
	authMiddleware,
	authorize("admin"),
	asyncHandler(getReturnById),
);

// Create return
router.post("/", authMiddleware, authorize("admin"), asyncHandler(createReturn));

// Update return
router.put(
	"/:id",
	authMiddleware,
	authorize("admin"),
	asyncHandler(updateReturn),
);

// Delete return
router.delete(
	"/:id",
	authMiddleware,
	authorize("admin"),
	asyncHandler(deleteReturn),
);

export default router;

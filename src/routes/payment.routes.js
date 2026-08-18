import { Router } from "express";
import authMiddleware, { authorize } from "../middleware/auth.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
	getPayments,
	getPaymentById,
	getPaymentsByMerchant,
	createPayment,
	updatePayment,
	deletePayment,
	generatePaymentPDF,
	getPaymentStats,
} from "../controllers/payment/paymentController.js";
 
const router = Router();
 
// Get all payments (paginated)
router.get(
	"/",
	authMiddleware,
	authorize("admin"),
	asyncHandler(getPayments),
);
 
// Get payments by merchant
router.get(
	"/merchant/:merchantUsername",
	authMiddleware,
	authorize("admin"),
	asyncHandler(getPaymentsByMerchant),
);
 
// Get payment stats by merchant
router.get(
	"/merchant/:merchantUsername/stats",
	authMiddleware,
	authorize("admin"),
	asyncHandler(getPaymentStats),
);
 
// Download PDF for payment
router.get(
	"/:id/pdf",
	authMiddleware,
	authorize("admin"),
	asyncHandler(generatePaymentPDF),
);
 
// Get single payment
router.get(
	"/:id",
	authMiddleware,
	authorize("admin"),
	asyncHandler(getPaymentById),
);
 
// Create payment
router.post(
	"/",
	authMiddleware,
	authorize("admin"),
	asyncHandler(createPayment),
);
 
// Update payment
router.put(
	"/:id",
	authMiddleware,
	authorize("admin"),
	asyncHandler(updatePayment),
);
 
// Delete payment
router.delete(
	"/:id",
	authMiddleware,
	authorize("admin"),
	asyncHandler(deletePayment),
);
 
export default router;
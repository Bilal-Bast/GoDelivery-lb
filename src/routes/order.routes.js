import { Router } from "express";
import rateLimit from "express-rate-limit";

import authMiddleware, { authorize } from "../middleware/auth.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import validateRequest from "../middleware/validation.middleware.js";
import {
	createOrderValidators,
	updateOrderValidators,
	updateOrderStatusValidators,
} from "../middleware/validators.js";
import {
	getOrders,
	exportOrders,
	previewOrderImport,
	getOrderById,
	getOrderSettlementInfo,
	getOrdersByMerchant,
	getOrdersByCurrentMerchant,
	getOrdersByDriver,
	createOrder,
	updateOrder,
	updateOrderStatus,
	deleteOrder,
	getOrderHistory,
	getCustomerByPhone,
	trackOrder,
	cancelOrder,
	validateOrderId,
	undoLastChange,
} from "../controllers/order/index.js";
import {
	getAuthorizedOrderLiveLocation,
	getPublicOrderLiveLocation,
} from "../controllers/live-tracking.controller.js";

const router = Router();

const publicLiveLocationLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 30,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: "Live tracking is temporarily rate limited" },
});

router.get("/", authMiddleware, authorize("admin"), asyncHandler(getOrders));
router.get("/my", authMiddleware, asyncHandler(getOrdersByCurrentMerchant));
router.get("/track/:id/live", publicLiveLocationLimiter, asyncHandler(getPublicOrderLiveLocation));
router.get(
	"/:id/live",
	authMiddleware,
	authorize("admin", "merchant"),
	asyncHandler(getAuthorizedOrderLiveLocation),
);
router.get("/export.csv", authMiddleware, authorize("admin", "merchant"), asyncHandler(exportOrders));
router.post("/import/preview", authMiddleware, authorize("admin", "merchant"), asyncHandler(previewOrderImport));
router.get(
	"/merchant/:merchantName",
	authMiddleware,
	authorize("admin", "merchant"),
	asyncHandler(getOrdersByMerchant),
);
router.get(
	"/driver/:driverUsername",
	authMiddleware,
	authorize("admin"),
	asyncHandler(getOrdersByDriver),
);
router.get("/track/:id", asyncHandler(trackOrder));
router.get(
	"/customers/phone/:phone",
	authMiddleware,
	authorize("admin", "merchant"),
	asyncHandler(getCustomerByPhone),
);
router.get(
"/:id/history",
	authMiddleware,
	authorize("admin", "merchant", "driver"),
	asyncHandler(getOrderHistory),
);
router.get(
	"/:id/settlement-info",
	authMiddleware,
	authorize("admin"),
	asyncHandler(getOrderSettlementInfo),
);
router.get(
	"/:id",
	authMiddleware,
	authorize("admin", "merchant", "driver"),
	asyncHandler(getOrderById),
);
router.post(
	"/",
	authMiddleware,
	authorize("admin", "merchant"),
	createOrderValidators,
	validateRequest,
	asyncHandler(createOrder),
);
router.put(
	"/:id",
	authMiddleware,
	authorize("admin"),
	updateOrderValidators,
	validateRequest,
	asyncHandler(updateOrder),
);
router.patch(
	"/:id/status",
	authMiddleware,
	authorize("admin", "driver"),
	updateOrderStatusValidators,
	validateRequest,
	asyncHandler(updateOrderStatus),
);
router.delete(
	"/:id",
	authMiddleware,
	authorize("admin"),
	asyncHandler(deleteOrder),
);
router.post(
	"/:id/cancel",
	authMiddleware,
	authorize("admin"),
	asyncHandler(cancelOrder),
);

router.post(
	"/validate-id",
	asyncHandler(validateOrderId),
);

router.post(
	"/:id/undo",
	authMiddleware,
	authorize("admin"),
	asyncHandler(undoLastChange),
);

export default router;

import { Router } from "express";

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
	getOrderById,
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
} from "../controllers/order/index.js";

const router = Router();

router.get("/", authMiddleware, authorize("admin"), asyncHandler(getOrders));
router.get("/my", authMiddleware, asyncHandler(getOrdersByCurrentMerchant));
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
	authorize("admin", "merchant"),
	asyncHandler(getOrderHistory),
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

export default router;

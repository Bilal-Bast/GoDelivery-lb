import { Router } from "express";

import authMiddleware, { authorize } from "../middleware/auth.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import Order from "../models/order.model.js";
import {
	getOrders,
	getOrderById,
	getOrdersByMerchant,
	getOrdersByDriver,
	createOrder,
	updateOrder,
	updateOrderStatus,
	deleteOrder,
	getOrderHistory,
	getCustomerByPhone,
	trackOrder,
} from "../controllers/order.controller.js";

const router = Router();

router.get("/", asyncHandler(getOrders));
router.get(
	"/my",
	authMiddleware,
	asyncHandler(async (req, res) => {
		const orders = await Order.find({ m: req.user.username }).sort({
			createdAt: -1,
		});
		res.json(orders);
	}),
);
router.get("/merchant/:merchantName", asyncHandler(getOrdersByMerchant));
router.get(
	"/driver/:driverUsername",
	authMiddleware,
	authorize("admin"),
	asyncHandler(getOrdersByDriver),
);
router.get("/track/:id", asyncHandler(trackOrder));
router.get("/customers/phone/:phone", asyncHandler(getCustomerByPhone));
router.get("/:id/history", asyncHandler(getOrderHistory));
router.get("/:id", asyncHandler(getOrderById));
router.post(
	"/",
	authMiddleware,
	authorize("admin", "merchant", "operator"),
	asyncHandler(createOrder),
);
router.put(
	"/:id",
	authMiddleware,
	authorize("admin", "operator"),
	asyncHandler(updateOrder),
);
router.patch(
	"/:id/status",
	authMiddleware,
	authorize("admin", "driver", "operator"),
	asyncHandler(updateOrderStatus),
);
router.delete(
	"/:id",
	authMiddleware,
	authorize("admin"),
	asyncHandler(deleteOrder),
);

export default router;

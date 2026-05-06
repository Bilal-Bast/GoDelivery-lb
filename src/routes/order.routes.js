import { Router } from "express";

import authMiddleware, { authorize } from "../middleware/auth.middleware.js";
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

router.get("/", getOrders);
router.get("/my", authMiddleware, async (req, res) => {
	try {
		const orders = await Order.find({ m: req.user.username }).sort({
			createdAt: -1,
		});
		res.json(orders);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});
router.get("/merchant/:merchantName", getOrdersByMerchant);
router.get("/driver/:driverUsername", authMiddleware, authorize("admin"), getOrdersByDriver);
router.get("/track/:id", trackOrder);
router.get("/customers/phone/:phone", getCustomerByPhone);
router.get("/:id/history", getOrderHistory);
router.get("/:id", getOrderById);
router.post(
	"/",
	authMiddleware,
	authorize("admin", "merchant", "operator"),
	createOrder,
);
router.put(
	"/:id",
	authMiddleware,
	authorize("admin", "operator"),
	updateOrder,
);
router.patch("/:id/status", authMiddleware, updateOrderStatus);
router.delete("/:id", authMiddleware, authorize("admin"), deleteOrder);

export default router;

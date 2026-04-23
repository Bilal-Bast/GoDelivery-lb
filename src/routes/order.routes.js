import { Router } from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import Order from "../models/order.model.js";
import {
	getOrders,
	getOrderById,
	getOrdersByMerchant,
	createOrder,
	updateOrder,
	updateOrderStatus,
	deleteOrder,
	getOrderHistory,
	getCustomerByPhone,
	trackOrder,
} from "../controllers/order.controller.js";

const router = Router();

router.get("/orders", getOrders);
router.get("/orders/my", authMiddleware, async (req, res) => {
	try {
		const orders = await Order.find({ m: req.user.username }).sort({
			createdAt: -1,
		});
		res.json(orders);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});
router.get("/orders/:id", getOrderById);
router.get("/orders/merchant/:merchantName", getOrdersByMerchant);
router.post("/orders", createOrder);
router.put("/orders/:id", updateOrder);
router.patch("/orders/:id/status", updateOrderStatus);
router.delete("/orders/:id", deleteOrder);
router.get("/api/orders/:id/history", getOrderHistory);
router.get("/customers/phone/:phone", getCustomerByPhone);
router.get("/orders/track/:id", trackOrder);

export default router;

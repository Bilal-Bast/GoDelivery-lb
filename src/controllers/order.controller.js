import Order from "../models/order.model.js";
import OrderHistory from "../models/orderHistory.model.js";

async function getOrders(req, res) {
	try {
		const orders = await Order.find().sort({ createdAt: -1 });
		res.json(orders);
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch orders" });
	}
}

async function getOrderById(req, res) {
	try {
		const order = await Order.findOne({ id: req.params.id });
		if (!order) return res.status(404).json({ error: "Order not found" });
		res.json(order);
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch order" });
	}
}

async function getOrdersByMerchant(req, res) {
	try {
		const orders = await Order.find({ m: req.params.merchantName }).sort({
			createdAt: -1,
		});
		res.json(orders);
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch orders" });
	}
}

async function createOrder(req, res) {
	try {
		let orderData = req.body;

		if (orderData.merchant && !orderData.m) {
			orderData = {
				id: orderData.id,
				m: orderData.merchant,
				c: {
					f: orderData.customer?.firstName,
					l: orderData.customer?.lastName,
					p: orderData.customer?.phone,
					loc: {
						d: orderData.customer?.location?.district,
						cty: orderData.customer?.location?.city,
					},
				},
				pr: {
					t: orderData.pricing?.totalPrice,
					d: orderData.pricing?.deliveryCharge,
				},
				s:
					orderData.status === "Warehouse"
						? 0
						: orderData.status === "New"
							? 1
							: orderData.status === "Picked up"
								? 2
								: orderData.status === "Delivered"
									? 3
									: orderData.status === "Cancelled"
										? 4
										: orderData.status === "Paid"
											? 5
											: orderData.status === "Collected"
												? 6
												: 0,
				e: orderData.e === true,
				eN: orderData.eN || "",
				cb: orderData.createdBy || "admin",
			};
		}

		const newOrder = new Order(orderData);
		newOrder.history = [
			{
				action: "Created",
				details: orderData,
				by: orderData.cb || "merchant",
				timestamp: new Date(),
			},
		];

		const savedOrder = await newOrder.save();

		await new OrderHistory({
			order_id: savedOrder.id,
			action_type: "creation",
			new_value: orderData,
			performed_by: orderData.cb || "merchant",
			metadata: { message: "Order created" },
		}).save();

		res.status(201).json({
			message: "Order created successfully",
			order: savedOrder,
		});
	} catch (error) {
		if (error.code === 11000) {
			return res
				.status(400)
				.json({ error: "Order with this ID already exists" });
		}

		res.status(500).json({
			error: "Failed to create order",
			details: error.message,
		});
	}
}

async function updateOrder(req, res) {
	try {
		const historyEntry = {
			action: "Updated fields",
			details: req.body,
			by: "admin",
			timestamp: new Date(),
		};

		const updatedOrder = await Order.findOneAndUpdate(
			{ id: req.params.id },
			{ $set: req.body, $push: { history: historyEntry } },
			{ returnDocument: "after", runValidators: true },
		);

		if (!updatedOrder)
			return res.status(404).json({ error: "Order not found" });

		await new OrderHistory({
			order_id: updatedOrder.id,
			action_type: "update",
			new_value: req.body,
			performed_by: "admin",
		}).save();

		res.json({
			message: "Order updated successfully",
			order: updatedOrder,
		});
	} catch (error) {
		res.status(500).json({ error: "Failed to update order" });
	}
}

async function updateOrderStatus(req, res) {
	try {
		const { s, note } = req.body;
		const validStatuses = [0, 1, 2, 3, 4, 5, 6];

		if (s === undefined || !validStatuses.includes(Number(s))) {
			return res
				.status(400)
				.json({ error: "Invalid status. Must be a number 0-6." });
		}

		const numericStatus = Number(s);
		const statusNames = [
			"Warehouse",
			"New",
			"Picked Up",
			"Delivered",
			"Cancelled",
			"Paid",
			"Collected",
		];

		const historyEntry = {
			action: `Status changed to ${statusNames[numericStatus]}`,
			details: { s: numericStatus, note },
			by: "driver",
			timestamp: new Date(),
		};

		const updateFields = { s: numericStatus, statusUpdatedAt: new Date() };
		if (note) updateFields.eN = note;

		const updatedOrder = await Order.findOneAndUpdate(
			{ id: req.params.id },
			{ $set: updateFields, $push: { history: historyEntry } },
			{ new: true },
		);

		if (!updatedOrder)
			return res.status(404).json({ error: "Order not found" });

		await new OrderHistory({
			order_id: updatedOrder.id,
			action_type: "status_change",
			new_value: numericStatus,
			performed_by: "driver",
			metadata: {
				status_text: statusNames[numericStatus],
				note: note || "",
			},
		}).save();

		res.json({
			message: "Order status updated successfully",
			order: updatedOrder,
		});
	} catch (error) {
		res.status(500).json({ error: "Failed to update order status" });
	}
}

async function deleteOrder(req, res) {
	try {
		const deletedOrder = await Order.findOneAndDelete({
			id: req.params.id,
		});
		if (!deletedOrder)
			return res.status(404).json({ error: "Order not found" });

		res.json({
			message: "Order deleted successfully",
			order: deletedOrder,
		});
	} catch (error) {
		res.status(500).json({ error: "Failed to delete order" });
	}
}

async function getOrderHistory(req, res) {
	try {
		const history = await OrderHistory.find({
			order_id: req.params.id,
		}).sort({ created_at: 1 });
		res.json(history);
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch order history" });
	}
}

async function getCustomerByPhone(req, res) {
	try {
		const customer = await Order.findOne(
			{ "c.p": { $regex: req.params.phone, $options: "i" } },
			{ c: 1 },
		).sort({ createdAt: -1 });

		if (!customer)
			return res.status(404).json({ error: "Customer not found" });
		res.json(customer.c);
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch customer" });
	}
}

async function trackOrder(req, res) {
	try {
		const order = await Order.findOne({ id: req.params.id });
		if (!order) return res.status(404).json({ error: "Order not found" });

		res.json({
			id: order.id,
			s: order.s,
			c: order.c,
			pr: order.pr,
			driver: order.driver || "Not assigned",
			history: order.history || [],
		});
	} catch (error) {
		res.status(500).json({ error: "Server error" });
	}
}

export {
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
};

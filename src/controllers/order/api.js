import prisma from "../../config/prisma.js";
import { validatePaginationParams } from "../../utils/queryValidator.js";
import { statusNumberToEnum, statusNames } from "../../utils/orderStatus.js";
import {
	orderFromPrisma,
	orderHistoryFromPrisma,
	resolveMerchantId,
	resolveDriverId,
	buildOrderCreateData,
	buildOrderUpdateData,
	findSettlementBlock,
} from "./mappers.js";
import { sendWhatsAppMessage } from "../../services/whatsapp.js";

async function getOrders(req, res, next) {
	try {
		const { page, limit } = validatePaginationParams(req);
		const skip = (page - 1) * limit;

		const total = await prisma.order.count();
		const orders = await prisma.order.findMany({
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
			include: {
				merchant: { select: { username: true } },
				driver: { select: { username: true } },
			},
		});

		res.json({
			data: orders.map((order) => orderFromPrisma(order)),
			pagination: {
				total,
				page,
				limit,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		next(error);
	}
}

async function getOrdersByCurrentMerchant(req, res, next) {
	try {
		const merchantUsername = req.user?.username;
		if (!merchantUsername) {
			return res.status(400).json({ error: "Invalid user" });
		}

		const orders = await prisma.order.findMany({
			where: {
				merchant: { username: merchantUsername },
			},
			orderBy: { createdAt: "desc" },
			include: {
				merchant: { select: { username: true } },
				driver: { select: { username: true } },
			},
		});

		res.json(orders.map((order) => orderFromPrisma(order)));
	} catch (error) {
		next(error);
	}
}

async function getOrderById(req, res, next) {
	try {
		if (!req.params.id || req.params.id.length > 50) {
			return res.status(400).json({ error: "Invalid order ID" });
		}

		const order = await prisma.order.findUnique({
			where: { id: req.params.id },
			include: {
				merchant: { select: { username: true } },
				driver: { select: { username: true } },
			},
		});

		if (!order) return res.status(404).json({ error: "Order not found" });

		const history = await prisma.orderHistory.findMany({
			where: { orderId: order.id },
			orderBy: { createdAt: "asc" },
		});

		res.json(orderFromPrisma(order, history.map(orderHistoryFromPrisma)));
	} catch (error) {
		next(error);
	}
}

async function getOrdersByDriver(req, res, next) {
	try {
		const orders = await prisma.order.findMany({
			where: {
				driver: { username: req.params.driverUsername },
			},
			orderBy: { createdAt: "desc" },
			include: {
				merchant: { select: { username: true } },
				driver: { select: { username: true } },
			},
		});
		res.json(orders.map((order) => orderFromPrisma(order)));
	} catch (error) {
		next(error);
	}
}

async function getOrdersByMerchant(req, res, next) {
	try {
		if (req.user.role === "merchant" && req.user.username !== req.params.merchantName) {
			return res.status(403).json({ error: "Forbidden" });
		}
		const orders = await prisma.order.findMany({
			where: {
				merchant: { username: req.params.merchantName },
			},
			orderBy: { createdAt: "desc" },
			include: {
				merchant: { select: { username: true } },
				driver: { select: { username: true } },
			},
		});
		res.json(orders.map((order) => orderFromPrisma(order)));
	} catch (error) {
		next(error);
	}
}

async function createOrder(req, res, next) {
	try {
		let orderData = { ...req.body };
		delete orderData.driver;

		const createInfo = await buildOrderCreateData(orderData);
		if (createInfo.error) {
			return res.status(400).json({ error: createInfo.error });
		}

		const historyEntry = {
			orderId: createInfo.data.id,
			actionType: "creation",
			newValue: orderData,
			performedBy: createInfo.data.createdBy,
			metadata: { message: "Order created" },
		};

		const [order] = await prisma.$transaction([
			prisma.order.create({
				data: createInfo.data,
				include: {
					merchant: { select: { username: true } },
					driver: { select: { username: true } },
				},
			}),
			prisma.orderHistory.create({ data: historyEntry }),
		]);


		// WhatsApp notification (temporary simulation for now)
		try {
			console.log("📱 Attempting to send WhatsApp message...");
			const whatsappResult = await sendWhatsAppMessage({
				phone: order.customerPhone,
				customerName: order.customerFirstName,
				orderId: order.id,
				merchant: order.merchant?.username || "Go Delivery",
				total: order.total,
			});
			console.log("✅ WhatsApp result:", whatsappResult);
		} catch (whatsappError) {
			console.error("❌ WhatsApp notification failed:", whatsappError);
		}

		res.status(201).json({
			message: "Order created successfully",
			order: orderFromPrisma(order, [historyEntry]),
		});
	} catch (error) {
		if (error.code === "P2002") {
			return res.status(400).json({ error: "Order with this ID already exists" });
		}
		next(error);
	}
}

async function updateOrder(req, res, next) {
	try {
		const order = await prisma.order.findUnique({
			where: { id: req.params.id },
		});
		if (!order) return res.status(404).json({ error: "Order not found" });

		const updateData = buildOrderUpdateData(req.body);

		// Same rule as updateOrderStatus: an update that moves the order to
		// Cancelled must record who cancelled so finance can attribute the
		// delivery charge. Explicit body value wins; otherwise default by
		// role (merchant cancelling their own order → "merchant", everyone
		// else acting on a customer's refusal → "customer").
		if (updateData.status === "Canceled" && order.status !== "Canceled") {
			const bodyCancelledBy = ["merchant", "customer"].includes(req.body.cancelledBy)
				? req.body.cancelledBy
				: null;
			updateData.cancelledBy =
				bodyCancelledBy ||
				(req.user.role === "merchant" ? "merchant" : "customer");
			updateData.cancelledFromStatus = order.status;
		}

		const relations = {};
		if (updateData.merchantUsername) {
			const merchantId = await resolveMerchantId(updateData.merchantUsername);
			if (!merchantId) {
				return res.status(400).json({ error: "Invalid merchant username" });
			}
			relations.merchant = { connect: { id: merchantId } };
			delete updateData.merchantUsername;
		}
		if (Object.prototype.hasOwnProperty.call(updateData, "driverUsername")) {
			const driverId = updateData.driverUsername
				? await resolveDriverId(updateData.driverUsername)
				: null;
			if (updateData.driverUsername && !driverId) {
				return res.status(400).json({ error: "Invalid driver username" });
			}
			relations.driver = driverId ? { connect: { id: driverId } } : { disconnect: true };
			delete updateData.driverUsername;
		}

		if (Object.keys(updateData).length === 0 && Object.keys(relations).length === 0) {
			return res.status(400).json({ error: "No valid fields to update" });
		}

		if (updateData.status && updateData.status !== order.status) {
			const blockReason = await findSettlementBlock(req.params.id, updateData.status);
			if (blockReason) {
				return res.status(409).json({ error: blockReason });
			}
		}

		const historyEntry = {
			orderId: req.params.id,
			actionType: "update",
			newValue: req.body,
			performedBy: req.user.username,
		};

		const [updatedOrder] = await prisma.$transaction([
			prisma.order.update({
				where: { id: req.params.id },
				data: { ...updateData, ...relations },
				include: {
					merchant: { select: { username: true } },
					driver: { select: { username: true } },
				},
			}),
			prisma.orderHistory.create({ data: historyEntry }),
		]);

		const fullHistory = await prisma.orderHistory.findMany({
			where: { orderId: req.params.id },
			orderBy: { createdAt: "asc" },
		});

		res.json({
			message: "Order updated successfully",
			order: orderFromPrisma(updatedOrder, fullHistory.map(orderHistoryFromPrisma)),
		});
	} catch (error) {
		next(error);
	}
}

async function updateOrderStatus(req, res, next) {
	try {
		const { s, note } = req.body;
		const validStatuses = [0, 1, 2, 3, 4, 5, 6];

		if (s === undefined || !validStatuses.includes(Number(s))) {
			return res
				.status(400)
				.json({ error: "Invalid status. Must be a number 0-6." });
		}

		const numericStatus = Number(s);
		const historyEntry = {
			orderId: req.params.id,
			actionType: "status_change",
			newValue: numericStatus,
			performedBy: req.user.username,
			metadata: {
				status_text: statusNames[numericStatus],
				note: note || "",
			},
		};

		const query = {
			id: req.params.id,
		};
		if (req.user.role === "driver") {
			query.driver = { username: req.user.username };
		}

		const order = await prisma.order.findFirst({
			where: query,
		});
		if (!order) return res.status(404).json({ error: "Order not found" });

		const targetStatus = statusNumberToEnum[numericStatus];
		if (targetStatus !== order.status) {
			const blockReason = await findSettlementBlock(req.params.id, targetStatus);
			if (blockReason) {
				return res.status(409).json({ error: blockReason });
			}
		}

		// When cancelling through this generic status endpoint, still record
		// who cancelled so finance can attribute the delivery charge. Use the
		// explicit body value if given, otherwise default by role: a driver
		// cancels because the customer refused at the door → "customer";
		// a merchant cancelling their own order → "merchant"; admin acting on
		// a customer's request → "customer". (The dedicated /cancel endpoint
		// remains the precise path.)
		let cancellationData = {};
		if (numericStatus === 4 && order.status !== "Canceled") {
			const bodyCancelledBy = ["merchant", "customer"].includes(req.body.cancelledBy)
				? req.body.cancelledBy
				: null;
			const cancelledBy =
				bodyCancelledBy ||
				(req.user.role === "merchant" ? "merchant" : "customer");
			cancellationData = {
				cancelledBy,
				cancelledFromStatus: order.status,
			};
			historyEntry.metadata.cancelledBy = cancelledBy;
			historyEntry.metadata.cancelledFromStatus = order.status;
		}

		const [updatedOrder] = await prisma.$transaction([
			prisma.order.update({
				where: { id: req.params.id },
				data: {
					status: statusNumberToEnum[numericStatus],
					statusUpdatedAt: new Date(),
					expressNote: note || undefined,
					...cancellationData,
				},
				include: {
					merchant: { select: { username: true } },
					driver: { select: { username: true } },
				},
			}),
			prisma.orderHistory.create({ data: historyEntry }),
		]);

		res.json({
			message: "Order status updated successfully",
			order: orderFromPrisma(updatedOrder),
		});
	} catch (error) {
		next(error);
	}
}

async function deleteOrder(req, res, next) {
	try {
		const order = await prisma.order.findUnique({
			where: { id: req.params.id },
			include: {
				merchant: { select: { username: true } },
				driver:   { select: { username: true } },
			},
		});
		if (!order) return res.status(404).json({ error: "Order not found" });

		await prisma.$transaction([
			prisma.orderHistory.deleteMany(    { where: { orderId: req.params.id } }),
			prisma.collectionOrder.deleteMany( { where: { orderId: req.params.id } }),
			prisma.paymentOrder.deleteMany(    { where: { orderId: req.params.id } }),
			prisma.financeTransaction.deleteMany({ where: { relatedOrderId: req.params.id } }),
			prisma.order.delete({ where: { id: req.params.id } }),
		]);

		res.json({
			message: "Order deleted successfully",
			order: orderFromPrisma(order),
		});
	} catch (error) {
		next(error);
	}
}

async function getOrderHistory(req, res, next) {
	try {
		const history = await prisma.orderHistory.findMany({
			where: { orderId: req.params.id },
			orderBy: { createdAt: "asc" },
		});
		res.json(history.map(orderHistoryFromPrisma));
	} catch (error) {
		next(error);
	}
}

async function getCustomerByPhone(req, res, next) {
	try {
		const order = await prisma.order.findFirst({
			where: {
				customerPhone: {
					contains: req.params.phone,
					mode: "insensitive",
				},
			},
			orderBy: { createdAt: "desc" },
			select: {
				customerFirstName: true,
				customerLastName: true,
				customerPhone: true,
				district: true,
				city: true,
			},
		});

		if (!order) return res.status(404).json({ error: "Customer not found" });
		res.json({
			f: order.customerFirstName,
			l: order.customerLastName,
			p: order.customerPhone,
			loc: { d: order.district, cty: order.city },
		});
	} catch (error) {
		next(error);
	}
}

async function trackOrder(req, res, next) {
	try {
		const order = await prisma.order.findUnique({
			where: { id: req.params.id },
			include: {
				merchant: { select: { username: true } },
				driver: { select: { username: true } },
			},
		});
		if (!order) return res.status(404).json({ error: "Order not found" });

		const history = await prisma.orderHistory.findMany({
			where: { orderId: order.id },
			orderBy: { createdAt: "asc" },
		});

		const mappedOrder = orderFromPrisma(order, history.map(orderHistoryFromPrisma));
		mappedOrder.driver = mappedOrder.driver || "Not assigned";

		res.json(mappedOrder);
	} catch (error) {
		next(error);
	}
}

async function cancelOrder(req, res, next) {
	try {
		const { cancelledBy, cancelledFromStatus } = req.body;
 
		if (!cancelledBy || !["merchant", "customer"].includes(cancelledBy)) {
			return res.status(400).json({ error: "cancelledBy must be 'merchant' or 'customer'" });
		}
 
		const order = await prisma.order.findUnique({
			where: { id: req.params.id },
			include: {
				merchant: { select: { username: true } },
				driver: { select: { username: true } },
			},
		});
 
		if (!order) return res.status(404).json({ error: "Order not found" });
		if (order.status === "Canceled") {
			return res.status(400).json({ error: "Order is already cancelled" });
		}
 
		// Merchant owes the delivery charge whenever the CUSTOMER cancels
		// (pickup status no longer matters). Merchant cancellations are free.
		// The charge is only settled once the goods are collected back from
		// the driver — that's enforced in the finance queries.
		const deliveryChargeOwed =
			cancelledBy === "customer" ? order.deliveryCharge : 0;

		const historyEntry = {
			orderId: req.params.id,
			actionType: "cancellation",
			newValue: { status: "Canceled", cancelledBy, cancelledFromStatus },
			performedBy: req.user.username,
			metadata: {
				cancelledBy,
				cancelledFromStatus,
				deliveryChargeOwed,
				note:
					cancelledBy === "merchant"
						? "Cancelled by merchant — no charges"
						: `Cancelled by customer — merchant owes delivery charge of $${deliveryChargeOwed} (settled once collected back)`,
			},
		};
 
		const [updatedOrder] = await prisma.$transaction([
			prisma.order.update({
				where: { id: req.params.id },
				data: {
					status: "Canceled",
					cancelledBy,
					cancelledFromStatus,
					statusUpdatedAt: new Date(),
				},
				include: {
					merchant: { select: { username: true } },
					driver: { select: { username: true } },
				},
			}),
			prisma.orderHistory.create({ data: historyEntry }),
		]);
 
		return res.json({
			message: "Order cancelled successfully",
			order: orderFromPrisma(updatedOrder),
			deliveryChargeOwed,
		});
	} catch (error) {
		next(error);
	}
}

async function validateOrderId(req, res, next) {
	try {
		const { orderId } = req.body;

		if (!orderId || orderId.trim() === "") {
			return res.status(400).json({
				exists: null,
				error: "Order ID is required",
			});
		}

		// Uses your Prisma setup
		const existingOrder = await prisma.order.findUnique({
			where: { id: orderId },
		});

		res.status(200).json({
			exists: existingOrder !== null,
			message: existingOrder 
				? `Order ID "${orderId}" already exists`
				: `Order ID "${orderId}" is available`,
		});
	} catch (error) {
		console.error("Order ID validation error:", error);
		res.status(500).json({
			exists: null,
			error: "Failed to validate Order ID",
		});
	}
}

async function undoLastChange(req, res, next) {
	
	try {
		const { id: orderId } = req.params;

		// Get the latest history record for this order
		const lastChange = await prisma.orderHistory.findFirst({
			where: {
				orderId: String(orderId),
				actionType: {
					not: "undo",
				},
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		if (!lastChange) {
			return res.status(400).json({
				error: "No previous change to undo",
			});
		}

		// Get current order
		const order = await prisma.order.findUnique({
			where: {
				id: String(orderId),
			},
		});

		if (!order) {
			return res.status(404).json({
				error: "Order not found",
			});
		}

		const oldValue = lastChange.oldValue;

		if (!oldValue || typeof oldValue !== "object") {
			return res.status(400).json({
				error: "Previous order values are unavailable",
			});
		}

		const revertData = {};

		// ----------------------------------------
		// Undo status change
		// ----------------------------------------
		if (lastChange.actionType === "status_change") {
			if (
				oldValue.status === undefined ||
				oldValue.status === null
			) {
				return res.status(400).json({
					error: "Previous status is unavailable",
				});
			}

			revertData.status = oldValue.status;
			revertData.statusUpdatedAt = new Date();
		}

		// ----------------------------------------
		// Undo normal update
		// ----------------------------------------
		else if (lastChange.actionType === "update") {
			const allowedFields = [
				"merchantId",
				"driverId",
				"customerFirstName",
				"customerLastName",
				"customerPhone",
				"district",
				"city",
				"total",
				"deliveryCharge",
				"createdBy",
				"status",
				"statusUpdatedAt",
				"isExpress",
				"expressNote",
				"cancelledBy",
				"cancelledFromStatus",
				"collectedBack",
				"whatsappSent",
				"whatsappSentAt",
				"whatsappMessageId",
			];

			for (const field of allowedFields) {
				if (Object.prototype.hasOwnProperty.call(oldValue, field)) {
					revertData[field] = oldValue[field];
				}
			}

			if (revertData.status !== undefined) {
				revertData.statusUpdatedAt = new Date();
			}
		}

		// ----------------------------------------
		// Unsupported action
		// ----------------------------------------
		else {
			return res.status(400).json({
				error: `Cannot undo action: ${lastChange.actionType}`,
			});
		}

		// Make sure there is something to revert
		if (Object.keys(revertData).length === 0) {
			return res.status(400).json({
				error: "No reversible changes found",
			});
		}

		// ----------------------------------------
		// Update order
		// ----------------------------------------
		const updatedOrder = await prisma.order.update({
			where: {
				id: String(orderId),
			},
			data: revertData,
		});

		// ----------------------------------------
		// Create history record for the undo
		// ----------------------------------------
		await prisma.orderHistory.create({
			data: {
				orderId: String(orderId),
				actionType: "undo",
				oldValue: order,
				newValue: updatedOrder,
				performedBy: req.user?.username || "admin",
				metadata: {
					undoOf: lastChange.id,
				},
			},
		});

		// ----------------------------------------
		// Status label
		// ----------------------------------------
		const statusLabels = {
			WAREHOUSE: "Warehouse",
			NEW: "New",
			PICKED_UP: "Picked Up",
			DELIVERED: "Delivered",
			CANCELLED: "Cancelled",
			PAID: "Paid",
			COLLECTED: "Collected",
		};

		const previousStatusLabel =
			updatedOrder.status
				? statusLabels[updatedOrder.status] || updatedOrder.status
				: "Previous";

		return res.json({
			success: true,
			order: updatedOrder,
			previousStatusLabel,
		});
	} catch (error) {
		console.error("Undo order error:", error);

		return res.status(500).json({
			error: error.message,
		});
	}
}
 
export {
	validateOrderId,
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
	undoLastChange,
};

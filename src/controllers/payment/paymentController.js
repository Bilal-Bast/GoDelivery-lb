import prisma from "../../config/prisma.js";

// What the admin owes (or is owed by) the merchant for one order — mirrors
// the frontend's getPayout() in public/js/pay.js.
function computePayout(order) {
	if (order.cancelledBy === "merchant") return -(order.deliveryCharge || 0);
	if (order.cancelledBy === "customer") return 0;
	return (order.total || 0) - (order.deliveryCharge || 0);
}

// Get all payments (paginated)
export const getPayments = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 20;
		const merchantFilter = req.query.merchant;
 
		const where = {};
		if (merchantFilter) {
			where.merchant = {
				username: merchantFilter,
			};
		}
 
		const [payments, total] = await Promise.all([
			prisma.merchantPayment.findMany({
				where,
				include: {
					merchant: {
						select: {
							id: true,
							username: true,
							firstName: true,
							lastName: true,
						},
					},
					admin: {
						select: {
							username: true,
							firstName: true,
							lastName: true,
						},
					},
					orders: {
						include: {
							order: {
								select: {
									id: true,
									customerFirstName: true,
									customerLastName: true,
									customerPhone: true,
									total: true,
									deliveryCharge: true,
									status: true,
								},
							},
						},
					},
				},
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * limit,
				take: limit,
			}),
			prisma.merchantPayment.count({ where }),
		]);
 
		return res.json({
			data: payments,
			pagination: {
				total,
				page,
				limit,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error("Error fetching payments:", error);
		return res.status(500).json({ error: "Failed to fetch payments" });
	}
};
 
// Get single payment
export const getPaymentById = async (req, res) => {
	try {
		const payment = await prisma.merchantPayment.findUnique({
			where: { id: req.params.id },
			include: {
				merchant: true,
				admin: true,
				orders: {
					include: {
						order: {
							include: {
								merchant: true,
							},
						},
					},
				},
			},
		});
 
		if (!payment) {
			return res.status(404).json({ error: "Payment not found" });
		}
 
		return res.json({ data: payment });
	} catch (error) {
		console.error("Error fetching payment:", error);
		return res.status(500).json({ error: "Failed to fetch payment" });
	}
};
 
// Get payments by merchant
export const getPaymentsByMerchant = async (req, res) => {
	try {
		const { merchantUsername } = req.params;
 
		const merchant = await prisma.user.findFirst({
			where: { username: merchantUsername, role: "MERCHANT" },
		});
 
		if (!merchant) {
			return res.status(404).json({ error: "Merchant not found" });
		}
 
		const payments = await prisma.merchantPayment.findMany({
			where: { merchantId: merchant.id },
			include: {
				orders: {
					include: {
						order: {
							include: {
								merchant: true,
							},
						},
					},
				},
				admin: true,
			},
			orderBy: { createdAt: "desc" },
		});
 
		return res.json({ data: payments });
	} catch (error) {
		console.error("Error fetching merchant payments:", error);
		return res.status(500).json({ error: "Failed to fetch payments" });
	}
};
 
// Create new payment
export const createPayment = async (req, res) => {
	try {
		const { merchantUsername, orderIds, amount, notes } = req.body;
 
		// Validate input
		if (!merchantUsername || !orderIds || orderIds.length === 0) {
			return res.status(400).json({ error: "Missing required fields" });
		}
 
		if (amount == null) {
			return res.status(400).json({ error: "Amount is required" });
		}

		// Don't let the same order get settled (and its delivery-charge
		// deduction applied) twice across two different payments.
		const alreadySettled = await prisma.paymentOrder.findFirst({
			where: { orderId: { in: orderIds } },
		});
		if (alreadySettled) {
			return res
				.status(400)
				.json({ error: "One or more orders have already been paid" });
		}

		// Find merchant
		const merchant = await prisma.user.findFirst({
			where: { username: merchantUsername, role: "MERCHANT" },
		});

		if (!merchant) {
			return res.status(404).json({ error: "Merchant not found" });
		}

		// Find current admin user
		const admin = await prisma.user.findFirst({
			where: { id: req.user.id },
		});

		if (!admin) {
			return res.status(401).json({ error: "Admin not found" });
		}

		// Find orders
		const orders = await prisma.order.findMany({
			where: { id: { in: orderIds } },
		});

		if (orders.length === 0) {
			return res.status(404).json({ error: "No orders found" });
		}

		// Get next payment number
		const lastPayment = await prisma.merchantPayment.findFirst({
			orderBy: { number: "desc" },
			select: { number: true },
		});
 
		const nextNumber = (lastPayment?.number || 0) + 1;
 
		// Create payment with transaction
		const payment = await prisma.$transaction(async (tx) => {
			// Create payment
			const newPayment = await tx.merchantPayment.create({
				data: {
					number: nextNumber,
					merchantId: merchant.id,
					adminId: admin.id,
					amount: parseFloat(amount),
					orders: {
						create: orderIds.map((orderId) => ({
							orderId,
						})),
					},
				},
				include: {
					orders: {
						include: {
							order: {
								include: {
									merchant: true,
								},
							},
						},
					},
					merchant: true,
					admin: true,
				},
			});
 
			// Every settled order moves to Paid — this covers orders that went
			// through driver collection (now COLLECTED) as well as
			// merchant-cancelled orders paid directly from Canceled (no driver
			// collection needed since no cash ever changed hands with them).
			await tx.order.updateMany({
				where: { id: { in: orderIds } },
				data: {
					status: "Paid",
					statusUpdatedAt: new Date(),
				},
			});
 
			// Create finance transaction record
			const absAmount = Math.abs(parseFloat(amount));
			const transactionType = parseFloat(amount) >= 0 ? "MERCHANT_PAYMENT" : "CASH_IN";
 
			if (absAmount > 0) {
				await tx.financeTransaction.create({
					data: {
						type: transactionType,
						amount: absAmount,
						merchantId: merchant.id,
						adminId: admin.id,
						description: `Payment #${nextNumber} to merchant ${merchant.username}`,
						notes: notes || "",
						date: new Date(),
						status: "DELIVERED",
					},
				});
			}
 
			return newPayment;
		});
 
		return res.status(201).json({
			message: "Payment created successfully",
			data: payment,
		});
	} catch (error) {
		console.error("Error creating payment:", error);
		return res.status(500).json({ error: "Failed to create payment" });
	}
};
 
// Update payment
export const updatePayment = async (req, res) => {
	try {
		const { notes } = req.body;
 
		const updated = await prisma.merchantPayment.update({
			where: { id: req.params.id },
			data: {
				...(notes !== undefined && { notes }),
			},
			include: {
				merchant: true,
				admin: true,
				orders: {
					include: {
						order: true,
					},
				},
			},
		});
 
		return res.json({
			message: "Payment updated successfully",
			data: updated,
		});
	} catch (error) {
		console.error("Error updating payment:", error);
		if (error.code === "P2025") {
			return res.status(404).json({ error: "Payment not found" });
		}
		return res.status(500).json({ error: "Failed to update payment" });
	}
};
 
// Delete payment
export const deletePayment = async (req, res) => {
	try {
		const payment = await prisma.merchantPayment.findUnique({
			where: { id: req.params.id },
		});
 
		if (!payment) {
			return res.status(404).json({ error: "Payment not found" });
		}
 
		// Delete in transaction to rollback finance transaction if needed
		await prisma.$transaction(async (tx) => {
			// Delete associated finance transaction
			await tx.financeTransaction.deleteMany({
				where: {
					description: {
						contains: `Payment #${payment.number}`,
					},
				},
			});
 
			// Delete payment (cascade will delete PaymentOrders)
			await tx.merchantPayment.delete({
				where: { id: req.params.id },
			});
		});
 
		return res.json({ message: "Payment deleted successfully" });
	} catch (error) {
		console.error("Error deleting payment:", error);
		if (error.code === "P2025") {
			return res.status(404).json({ error: "Payment not found" });
		}
		return res.status(500).json({ error: "Failed to delete payment" });
	}
};
 
// Generate PDF for payment
export const generatePaymentPDF = async (req, res) => {
	try {
		const PDFDocument = (await import("pdfkit")).default;
 
		const payment = await prisma.merchantPayment.findUnique({
			where: { id: req.params.id },
			include: {
				merchant: true,
				admin: true,
				orders: {
					include: {
						order: {
							include: {
								merchant: true,
							},
						},
					},
				},
			},
		});
 
		if (!payment) {
			return res.status(404).json({ error: "Payment not found" });
		}
 
		// Create PDF
		const doc = new PDFDocument({
			margin: 50,
			size: "A4",
		});
 
		// Set response headers
		res.setHeader("Content-Type", "application/pdf");
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="payment-${payment.number}.pdf"`,
		);
 
		// Pipe to response
		doc.pipe(res);
 
		// Header
		doc.fontSize(20).font("Helvetica-Bold").text("Payment Report", {
			align: "center",
		});
		doc.moveDown(0.5);
 
		// Payment info
		doc.fontSize(12).font("Helvetica").text(
			`Payment #${payment.number}`,
			{
				align: "left",
			},
		);
 
		const merchantName = `${payment.merchant.firstName} ${payment.merchant.lastName}`.trim() || payment.merchant.username;
		const adminName = `${payment.admin.firstName} ${payment.admin.lastName}`.trim() || payment.admin.username;
 
		doc.text(`Merchant: ${merchantName}`);
		doc.text(
			`Date: ${new Date(payment.createdAt).toLocaleDateString()} ${new Date(
				payment.createdAt,
			).toLocaleTimeString()}`,
		);
		doc.text(`Recorded by: ${adminName}`);
 
		doc.moveDown(1);
 
		// Table headers
		const tableTop = doc.y;
		const col1 = 50;
		const col2 = 150;
		const col3 = 280;
		const col4 = 380;
		const col5 = 480;
 
		doc.fontSize(10).font("Helvetica-Bold");
		doc.text("Order ID", col1, tableTop);
		doc.text("Customer", col2, tableTop);
		doc.text("Total", col3, tableTop);
		doc.text("Delivery", col4, tableTop);
		doc.text("Payout", col5, tableTop);
 
		// Table body
		let yPosition = tableTop + 20;
		const pageHeight = doc.page.height;
		const bottomMargin = 50;
 
		doc.fontSize(9).font("Helvetica");
 
		payment.orders.forEach((payOrder) => {
			const order = payOrder.order;
 
			// Check if we need a new page
			if (yPosition > pageHeight - bottomMargin) {
				doc.addPage();
				yPosition = 50;
 
				// Repeat headers on new page
				doc.fontSize(10).font("Helvetica-Bold");
				doc.text("Order ID", col1, yPosition);
				doc.text("Customer", col2, yPosition);
				doc.text("Total", col3, yPosition);
				doc.text("Delivery", col4, yPosition);
				doc.text("Payout", col5, yPosition);
 
				yPosition += 20;
				doc.fontSize(9).font("Helvetica");
			}
 
			const customerName = `${order.customerFirstName} ${order.customerLastName || ""}`.trim();
			const payout = computePayout(order);
 
			doc.text(order.id, col1, yPosition, { width: 90 });
			doc.text(customerName, col2, yPosition, { width: 120 });
			doc.text(`$${(order.total || 0).toFixed(2)}`, col3, yPosition, {
				width: 90,
			});
			doc.text(`$${(order.deliveryCharge || 0).toFixed(2)}`, col4, yPosition, {
				width: 80,
			});
			doc.text(
				`${payout < 0 ? "-" : ""}$${Math.abs(payout).toFixed(2)}`,
				col5,
				yPosition,
			);
 
			yPosition += 15;
		});
 
		// Summary
		doc.moveDown(1);
		doc.fontSize(11).font("Helvetica-Bold");
		doc.text(`Total Orders: ${payment.orders.length}`);
		doc.text(`Net Amount: ${payment.amount >= 0 ? "$" : "-$"}${Math.abs(payment.amount).toFixed(2)}`, {
			color: payment.amount >= 0 ? "#3b82f6" : "#dc2626",
		});
 
		// Footer
		doc.moveDown(2);
		doc.fontSize(9)
			.font("Helvetica")
			.text(
				`Generated: ${new Date().toLocaleString()} | Payment ID: ${
					payment.id
				}`,
				{
					align: "center",
					color: "#94a3b8",
				},
			);
 
		// Finalize PDF
		doc.end();
	} catch (error) {
		console.error("Error generating PDF:", error);
		return res.status(500).json({ error: "Failed to generate PDF" });
	}
};
 
// Get merchant payment stats
export const getPaymentStats = async (req, res) => {
	try {
		const { merchantUsername } = req.params;
 
		const merchant = await prisma.user.findFirst({
			where: { username: merchantUsername, role: "MERCHANT" },
		});
 
		if (!merchant) {
			return res.status(404).json({ error: "Merchant not found" });
		}
 
		// Get stats
		const stats = await prisma.merchantPayment.aggregate({
			where: { merchantId: merchant.id },
			_count: true,
			_sum: { amount: true },
		});
 
		const thisMonth = new Date();
		thisMonth.setDate(1);
 
		const monthStats = await prisma.merchantPayment.aggregate({
			where: {
				merchantId: merchant.id,
				createdAt: { gte: thisMonth },
			},
			_count: true,
			_sum: { amount: true },
		});
 
		return res.json({
			data: {
				total: {
					payments: stats._count,
					amount: stats._sum.amount || 0,
				},
				thisMonth: {
					payments: monthStats._count,
					amount: monthStats._sum.amount || 0,
				},
			},
		});
	} catch (error) {
		console.error("Error fetching payment stats:", error);
		return res.status(500).json({ error: "Failed to fetch stats" });
	}
};
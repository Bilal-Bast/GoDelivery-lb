import prisma from "../../config/prisma.js";
import {
	COLORS,
	createReportDoc,
	drawHeader,
	drawInfoCard,
	drawTable,
	drawSummary,
	money,
	sanitizeFilenamePart,
	formatDateForFilename,
} from "../../utils/pdfReport.js";
import { getPrepaidMerchantBalances } from "../finance.controller.js";
import {
	SettlementValidationError,
	assertSettlementCanBeDeleted,
	createPaymentSettlement,
} from "../../services/settlement.service.js";
import {
	paginationMeta,
	parseBoundedPagination,
} from "../../utils/pagination.js";

const selfPaymentInclude = {
	admin: {
		select: {
			id: true,
			username: true,
			firstName: true,
			lastName: true,
		},
	},
	orders: {
		select: {
			order: {
				select: {
					id: true,
					total: true,
					deliveryCharge: true,
					status: true,
					createdAt: true,
				},
			},
		},
	},
};

function mapSelfPayment(payment) {
	return {
		id: payment.id,
		number: payment.number,
		amount: payment.amount,
		isAdvance: payment.isAdvance,
		notes: payment.notes,
		status: payment.status,
		createdAt: payment.createdAt,
		admin: payment.admin,
		orders: payment.orders.map(({ order }) => order),
	};
}

export function createGetMyPayments(db = prisma) {
	return async (req, res) => {
		try {
			const { page, limit, skip } = parseBoundedPagination(req.query);
			const where = { merchantId: req.user.id };
			const [payments, total] = await Promise.all([
				db.merchantPayment.findMany({
					where,
					include: selfPaymentInclude,
					orderBy: [{ createdAt: "desc" }, { id: "desc" }],
					skip,
					take: limit,
				}),
				db.merchantPayment.count({ where }),
			]);

			return res.json({
				data: payments.map(mapSelfPayment),
				pagination: paginationMeta({ page, limit, total }),
			});
		} catch (error) {
			console.error("Error fetching authenticated merchant payments:", error);
			return res.status(500).json({ error: "Failed to fetch payments" });
		}
	};
}

export const getMyPayments = createGetMyPayments();

// What the admin owes (or is owed by) the merchant for one order — mirrors
// the frontend's getPayout() in public/js/pay.js.
function computePayout(order) {
	if (order.cancelledBy) return 0;
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
		if (req.query.isAdvance != null) {
			where.isAdvance = req.query.isAdvance === "true";
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
		const { merchantUsername, orderIds, notes } = req.body;

		// Validate input
		if (!merchantUsername || !orderIds || orderIds.length === 0) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		// Find merchant
		const merchant = await prisma.user.findFirst({
			where: { username: merchantUsername, role: "MERCHANT" },
		});

		if (!merchant) {
			return res.status(404).json({ error: "Merchant not found" });
		}

		// Prepaid merchants are paid in advance against a running balance from
		// the Finance page — settling their orders here too would pay twice.
		if (merchant.accountType === "PREPAID") {
			return res.status(400).json({
				error: "This merchant is prepaid — pay them from the Finance page instead",
			});
		}

		// Find current admin user
		const admin = await prisma.user.findFirst({
			where: { id: req.user.id },
		});

		if (!admin) {
			return res.status(401).json({ error: "Admin not found" });
		}

		const settlementResult = await createPaymentSettlement({
			prisma,
			merchant,
			admin,
			orderIds,
			notes,
		});
		return res.status(201).json({
			message: "Payment created successfully",
			data: settlementResult.payment,
		});

	} catch (error) {
		if (error instanceof SettlementValidationError) {
			return res.status(error.statusCode).json({ error: error.message });
		}
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
			include: { orders: { select: { id: true } } },
		});
 
		if (!payment) {
			return res.status(404).json({ error: "Payment not found" });
		}
		assertSettlementCanBeDeleted("payment", payment.orders.length);
 
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
		if (error instanceof SettlementValidationError) {
			return res.status(error.statusCode).json({ error: error.message });
		}
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

		const doc = await createReportDoc();

		const filenamePrefix = payment.isAdvance ? "advance" : "pay";
		const filename = `${filenamePrefix}(${sanitizeFilenamePart(payment.merchant.username)})(${formatDateForFilename(payment.createdAt)}).pdf`;
		res.setHeader("Content-Type", "application/pdf");
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="${filename}"`,
		);
		doc.pipe(res);

		const merchantName =
			`${payment.merchant.firstName} ${payment.merchant.lastName}`.trim() ||
			payment.merchant.username;
		const adminName =
			`${payment.admin.firstName} ${payment.admin.lastName}`.trim() ||
			payment.admin.username;

		drawHeader(doc, {
			title: payment.isAdvance ? "Prepaid Advance Report" : "Payment Report",
			number: payment.number,
		});

		if (payment.isAdvance) {
			// Advances aren't tied to specific orders — there's nothing to
			// tabulate, just the amount handed over (or collected back) and why.
			const isCollection = payment.amount < 0;
			const infoItems = [
				{ label: "Merchant", value: merchantName },
				{ label: "Date", value: new Date(payment.createdAt).toLocaleString() },
				{ label: "Recorded By", value: adminName },
			];
			if (payment.notes) {
				infoItems.push({ label: "Note", value: payment.notes });
			}
			drawInfoCard(doc, infoItems);

			const [currentBalance] = await getPrepaidMerchantBalances(
				payment.merchant.username,
			);
			const amountLeft = currentBalance?.balance ?? null;

			drawSummary(doc, {
				lines: [
					{ label: "Type", value: "Prepaid Advance" },
					{
						label: isCollection ? "Amount Collected" : "Amount Paid",
						value: money(payment.amount, { signed: true }),
						color: isCollection ? COLORS.negative : COLORS.positive,
					},
				],
				netLabel: "Amount Left (current balance)",
				netValue: amountLeft != null ? money(amountLeft, { signed: true }) : "—",
				netColor:
					amountLeft == null
						? COLORS.text
						: amountLeft < 0
							? COLORS.negative
							: COLORS.positive,
			});
		} else {
			drawInfoCard(doc, [
				{ label: "Merchant", value: merchantName },
				{ label: "Date", value: new Date(payment.createdAt).toLocaleString() },
				{ label: "Recorded By", value: adminName },
				{ label: "Orders Settled", value: String(payment.orders.length) },
			]);

			drawTable(doc, {
				columns: [
					{ label: "ORDER ID", width: 70 },
					{ label: "CUSTOMER", width: 80 },
					{ label: "PHONE", width: 90 },
					{ label: "TOTAL", width: 70, align: "right" },
					{ label: "DELIVERY", width: 70, align: "right" },
					{ label: "PAYOUT", width: 85, align: "right" },
				],
				rows: payment.orders.map(({ order }) => {
					const payout = computePayout(order);
					return {
						cells: [
							{ text: order.id },
							{
								text: `${order.customerFirstName} ${order.customerLastName || ""}`.trim(),
							},
							{
								text: order.customerPhone || "—",
							},
							{ text: money(order.total) },
							{ text: money(order.deliveryCharge) },
							{
								text: money(payout, { signed: true }),
								color: payout < 0 ? COLORS.negative : COLORS.text,
							},
						],
					};
				}),
			});

			drawSummary(doc, {
				lines: [
					{ label: "Total Orders", value: String(payment.orders.length) },
				],
				netLabel: "Net Amount",
				netValue: money(payment.amount, { signed: true }),
				netColor: payment.amount >= 0 ? COLORS.positive : COLORS.negative,
			});
		}

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

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

// Goods value of one order — what the merchant is getting back in stock terms.
// Never a payable amount: returns move product, not money.
function goodsValueOf(order) {
	return (order.total ?? 0) - (order.deliveryCharge ?? 0);
}

// Why this order is on the Return page, for display and for the PDF.
function returnReasonOf(order) {
	if (order.cancelledBy === "merchant") return "Cancelled by Merchant";
	if (order.cancelledBy === "customer") return "Cancelled by Customer";
	if (order.isExpress) return "Exchange";
	return "Return";
}

// An order can be handed back once the driver has physically returned it to
// us (collectedBack), and only if it hasn't already been returned. Cancelled
// orders qualify; so do exchange orders, whose swapped-out goods come back
// even when the delivery itself succeeded.
const RETURNABLE_WHERE = {
	collectedBack: true,
	returnedToMerchantAt: null,
	OR: [{ cancelledBy: { not: null } }, { isExpress: true }],
};

// Get all returns (paginated)
export const getReturns = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 20;
		const merchantFilter = req.query.merchant;

		const where = {};
		if (merchantFilter) {
			where.merchant = { username: merchantFilter };
		}

		const [returns, total] = await Promise.all([
			prisma.merchantReturn.findMany({
				where,
				include: {
					merchant: {
						select: {
							id: true,
							username: true,
							firstName: true,
							lastName: true,
							accountType: true,
						},
					},
					admin: {
						select: { username: true, firstName: true, lastName: true },
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
									cancelledBy: true,
									isExpress: true,
								},
							},
						},
					},
				},
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * limit,
				take: limit,
			}),
			prisma.merchantReturn.count({ where }),
		]);

		return res.json({
			data: returns,
			pagination: {
				total,
				page,
				limit,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error("Error fetching returns:", error);
		return res.status(500).json({ error: "Failed to fetch returns" });
	}
};

// Get single return
export const getReturnById = async (req, res) => {
	try {
		const merchantReturn = await prisma.merchantReturn.findUnique({
			where: { id: req.params.id },
			include: {
				merchant: true,
				admin: true,
				orders: { include: { order: true } },
			},
		});

		if (!merchantReturn) {
			return res.status(404).json({ error: "Return not found" });
		}

		return res.json({ data: merchantReturn });
	} catch (error) {
		console.error("Error fetching return:", error);
		return res.status(500).json({ error: "Failed to fetch return" });
	}
};

// Get returns by merchant
export const getReturnsByMerchant = async (req, res) => {
	try {
		const { merchantUsername } = req.params;

		const merchant = await prisma.user.findFirst({
			where: { username: merchantUsername, role: "MERCHANT" },
		});

		if (!merchant) {
			return res.status(404).json({ error: "Merchant not found" });
		}

		const returns = await prisma.merchantReturn.findMany({
			where: { merchantId: merchant.id },
			include: {
				orders: { include: { order: true } },
				admin: true,
			},
			orderBy: { createdAt: "desc" },
		});

		return res.json({ data: returns });
	} catch (error) {
		console.error("Error fetching merchant returns:", error);
		return res.status(500).json({ error: "Failed to fetch returns" });
	}
};

// Orders currently eligible to hand back to a given merchant
export const getReturnableOrders = async (req, res) => {
	try {
		const { merchantUsername } = req.params;

		const merchant = await prisma.user.findFirst({
			where: { username: merchantUsername, role: "MERCHANT" },
		});

		if (!merchant) {
			return res.status(404).json({ error: "Merchant not found" });
		}

		const orders = await prisma.order.findMany({
			where: { merchantId: merchant.id, ...RETURNABLE_WHERE },
			orderBy: { statusUpdatedAt: "desc" },
			select: {
				id: true,
				customerFirstName: true,
				customerLastName: true,
				customerPhone: true,
				district: true,
				city: true,
				total: true,
				deliveryCharge: true,
				status: true,
				cancelledBy: true,
				isExpress: true,
				statusUpdatedAt: true,
			},
		});

		return res.json({
			data: orders.map((order) => ({
				id: order.id,
				customerName: `${order.customerFirstName || ""} ${order.customerLastName || ""}`.trim(),
				phone: order.customerPhone,
				district: order.district,
				city: order.city,
				total: order.total ?? 0,
				deliveryCharge: order.deliveryCharge ?? 0,
				goodsValue: goodsValueOf(order),
				cancelledBy: order.cancelledBy,
				isExchange: order.isExpress,
				reason: returnReasonOf(order),
				statusUpdatedAt: order.statusUpdatedAt,
			})),
			merchant: {
				username: merchant.username,
				accountType: merchant.accountType,
			},
		});
	} catch (error) {
		console.error("Error fetching returnable orders:", error);
		return res.status(500).json({ error: "Failed to fetch returnable orders" });
	}
};

/**
 * Record a hand-back of goods to a merchant.
 *
 * No money moves here, by design:
 *  - Customer-cancelled → the CUSTOMER paid the delivery charge to the driver,
 *    so the merchant owes nothing.
 *  - Merchant-cancelled → free, nothing was ever charged.
 *  - Prepaid merchants → their balance already fell when the order was
 *    cancelled, because getPrepaidMerchantBalances() only counts orders with
 *    cancelledBy: null toward `entitled`. Recording anything extra here would
 *    charge them twice.
 *
 * Status handling differs by case:
 *  - Cancelled + POSTPAID → moves to Paid, closing the order out.
 *  - Cancelled + PREPAID  → status left alone; the balance already settled it.
 *  - Exchange, not cancelled → status left alone, so the merchant is still
 *    paid normally for the delivery on the Pay page.
 */
export const createReturn = async (req, res) => {
	try {
		const { merchantUsername, orderIds, notes } = req.body;

		if (!merchantUsername || !orderIds || orderIds.length === 0) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		// Don't let the same goods be handed back twice.
		const alreadyReturned = await prisma.returnOrder.findFirst({
			where: { orderId: { in: orderIds } },
		});
		if (alreadyReturned) {
			return res
				.status(400)
				.json({ error: "One or more orders have already been returned" });
		}

		const merchant = await prisma.user.findFirst({
			where: { username: merchantUsername, role: "MERCHANT" },
		});
		if (!merchant) {
			return res.status(404).json({ error: "Merchant not found" });
		}

		const admin = await prisma.user.findFirst({ where: { id: req.user.id } });
		if (!admin) {
			return res.status(401).json({ error: "Admin not found" });
		}

		// Re-check eligibility server-side rather than trusting the posted list:
		// this rejects orders belonging to another merchant, orders still out
		// with a driver, and anything already returned.
		const orders = await prisma.order.findMany({
			where: {
				id: { in: orderIds },
				merchantId: merchant.id,
				...RETURNABLE_WHERE,
			},
		});

		if (orders.length === 0) {
			return res
				.status(400)
				.json({ error: "No eligible orders found for this merchant" });
		}
		if (orders.length !== orderIds.length) {
			const eligible = new Set(orders.map((o) => o.id));
			const rejected = orderIds.filter((id) => !eligible.has(id));
			return res.status(400).json({
				error: `Not returnable for this merchant: ${rejected.join(", ")}`,
			});
		}

		const isPrepaid = merchant.accountType === "PREPAID";
		const goodsValue = orders.reduce((sum, o) => sum + goodsValueOf(o), 0);

		// Cancelled orders for a postpaid merchant close out as Paid. Exchange
		// orders that were actually delivered keep their status so they still
		// show up for payment; prepaid cancellations are already settled by the
		// running balance.
		const closeOutIds = isPrepaid
			? []
			: orders.filter((o) => o.cancelledBy).map((o) => o.id);

		const lastReturn = await prisma.merchantReturn.findFirst({
			orderBy: { number: "desc" },
			select: { number: true },
		});
		const nextNumber = (lastReturn?.number || 0) + 1;

		const returnedAt = new Date();
		const allIds = orders.map((o) => o.id);

		const created = await prisma.$transaction(async (tx) => {
			const newReturn = await tx.merchantReturn.create({
				data: {
					number: nextNumber,
					merchantId: merchant.id,
					adminId: admin.id,
					goodsValue,
					notes: notes || "",
					orders: { create: allIds.map((orderId) => ({ orderId })) },
				},
				include: {
					orders: { include: { order: true } },
					merchant: true,
					admin: true,
				},
			});

			// Mark every order as physically handed back.
			await tx.order.updateMany({
				where: { id: { in: allIds } },
				data: { returnedToMerchantAt: returnedAt },
			});

			if (closeOutIds.length > 0) {
				await tx.order.updateMany({
					where: { id: { in: closeOutIds } },
					data: { status: "Paid", statusUpdatedAt: returnedAt },
				});
			}

			await tx.orderHistory.createMany({
				data: orders.map((order) => ({
					orderId: order.id,
					actionType: "return",
					newValue: { returnNumber: nextNumber },
					performedBy: admin.username,
					metadata: {
						reason: returnReasonOf(order),
						goodsValue: goodsValueOf(order),
						merchant: merchant.username,
						accountType: isPrepaid ? "prepaid" : "postpaid",
						closedOutAsPaid: closeOutIds.includes(order.id),
						note: "Goods returned to merchant — no money moved",
					},
				})),
			});

			return newReturn;
		});

		return res.status(201).json({
			message: "Return recorded successfully",
			data: created,
		});
	} catch (error) {
		console.error("Error creating return:", error);
		return res.status(500).json({ error: "Failed to create return" });
	}
};

// Update return (notes only)
export const updateReturn = async (req, res) => {
	try {
		const { notes } = req.body;

		const updated = await prisma.merchantReturn.update({
			where: { id: req.params.id },
			data: { ...(notes !== undefined && { notes }) },
			include: {
				merchant: true,
				admin: true,
				orders: { include: { order: true } },
			},
		});

		return res.json({ message: "Return updated successfully", data: updated });
	} catch (error) {
		console.error("Error updating return:", error);
		if (error.code === "P2025") {
			return res.status(404).json({ error: "Return not found" });
		}
		return res.status(500).json({ error: "Failed to update return" });
	}
};

// Delete return — releases the orders so they can be handed back again
export const deleteReturn = async (req, res) => {
	try {
		const merchantReturn = await prisma.merchantReturn.findUnique({
			where: { id: req.params.id },
			include: { orders: true },
		});

		if (!merchantReturn) {
			return res.status(404).json({ error: "Return not found" });
		}

		const orderIds = merchantReturn.orders.map((o) => o.orderId);

		await prisma.$transaction(async (tx) => {
			await tx.returnOrder.deleteMany({
				where: { returnId: req.params.id },
			});
			await tx.merchantReturn.delete({ where: { id: req.params.id } });
			if (orderIds.length > 0) {
				await tx.order.updateMany({
					where: { id: { in: orderIds } },
					data: { returnedToMerchantAt: null },
				});
			}
		});

		return res.json({ message: "Return deleted successfully" });
	} catch (error) {
		console.error("Error deleting return:", error);
		if (error.code === "P2025") {
			return res.status(404).json({ error: "Return not found" });
		}
		return res.status(500).json({ error: "Failed to delete return" });
	}
};

// Generate PDF handover receipt
export const generateReturnPDF = async (req, res) => {
	try {
		const merchantReturn = await prisma.merchantReturn.findUnique({
			where: { id: req.params.id },
			include: {
				merchant: true,
				admin: true,
				orders: { include: { order: true } },
			},
		});

		if (!merchantReturn) {
			return res.status(404).json({ error: "Return not found" });
		}

		const doc = await createReportDoc();

		const filename = `return(${sanitizeFilenamePart(merchantReturn.merchant.username)})(${formatDateForFilename(merchantReturn.createdAt)}).pdf`;
		res.setHeader("Content-Type", "application/pdf");
		res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
		doc.pipe(res);

		const merchantName =
			`${merchantReturn.merchant.firstName} ${merchantReturn.merchant.lastName}`.trim() ||
			merchantReturn.merchant.username;
		const adminName =
			`${merchantReturn.admin.firstName} ${merchantReturn.admin.lastName}`.trim() ||
			merchantReturn.admin.username;

		drawHeader(doc, {
			title: "Returned Goods Report",
			number: merchantReturn.number,
		});

		drawInfoCard(doc, [
			{ label: "Merchant", value: merchantName },
			{
				label: "Date",
				value: new Date(merchantReturn.createdAt).toLocaleString(),
			},
			{ label: "Handed Over By", value: adminName },
			{
				label: "Orders Returned",
				value: String(merchantReturn.orders.length),
			},
		]);

		drawTable(doc, {
			columns: [
				{ label: "ORDER ID", width: 100 },
				{ label: "CUSTOMER", width: 125 },
				{ label: "REASON", width: 130 },
				{ label: "GOODS VALUE", width: 95, align: "right" },
			],
			rows: merchantReturn.orders.map(({ order }) => ({
				cells: [
					{ text: order.id },
					{
						text: `${order.customerFirstName} ${order.customerLastName || ""}`.trim(),
					},
					{ text: returnReasonOf(order) },
					{ text: money(goodsValueOf(order)) },
				],
			})),
		});

		drawSummary(doc, {
			lines: [
				{
					label: "Total Orders",
					value: String(merchantReturn.orders.length),
				},
				{
					label: "Goods Value Returned",
					value: money(merchantReturn.goodsValue),
				},
			],
			netLabel: "Amount Payable",
			netValue: money(0),
			netColor: COLORS.text,
		});

		doc.end();
	} catch (error) {
		console.error("Error generating return PDF:", error);
		return res.status(500).json({ error: "Failed to generate PDF" });
	}
};

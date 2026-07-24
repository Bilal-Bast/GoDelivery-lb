import prisma from "../config/prisma.js";
import { statusEnumToNumber, statusNumberToEnum } from "../utils/orderStatus.js";
import { formatUserDisplayName } from "../utils/userDisplay.js";

function formatCurrency(value) {
	return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getPeriodRange(days) {
	const now = new Date();
	const start = new Date();
	start.setDate(now.getDate() - days);
	return { start, end: now };
}

const transactionTypeMap = {
	"Cash In": "CASH_IN",
	"Cash Out": "CASH_OUT",
	"Merchant Payment": "MERCHANT_PAYMENT",
	"Driver Collection": "DRIVER_COLLECTION",
	Expense: "EXPENSE",
	Refund: "REFUND",
};

const paymentMethodMap = {
	Cash: "CASH",
	OMT: "OMT",
	Whish: "WHISH",
};

const transactionStatusMap = {
	DELIVERED: "Completed",
	Picked_up: "Pending",
	CANCELLED: "Cancelled",
};

const expenseCategoryMap = {
	Fuel: "FUEL",
	Rent: "RENT",
	Electricity: "ELECTRICITY",
	Water: "WATER",
	Internet: "INTERNET",
	"Office Supplies": "OFFICE_SUPPLIES",
	Equipment: "EQUIPMENT",
	Maintenance: "MAINTENANCE",
	Marketing: "MARKETING",
	Refunds: "REFUNDS",
	Salaries: "SALARIES",
	Other: "OTHER",
};

// ─── Live grouping helpers ─────────────────────────────────────────────────────

async function getDriverCollections() {
	const orders = await prisma.order.findMany({
		where: { status: "DELIVERED" },
		select: {
			id: true,
			total: true,
			deliveryCharge: true,
			driver: { select: { username: true, firstName: true, lastName: true } },
		},
	});

	const map = new Map();
	for (const order of orders) {
		if (!order.driver) continue;
		const key = order.driver.username;
		if (!map.has(key)) {
			map.set(key, {
				driverUsername: key,
				driverName: formatUserDisplayName(order.driver),
				orderIds: [],
				amount: 0,
			});
		}
		const entry = map.get(key);
		entry.orderIds.push(order.id);
		entry.amount += order.total ?? 0;
	}

	return [...map.values()];
}

async function getMerchantPayments() {
	const [collectedOrders, cancelledCustomerOrders] = await Promise.all([
		// Normal collected orders — we owe merchant
		prisma.order.findMany({
			where: { status: "COLLECTED" },
			select: {
				id: true,
				total: true,
				deliveryCharge: true,
				merchant: { select: { username: true, firstName: true, lastName: true } },
			},
		}),
		// Customer-cancelled orders that have been collected back from driver
		// Merchant owes admin delivery charge only
		prisma.order.findMany({
			where: {
				status: "Canceled",
				collectedBack: true,
				NOT: { cancelledBy: "merchant" },
			},
			select: {
				id: true,
				deliveryCharge: true,
				merchant: { select: { username: true, firstName: true, lastName: true } },
			},
		}),
	]);
 
	const map = new Map();
 
	function ensureEntry(merchantUser) {
		const key = merchantUser.username;
		if (!map.has(key)) {
			map.set(key, {
				merchantUsername: key,
				merchantName: formatUserDisplayName(merchantUser),
				orderIds: [],       // COLLECTED order IDs (normal payout)
				grossAmount: 0,     // what admin owes merchant
				deductions: [],     // delivery charges merchant owes admin
				deductionTotal: 0,
				amount: 0,          // net: positive = pay them, negative = collect from them
			});
		}
		return map.get(key);
	}
 
	// Add gross amounts from COLLECTED orders
	for (const order of collectedOrders) {
		if (!order.merchant) continue;
		const entry = ensureEntry(order.merchant);
		entry.orderIds.push(order.id);
		// Admin keeps delivery charge, pays merchant the rest
		entry.grossAmount += (order.total ?? 0) - (order.deliveryCharge ?? 0);
	}
 
	// Add deductions from customer-cancelled collected-back orders
	for (const order of cancelledCustomerOrders) {
		if (!order.merchant) continue;
		const entry = ensureEntry(order.merchant);
		entry.deductions.push({
			orderId: order.id,
			deliveryCharge: order.deliveryCharge ?? 0,
		});
		entry.deductionTotal += order.deliveryCharge ?? 0;
	}
 
	// Net amount per merchant
	for (const entry of map.values()) {
		entry.amount = entry.grossAmount - entry.deductionTotal;
	}
 
	return [...map.values()].filter(
		(e) => e.orderIds.length > 0 || e.deductions.length > 0,
	);
}

// ─── Stats builder ─────────────────────────────────────────────────────────────

function buildStats({ orders, transactions, expenses, collections, payments }) {
	const completedTransactions = transactions.filter((tx) => tx.status === "Completed");
 
	// Cash IN: money that came into admin's hands
	const cashIn = completedTransactions
		.filter((tx) => tx.type === "Cash In" || tx.type === "Driver Collection")
		.reduce((sum, tx) => sum + (tx.amount || 0), 0);
 
	// Cash OUT: money that left admin's hands
	const cashOut = completedTransactions
		.filter((tx) => tx.type === "Cash Out" || tx.type === "Merchant Payment" || tx.type === "Expense")
		.reduce((sum, tx) => sum + (tx.amount || 0), 0);
 
	// Current cash balance = what admin physically holds
	const currentCashBalance = cashIn - cashOut;
 
	// Net profit = delivery charges kept + any cash-in minus expenses and cash-out
	// Since DRIVER_COLLECTION brings full order total in,
	// and MERCHANT_PAYMENT sends (total - delivery) back out,
	// the difference is just delivery charges. We derive it from transactions directly.
	const driverCollectionTotal = completedTransactions
		.filter((tx) => tx.type === "Driver Collection")
		.reduce((sum, tx) => sum + (tx.amount || 0), 0);
 
	const merchantPaymentTotal = completedTransactions
		.filter((tx) => tx.type === "Merchant Payment")
		.reduce((sum, tx) => sum + (tx.amount || 0), 0);
 
	const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
 
	// Profit = what we kept from driver collections after paying merchants, minus expenses
	const netProfit = (driverCollectionTotal - merchantPaymentTotal) - totalExpenses;
 
	// Delivery revenue = sum of deliveryCharge on all orders (what we're entitled to keep)
	const deliveryRevenue = orders.reduce((sum, o) => sum + (o.pr?.d || 0), 0);
 
	// Total order revenue (gross — before paying merchants back)
	const totalRevenue = orders.reduce((sum, o) => sum + (o.pr?.t || 0), 0);
 
	const totalExpensesDisplay = totalExpenses;
 
	// Outstanding = what's still not settled
	const outstandingDriverCollections = collections.reduce((sum, c) => sum + (c.amount || 0), 0);
	// For merchant outstanding, use net amount (what we'll actually pay out)
	const outstandingMerchantBalance = payments.reduce((sum, p) => sum + Math.max(p.amount, 0), 0);
 
	const pendingMerchantPayments = payments.reduce((sum, p) => sum + p.orderIds.length, 0);
	const pendingDriverCollections = collections.reduce((sum, c) => sum + c.orderIds.length, 0);
 
	const weeklyRevenue = orders
		.filter((o) => new Date(o.createdAt) >= getPeriodRange(7).start)
		.reduce((sum, o) => sum + (o.pr?.d || 0), 0); // weekly delivery revenue (what we keep)
 
	const monthlyRevenue = orders
		.filter((o) => new Date(o.createdAt) >= getPeriodRange(30).start)
		.reduce((sum, o) => sum + (o.pr?.d || 0), 0); // monthly delivery revenue
 
	const omtBalance = completedTransactions
		.filter((tx) => tx.paymentMethod === "OMT")
		.reduce((sum, tx) => sum + (tx.amount || 0), 0);
 
	const whishBalance = completedTransactions
		.filter((tx) => tx.paymentMethod === "Whish")
		.reduce((sum, tx) => sum + (tx.amount || 0), 0);
 
	return {
		financial: [
			{ key: "currentCashBalance",   title: "Current Cash Balance",          value: formatCurrency(currentCashBalance),         description: "Cash admin physically holds",    trend: "", icon: "bx-wallet" },
			{ key: "netProfit",            title: "Net Profit",                     value: formatCurrency(netProfit),                  description: "Delivery fees kept minus expenses", trend: "", icon: "bx-trending-up" },
			{ key: "merchantOutstanding",  title: "Merchant Outstanding Balance",   value: formatCurrency(outstandingMerchantBalance), description: "Net owed to merchants",          trend: "", icon: "bx-store" },
			{ key: "driverOutstanding",    title: "Driver Outstanding Collections", value: formatCurrency(outstandingDriverCollections), description: "Cash still with drivers",      trend: "", icon: "bx-car" },
		],
		operations: [
			{ key: "totalOrders",             title: "Total Orders",              value: orders.length,          description: "Orders tracked",             trend: "", icon: "bx-receipt" },
			{ key: "pendingMerchantPayments", title: "Pending Merchant Payments", value: pendingMerchantPayments, description: "Orders ready to pay",       trend: "", icon: "bx-store-alt" },
			{ key: "pendingDriverCollections",title: "Pending Driver Collections",value: pendingDriverCollections,description: "Orders awaiting collection", trend: "", icon: "bx-user" },
			{ key: "totalExpenses",           title: "Total Expenses",            value: formatCurrency(totalExpensesDisplay), description: "Recorded expenses", trend: "", icon: "bx-money" },
		],
		revenue: [
			{ key: "totalRevenue",    title: "Total Order Revenue", value: formatCurrency(totalRevenue),    description: "Gross order value (before merchant payout)", trend: "", icon: "bx-line-chart" },
			{ key: "deliveryRevenue", title: "Delivery Revenue",    value: formatCurrency(deliveryRevenue), description: "Delivery fees (admin keeps)",                trend: "", icon: "bx-package" },
			{ key: "weeklyRevenue",   title: "Weekly Delivery Revenue",  value: formatCurrency(weeklyRevenue),  description: "Last 7 days",  trend: "", icon: "bx-calendar-week" },
			{ key: "monthlyRevenue",  title: "Monthly Delivery Revenue", value: formatCurrency(monthlyRevenue), description: "Last 30 days", trend: "", icon: "bx-calendar" },
		],
		cashFlow: [
			{ key: "cashIn",       title: "Total Cash In",   value: formatCurrency(cashIn),       description: "All incoming funds",   trend: "", icon: "bx-down-arrow-circle" },
			{ key: "cashOut",      title: "Total Cash Out",  value: formatCurrency(cashOut),      description: "All outgoing funds",   trend: "", icon: "bx-up-arrow-circle" },
			{ key: "omtBalance",   title: "OMT Balance",     value: formatCurrency(omtBalance),   description: "OMT transactions",     trend: "", icon: "bx-transfer" },
			{ key: "whishBalance", title: "Whish Balance",   value: formatCurrency(whishBalance), description: "Whish transactions",   trend: "", icon: "bx-transfer" },
		],
		alerts: [
			...(outstandingDriverCollections > 0
				? [{ type: "warning", title: "Driver still holding cash", detail: `${formatCurrency(outstandingDriverCollections)} awaiting collection` }]
				: []),
			...(pendingMerchantPayments > 0
				? [{ type: "warning", title: "Merchant waiting payment", detail: `${pendingMerchantPayments} orders ready for settlement` }]
				: []),
			...(expenses.length > 0
				? [{ type: "info", title: "Expenses recorded", detail: `${expenses.length} expense entries` }]
				: []),
			...(currentCashBalance < 1000
				? [{ type: "danger", title: "Low cash balance", detail: `Current cash is ${formatCurrency(currentCashBalance)}` }]
				: []),
		],
	};
}
// ─── Mappers ───────────────────────────────────────────────────────────────────

function mapOrderForStats(order) {
	return {
		id: order.id,
		createdAt: order.createdAt,
		s: statusEnumToNumber[order.status] ?? 0,
		pr: {
			t: order.total ?? 0,
			d: order.deliveryCharge ?? 0,
		},
	};
}

function mapTransaction(transaction) {
	return {
		id: transaction.id,
		type:
			transaction.type === "CASH_IN" ? "Cash In"
			: transaction.type === "CASH_OUT" ? "Cash Out"
			: transaction.type === "MERCHANT_PAYMENT" ? "Merchant Payment"
			: transaction.type === "DRIVER_COLLECTION" ? "Driver Collection"
			: transaction.type === "EXPENSE" ? "Expense"
			: transaction.type === "REFUND" ? "Refund"
			: transaction.type,
		amount: transaction.amount,
		paymentMethod: transaction.paymentMethod === "CASH" ? "Cash" : transaction.paymentMethod,
		status: transactionStatusMap[transaction.status] || transaction.status,
		relatedOrder: transaction.relatedOrderId || null,
		driver: transaction.driver?.username || null,
		merchant: transaction.merchant?.username || null,
		description: transaction.description,
		notes: transaction.notes,
		date: transaction.date,
		adminUsername: transaction.admin?.username || null,
	};
}

function mapExpense(expense) {
	return {
		id: expense.id,
		amount: expense.amount,
		category:
			expense.category === "OFFICE_SUPPLIES"
				? "Office Supplies"
				: expense.category[0] + expense.category.slice(1).toLowerCase().replace(/_/g, " "),
		description: expense.description,
		date: expense.date,
		receipt: expense.receipt,
		createdBy: expense.createdBy?.username || null,
	};
}

function mapAudit(audit) {
	return {
		id: audit.id,
		user: audit.user?.username || null,
		action: audit.action,
		description: audit.description,
		date: audit.date,
		createdAt: audit.createdAt,
	};
}

// ─── Page data ─────────────────────────────────────────────────────────────────

export async function getFinancePageData() {
	try {
		const [ordersRaw, transactionsRaw, expensesRaw, drivers, merchants, auditsRaw, collections, payments] = await Promise.all([
			prisma.order.findMany({
				orderBy: { createdAt: "desc" },
				select: { id: true, total: true, deliveryCharge: true, createdAt: true, status: true },
			}),
			prisma.financeTransaction.findMany({
				orderBy: { date: "desc" },
				include: {
					driver: { select: { username: true } },
					merchant: { select: { username: true } },
					admin: { select: { username: true } },
				},
			}),
			prisma.financeExpense.findMany({
				orderBy: { date: "desc" },
				include: { createdBy: { select: { username: true } } },
			}),
			prisma.user.findMany({
				where: { role: "DRIVER" },
				select: { username: true, firstName: true, lastName: true },
			}),
			prisma.user.findMany({
				where: { role: "MERCHANT" },
				select: { username: true, firstName: true, lastName: true },
			}),
			prisma.financeAudit.findMany({
				orderBy: { date: "desc" },
				include: { user: { select: { username: true } } },
			}),
			// Live grouping from order statuses — no separate collection/payment tables needed
			getDriverCollections(),
			getMerchantPayments(),
		]);

		const orders = ordersRaw.map(mapOrderForStats);
		const transactions = transactionsRaw.map(mapTransaction);
		const expenses = expensesRaw.map(mapExpense);
		const audits = auditsRaw.map(mapAudit);
		const stats = buildStats({ orders, transactions, expenses, collections, payments });

		return {
			orders,
			transactions,
			expenses,
			collections,
			payments,
			drivers: drivers.map((d) => ({ id: d.username, username: d.username, name: formatUserDisplayName(d) })),
			merchants: merchants.map((m) => ({ id: m.username, username: m.username, name: formatUserDisplayName(m) })),
			audits,
			stats,
		};
	} catch (error) {
		console.warn("Finance data unavailable, returning empty state:", error.message);
		const stats = buildStats({ orders: [], transactions: [], expenses: [], collections: [], payments: [] });
		return {
			orders: [], transactions: [], expenses: [], collections: [], payments: [],
			drivers: [], merchants: [], audits: [], stats,
		};
	}
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

async function findUserId(username) {
	if (!username) return null;
	const user = await prisma.user.findUnique({ where: { username } });
	return user?.id || null;
}

// ─── Collect from driver ───────────────────────────────────────────────────────

/**
 * POST /api/finance/collect-driver
 * Body: { driverUsername, paymentMethod? }
 *
 * 1. Finds all DELIVERED orders for that driver
 * 2. Sums their totals → transaction amount
 * 3. Creates a DRIVER_COLLECTION FinanceTransaction
 * 4. Bulk-updates those orders to COLLECTED
 * 5. Creates audit log entry
 * 6. Returns the new transaction + updated collections list
 */
export async function collectFromDriver(req, res, next) {
	try {
		const { driverUsername, paymentMethod } = req.body;
		if (!driverUsername) {
			return res.status(400).json({ error: "driverUsername is required" });
		}

		// Find the driver user record
		const driver = await prisma.user.findUnique({
			where: { username: driverUsername },
			select: { id: true, username: true, firstName: true, lastName: true },
		});
		if (!driver) return res.status(404).json({ error: "Driver not found" });

		// Find all DELIVERED orders assigned to this driver
		const orders = await prisma.order.findMany({
			where: { status: "DELIVERED", driver: { username: driverUsername } },
			select: { id: true, total: true },
		});

		if (orders.length === 0) {
			return res.status(400).json({ error: "No delivered orders pending collection for this driver" });
		}

		const amount = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
		const orderIds = orders.map((o) => o.id);
		const adminId = await findUserId(req.user?.username);
		const prismaPaymentMethod = paymentMethodMap[paymentMethod] || "CASH";

		// Run everything in a transaction: create finance record + update all orders
		const [transaction] = await prisma.$transaction([
			prisma.financeTransaction.create({
				data: {
					type: "DRIVER_COLLECTION",
					amount,
					paymentMethod: prismaPaymentMethod,
					status: "DELIVERED",
					driver: { connect: { id: driver.id } },
					description: `Collected cash from driver ${driverUsername} — ${orders.length} orders`,
					date: new Date(),
					...(adminId ? { admin: { connect: { id: adminId } } } : {}),
				},
				include: {
					driver: { select: { username: true } },
					merchant: { select: { username: true } },
					admin: { select: { username: true } },
				},
			}),
			prisma.order.updateMany({
				where: { id: { in: orderIds } },
				data: { status: "COLLECTED", statusUpdatedAt: new Date() },
			}),
			prisma.financeAudit.create({
				data: {
					...(adminId ? { user: { connect: { id: adminId } } } : {}),
					action: "Driver Collection",
					description: `Collected ${formatCurrency(amount)} from driver ${driverUsername} (${orders.length} orders)`,
					ip: req.ip || "",
				},
			}),
		]);

		// Return the new transaction and the refreshed live collections list
		const updatedCollections = await getDriverCollections();
		const updatedPayments = await getMerchantPayments();

		return res.status(201).json({
			success: true,
			transaction: mapTransaction(transaction),
			collections: updatedCollections,
			payments: updatedPayments,
			collectedOrderIds: orderIds,
			amount,
		});
	} catch (error) {
		next(error);
	}
}

// ─── Pay merchant ──────────────────────────────────────────────────────────────

/**
 * POST /api/finance/pay-merchant
 * Body: { merchantUsername, paymentMethod? }
 *
 * 1. Finds all COLLECTED orders for that merchant
 * 2. Sums (total - deliveryCharge) → merchant's owed amount
 * 3. Creates a MERCHANT_PAYMENT FinanceTransaction
 * 4. Bulk-updates those orders to Paid
 * 5. Creates audit log entry
 * 6. Returns the new transaction + updated payments list
 */
export async function payMerchant(req, res, next) {
	try {
		const { merchantUsername, paymentMethod } = req.body;
		if (!merchantUsername) {
			return res.status(400).json({ error: "merchantUsername is required" });
		}
 
		const merchant = await prisma.user.findUnique({
			where: { username: merchantUsername },
			select: { id: true, username: true, firstName: true, lastName: true },
		});
		if (!merchant) return res.status(404).json({ error: "Merchant not found" });
 
		// Fetch COLLECTED orders for this merchant
		const collectedOrders = await prisma.order.findMany({
			where: { status: "COLLECTED", merchant: { username: merchantUsername } },
			select: { id: true, total: true, deliveryCharge: true },
		});

		// Fetch customer-cancelled collected-back orders for this merchant
		const cancelledOrders = await prisma.order.findMany({
			where: {
				status: "Canceled",
				cancelledBy: "customer",
				collectedBack: true,
				merchant: { username: merchantUsername },
			},
			select: { id: true, deliveryCharge: true },
		});

		if (collectedOrders.length === 0 && cancelledOrders.length === 0) {
			return res.status(400).json({ error: "Nothing to settle for this merchant" });
		}

		const grossAmount = collectedOrders.reduce(
			(sum, o) => sum + ((o.total ?? 0) - (o.deliveryCharge ?? 0)), 0
		);
		const deductionTotal = cancelledOrders.reduce(
			(sum, o) => sum + (o.deliveryCharge ?? 0), 0
		);
		const netAmount = grossAmount - deductionTotal;

		const collectedOrderIds = collectedOrders.map((o) => o.id);
		const cancelledOrderIds = cancelledOrders.map((o) => o.id);

		const prismaOps = [
			// Normal collected orders → Paid
			...(collectedOrderIds.length > 0 ? [
				prisma.order.updateMany({
					where: { id: { in: collectedOrderIds } },
					data: { status: "Paid", statusUpdatedAt: new Date() },
				}),
			] : []),
			// Cancelled-collected-back orders → Paid (settled, remove from finance page)
			...(cancelledOrderIds.length > 0 ? [
				prisma.order.updateMany({
					where: { id: { in: cancelledOrderIds } },
					data: { status: "Paid", statusUpdatedAt: new Date() },
				}),
			] : []),
			// Audit log
			prisma.financeAudit.create({
				data: {
					...(adminId ? { user: { connect: { id: adminId } } } : {}),
					action: netAmount >= 0 ? "Merchant Payment" : "Delivery Charge Collected",
					description,
					ip: req.ip || "",
				},
			}),
		];

		// Only create a transaction if money actually moved
		let transaction = null;
		if (absAmount > 0) {
			transaction = await prisma.financeTransaction.create({
				data: {
					type: transactionType,
					amount: absAmount,
					paymentMethod: prismaPaymentMethod,
					status: "DELIVERED",
					// Link merchant only for MERCHANT_PAYMENT; for CASH_IN it's a collection
					...(netAmount >= 0
						? { merchant: { connect: { id: merchant.id } } }
						: {}),
					description,
					date: new Date(),
					...(adminId ? { admin: { connect: { id: adminId } } } : {}),
				},
				include: {
					driver:   { select: { username: true } },
					merchant: { select: { username: true } },
					admin:    { select: { username: true } },
				},
			});
		}
 
		await prisma.$transaction(prismaOps);
 
		const updatedCollections = await getDriverCollections();
		const updatedPayments = await getMerchantPayments();
 
		return res.status(201).json({
			success: true,
			transaction: transaction ? mapTransaction(transaction) : null,
			collections: updatedCollections,
			payments: updatedPayments,
			paidOrderIds: allOrderIds,
			grossAmount,
			deductionTotal,
			amount: netAmount,
		});
	} catch (error) {
		next(error);
	}
}

// ─── Generic transaction / expense / audit ─────────────────────────────────────

export async function createFinanceTransaction(req, res, next) {
	try {
		const { type, amount, paymentMethod, relatedOrder, driver, merchant, description, notes, date, adminUsername } = req.body;
		const parsedAmount = Number(amount);
		if (!type || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
			return res.status(400).json({ error: "Valid transaction details are required" });
		}

		const prismaType = transactionTypeMap[type] || null;
		if (!prismaType) return res.status(400).json({ error: "Invalid transaction type" });

		const prismaPaymentMethod = paymentMethodMap[paymentMethod] || "CASH";
		const driverId = await findUserId(driver);
		const merchantId = await findUserId(merchant);
		const adminId = await findUserId(adminUsername || req.user?.username || "");

		const transaction = await prisma.financeTransaction.create({
			data: {
				type: prismaType,
				amount: parsedAmount,
				paymentMethod: prismaPaymentMethod,
				status: "DELIVERED",
				...(relatedOrder ? { relatedOrder: { connect: { id: relatedOrder } } } : {}),
				...(driverId    ? { driver:       { connect: { id: driverId   } } } : {}),
				...(merchantId  ? { merchant:     { connect: { id: merchantId } } } : {}),
				description: description || "",
				notes: notes || "",
				date: date ? new Date(date) : new Date(),
				...(adminId ? { admin: { connect: { id: adminId } } } : {}),
			},
			include: {
				driver:   { select: { username: true } },
				merchant: { select: { username: true } },
				admin:    { select: { username: true } },
			},
		});

		await prisma.financeAudit.create({
			data: {
				...(adminId ? { user: { connect: { id: adminId } } } : {}),
				action: type,
				description: description || `${type} recorded`,
				ip: req.ip || "",
			},
		});

		return res.status(201).json({ success: true, transaction: mapTransaction(transaction) });
	} catch (error) {
		next(error);
	}
}

export async function createFinanceExpense(req, res, next) {
	try {
		const { amount, category, description, date, receipt, createdBy } = req.body;
		const parsedAmount = Number(amount);
		if (!category || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
			return res.status(400).json({ error: "Expense details are required" });
		}

		const prismaCategory = expenseCategoryMap[category] || null;
		if (!prismaCategory) return res.status(400).json({ error: "Invalid expense category" });

		const createdById = await findUserId(createdBy || req.user?.username || "");
		const expense = await prisma.financeExpense.create({
			data: {
				amount: parsedAmount,
				category: prismaCategory,
				description: description || "",
				date: date ? new Date(date) : new Date(),
				receipt: receipt || "",
				createdBy: createdById ? { connect: { id: createdById } } : undefined,
			},
			include: { createdBy: { select: { username: true } } },
		});

		const adminId = await findUserId(req.user?.username || "");
		await prisma.financeAudit.create({
			data: {
				...(adminId ? { user: { connect: { id: adminId } } } : {}),
				action: "Expense Added",
				description: `${category} expense recorded`,
				ip: req.ip || "",
			},
		});

		return res.status(201).json({ success: true, expense: mapExpense(expense) });
	} catch (error) {
		next(error);
	}
}

export async function getFinanceAudit(req, res, next) {
	try {
		const audits = await prisma.financeAudit.findMany({
			orderBy: { date: "desc" },
			include: { user: { select: { username: true } } },
		});
		return res.json(audits.map(mapAudit));
	} catch (error) {
		next(error);
	}
}
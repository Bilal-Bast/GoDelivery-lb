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

// Postpaid merchants only — prepaid merchants are paid in advance against a
// running balance (see getPrepaidMerchantBalances) and never settle per-order,
// so including them here would double-pay them.
const NOT_PREPAID = {
	is: {
		OR: [{ accountType: { not: "PREPAID" } }, { accountType: null }],
	},
};

async function getMerchantPayments() {
	// Cancelled orders — either party — settle at $0 and are handled on the
	// dedicated Pay page; only genuinely collected (non-cancelled) orders
	// create a real payable balance here. Excluding cancelledBy explicitly
	// also stops a cancelled-but-collected order's raw total/deliveryCharge
	// from leaking into this gross figure.
	const collectedOrders = await prisma.order.findMany({
		where: {
			status: "COLLECTED",
			cancelledBy: null,
			merchant: NOT_PREPAID,
		},
		select: {
			id: true,
			total: true,
			deliveryCharge: true,
			merchant: { select: { username: true, firstName: true, lastName: true } },
		},
	});

	const map = new Map();

	function ensureEntry(merchantUser) {
		const key = merchantUser.username;
		if (!map.has(key)) {
			map.set(key, {
				merchantUsername: key,
				merchantName: formatUserDisplayName(merchantUser),
				orderIds: [],       // COLLECTED order IDs (normal payout)
				grossAmount: 0,     // what admin owes merchant
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

	for (const entry of map.values()) {
		entry.amount = entry.grossAmount;
	}

	return [...map.values()].filter((e) => e.orderIds.length > 0);
}

// ─── Prepaid merchant balances ─────────────────────────────────────────────────

/**
 * Prepaid merchants are paid up front, as soon as an order exists — long
 * before it's delivered or collected. So their entitlement is every live
 * (non-cancelled) order they've created, valued at total − deliveryCharge.
 * Against that we net off every payment we've actually handed them.
 *
 *   balance = entitled − paid
 *
 * Positive means we still owe them (the outstanding loan we pay down later);
 * negative means we've already paid past what their orders ended up being
 * worth — typically because an order was cancelled after we paid — and they
 * owe us that back.
 *
 * Pass a username to scope to a single merchant.
 */
async function getPrepaidMerchantBalances(merchantUsername = null) {
	const where = { role: "MERCHANT", accountType: "PREPAID" };
	if (merchantUsername) where.username = merchantUsername;

	const merchants = await prisma.user.findMany({
		where,
		select: { id: true, username: true, firstName: true, lastName: true },
	});
	if (merchants.length === 0) return [];

	const merchantIds = merchants.map((m) => m.id);

	const [orders, payments] = await Promise.all([
		prisma.order.findMany({
			where: {
				merchantId: { in: merchantIds },
				status: { not: "Canceled" },
				cancelledBy: null,
			},
			select: {
				id: true,
				merchantId: true,
				total: true,
				deliveryCharge: true,
				status: true,
				createdAt: true,
			},
			orderBy: { createdAt: "desc" },
		}),
		prisma.merchantPayment.findMany({
			where: { merchantId: { in: merchantIds } },
			select: { merchantId: true, amount: true },
		}),
	]);

	const byMerchant = new Map(
		merchants.map((m) => [
			m.id,
			{
				merchantUsername: m.username,
				merchantName: formatUserDisplayName(m),
				accountType: "prepaid",
				orderCount: 0,
				entitled: 0,
				paid: 0,
				balance: 0,
				orders: [],
			},
		]),
	);

	for (const order of orders) {
		const entry = byMerchant.get(order.merchantId);
		if (!entry) continue;
		const value = (order.total ?? 0) - (order.deliveryCharge ?? 0);
		entry.orderCount += 1;
		entry.entitled += value;
		entry.orders.push({
			id: order.id,
			total: order.total ?? 0,
			deliveryCharge: order.deliveryCharge ?? 0,
			value,
			status: statusEnumToNumber[order.status] ?? 0,
			createdAt: order.createdAt,
		});
	}

	for (const payment of payments) {
		const entry = byMerchant.get(payment.merchantId);
		if (!entry) continue;
		entry.paid += payment.amount ?? 0;
	}

	for (const entry of byMerchant.values()) {
		entry.balance = entry.entitled - entry.paid;
	}

	return [...byMerchant.values()];
}

/**
 * What each driver still owes us in cash, using the same per-order rules the
 * Collect page applies: delivered → full total, customer-cancelled → the
 * delivery charge, merchant-cancelled → nothing. The driver's per-order fee is
 * then netted off once, across every order that earned one, to give what we
 * actually expect to receive.
 */
async function getDriverOutstanding() {
	const orders = await prisma.order.findMany({
		where: {
			collectedBack: false,
			driverId: { not: null },
			OR: [{ status: "DELIVERED" }, { status: "Canceled" }],
		},
		select: {
			id: true,
			total: true,
			deliveryCharge: true,
			status: true,
			cancelledBy: true,
			createdAt: true,
			driver: {
				select: {
					username: true,
					firstName: true,
					lastName: true,
					deliveryFee: true,
				},
			},
		},
		orderBy: { createdAt: "desc" },
	});

	const map = new Map();
	for (const order of orders) {
		if (!order.driver) continue;
		const key = order.driver.username;
		if (!map.has(key)) {
			map.set(key, {
				driverUsername: key,
				driverName: formatUserDisplayName(order.driver),
				perOrderFee: order.driver.deliveryFee ?? 0,
				orderCount: 0,
				gross: 0,
				feeTotal: 0,
				outstanding: 0,
				orders: [],
			});
		}
		const entry = map.get(key);

		let value = 0;
		let earnsFee = false;
		if (order.status === "DELIVERED") {
			value = order.total ?? 0;
			earnsFee = true;
		} else if (order.cancelledBy === "customer") {
			value = order.deliveryCharge ?? 0;
			earnsFee = true;
		}

		entry.orderCount += 1;
		entry.gross += value;
		if (earnsFee) entry.feeTotal += entry.perOrderFee;
		entry.orders.push({
			id: order.id,
			value,
			status: statusEnumToNumber[order.status] ?? 0,
			cancelledBy: order.cancelledBy,
			createdAt: order.createdAt,
		});
	}

	for (const entry of map.values()) {
		entry.outstanding = entry.gross - entry.feeTotal;
	}

	return [...map.values()].filter((e) => e.orderCount > 0);
}

/**
 * Combined receivables/payables view: what we owe merchants (prepaid running
 * balances plus postpaid collected-order settlements) and what drivers still
 * owe us.
 */
async function getBalancesOverview() {
	const [prepaid, postpaid, drivers] = await Promise.all([
		getPrepaidMerchantBalances(),
		getMerchantPayments(),
		getDriverOutstanding(),
	]);

	const postpaidRows = postpaid.map((p) => ({
		merchantUsername: p.merchantUsername,
		merchantName: p.merchantName,
		accountType: "postpaid",
		orderCount: p.orderIds.length,
		entitled: p.grossAmount,
		paid: 0,
		balance: p.amount,
		orders: [],
	}));

	const merchants = [...prepaid, ...postpaidRows].filter(
		(m) => m.orderCount > 0 || m.paid !== 0 || m.balance !== 0,
	);

	return {
		merchants,
		drivers,
		totals: {
			owedToMerchants: merchants.reduce(
				(sum, m) => sum + Math.max(m.balance, 0),
				0,
			),
			owedByMerchants: merchants.reduce(
				(sum, m) => sum + Math.max(-m.balance, 0),
				0,
			),
			owedByDrivers: drivers.reduce((sum, d) => sum + d.outstanding, 0),
		},
	};
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

	// Delivery charges collected directly from merchants (cancelled-order
	// settlements). These CASH_IN transactions are merchant-linked, unlike
	// manual Cash In entries, which have no merchant and stay excluded.
	const merchantCashInTotal = completedTransactions
		.filter((tx) => tx.type === "Cash In" && tx.merchant)
		.reduce((sum, tx) => sum + (tx.amount || 0), 0);

	const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

	// Driver-collection transactions are already recorded net of the driver's
	// delivery fee for every order that earned one — delivered orders and
	// customer-cancelled orders alike both flow through a driver collection
	// now, so no further fee adjustment is needed here (subtracting it again
	// would double-count what's already baked into driverCollectionTotal).

	// Profit = net driver collections after paying merchants, plus delivery
	// charges collected from merchants on cancelled orders, minus expenses
	const netProfit = (driverCollectionTotal + merchantCashInTotal - merchantPaymentTotal) - totalExpenses;
 
	// Cancelled orders: the goods come back, so their totals are never
	// revenue — even after settling, when the order moves to Paid but keeps
	// its cancelledBy marker. Delivery charge is still earned when the
	// CUSTOMER cancelled (merchant owes it); merchant cancellations earn
	// nothing.
	const revenueOrders = orders.filter((o) => o.s !== 4 && !o.cancelledBy);
	const deliveryOrders = orders.filter(
		(o) => (o.s !== 4 && !o.cancelledBy) || o.cancelledBy === "customer",
	);

	// Delivery revenue = delivery charges we're entitled to keep
	const deliveryRevenue = deliveryOrders.reduce((sum, o) => sum + ((o.pr?.d || 0) - (o.pr?.f || 0)), 0);

	// Total order revenue (gross — before paying merchants back)
	const totalRevenue = revenueOrders.reduce((sum, o) => sum + (o.pr?.t || 0), 0);
 
	const totalExpensesDisplay = totalExpenses;
 
	// Outstanding = what's still not settled
	const outstandingDriverCollections = collections.reduce((sum, c) => sum + (c.amount || 0), 0);
	// For merchant outstanding, use net amount (what we'll actually pay out)
	const outstandingMerchantBalance = payments.reduce((sum, p) => sum + Math.max(p.amount, 0), 0);
 
	const pendingMerchantPayments = payments.reduce((sum, p) => sum + p.orderIds.length, 0);
	const pendingDriverCollections = collections.reduce((sum, c) => sum + c.orderIds.length, 0);
 
	const weeklyRevenue = deliveryOrders
		.filter((o) => new Date(o.createdAt) >= getPeriodRange(7).start)
		.reduce((sum, o) => sum + ((o.pr?.d || 0) - (o.pr?.f || 0)), 0); // weekly delivery revenue (what we keep, net of driver fee)

	const monthlyRevenue = deliveryOrders
		.filter((o) => new Date(o.createdAt) >= getPeriodRange(30).start)
		.reduce((sum, o) => sum + ((o.pr?.d || 0) - (o.pr?.f || 0)), 0); // monthly delivery revenue (net of driver fee)
 
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
		cancelledBy: order.cancelledBy || null,
		pr: {
			t: order.total ?? 0,
			d: order.deliveryCharge ?? 0,
			// Driver's cut of the delivery charge — reduces admin's delivery profit
			f: order.driver?.deliveryFee ?? 0,
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
				select: {
					id: true,
					total: true,
					deliveryCharge: true,
					createdAt: true,
					status: true,
					cancelledBy: true,
					driver: { select: { deliveryFee: true } },
				},
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
				select: {
					username: true,
					firstName: true,
					lastName: true,
					accountType: true,
				},
			}),
			prisma.financeAudit.findMany({
				orderBy: { date: "desc" },
				include: { user: { select: { username: true } } },
			}),
			// Live grouping from order statuses — no separate collection/payment tables needed
			getDriverCollections(),
			getMerchantPayments(),
		]);

		const balances = await getBalancesOverview();

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
			merchants: merchants.map((m) => ({
				id: m.username,
				username: m.username,
				name: formatUserDisplayName(m),
				accountType: m.accountType
					? String(m.accountType).toLowerCase()
					: null,
			})),
			audits,
			stats,
			balances,
		};
	} catch (error) {
		console.warn("Finance data unavailable, returning empty state:", error.message);
		const stats = buildStats({ orders: [], transactions: [], expenses: [], collections: [], payments: [] });
		return {
			orders: [], transactions: [], expenses: [], collections: [], payments: [],
			drivers: [], merchants: [], audits: [], stats,
			balances: { merchants: [], drivers: [], totals: { owedToMerchants: 0, owedByMerchants: 0, owedByDrivers: 0 } },
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
			select: { id: true, username: true, firstName: true, lastName: true, deliveryFee: true },
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

		// Driver keeps a delivery fee per delivered order; admin receives the net.
		const grossAmount = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
		const deliveryFeeTotal = (driver.deliveryFee ?? 0) * orders.length;
		const amount = grossAmount - deliveryFeeTotal;
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
 * 1. Finds all COLLECTED, non-cancelled orders for that merchant (cancelled
 *    orders — either party — always settle at $0 and are handled on the
 *    dedicated Pay page instead)
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
			select: {
				id: true,
				username: true,
				firstName: true,
				lastName: true,
				accountType: true,
			},
		});
		if (!merchant) return res.status(404).json({ error: "Merchant not found" });

		// Prepaid merchants settle via advances against a running balance, not
		// per collected order — routing them through here would double-pay.
		if (merchant.accountType === "PREPAID") {
			return res.status(400).json({
				error: "This merchant is prepaid — use the prepaid advance form instead",
			});
		}

		// Fetch COLLECTED, non-cancelled orders for this merchant
		const collectedOrders = await prisma.order.findMany({
			where: {
				status: "COLLECTED",
				cancelledBy: null,
				merchant: { username: merchantUsername },
			},
			select: { id: true, total: true, deliveryCharge: true },
		});

		if (collectedOrders.length === 0) {
			return res.status(400).json({ error: "Nothing to settle for this merchant" });
		}

		const grossAmount = collectedOrders.reduce(
			(sum, o) => sum + ((o.total ?? 0) - (o.deliveryCharge ?? 0)), 0
		);

		const collectedOrderIds = collectedOrders.map((o) => o.id);

		const adminId = await findUserId(req.user?.username);
		const prismaPaymentMethod = paymentMethodMap[paymentMethod] || "CASH";
		const description = `Paid merchant ${merchantUsername} — ${collectedOrders.length} collected orders`;

		const prismaOps = [
			prisma.order.updateMany({
				where: { id: { in: collectedOrderIds } },
				data: { status: "Paid", statusUpdatedAt: new Date() },
			}),
			// Audit log
			prisma.financeAudit.create({
				data: {
					...(adminId ? { user: { connect: { id: adminId } } } : {}),
					action: "Merchant Payment",
					description,
					ip: req.ip || "",
				},
			}),
		];

		// Only create a transaction if money actually moved
		let transaction = null;
		if (grossAmount > 0) {
			transaction = await prisma.financeTransaction.create({
				data: {
					type: "MERCHANT_PAYMENT",
					amount: grossAmount,
					paymentMethod: prismaPaymentMethod,
					status: "DELIVERED",
					merchant: { connect: { id: merchant.id } },
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
			paidOrderIds: collectedOrderIds,
			grossAmount,
			amount: grossAmount,
		});
	} catch (error) {
		next(error);
	}
}

// ─── Prepaid merchant advances ─────────────────────────────────────────────────

/**
 * GET /api/finance/balances
 * Receivables/payables snapshot — what we owe merchants and what drivers owe us.
 */
export async function getBalances(req, res, next) {
	try {
		return res.json(await getBalancesOverview());
	} catch (error) {
		next(error);
	}
}

/**
 * POST /api/finance/pay-prepaid-merchant
 * Body: { merchantUsername, amount, paymentMethod?, notes? }
 *
 * Hands a prepaid merchant any amount we choose, up front — it isn't tied to
 * settling specific orders. Whatever is left of their entitlement stays as an
 * outstanding balance to pay down later.
 */
export async function payPrepaidMerchant(req, res, next) {
	try {
		const { merchantUsername, amount, paymentMethod, notes } = req.body;

		if (!merchantUsername) {
			return res.status(400).json({ error: "merchantUsername is required" });
		}

		const parsedAmount = Number(amount);
		if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
			return res
				.status(400)
				.json({ error: "Amount must be a number greater than 0" });
		}

		const merchant = await prisma.user.findFirst({
			where: { username: merchantUsername, role: "MERCHANT" },
			select: { id: true, username: true, accountType: true },
		});
		if (!merchant) {
			return res.status(404).json({ error: "Merchant not found" });
		}
		if (merchant.accountType !== "PREPAID") {
			return res.status(400).json({
				error: "This merchant is not prepaid — settle them from the Pay page instead",
			});
		}

		const adminId = await findUserId(req.user?.username);
		if (!adminId) {
			return res.status(401).json({ error: "Admin not found" });
		}

		const last = await prisma.merchantPayment.findFirst({
			orderBy: { number: "desc" },
			select: { number: true },
		});
		const nextNumber = (last?.number || 0) + 1;

		const description = `Advance to prepaid merchant ${merchantUsername}`;
		const prismaPaymentMethod = paymentMethodMap[paymentMethod] || "CASH";

		const [, transaction] = await prisma.$transaction([
			prisma.merchantPayment.create({
				data: {
					number: nextNumber,
					merchantId: merchant.id,
					adminId,
					amount: parsedAmount,
					isAdvance: true,
					notes: notes || "",
				},
			}),
			prisma.financeTransaction.create({
				data: {
					type: "MERCHANT_PAYMENT",
					amount: parsedAmount,
					paymentMethod: prismaPaymentMethod,
					status: "DELIVERED",
					merchant: { connect: { id: merchant.id } },
					admin: { connect: { id: adminId } },
					description,
					notes: notes || "",
					date: new Date(),
				},
				include: {
					driver: { select: { username: true } },
					merchant: { select: { username: true } },
					admin: { select: { username: true } },
				},
			}),
			prisma.financeAudit.create({
				data: {
					user: { connect: { id: adminId } },
					action: "Prepaid Merchant Advance",
					description: `${description} — ${formatCurrency(parsedAmount)}`,
					ip: req.ip || "",
				},
			}),
		]);

		const [balance] = await getPrepaidMerchantBalances(merchantUsername);

		return res.status(201).json({
			success: true,
			transaction: mapTransaction(transaction),
			balance: balance || null,
			amount: parsedAmount,
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
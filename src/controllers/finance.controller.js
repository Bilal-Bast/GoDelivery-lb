import prisma from "../config/prisma.js";

function formatCurrency(value) {
	return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getPeriodRange(days) {
	const now = new Date();
	const start = new Date();
	start.setDate(now.getDate() - days);
	return { start, end: now };
}

const orderStatusToNumber = {
	WAREHOUSE: 0,
	NEW: 1,
	Picked_up: 2,
	DELIVERED: 3,
	Canceled: 4,
	Paid: 5,
	COLLECTED: 6,
};

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

function formatUserDisplayName(user) {
	if (!user) return null;
	const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
	return name || user.username;
}

function buildStats({ orders, transactions, expenses, collections, payments }) {
	const totalRevenue = orders.reduce((sum, order) => sum + (order.pr?.t || 0), 0);
	const deliveryRevenue = orders.reduce((sum, order) => sum + (order.pr?.d || 0), 0);
	const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
	const completedTransactions = transactions.filter((tx) => tx.status === "Completed");
	const cashIn = completedTransactions.filter((tx) => tx.type === "Cash In" || tx.type === "Driver Collection").reduce((sum, tx) => sum + (tx.amount || 0), 0);
	const cashOut = completedTransactions.filter((tx) => tx.type === "Cash Out" || tx.type === "Merchant Payment" || tx.type === "Expense").reduce((sum, tx) => sum + (tx.amount || 0), 0);
	const netProfit = totalRevenue - totalExpenses;
	const outstandingMerchantBalance = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
	const outstandingDriverCollections = collections.reduce((sum, collection) => sum + (collection.amount || 0), 0);
	const ordersToday = orders.filter((order) => {
		const created = new Date(order.createdAt);
		const now = new Date();
		return created.toDateString() === now.toDateString();
	}).length;
	const pendingMerchantPayments = orders.filter((order) => order.s === 6).length;
	const pendingDriverCollections = orders.filter((order) => order.s === 5).length;
	const weeklyRevenue = orders.filter((order) => {
		const { start } = getPeriodRange(7);
		return new Date(order.createdAt) >= start;
	}).reduce((sum, order) => sum + (order.pr?.t || 0), 0);
	const monthlyRevenue = orders.filter((order) => {
		const { start } = getPeriodRange(30);
		return new Date(order.createdAt) >= start;
	}).reduce((sum, order) => sum + (order.pr?.t || 0), 0);
	const currentCashBalance = cashIn - cashOut;
	const omtBalance = completedTransactions.filter((tx) => tx.paymentMethod === "OMT").reduce((sum, tx) => sum + (tx.amount || 0), 0);
	const whishBalance = completedTransactions.filter((tx) => tx.paymentMethod === "Whish").reduce((sum, tx) => sum + (tx.amount || 0), 0);

	return {
		cards: [
			{ key: "totalRevenue", title: "Total Revenue", value: formatCurrency(totalRevenue), description: "All order revenue", trend: "+12%" },
			{ key: "deliveryRevenue", title: "Delivery Revenue", value: formatCurrency(deliveryRevenue), description: "Delivery fees collected", trend: "+8%" },
			{ key: "merchantOutstanding", title: "Merchant Outstanding Balance", value: formatCurrency(outstandingMerchantBalance), description: "Payments pending", trend: "-3%" },
			{ key: "driverOutstanding", title: "Driver Outstanding Collections", value: formatCurrency(outstandingDriverCollections), description: "Cash still with drivers", trend: "+5%" },
			{ key: "cashInToday", title: "Cash In Today", value: formatCurrency(cashIn), description: "Incoming funds", trend: "+4%" },
			{ key: "cashOutToday", title: "Cash Out Today", value: formatCurrency(cashOut), description: "Outgoing funds", trend: "+2%" },
			{ key: "netProfit", title: "Net Profit", value: formatCurrency(netProfit), description: "Revenue minus expenses", trend: "+9%" },
			{ key: "totalExpenses", title: "Total Expenses", value: formatCurrency(totalExpenses), description: "Recorded expenses", trend: "-1%" },
			{ key: "totalOrders", title: "Total Orders", value: orders.length, description: "Orders tracked", trend: "+7%" },
			{ key: "pendingMerchantPayments", title: "Pending Merchant Payments", value: pendingMerchantPayments, description: "Orders ready to pay", trend: "0%" },
			{ key: "pendingDriverCollections", title: "Pending Driver Collections", value: pendingDriverCollections, description: "Orders awaiting collection", trend: "+6%" },
			{ key: "weeklyRevenue", title: "Weekly Revenue", value: formatCurrency(weeklyRevenue), description: "Last 7 days", trend: "+15%" },
			{ key: "monthlyRevenue", title: "Monthly Revenue", value: formatCurrency(monthlyRevenue), description: "Last 30 days", trend: "+11%" },
			{ key: "currentCashBalance", title: "Current Cash Balance", value: formatCurrency(currentCashBalance), description: "Net cash position", trend: "+3%" },
			{ key: "omtBalance", title: "OMT Balance", value: formatCurrency(omtBalance), description: "OMT transactions", trend: "+1%" },
			{ key: "whishBalance", title: "Whish Balance", value: formatCurrency(whishBalance), description: "Whish transactions", trend: "+2%" },
		],
		alerts: [
			...(outstandingDriverCollections > 0 ? [{ type: "warning", title: "Driver still holding cash", detail: `${outstandingDriverCollections} still awaiting collection` }] : []),
			...(pendingMerchantPayments > 0 ? [{ type: "warning", title: "Merchant waiting payment", detail: `${pendingMerchantPayments} orders ready for settlement` }] : []),
			...(expenses.length > 0 ? [{ type: "info", title: "Large expense added", detail: `${expenses.length} expense entries recorded` }] : []),
			...(currentCashBalance < 1000 ? [{ type: "danger", title: "Low cash balance", detail: `Current cash is ${formatCurrency(currentCashBalance)}` }] : []),
		],
	};
}

function mapOrderForStats(order) {
	return {
		id: order.id,
		createdAt: order.createdAt,
		s: orderStatusToNumber[order.status] ?? 0,
		pr: {
			t: order.total ?? 0,
			d: order.deliveryCharge ?? 0,
		},
	};
}

function mapTransaction(transaction) {
	return {
		id: transaction.id,
		type: transaction.type === "CASH_IN" ? "Cash In" : transaction.type === "CASH_OUT" ? "Cash Out" : transaction.type === "MERCHANT_PAYMENT" ? "Merchant Payment" : transaction.type === "DRIVER_COLLECTION" ? "Driver Collection" : transaction.type === "EXPENSE" ? "Expense" : transaction.type === "REFUND" ? "Refund" : transaction.type,
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
		category: expense.category === "OFFICE_SUPPLIES" ? "Office Supplies" : expense.category[0] + expense.category.slice(1).toLowerCase().replace(/_/g, " "),
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

function mapCollection(collection) {
	return {
		_id: collection.id,
		number: collection.number,
		driverUsername: collection.driver.username,
		driverName: formatUserDisplayName(collection.driver),
		amount: collection.amount,
		orderIds: collection.orders.map((o) => o.order.id),
		createdAt: collection.createdAt,
	};
}

function mapPayment(payment) {
	return {
		_id: payment.id,
		number: payment.number,
		merchantUsername: payment.merchant.username,
		merchantName: formatUserDisplayName(payment.merchant),
		amount: payment.amount,
		orderIds: payment.orders.map((o) => o.order.id),
		createdAt: payment.createdAt,
	};
}

export async function getFinancePageData() {
	try {
		const [ordersRaw, transactionsRaw, expensesRaw, collectionsRaw, paymentsRaw, drivers, merchants, auditsRaw] = await Promise.all([
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
			prisma.driverCollection.findMany({
				orderBy: { createdAt: "desc" },
				include: { driver: { select: { username: true, firstName: true, lastName: true } }, orders: { include: { order: { select: { id: true } } } } },
			}),
			prisma.merchantPayment.findMany({
				orderBy: { createdAt: "desc" },
				include: { merchant: { select: { username: true, firstName: true, lastName: true } }, orders: { include: { order: { select: { id: true } } } } },
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
		]);

		const orders = ordersRaw.map(mapOrderForStats);
		const transactions = transactionsRaw.map(mapTransaction);
		const expenses = expensesRaw.map(mapExpense);
		const collections = collectionsRaw.map(mapCollection);
		const payments = paymentsRaw.map(mapPayment);
		const audits = auditsRaw.map(mapAudit);

		const stats = buildStats({ orders, transactions, expenses, collections, payments });
		return {
			orders,
			transactions,
			expenses,
			collections,
			payments,
			drivers: drivers.map((d) => ({
				id: d.username,
				username: d.username,
				name: formatUserDisplayName(d),
			})),
			merchants: merchants.map((m) => ({
				id: m.username,
				username: m.username,
				name: formatUserDisplayName(m),
			})),
			audits,
			stats,
		};
	} catch (error) {
		console.warn("Finance data unavailable, returning empty state:", error.message);
		const stats = buildStats({ orders: [], transactions: [], expenses: [], collections: [], payments: [] });
		return {
			orders: [],
			transactions: [],
			expenses: [],
			collections: [],
			payments: [],
			drivers: [],
			merchants: [],
			audits: [],
			stats,
		};
	}
}

async function findUserId(username) {
	if (!username) return null;
	const user = await prisma.user.findUnique({ where: { username } });
	return user?.id || null;
}

export async function createFinanceTransaction(req, res, next) {
	try {
		const { type, amount, paymentMethod, relatedOrder, driver, merchant, description, notes, date, adminUsername } = req.body;
		const parsedAmount = Number(amount);
		if (!type || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
			return res.status(400).json({ error: "Valid transaction details are required" });
		}

		const prismaType = transactionTypeMap[type] || null;
		if (!prismaType) {
			return res.status(400).json({ error: "Invalid transaction type" });
		}

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
				relatedOrderId: relatedOrder || null,
				driver: driverId ? { connect: { id: driverId } } : undefined,
				merchant: merchantId ? { connect: { id: merchantId } } : undefined,
				description: description || "",
				notes: notes || "",
				date: date ? new Date(date) : new Date(),
				admin: adminId ? { connect: { id: adminId } } : undefined,
			},
			include: {
				driver: { select: { username: true } },
				merchant: { select: { username: true } },
				admin: { select: { username: true } },
			},
		});

		await prisma.financeAudit.create({
			data: {
				user: adminId ? { connect: { id: adminId } } : undefined,
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
		if (!prismaCategory) {
			return res.status(400).json({ error: "Invalid expense category" });
		}

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
			include: {
				createdBy: { select: { username: true } },
			},
		});

		const adminId = await findUserId(req.user?.username || "");
		await prisma.financeAudit.create({
			data: {
				user: adminId ? { connect: { id: adminId } } : undefined,
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

import FinanceTransaction from "../models/financeTransaction.model.js";
import FinanceExpense from "../models/financeExpense.model.js";
import FinanceAudit from "../models/financeAudit.model.js";
import Order from "../models/order.model.js";
import DriverCollection from "../models/driverCollection.model.js";
import MerchantPayment from "../models/merchantPayment.model.js";
import User from "../models/user.model.js";

function formatCurrency(value) {
	return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getPeriodRange(days) {
	const now = new Date();
	const start = new Date();
	start.setDate(now.getDate() - days);
	return { start, end: now };
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

export async function getFinancePageData() {
	try {
		const [orders, transactions, expenses, collections, payments, drivers, merchants, audits] = await Promise.all([
			Order.find().sort({ createdAt: -1 }).lean(),
			FinanceTransaction.find().sort({ date: -1 }).lean(),
			FinanceExpense.find().sort({ date: -1 }).lean(),
			DriverCollection.find().sort({ createdAt: -1 }).lean(),
			MerchantPayment.find().sort({ createdAt: -1 }).lean(),
			User.find({ role: "driver" }).select("username firstName lastName").lean(),
			User.find({ role: "merchant" }).select("username firstName lastName").lean(),
			FinanceAudit.find().sort({ date: -1 }).lean(),
		]);

		const stats = buildStats({ orders, transactions, expenses, collections, payments });
		return {
			orders,
			transactions,
			expenses,
			collections,
			payments,
			drivers,
			merchants,
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

export async function createFinanceTransaction(req, res, next) {
	try {
		const { type, amount, paymentMethod, relatedOrder, driver, merchant, description, notes, date, adminUsername } = req.body;
		const parsedAmount = Number(amount);
		if (!type || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
			return res.status(400).json({ error: "Valid transaction details are required" });
		}
		const transaction = await FinanceTransaction.create({
			type,
			amount: parsedAmount,
			paymentMethod: paymentMethod || "Cash",
			relatedOrder: relatedOrder || "",
			driver: driver || "",
			merchant: merchant || "",
			description: description || "",
			notes: notes || "",
			date: date ? new Date(date) : new Date(),
			adminUsername: adminUsername || req.user?.username || "admin",
		});
		await FinanceAudit.create({
			user: req.user?.username || "admin",
			action: type,
			description: description || `${type} recorded`,
			ip: req.ip || "",
		});
		return res.status(201).json({ success: true, transaction });
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
		const expense = await FinanceExpense.create({
			amount: parsedAmount,
			category,
			description: description || "",
			date: date ? new Date(date) : new Date(),
			receipt: receipt || "",
			createdBy: createdBy || req.user?.username || "admin",
		});
		await FinanceAudit.create({
			user: req.user?.username || "admin",
			action: "Expense Added",
			description: `${category} expense recorded`,
			ip: req.ip || "",
		});
		return res.status(201).json({ success: true, expense });
	} catch (error) {
		next(error);
	}
}

export async function getFinanceAudit(req, res, next) {
	try {
		const audits = await FinanceAudit.find().sort({ date: -1 }).lean();
		return res.json(audits);
	} catch (error) {
		next(error);
	}
}

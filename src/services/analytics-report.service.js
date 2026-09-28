import { statusNumberToEnum } from "../utils/orderStatus.js";

const DAY = 86400000;
const COMPLETED = "DELIVERED";
const STATUS = Object.freeze(statusNumberToEnum);
const CASH_IN = new Set(["CASH_IN", "DRIVER_COLLECTION"]);
const CASH_OUT = new Set(["CASH_OUT", "MERCHANT_PAYMENT", "EXPENSE"]);

function utcDay(date) { return date.toISOString().slice(0, 10); }
function parseDay(value, label) {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid ${label}`);
	const date = new Date(`${value}T00:00:00.000Z`);
	if (Number.isNaN(date.getTime()) || utcDay(date) !== value) throw new Error(`Invalid ${label}`);
	return date;
}

function normalizeReportRange(query = {}, now = new Date()) {
	const allowed = new Set(["preset", "startDate", "endDate", "merchantId", "driverId", "district", "city"]);
	for (const key of Object.keys(query)) if (!allowed.has(key)) throw new Error(`Unsupported report filter: ${key}`);
	const today = parseDay(utcDay(now), "today");
	let start; let end;
	const preset = query.preset || "last30";
	if (query.startDate !== undefined || query.endDate !== undefined) {
		if (query.startDate === undefined || query.endDate === undefined) throw new Error("Both dates are required");
		start = parseDay(query.startDate, "startDate");
		end = parseDay(query.endDate, "endDate");
	} else if (preset === "today") { start = today; end = today; }
	else if (preset === "yesterday") { start = new Date(today.getTime() - DAY); end = start; }
	else if (preset === "last7") { start = new Date(today.getTime() - 6 * DAY); end = today; }
	else if (preset === "last30") { start = new Date(today.getTime() - 29 * DAY); end = today; }
	else if (preset === "thisMonth") { start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)); end = today; }
	else if (preset === "previousMonth") { start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)); end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0)); }
	else throw new Error("Invalid preset");
	const days = Math.round((end - start) / DAY) + 1;
	if (days < 1 || days > 366) throw new Error("Date range must be 1–366 days");
	const previousEnd = new Date(start.getTime() - DAY);
	const previousStart = new Date(previousEnd.getTime() - (days - 1) * DAY);
	const text = (key) => {
		const value = query[key];
		if (value === undefined || value === "") return undefined;
		if (typeof value !== "string" || value.trim().length > 100) throw new Error(`Invalid ${key}`);
		return value.trim();
	};
	return {
		startDate: utcDay(start), endDate: utcDay(end), previousStartDate: utcDay(previousStart), previousEndDate: utcDay(previousEnd),
		start, endExclusive: new Date(end.getTime() + DAY), previousStart, days,
		filters: Object.fromEntries(["merchantId", "driverId", "district", "city"].map((key) => [key, text(key)]).filter(([, value]) => value !== undefined)),
		timezone: "UTC", basis: "order createdAt; current outcome/status",
	};
}

function isCancelled(order) { return order.status === "Canceled" || order.cancelledBy != null; }
function isDelivered(order) { return ["DELIVERED", "COLLECTED", "Paid"].includes(order.status) && !isCancelled(order); }
function isRevenueEligible(order) { return !isCancelled(order) && !order.collectedBack; }
function ratio(numerator, denominator) { return denominator ? numerator / denominator : null; }
function compare(current, previous) {
	return { current, previous, change: current - previous, percentChange: previous === 0 ? null : ((current - previous) / Math.abs(previous)) * 100 };
}

function summarizeOrders(orders) {
	const summary = { totalOrders: orders.length, deliveredOrders: 0, cancelledOrders: 0, customerCancellations: 0, merchantCancellations: 0, pickedUpStatusOrders: 0, activeOrders: 0, collectedOrders: 0, paidOrders: 0, grossOrderValueUSD: 0, deliveryChargesUSD: 0, averageOrderValueUSD: null, expressOrders: 0, deliverySuccessRate: null, cancellationRate: null, expressRate: null };
	const statuses = Object.fromEntries(STATUS.map((status) => [status, 0]));
	for (const order of orders) {
		statuses[order.status] = (statuses[order.status] || 0) + 1;
		if (isDelivered(order)) summary.deliveredOrders++;
		if (isCancelled(order)) summary.cancelledOrders++;
		if (order.cancelledBy === "customer") summary.customerCancellations++;
		if (order.cancelledBy === "merchant") summary.merchantCancellations++;
		if (order.status === "Picked_up") summary.pickedUpStatusOrders++;
		if (["WAREHOUSE", "NEW", "Picked_up"].includes(order.status) && !isCancelled(order)) summary.activeOrders++;
		if (order.status === "COLLECTED") summary.collectedOrders++;
		if (order.status === "Paid") summary.paidOrders++;
		if (order.isExpress) summary.expressOrders++;
		if (isRevenueEligible(order)) {
			summary.grossOrderValueUSD += order.total || 0;
			summary.deliveryChargesUSD += order.deliveryCharge || 0;
		}
	}
	summary.averageOrderValueUSD = ratio(summary.grossOrderValueUSD, orders.filter(isRevenueEligible).length);
	summary.deliverySuccessRate = ratio(summary.deliveredOrders, summary.totalOrders);
	summary.cancellationRate = ratio(summary.cancelledOrders, summary.totalOrders);
	summary.expressRate = ratio(summary.expressOrders, summary.totalOrders);
	return { summary, statuses };
}

function groupOrders(orders, keyOf, labelOf = (key) => key) {
	const map = new Map();
	for (const order of orders) {
		const key = keyOf(order);
		if (!key) continue;
		if (!map.has(key)) map.set(key, { key, name: labelOf(key), orders: [] });
		map.get(key).orders.push(order);
	}
	return [...map.values()].map(({ key, name, orders: items }) => ({ key, name, ...summarizeOrders(items).summary }))
		.sort((a, b) => b.totalOrders - a.totalOrders || a.name.localeCompare(b.name)).slice(0, 100);
}

function orderTrend(orders, range) {
	const monthly = range.days > 90;
	const points = new Map();
	for (const order of orders) {
		const day = utcDay(order.createdAt);
		const key = monthly ? day.slice(0, 7) : day;
		if (!points.has(key)) points.set(key, { period: key, orders: 0, delivered: 0, cancelled: 0, grossOrderValueUSD: 0, deliveryChargesUSD: 0 });
		const point = points.get(key);
		point.orders++;
		if (isDelivered(order)) point.delivered++;
		if (isCancelled(order)) point.cancelled++;
		if (isRevenueEligible(order)) { point.grossOrderValueUSD += order.total || 0; point.deliveryChargesUSD += order.deliveryCharge || 0; }
	}
	return { bucket: monthly ? "month" : "day", points: [...points.values()].sort((a, b) => a.period.localeCompare(b.period)) };
}

function financeSummary(transactions, expenses, collections, payments) {
	const completed = transactions.filter((tx) => tx.status === COMPLETED);
	const sum = (rows, field = "amount") => rows.reduce((total, row) => total + (row[field] || 0), 0);
	const cashInUSD = sum(completed.filter((tx) => CASH_IN.has(tx.type)));
	const cashOutUSD = sum(completed.filter((tx) => CASH_OUT.has(tx.type)));
	const paymentMethods = Object.fromEntries(["CASH", "OMT", "WHISH"].map((method) => [method, sum(completed.filter((tx) => tx.paymentMethod === method))]));
	const expenseCategories = {};
	for (const expense of expenses) expenseCategories[expense.category] = (expenseCategories[expense.category] || 0) + expense.amount;
	const cashTrend = new Map();
	for (const tx of completed) {
		const day = utcDay(tx.date);
		if (!cashTrend.has(day)) cashTrend.set(day, { period: day, cashInUSD: 0, cashOutUSD: 0 });
		if (CASH_IN.has(tx.type)) cashTrend.get(day).cashInUSD += tx.amount;
		if (CASH_OUT.has(tx.type)) cashTrend.get(day).cashOutUSD += tx.amount;
	}
	const expenseTrend = new Map();
	for (const expense of expenses) {
		const day = utcDay(expense.date);
		expenseTrend.set(day, (expenseTrend.get(day) || 0) + expense.amount);
	}
	return {
		cashInUSD, cashOutUSD, netCashMovementUSD: cashInUSD - cashOutUSD,
		transactionCount: completed.length, transactionTypes: Object.fromEntries(["CASH_IN", "CASH_OUT", "MERCHANT_PAYMENT", "DRIVER_COLLECTION", "EXPENSE", "REFUND"].map((type) => [type, sum(completed.filter((tx) => tx.type === type))])),
		paymentMethods, expensesUSD: sum(expenses), expenseCategories,
		cashTrend: [...cashTrend.values()].sort((a, b) => a.period.localeCompare(b.period)),
		expenseTrend: [...expenseTrend.entries()].map(([period, amountUSD]) => ({ period, amountUSD })).sort((a, b) => a.period.localeCompare(b.period)),
		collectionGrossUSD: sum(collections), collectionDriverFeeUSD: sum(collections, "deliveryFee"), collectionCount: collections.length,
		merchantPaymentsUSD: sum(payments), prepaidAdvancesUSD: sum(payments.filter((payment) => payment.isAdvance && payment.amount > 0)), prepaidNegativeAdjustmentsUSD: sum(payments.filter((payment) => payment.isAdvance && payment.amount < 0)), paymentCount: payments.length,
	};
}

async function loadAnalyticsReport(db, range) {
	const { filters, start, endExclusive, previousStart } = range;
	const orderWhere = {
		createdAt: { gte: previousStart, lt: endExclusive },
		...(filters.merchantId && { merchantId: filters.merchantId }),
		...(filters.driverId && { driverId: filters.driverId }),
		...(filters.district && { district: { equals: filters.district, mode: "insensitive" } }),
		...(filters.city && { city: { equals: filters.city, mode: "insensitive" } }),
	};
	const financeEnabled = Object.keys(filters).length === 0;
	const [orders, transactions, expenses, collections, payments, users] = await Promise.all([
		db.order.findMany({ where: orderWhere, take: 50001, select: { id: true, createdAt: true, status: true, cancelledBy: true, collectedBack: true, total: true, deliveryCharge: true, isExpress: true, merchantId: true, driverId: true, district: true, city: true } }),
		financeEnabled ? db.financeTransaction.findMany({ where: { date: { gte: previousStart, lt: endExclusive } }, take: 20001, select: { type: true, amount: true, paymentMethod: true, status: true, date: true } }) : [],
		financeEnabled ? db.financeExpense.findMany({ where: { date: { gte: previousStart, lt: endExclusive } }, take: 20001, select: { amount: true, category: true, date: true } }) : [],
		financeEnabled ? db.driverCollection.findMany({ where: { createdAt: { gte: start, lt: endExclusive } }, take: 10001, select: { driverId: true, amount: true, deliveryFee: true } }) : [],
		financeEnabled ? db.merchantPayment.findMany({ where: { createdAt: { gte: start, lt: endExclusive } }, take: 10001, select: { merchantId: true, amount: true, isAdvance: true } }) : [],
		db.user.findMany({ where: { role: { in: ["MERCHANT", "DRIVER"] } }, select: { id: true, username: true, firstName: true, lastName: true, accountType: true } }),
	]);
	if (orders.length > 50000 || transactions.length > 20000 || expenses.length > 20000 || [collections, payments].some((rows) => rows.length > 10000)) throw new Error("Report exceeds read limit; narrow the period");
	const current = orders.filter((order) => order.createdAt >= start);
	const previous = orders.filter((order) => order.createdAt < start);
	const currentSummary = summarizeOrders(current);
	const previousSummary = summarizeOrders(previous);
	const comparisons = Object.fromEntries(Object.keys(currentSummary.summary).filter((key) => typeof currentSummary.summary[key] === "number" && Number.isFinite(currentSummary.summary[key])).map((key) => [key, compare(currentSummary.summary[key], previousSummary.summary[key]) ]));
	const userMap = new Map(users.map((user) => [user.id, user]));
	const label = (id) => userMap.get(id)?.username || id;
	const merchants = groupOrders(current, (order) => order.merchantId, label).map((row) => ({ ...row, accountType: userMap.get(row.key)?.accountType || "POSTPAID", paymentAmountUSD: financeEnabled ? sumBy(payments.filter((payment) => payment.merchantId === row.key), "amount") : null }));
	const drivers = groupOrders(current, (order) => order.driverId, label).map((row) => ({ ...row, collectionGrossUSD: financeEnabled ? sumBy(collections.filter((collection) => collection.driverId === row.key), "amount") : null, collectionDriverFeeUSD: financeEnabled ? sumBy(collections.filter((collection) => collection.driverId === row.key), "deliveryFee") : null }));
	const finance = financeEnabled ? financeSummary(transactions.filter((row) => row.date >= start), expenses.filter((row) => row.date >= start), collections, payments) : null;
	if (finance) {
		const prior = financeSummary(transactions.filter((row) => row.date < start), expenses.filter((row) => row.date < start), [], []);
		finance.comparison = Object.fromEntries(["cashInUSD", "cashOutUSD", "netCashMovementUSD", "expensesUSD"].map((key) => [key, compare(finance[key], prior[key])]));
	}
	return {
		range: { startDate: range.startDate, endDate: range.endDate, previousStartDate: range.previousStartDate, previousEndDate: range.previousEndDate, timezone: range.timezone, basis: range.basis, filters },
		summary: currentSummary.summary, comparison: comparisons, rawStatusDistribution: currentSummary.statuses,
		trend: orderTrend(current, range), merchants, drivers,
		regions: { districts: groupOrders(current, (order) => order.district), cities: groupOrders(current, (order) => `${order.district} / ${order.city}`) },
		finance,
		financeScope: financeEnabled ? "Company records in selected UTC period" : "Unavailable with order party/location filters; clear filters for company finance",
	};
}

function sumBy(rows, field) { return rows.reduce((sum, row) => sum + (row[field] || 0), 0); }

export { normalizeReportRange, isCancelled, isDelivered, isRevenueEligible, compare, summarizeOrders, orderTrend, financeSummary, loadAnalyticsReport };

import { summarizeOrders } from "./analytics-report.service.js";

async function loadStatement(db, kind, userId, range) {
	if (!["merchant", "driver"].includes(kind)) throw new Error("Invalid statement kind");
	const role = kind === "merchant" ? "MERCHANT" : "DRIVER";
	const user = await db.user.findFirst({ where: { id: userId, role }, select: { id: true, username: true, firstName: true, lastName: true, accountType: true } });
	if (!user) return null;
	const orderWhere = { [kind === "merchant" ? "merchantId" : "driverId"]: user.id, createdAt: { gte: range.start, lt: range.endExclusive } };
	const orders = await db.order.findMany({ where: orderWhere, orderBy: { createdAt: "asc" }, take: 5001, select: { id: true, createdAt: true, status: true, cancelledBy: true, collectedBack: true, total: true, deliveryCharge: true, isExpress: true } });
	let records;
	if (kind === "merchant") {
		records = await db.merchantPayment.findMany({ where: { merchantId: user.id, createdAt: { gte: range.start, lt: range.endExclusive } }, orderBy: { createdAt: "asc" }, take: 5001, select: { number: true, createdAt: true, amount: true, isAdvance: true, orders: { select: { orderId: true } } } });
	} else {
		records = await db.driverCollection.findMany({ where: { driverId: user.id, createdAt: { gte: range.start, lt: range.endExclusive } }, orderBy: { createdAt: "asc" }, take: 5001, select: { number: true, createdAt: true, amount: true, deliveryFee: true, orders: { select: { orderId: true } } } });
	}
	if (orders.length > 5000 || records.length > 5000) throw new Error("Statement exceeds 5000 records; narrow the period");
	const summary = summarizeOrders(orders).summary;
	const activity = records.map((record) => kind === "merchant" ? {
		number: record.number, date: record.createdAt, type: record.isAdvance ? "PREPAID_ADVANCE_OR_ADJUSTMENT" : "ORDER_PAYMENT", amountUSD: record.amount, orderIds: record.orders.map((link) => link.orderId),
	} : {
		number: record.number, date: record.createdAt, grossUSD: record.amount, driverFeeUSD: record.deliveryFee, netToGoDeliveryUSD: record.amount - record.deliveryFee, orderIds: record.orders.map((link) => link.orderId),
	});
	return {
		kind, identity: { id: user.id, username: user.username, name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username, ...(kind === "merchant" && { accountType: user.accountType || "POSTPAID" }) },
		range: { startDate: range.startDate, endDate: range.endDate, timezone: "UTC", basis: "orders by createdAt; payments/collections by createdAt" },
		summary, orders, activity,
		activityTotals: kind === "merchant"
			? { recordedPaymentsUSD: activity.reduce((sum, row) => sum + row.amountUSD, 0), paymentCount: activity.length }
			: { collectionGrossUSD: activity.reduce((sum, row) => sum + row.grossUSD, 0), recordedDriverFeesUSD: activity.reduce((sum, row) => sum + row.driverFeeUSD, 0), netTransferredUSD: activity.reduce((sum, row) => sum + row.netToGoDeliveryUSD, 0), collectionCount: activity.length },
	};
}

export { loadStatement };

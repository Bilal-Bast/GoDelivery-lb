import prisma from "../config/prisma.js";
import { csvDocument } from "../services/csv.service.js";

async function exportFinanceHistory(req, res, next) {
	try {
		const kind = req.params.kind;
		if (!["collections", "payments", "returns"].includes(kind)) return res.status(404).json({ error: "Unknown export" });
		const select = {
			collections: { model: prisma.driverCollection, fields: { number: true, createdAt: true, amount: true, deliveryFee: true, driver: { select: { username: true } }, admin: { select: { username: true } }, orders: { select: { orderId: true } } } },
			payments: { model: prisma.merchantPayment, fields: { number: true, createdAt: true, amount: true, isAdvance: true, notes: true, merchant: { select: { username: true, accountType: true } }, admin: { select: { username: true } }, orders: { select: { orderId: true } } } },
			returns: { model: prisma.merchantReturn, fields: { number: true, createdAt: true, goodsValue: true, merchant: { select: { username: true, accountType: true } }, admin: { select: { username: true } }, orders: { select: { orderId: true } } } },
		}[kind];
		const records = await select.model.findMany({ orderBy: { createdAt: "desc" }, take: 5001, select: select.fields });
		if (records.length > 5000) return res.status(400).json({ error: "Export exceeds 5000 records" });
		const c = (value, text = true) => ({ value, text });
		let headers;
		let rows;
		if (kind === "collections") {
			headers = ["collectionNumber", "date", "driver", "admin", "grossUSD", "driverFeeUSD", "orderCount", "orderIds"];
			rows = records.map((item) => [c(item.number, false), c(item.createdAt.toISOString()), c(item.driver?.username), c(item.admin?.username), c(item.amount, false), c(item.deliveryFee, false), c(item.orders.length, false), c(item.orders.map((link) => link.orderId).join(" "))]);
		} else if (kind === "payments") {
			headers = ["paymentNumber", "date", "merchant", "accountType", "isAdvance", "amountUSD", "admin", "notes", "orderCount", "orderIds"];
			rows = records.map((item) => [c(item.number, false), c(item.createdAt.toISOString()), c(item.merchant?.username), c(item.merchant?.accountType), c(item.isAdvance), c(item.amount, false), c(item.admin?.username), c(item.notes), c(item.orders.length, false), c(item.orders.map((link) => link.orderId).join(" "))]);
		} else {
			headers = ["returnNumber", "date", "merchant", "accountType", "admin", "goodsValueUSD", "orderCount", "orderIds"];
			rows = records.map((item) => [c(item.number, false), c(item.createdAt.toISOString()), c(item.merchant?.username), c(item.merchant?.accountType), c(item.admin?.username), c(item.goodsValue, false), c(item.orders.length, false), c(item.orders.map((link) => link.orderId).join(" "))]);
		}
		res.set("Content-Type", "text/csv; charset=utf-8");
		res.set("Content-Disposition", `attachment; filename="GoDelivery-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`);
		res.send(csvDocument(headers, rows));
	} catch (error) { next(error); }
}

export { exportFinanceHistory };

import PDFDocument from "pdfkit";
import { csvDocument } from "./csv.service.js";

const c = (value, text = true) => ({ value, text });

function reportCsv(report, section) {
	if (section === "summary") {
		return csvDocument(["metric", "current", "previous", "change", "percentChange"], Object.entries(report.comparison).map(([key, value]) => [c(key), c(value.current, false), c(value.previous, false), c(value.change, false), c(value.percentChange, false)]));
	}
	if (section === "finance") {
		if (!report.finance) throw new Error("Clear order filters before exporting company finance");
		return csvDocument(["metric", "value"], Object.entries(report.finance).filter(([, value]) => typeof value === "number").map(([key, value]) => [c(key), c(value, false)]));
	}
	if (section === "merchants" || section === "drivers") {
		const headers = ["username", "orders", "delivered", "cancelled", "pickedUpCurrentStatus", "customerCancellations", "merchantCancellations", "grossOrderValueUSD", "deliveryChargesUSD", ...(section === "merchants" ? ["accountType", "paymentAmountUSD"] : ["collectionGrossUSD", "collectionDriverFeeUSD"])];
		const rows = report[section].map((row) => [c(row.name), c(row.totalOrders, false), c(row.deliveredOrders, false), c(row.cancelledOrders, false), c(row.pickedUpStatusOrders, false), c(row.customerCancellations, false), c(row.merchantCancellations, false), c(row.grossOrderValueUSD, false), c(row.deliveryChargesUSD, false), ...(section === "merchants" ? [c(row.accountType), c(row.paymentAmountUSD, false)] : [c(row.collectionGrossUSD, false), c(row.collectionDriverFeeUSD, false)])]);
		return csvDocument(headers, rows);
	}
	if (section === "regions") {
		const headers = ["level", "location", "orders", "delivered", "cancelled", "grossOrderValueUSD", "deliveryChargesUSD", "expressOrders"];
		const rows = ["districts", "cities"].flatMap((level) => report.regions[level].map((row) => [c(level), c(row.name), c(row.totalOrders, false), c(row.deliveredOrders, false), c(row.cancelledOrders, false), c(row.grossOrderValueUSD, false), c(row.deliveryChargesUSD, false), c(row.expressOrders, false)]));
		return csvDocument(headers, rows);
	}
	throw new Error("Invalid report section");
}

function statementCsv(statement) {
	const orderRows = statement.orders.map((order) => [c("order"), c(order.id), c(order.createdAt.toISOString()), c(order.status), c(order.total, false), c(order.deliveryCharge, false), c(order.cancelledBy), c("")]);
	const activityRows = statement.activity.map((item) => [c(statement.kind === "merchant" ? "payment" : "collection"), c(item.number, false), c(item.date.toISOString()), c(item.type || "recorded collection"), c(item.amountUSD ?? item.grossUSD, false), c(item.driverFeeUSD ?? "", false), c(""), c(item.orderIds.join(" "))]);
	return csvDocument(["recordType", "idOrNumber", "dateUTC", "statusOrType", "amountUSD", "deliveryChargeOrDriverFeeUSD", "cancelledBy", "linkedOrderIds"], [...orderRows, ...activityRows]);
}

function statementPdf(statement) {
	if (statement.orders.length + statement.activity.length > 500) throw new Error("PDF statement exceeds 500 rows; narrow the period or use CSV");
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ size: "A4", margin: 42, info: { Title: `GoDelivery ${statement.kind} statement` } });
		const chunks = [];
		doc.on("data", (chunk) => chunks.push(chunk));
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);
		const line = (label, value) => { doc.font("Helvetica-Bold").fontSize(9).text(`${label}: `, { continued: true }).font("Helvetica").text(String(value ?? "")); };
		doc.fillColor("#17324d").font("Helvetica-Bold").fontSize(19).text("GoDelivery Statement");
		doc.moveDown(0.5).fillColor("#222222").fontSize(11).text(statement.kind === "merchant" ? "Merchant activity" : "Driver activity");
		doc.moveDown();
		line("Account", `${statement.identity.name} (${statement.identity.username})`);
		if (statement.identity.accountType) line("Account type", statement.identity.accountType);
		line("Period (UTC)", `${statement.range.startDate} to ${statement.range.endDate}`);
		doc.moveDown();
		line("Orders created", statement.summary.totalOrders);
		line("Delivered outcome", statement.summary.deliveredOrders);
		line("Cancelled outcome", statement.summary.cancelledOrders);
		if (statement.kind === "merchant") line("Recorded payments (USD)", statement.activityTotals.recordedPaymentsUSD.toFixed(2));
		else {
			line("Collection gross (USD)", statement.activityTotals.collectionGrossUSD.toFixed(2));
			line("Recorded driver fees (USD)", statement.activityTotals.recordedDriverFeesUSD.toFixed(2));
			line("Net transferred (USD)", statement.activityTotals.netTransferredUSD.toFixed(2));
		}
		doc.moveDown().font("Helvetica-Bold").fontSize(12).text("Orders");
		doc.font("Helvetica").fontSize(8);
		if (!statement.orders.length) doc.text("No orders in this period.");
		for (const order of statement.orders) doc.text(`${order.createdAt.toISOString().slice(0, 10)}   ${order.id}   ${order.status}   USD ${order.total.toFixed(2)}   Delivery ${order.deliveryCharge.toFixed(2)}`);
		doc.moveDown().font("Helvetica-Bold").fontSize(12).text(statement.kind === "merchant" ? "Payments and adjustments" : "Collections");
		doc.font("Helvetica").fontSize(8);
		if (!statement.activity.length) doc.text("No recorded activity in this period.");
		for (const item of statement.activity) doc.text(`${item.date.toISOString().slice(0, 10)}   #${item.number}   USD ${(item.amountUSD ?? item.grossUSD).toFixed(2)}   ${item.type || `Fee ${item.driverFeeUSD.toFixed(2)}`}   Orders: ${item.orderIds.join(" ")}`);
		doc.end();
	});
}

export { reportCsv, statementCsv, statementPdf };

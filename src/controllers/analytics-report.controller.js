import prisma from "../config/prisma.js";
import { normalizeReportRange, loadAnalyticsReport } from "../services/analytics-report.service.js";
import { loadStatement } from "../services/statement.service.js";
import { reportCsv, statementCsv, statementPdf } from "../services/report-export.service.js";

function badRequest(res, error) { return res.status(400).json({ error: error.message }); }
function download(res, bytes, filename, type) {
	res.set("Content-Type", type);
	res.set("Content-Disposition", `attachment; filename="${filename}"`);
	return res.send(bytes);
}

async function getReport(req, res, next) {
	try {
		const { section, ...filters } = req.query;
		let range;
		try { range = normalizeReportRange(filters); }
		catch (error) { return badRequest(res, error); }
		if (section && !["summary", "merchants", "drivers", "regions", "finance"].includes(section)) return res.status(400).json({ error: "Invalid export section" });
		if (section === "finance" && Object.keys(range.filters).length) return res.status(400).json({ error: "Clear order filters before exporting company finance" });
		const report = await loadAnalyticsReport(prisma, range);
		if (section) return download(res, reportCsv(report, section), `GoDelivery-Analytics-${section}-${range.endDate}.csv`, "text/csv; charset=utf-8");
		return res.json(report);
	} catch (error) {
		if (error.message?.includes("exceeds read limit")) return res.status(413).json({ error: error.message });
		next(error);
	}
}

async function getStatement(req, res, next, self = false) {
	try {
		if (!self && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
		if (self && !["merchant", "driver"].includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
		const { format, ...filters } = req.query;
		if (format && !["csv", "pdf"].includes(format)) return res.status(400).json({ error: "Invalid format" });
		let range;
		try { range = normalizeReportRange(filters); }
		catch (error) { return badRequest(res, error); }
		const kind = self ? req.user.role : req.params.kind;
		const userId = self ? req.user.id : req.params.id;
		if (!["merchant", "driver"].includes(kind)) return res.status(400).json({ error: "Invalid statement kind" });
		const statement = await loadStatement(prisma, kind, userId, range);
		if (!statement) return res.status(404).json({ error: "Account not found" });
		const base = `GoDelivery-${kind}-statement-${range.endDate}`;
		if (format === "csv") return download(res, statementCsv(statement), `${base}.csv`, "text/csv; charset=utf-8");
		if (format === "pdf") return download(res, await statementPdf(statement), `${base}.pdf`, "application/pdf");
		return res.json(statement);
	} catch (error) {
		if (error.message?.includes("exceeds 5000 records") || error.message?.includes("PDF statement exceeds")) return res.status(413).json({ error: error.message });
		next(error);
	}
}

const getOwnStatement = (req, res, next) => getStatement(req, res, next, true);
const getAdminStatement = (req, res, next) => getStatement(req, res, next, false);
export { getReport, getOwnStatement, getAdminStatement };

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(
	__dirname,
	"../public/assets/logogo-removebg-preview.png",
);

const COLORS = {
	brandDark: "#1e293b",
	brandMuted: "#cbd5e1",
	text: "#1f2937",
	muted: "#6b7280",
	border: "#e2e8f0",
	panelBg: "#f8fafc",
	zebra: "#f9fafb",
	positive: "#059669",
	negative: "#dc2626",
	white: "#ffffff",
};

const MARGIN = 50;

async function createReportDoc() {
	const PDFDocument = (await import("pdfkit")).default;
	return new PDFDocument({ margin: MARGIN, size: "A4" });
}

/** Dark header band with logo, brand name, and the report title/number. */
function drawHeader(doc, { title, number }) {
	const pageWidth = doc.page.width;
	const bandHeight = 78;

	doc.rect(0, 0, pageWidth, bandHeight).fill(COLORS.brandDark);

	let textX = MARGIN;
	try {
		doc.image(LOGO_PATH, MARGIN, 15, { width: 48, height: 48 });
		textX = MARGIN + 58;
	} catch {
		// Logo is a nice-to-have — carry on without it if it can't be read.
	}

	doc
		.font("Helvetica-Bold")
		.fontSize(17)
		.fillColor(COLORS.white)
		.text("Go Delivery", textX, 22);
	doc
		.font("Helvetica")
		.fontSize(9)
		.fillColor(COLORS.brandMuted)
		.text("Financial Settlement Report", textX, 44);

	doc
		.font("Helvetica-Bold")
		.fontSize(15)
		.fillColor(COLORS.white)
		.text(title, 0, 22, { align: "right", width: pageWidth - MARGIN });
	if (number != null) {
		doc
			.font("Helvetica")
			.fontSize(10)
			.fillColor(COLORS.brandMuted)
			.text(`#${String(number).padStart(4, "0")}`, 0, 44, {
				align: "right",
				width: pageWidth - MARGIN,
			});
	}

	doc.fillColor(COLORS.text);
	doc.y = bandHeight + 24;
}

/** Rounded panel of label/value pairs, laid out two per row. */
function drawInfoCard(doc, items) {
	const x = MARGIN;
	const width = doc.page.width - MARGIN * 2;
	const rowHeight = 32;
	const rows = Math.ceil(items.length / 2);
	const height = rows * rowHeight + 20;
	const y = doc.y;

	doc.roundedRect(x, y, width, height, 6).fill(COLORS.panelBg);
	doc
		.roundedRect(x, y, width, height, 6)
		.lineWidth(1)
		.strokeColor(COLORS.border)
		.stroke();

	const colWidth = width / 2;
	items.forEach((item, i) => {
		const col = i % 2;
		const row = Math.floor(i / 2);
		const ix = x + 20 + col * colWidth;
		const iy = y + 14 + row * rowHeight;

		doc
			.font("Helvetica")
			.fontSize(8)
			.fillColor(COLORS.muted)
			.text(item.label.toUpperCase(), ix, iy, { characterSpacing: 0.3 });
		doc
			.font("Helvetica-Bold")
			.fontSize(11)
			.fillColor(item.color || COLORS.text)
			.text(item.value, ix, iy + 12, { width: colWidth - 32 });
	});

	doc.fillColor(COLORS.text);
	doc.y = y + height + 24;
}

/**
 * Zebra-striped table with a colored header row that repeats on new pages.
 * columns: [{ label, width, align? }]
 * rows: [{ cells: [{ text, color? }] }]
 */
function drawTable(doc, { columns, rows }) {
	const pageWidth = doc.page.width;
	const tableWidth = pageWidth - MARGIN * 2;
	const headerHeight = 26;
	const rowHeight = 22;
	const bottomMargin = MARGIN;

	let colX = MARGIN;
	const positions = columns.map((col) => {
		const x = colX;
		colX += col.width;
		return x;
	});

	function header(y) {
		doc.rect(MARGIN, y, tableWidth, headerHeight).fill(COLORS.brandDark);
		doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.white);
		columns.forEach((col, i) => {
			doc.text(col.label, positions[i] + 8, y + 8, {
				width: col.width - 12,
				align: col.align || "left",
			});
		});
		doc.fillColor(COLORS.text);
		return y + headerHeight;
	}

	let y = header(doc.y);

	rows.forEach((row, i) => {
		if (y + rowHeight > doc.page.height - bottomMargin) {
			doc.addPage();
			y = header(MARGIN);
		}

		if (i % 2 === 1) {
			doc.rect(MARGIN, y, tableWidth, rowHeight).fill(COLORS.zebra);
		}

		doc.font("Helvetica").fontSize(9);
		row.cells.forEach((cell, ci) => {
			doc.fillColor(cell.color || COLORS.text);
			doc.text(cell.text, positions[ci] + 8, y + 6, {
				width: columns[ci].width - 12,
				align: columns[ci].align || "left",
			});
		});
		doc.fillColor(COLORS.text);
		y += rowHeight;
	});

	doc
		.moveTo(MARGIN, y)
		.lineTo(pageWidth - MARGIN, y)
		.lineWidth(1)
		.strokeColor(COLORS.border)
		.stroke();

	doc.y = y + 24;
}

/**
 * Right-aligned summary card — a stack of label/value lines followed by a
 * divider and a bolded net total.
 */
function drawSummary(doc, { lines, netLabel, netValue, netColor }) {
	const width = 250;
	const x = doc.page.width - MARGIN - width;
	const lineHeight = 20;
	const height = lines.length * lineHeight + 56;

	if (doc.y + height > doc.page.height - MARGIN) {
		doc.addPage();
	}
	const y = doc.y;

	doc.roundedRect(x, y, width, height, 6).fill(COLORS.panelBg);
	doc
		.roundedRect(x, y, width, height, 6)
		.lineWidth(1)
		.strokeColor(COLORS.border)
		.stroke();

	let cy = y + 16;
	const labelWidth = 130;
	const valueWidth = width - 32 - labelWidth;
	lines.forEach((line) => {
		doc
			.font("Helvetica")
			.fontSize(9.5)
			.fillColor(COLORS.muted)
			.text(line.label, x + 16, cy, { width: labelWidth });
		doc
			.font(line.bold ? "Helvetica-Bold" : "Helvetica")
			.fontSize(9.5)
			.fillColor(line.color || COLORS.text)
			.text(line.value, x + 16 + labelWidth, cy, {
				width: valueWidth,
				align: "right",
			});
		cy += lineHeight;
	});

	doc
		.moveTo(x + 16, cy + 2)
		.lineTo(x + width - 16, cy + 2)
		.lineWidth(1)
		.strokeColor(COLORS.border)
		.stroke();
	cy += 12;

	doc
		.font("Helvetica-Bold")
		.fontSize(12)
		.fillColor(COLORS.text)
		.text(netLabel, x + 16, cy, { width: labelWidth });
	doc
		.font("Helvetica-Bold")
		.fontSize(12)
		.fillColor(netColor || COLORS.text)
		.text(netValue, x + 16 + labelWidth, cy, {
			width: valueWidth,
			align: "right",
		});

	doc.fillColor(COLORS.text);
	doc.y = y + height + 20;
}

function money(value, { signed = false } = {}) {
	const n = Number(value || 0);
	const sign = signed && n < 0 ? "-" : "";
	return `${sign}$${Math.abs(n).toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

/** Strip characters that aren't safe in a downloaded filename. */
function sanitizeFilenamePart(value) {
	return String(value || "").replace(/[\\/:*?"<>|]/g, "_").trim();
}

/** YYYY-MM-DD, safe and sortable for use in a filename. */
function formatDateForFilename(date) {
	const d = new Date(date);
	const yyyy = d.getFullYear();
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

export {
	COLORS,
	createReportDoc,
	drawHeader,
	drawInfoCard,
	drawTable,
	drawSummary,
	money,
	sanitizeFilenamePart,
	formatDateForFilename,
};

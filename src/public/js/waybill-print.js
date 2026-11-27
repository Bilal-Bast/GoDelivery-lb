// Waybill (shipping label) printing for the merchant dashboard. The label
// layout, barcode drawing and print window are the same as the admin Orders
// page, so a waybill looks identical on both. Each order is one 80x80mm page.
//
//   window.WaybillPrint.print(orders)   // orders use the API shape (c, pr, m, e, eN ...)
(() => {
	const escapeHtml = (value) =>
		String(value ?? "").replace(/[&<>"']/g, (character) => ({
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#39;",
		})[character]);

	// JsBarcode writes fixed px width/height attributes on the <svg>, which makes
	// it overflow or get clipped on a fixed-size label. Swapping those for a
	// viewBox lets the CSS mm dimensions scale the whole barcode proportionally.
	// `fit` of "none" stretches the drawing to both edges of that box — what a
	// barcode-only label wants, so the bars span the full 35mm however long the
	// order id is. Every bar scales by the same factor, so it still scans.
	function fitBarcodeSvg(svg, fit = "xMidYMid meet") {
		if (!svg) return;
		const w = parseFloat(svg.getAttribute("width"));
		const h = parseFloat(svg.getAttribute("height"));
		if (!w || !h) return;
		svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
		svg.setAttribute("preserveAspectRatio", fit);
		svg.removeAttribute("width");
		svg.removeAttribute("height");
	}

	// Waits for JsBarcode and the label images so nothing prints half-rendered.
	function whenPrintWindowReady(printWindow, cb) {
		const start = Date.now();
		(function poll() {
			if (printWindow.closed) return;
			const imagesReady = Array.prototype.every.call(
				printWindow.document.images,
				(img) => img.complete,
			);
			if ((printWindow.JsBarcode && imagesReady) || Date.now() - start > 5000) {
				cb();
				return;
			}
			printWindow.setTimeout(poll, 50);
		})();
	}

	// Every label sheet — single or batch — shares this stylesheet. Each .label
	// is exactly one 50x80mm page, so a batch just stacks them and lets the
	// page break carry each order onto its own sheet.
	const LABEL_STYLES = `
			@page{
				size:80mm 80mm;
				margin:0;
			}

			*{
				box-sizing:border-box;
			}

			html,body{
				width:80mm;
				margin:0;
				padding:0;
				background:#fff;
			}

			body{
				font-family:Arial,Helvetica,sans-serif;
				color:#000;
				-webkit-font-smoothing:antialiased;
				-webkit-print-color-adjust:exact;
				print-color-adjust:exact;
			}

			.label{
				width:80mm;
				height:80mm;
				padding:1.5mm 2.5mm;
				overflow:hidden;
				display:flex;
				flex-direction:column;
				page-break-after:always;
				break-after:page;
			}

			.label:last-child{
				page-break-after:auto;
				break-after:auto;
			}

			/* ── header: logo + order reference ─────────────────────── */
			.head{
				display:flex;
				justify-content:space-between;
				align-items:flex-end;
				gap:2mm;
				padding-bottom:1mm;
				border-bottom:0.5mm solid #000;
			}

			.logo{
				flex:0 0 auto;
				height:9mm;
				width:auto;
				max-width:24mm;
				object-fit:contain;
			}

			.ref{
				text-align:right;
				line-height:1;
			}

			.ref .k{
				font-size:5.5pt;
				font-weight:bold;
				letter-spacing:0.4mm;
			}

			.ref .v{
				margin-top:0.7mm;
				font-size:11pt;
				font-weight:bold;
			}

			/* ── recipient + amount due ─────────────────────────────── */
			.body{
				flex:1;
				min-height:0;
				overflow:hidden;
				display:flex;
				flex-direction:column;
				align-items:flex-start;
				gap:2mm;
				padding-top:1mm;
			}

			.who{
				flex:1;
				min-width:0;
				width:100%;
			}

			.name{
				font-size:12pt;
				font-weight:bold;
				line-height:1.1;
				white-space:nowrap;
				overflow:hidden;
				text-overflow:ellipsis;
			}

			.phone{
				margin-top:0.7mm;
				font-size:8.5pt;
				white-space:nowrap;
				overflow:hidden;
				text-overflow:ellipsis;
			}

			.addr{
				margin-top:0;width:100%;
				font-size:12pt;
				font-weight:bold;
				line-height:1.2;
				display:-webkit-box;
				-webkit-line-clamp:4;
				-webkit-box-orient:vertical;
				overflow:hidden;
			}

			.cod{
				flex:0 0 auto;
				background:#000;
				color:#fff;
				border-radius:1.2mm;
				padding:1.1mm 2mm;
				text-align:center;
				line-height:1;
				align-self:flex-start;
			}

			.cod .k{
				font-size:5.5pt;
				font-weight:bold;
				letter-spacing:0.35mm;
			}

			.cod .v{
				margin-top:0.9mm;
				font-size:10pt;
				font-weight:bold;
				white-space:nowrap;
			}

			/* ── sender strip ───────────────────────────────────────── */
			.from{
				display:flex;
				justify-content:space-between;
				align-items:center;
				gap:2mm;
				margin-top:0.6mm;
				padding-top:0.6mm;
				border-top:0.2mm solid #000;
				font-size:6.5pt;
				letter-spacing:0.12mm;
				text-transform:uppercase;
			}

			.from .m{
				min-width:0;
				white-space:nowrap;
				overflow:hidden;
				text-overflow:ellipsis;
			}

			.from .m b{
				font-weight:bold;
			}

			.tag{
				flex:0 0 auto;
				border:0.25mm solid #000;
				border-radius:0.8mm;
				padding:0.3mm 1.2mm;
				font-size:6pt;
				font-weight:bold;
				letter-spacing:0.25mm;
			}

			/* ── note ─────────────────────────────── */
			.note{
				margin-top:0.8mm;
				padding:0.8mm 1.2mm;
				border:0.3mm solid #000;
				border-radius:1mm;
				font-size:7pt;
				line-height:1.3;
				display:-webkit-box;
				-webkit-line-clamp:3;
				-webkit-box-orient:vertical;
				overflow:hidden;
			}

			.note .k{
				font-size:5.5pt;
				font-weight:bold;
				letter-spacing:0.35mm;
			}

			/* ── barcode ────────────────────────────────────────────── */
			.barcode{
				margin-top:auto;
				text-align:center;
			}

			.barcode svg{
				display:block;
				width:45mm;
				height:20mm;
				margin:0 auto;
			}
	`;

	const barcodeElementId = (order) => `barcode-${order.id}`;

	// One shipping label for a single order.
	function buildLabelMarkup(order) {
		const name = `${order.c?.f || ""} ${order.c?.l || ""}`.trim();
		const phone = order.c?.p || "";
		const district = order.c?.loc?.d || "";
		const city = order.c?.loc?.cty || "";
		const merchant = order.m || "";
		const amount = order.pr?.t || 0;

		const place =
			district && city ? `${district}, ${city}` : district || city;
		const location = [order.c?.loc?.a, place].filter(Boolean).join(" - ");

		const isExchange = !!order.e;
		const note = (order.eN || "").trim();

		return `
		<div class="label">

			<div class="head">
				<img class="logo"
					src="/assets/logo-label.png"
					alt="Logo"
					onerror="this.style.display='none'">

				<div class="ref">
					<div class="k">ORDER</div>
					<div class="v">#${escapeHtml(String(order.id))}</div>
				</div>
			</div>

			<div class="body">
				<div class="who">
					<div class="name">${escapeHtml(name) || "&nbsp;"}</div>
					<div class="phone">${escapeHtml(phone)}</div>
				</div>
					<div class="addr">${escapeHtml(location)}</div>

				<div class="cod">
					<div class="k">COD</div>
					<div class="v">$${Number(amount).toFixed(2)}</div>
				</div>
			</div>

			<div class="from">
				<div class="m">From <b>${escapeHtml(merchant)}</b></div>
				${isExchange ? `<div class="tag">EXCHANGE</div>` : ""}
			</div>

			${note ? `<div class="note"><span class="k">NOTE</span> ${escapeHtml(note)}</div>` : ""}

			<div class="barcode">
				<svg id="${escapeHtml(barcodeElementId(order))}"></svg>
			</div>

		</div>
		`;
	}

	// Opens the print window, draws a barcode into every placeholder, prints once
	// everything has rendered, then closes.
	function openPrintSheet({ title, styles, body, orders, barcodeOptions, barcodeFit }) {
		const printWindow = window.open("", "", "width=320,height=420");

		if (!printWindow) {
			window.Dialog.alert(
				"Could not open the print window — please allow pop-ups for this site.",
				{ title: "Notice" },
			);
			return;
		}

		printWindow.document.write(`
	<html>
	<head>
		<title>${escapeHtml(title)}</title>

		<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>

		<style>${styles}</style>
	</head>

	<body>
${body}
	</body>
	</html>
	`);

		printWindow.document.close();

		whenPrintWindowReady(printWindow, () => {
			if (printWindow.JsBarcode) {
				orders.forEach((order) => {
					const svg = printWindow.document.getElementById(
						barcodeElementId(order),
					);
					if (!svg) return;

					printWindow.JsBarcode(svg, String(order.id), barcodeOptions);
					fitBarcodeSvg(svg, barcodeFit);
				});
			}

			printWindow.setTimeout(() => {
				printWindow.print();
				printWindow.close();
			}, 150);
		});
	}

	const LABEL_BARCODE_OPTIONS = {
		format: "CODE128",
		width: 2,
		height: 50,
		displayValue: true,
		fontSize: 16,
		textMargin: 1,
		margin: 0,
	};

	window.WaybillPrint = {
		print(orders) {
			if (!Array.isArray(orders) || !orders.length) return;
			openPrintSheet({
				title: orders.length === 1 ? "Shipping Label" : `Shipping Labels (${orders.length})`,
				styles: LABEL_STYLES,
				body: orders.map(buildLabelMarkup).join("\n"),
				orders,
				barcodeOptions: LABEL_BARCODE_OPTIONS,
			});
		},
	};
})();

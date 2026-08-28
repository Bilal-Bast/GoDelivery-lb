(() => {
	const escapeHtml = (str) =>
		String(str ?? "").replace(
			/[&<>"']/g,
			(c) =>
				({
					"&": "&amp;",
					"<": "&lt;",
					">": "&gt;",
					"'": "&#39;",
					'"': "&quot;",
				})[c],
		);

	// Orders currently listed for the selected merchant, keyed by id — the
	// scanner needs this to turn a barcode into a row.
	let returnableOrders = [];
	let selectedMerchantType = null;

	function money(value) {
		return `$${Number(value || 0).toFixed(2)}`;
	}

	function updateSelectedTotal() {
		let total = 0;
		document
			.querySelectorAll('#ordersBody input[type="checkbox"]:checked')
			.forEach((cb) => {
				total += parseFloat(cb.dataset.amount) || 0;
			});
		const el = document.getElementById("selectedTotal");
		if (el) el.textContent = money(total);
	}

	function reasonLabel(order) {
		if (order.cancelledBy === "merchant")
			return `<span style="color:#f59e0b;font-weight:600;">Cancelled by Merchant</span>`;
		if (order.cancelledBy === "customer")
			return `<span style="color:#f59e0b;font-weight:600;">Cancelled by Customer</span>`;
		if (order.isExchange)
			return `<span style="color:#6366f1;font-weight:600;">Exchange</span>`;
		return "Return";
	}

	// Spells out what confirming actually does, which differs by account type:
	// postpaid cancellations close out as Paid, whereas a prepaid merchant's
	// balance already dropped when the order was cancelled.
	function renderMerchantTypeNote() {
		const el = document.getElementById("merchantTypeNote");
		if (!el) return;
		el.className = "merchant-type-note";
		if (!selectedMerchantType) {
			el.textContent = "";
			return;
		}
		if (selectedMerchantType === "PREPAID") {
			el.classList.add("prepaid");
			el.textContent =
				"Prepaid merchant — returning these does not move money: their balance already dropped when the orders were cancelled.";
		} else {
			el.classList.add("postpaid");
			el.textContent =
				"Postpaid merchant — returned cancelled orders are closed out as Paid. Exchange orders stay payable on the Pay page.";
		}
	}

	function renderOrders(orders) {
		returnableOrders = orders;
		const ordersBody = document.getElementById("ordersBody");
		if (!ordersBody) return;

		ordersBody.innerHTML = "";

		if (orders.length === 0) {
			ordersBody.innerHTML = `
				<tr>
					<td colspan="5" class="empty-msg">No orders awaiting return for this merchant.</td>
				</tr>
			`;
			updateSelectedTotal();
			return;
		}

		orders.forEach((order) => {
			const row = document.createElement("tr");
			row.dataset.orderId = order.id;
			row.innerHTML = `
				<td><input type="checkbox" name="orderIds" value="${escapeHtml(order.id)}" data-amount="${order.goodsValue}"></td>
				<td>${escapeHtml(order.id)}</td>
				<td>${escapeHtml(order.customerName || "-")}</td>
				<td>${reasonLabel(order)}</td>
				<td class="amount-cell">${money(order.goodsValue)}</td>
			`;
			ordersBody.appendChild(row);
		});

		ordersBody
			.querySelectorAll('input[type="checkbox"]')
			.forEach((cb) => cb.addEventListener("change", updateSelectedTotal));

		updateSelectedTotal();
	}

	async function loadMerchantData(merchantName) {
		const ordersBody = document.getElementById("ordersBody");
		const merchantInput = document.getElementById("merchantUsernameInput");

		if (!merchantName) {
			selectedMerchantType = null;
			renderMerchantTypeNote();
			returnableOrders = [];
			if (ordersBody)
				ordersBody.innerHTML = `
					<tr>
						<td colspan="5" class="empty-msg">Select a merchant to view orders</td>
					</tr>
				`;
			updateSelectedTotal();
			return;
		}

		if (merchantInput) merchantInput.value = merchantName;

		if (ordersBody)
			ordersBody.innerHTML = `
				<tr><td colspan="5" class="empty-msg">Loading…</td></tr>
			`;

		try {
			const response = await fetch(
				`/api/returns/merchant/${encodeURIComponent(merchantName)}/returnable`,
				{ credentials: "include" },
			);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const result = await response.json();

			selectedMerchantType = result.merchant?.accountType || null;
			renderMerchantTypeNote();
			renderOrders(result.data || []);
		} catch (error) {
			console.error("Error loading merchant returns:", error);
			if (ordersBody)
				ordersBody.innerHTML = `
					<tr><td colspan="5" class="empty-msg">Failed to load orders.</td></tr>
				`;
		}
	}

	// ─── Return sessions history ─────────────────────────────────────────────

	async function loadReturnSessions() {
		const sessionsBody = document.getElementById("sessionsBody");
		if (!sessionsBody) return;

		try {
			const response = await fetch("/api/returns?limit=50", {
				credentials: "include",
			});
			if (!response.ok) throw new Error("Failed to fetch returns");

			const result = await response.json();
			const sessions = result.data || [];

			sessionsBody.innerHTML = "";

			if (sessions.length === 0) {
				sessionsBody.innerHTML = `
					<tr>
						<td colspan="8" class="empty-msg">No returns recorded yet.</td>
					</tr>
				`;
				return;
			}

			sessions.forEach((session, idx) => {
				const merchantName =
					`${session.merchant.firstName || ""} ${session.merchant.lastName || ""}`.trim() ||
					session.merchant.username;
				const isPrepaid = session.merchant.accountType === "PREPAID";
				const detailId = `returnOrders-${idx}`;

				const row = document.createElement("tr");
				row.style.cursor = "pointer";
				row.innerHTML = `
					<td><i class='bx bx-chevron-right' data-toggle-icon></i> #${session.number}</td>
					<td>${escapeHtml(merchantName)}</td>
					<td>${isPrepaid ? "Prepaid" : "Postpaid"}</td>
					<td style="text-align:center;font-weight:bold;">${session.orders.length}</td>
					<td class="amount-cell">${money(session.goodsValue)}</td>
					<td>${new Date(session.createdAt).toLocaleDateString()}</td>
					<td>${new Date(session.createdAt).toLocaleTimeString()}</td>
					<td>
						<div class="action-buttons">
							<button class="print-session-btn" data-session-id="${session.id}" title="Download PDF">
								<i class='bx bx-printer'></i>
							</button>
						</div>
					</td>
				`;

				const detailRow = document.createElement("tr");
				detailRow.id = detailId;
				detailRow.style.display = "none";
				detailRow.innerHTML = `<td colspan="8">${buildOrdersTable(session.orders)}</td>`;

				row.addEventListener("click", (e) => {
					// The PDF button lives inside the row; don't toggle on it.
					if (e.target.closest(".print-session-btn")) return;
					const showing = detailRow.style.display !== "none";
					detailRow.style.display = showing ? "none" : "table-row";
					const icon = row.querySelector("[data-toggle-icon]");
					if (icon) {
						icon.classList.toggle("bx-chevron-down", !showing);
						icon.classList.toggle("bx-chevron-right", showing);
					}
				});

				sessionsBody.appendChild(row);
				sessionsBody.appendChild(detailRow);
			});

			sessionsBody.querySelectorAll(".print-session-btn").forEach((btn) => {
				btn.addEventListener("click", async (e) => {
					e.preventDefault();
					e.stopPropagation();
					await downloadReturnPDF(btn.dataset.sessionId);
				});
			});
		} catch (error) {
			console.error("Error loading returns:", error);
			sessionsBody.innerHTML = `
				<tr>
					<td colspan="8" class="empty-msg">Failed to load return sessions.</td>
				</tr>
			`;
		}
	}

	function buildOrdersTable(orders) {
		if (!orders || orders.length === 0) {
			return '<div class="empty-msg">No orders in this return</div>';
		}
		const rows = orders
			.map(({ order }) => {
				const customer =
					`${order.customerFirstName || ""} ${order.customerLastName || ""}`.trim();
				const reason = order.cancelledBy
					? `Cancelled by ${order.cancelledBy}`
					: order.isExpress
						? "Exchange"
						: "Return";
				const value = (order.total || 0) - (order.deliveryCharge || 0);
				return `
					<tr>
						<td>${escapeHtml(order.id)}</td>
						<td>${escapeHtml(customer || "-")}</td>
						<td>${escapeHtml(order.customerPhone || "-")}</td>
						<td>${escapeHtml(reason)}</td>
						<td class="amount-cell">${money(value)}</td>
					</tr>
				`;
			})
			.join("");
		return `
			<table style="width:100%;">
				<thead>
					<tr>
						<th>Order ID</th>
						<th>Customer</th>
						<th>Phone</th>
						<th>Reason</th>
						<th>Goods Value</th>
					</tr>
				</thead>
				<tbody>${rows}</tbody>
			</table>
		`;
	}

	function getFilenameFromResponse(response, fallback) {
		const header = response.headers.get("Content-Disposition") || "";
		const match = header.match(/filename="([^"]+)"/);
		return match ? match[1] : fallback;
	}

	async function downloadReturnPDF(sessionId) {
		try {
			const response = await fetch(`/api/returns/${sessionId}/pdf`, {
				credentials: "include",
			});
			if (!response.ok) throw new Error("Failed to download PDF");

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = getFilenameFromResponse(response, "return.pdf");
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Error downloading PDF:", error);
			await window.Dialog.alert("Failed to download PDF", {
				title: "Error",
				danger: true,
			});
		}
	}

	// ─── Barcode scanning (phones only) ──────────────────────────────────────
	//
	// Scanning here SELECTS orders rather than submitting them: each decoded
	// barcode ticks that order's checkbox so a whole stack can be scanned in
	// one go, then handed back with a single Confirm Return.

	let zxingLoadPromise = null;
	let scanControls = null;
	let scanBusy = false;

	function loadZXingLibrary() {
		if (window.ZXing) return Promise.resolve();
		if (!zxingLoadPromise) {
			zxingLoadPromise = new Promise((resolve, reject) => {
				const script = document.createElement("script");
				// jsdelivr specifically — the app's CSP script-src allowlist
				// doesn't trust unpkg.
				script.src =
					"https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js";
				script.onload = () => resolve();
				script.onerror = () =>
					reject(new Error("Failed to load barcode scanner library"));
				document.head.appendChild(script);
			});
		}
		return zxingLoadPromise;
	}

	async function openScanModal() {
		const modal = document.getElementById("returnScanModal");
		const statusEl = document.getElementById("returnScanStatus");

		if (!document.getElementById("merchantSelect")?.value) {
			await window.Dialog.alert("Select a merchant first.", {
				title: "Notice",
			});
			return;
		}

		modal.style.display = "block";
		statusEl.style.color = "";
		statusEl.textContent = "Loading scanner…";

		try {
			await loadZXingLibrary();
			const reader = new window.ZXing.BrowserMultiFormatReader();
			statusEl.textContent = "Scan a barcode…";
			scanControls = await reader.decodeFromConstraints(
				{ video: { facingMode: "environment" } },
				"returnScanVideo",
				(result) => {
					if (result) handleScan(result.getText());
				},
			);
		} catch (err) {
			console.error("Scanner error:", err);
			statusEl.style.color = "#dc2626";
			statusEl.textContent =
				err.name === "NotAllowedError"
					? "Camera access denied. Please allow camera access and try again."
					: err.name === "NotFoundError"
						? "No camera found on this device."
						: "Could not start the scanner. Please try again.";
		}
	}

	function closeScanModal() {
		document.getElementById("returnScanModal").style.display = "none";
		if (scanControls) {
			scanControls.stop();
			scanControls = null;
		}
		scanBusy = false;
	}

	// A barcode held in frame decodes many times a second — scanBusy gates it
	// until the flash feedback for the current scan has run.
	function handleScan(scannedId) {
		if (scanBusy) return;
		scanBusy = true;

		const orderId = scannedId.trim();
		const row = document
			.getElementById("ordersBody")
			?.querySelector(`tr[data-order-id="${CSS.escape(orderId)}"]`);
		const checkbox = row?.querySelector('input[type="checkbox"]');

		if (!checkbox) {
			flashScan(false, `${orderId} is not in this merchant's return list`);
		} else if (checkbox.checked) {
			flashScan(true, `${orderId} was already ticked`);
		} else {
			checkbox.checked = true;
			updateSelectedTotal();
			row.classList.add("row-just-scanned");
			setTimeout(() => row.classList.remove("row-just-scanned"), 1500);
			flashScan(true, `✓ ${orderId} added`);
		}

		setTimeout(() => {
			scanBusy = false;
		}, 1200);
	}

	function flashScan(success, message) {
		const flashEl = document.getElementById("returnScanFlash");
		const statusEl = document.getElementById("returnScanStatus");
		if (flashEl) {
			flashEl.className = `scan-flash-overlay ${success ? "scan-flash-success" : "scan-flash-error"}`;
			setTimeout(() => {
				flashEl.className = "scan-flash-overlay";
			}, 500);
		}
		if (statusEl) {
			statusEl.style.color = success ? "#16a34a" : "#dc2626";
			statusEl.textContent = message;
		}
	}

	function initScanner() {
		const scanBtn = document.getElementById("scanReturnBtn");
		const modal = document.getElementById("returnScanModal");
		if (!scanBtn || !modal) return;

		scanBtn.addEventListener("click", () => openScanModal());
		document
			.getElementById("closeReturnScanModal")
			?.addEventListener("click", closeScanModal);
		document
			.getElementById("doneReturnScanBtn")
			?.addEventListener("click", closeScanModal);
		modal.addEventListener("click", (e) => {
			if (e.target === modal) closeScanModal();
		});
	}

	// ─── Submit ──────────────────────────────────────────────────────────────

	async function saveReturn(merchantUsername, orderIds) {
		const response = await fetch("/api/returns", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ merchantUsername, orderIds, notes: "" }),
		});

		if (!response.ok) {
			const err = await response.json().catch(() => ({}));
			throw new Error(err.error || "Failed to record return");
		}

		return (await response.json()).data;
	}

	document.addEventListener("DOMContentLoaded", () => {
		const merchantSelect = document.getElementById("merchantSelect");
		if (merchantSelect) {
			merchantSelect.addEventListener("change", function () {
				loadMerchantData(this.value);
			});
		}

		const selectAll = document.getElementById("selectAllOrders");
		if (selectAll) {
			selectAll.addEventListener("change", function () {
				document
					.querySelectorAll('#ordersBody input[type="checkbox"]')
					.forEach((cb) => (cb.checked = this.checked));
				updateSelectedTotal();
			});
		}

		const returnForm = document.getElementById("returnForm");
		if (returnForm) {
			returnForm.addEventListener("submit", async (e) => {
				e.preventDefault();

				const selectedIds = Array.from(
					document.querySelectorAll(
						'#ordersBody input[type="checkbox"]:checked',
					),
				).map((cb) => cb.value);

				if (selectedIds.length === 0) {
					await window.Dialog.alert("Please select at least one order", {
						title: "Notice",
					});
					return;
				}

				const merchantUsername = merchantSelect.value;
				const confirmBtn = document.getElementById("confirmBtn");
				confirmBtn.disabled = true;

				try {
					await saveReturn(merchantUsername, selectedIds);
					await window.Dialog.alert(
						`${selectedIds.length} order${selectedIds.length === 1 ? "" : "s"} returned to the merchant.`,
						{ title: "Success" },
					);
					if (selectAll) selectAll.checked = false;
					await loadMerchantData(merchantUsername);
					await loadReturnSessions();
				} catch (error) {
					await window.Dialog.alert(error.message, {
						title: "Error",
						danger: true,
					});
				} finally {
					confirmBtn.disabled = false;
				}
			});
		}

		initScanner();
		loadReturnSessions();

		const preselected = window.__SELECTED_MERCHANT__;
		if (preselected && merchantSelect) {
			merchantSelect.value = preselected;
			loadMerchantData(preselected);
		}
	});
})();

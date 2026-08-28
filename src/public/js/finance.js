document.addEventListener("DOMContentLoaded", () => {
	const initData = window.__INIT_DATA__ || {};
	const stats = initData.stats || {};
	const transactions = initData.transactions || [];
	const expenses = initData.expenses || [];
	const drivers = initData.drivers || [];
	const merchants = initData.merchants || [];

	// Live state — mutated after collect/pay actions without page reload
	let collections = initData.collections || [];
	let payments = initData.payments || [];

	// ─── Alerts ─────────────────────────────────────────────────────────────────
	const alertsContainer = document.querySelector(".alert-list");
	if (alertsContainer) {
		const alerts = stats.alerts || [];
		alertsContainer.innerHTML = alerts.length
			? alerts.map((alert) => `
				<div class="alert-item ${alert.type || "info"}">
					<strong>${alert.title}</strong>
					<span>${alert.detail}</span>
				</div>`).join("")
			: '<div class="alert-item">No alerts at the moment.</div>';
	}

	// ─── Driver Collections table ────────────────────────────────────────────────

	function renderCollectionsTable() {
		const tbody = document.querySelector("#driverCollectionsTable tbody");
		if (!tbody) return;

		if (!collections.length) {
			tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted,#888)">No drivers with outstanding cash</td></tr>`;
			return;
		}

		tbody.innerHTML = collections.map((c) => `
			<tr data-driver="${c.driverUsername}">
				<td>${c.driverName || c.driverUsername}</td>
				<td>${c.orderIds.length}</td>
				<td>$${Number(c.amount).toLocaleString()}</td>
				<td>—</td>
				<td>
					<button class="small-btn receive-cash-btn" data-driver="${c.driverUsername}" data-amount="${c.amount}">
						Receive Cash
					</button>
				</td>
			</tr>`).join("");

		tbody.querySelectorAll(".receive-cash-btn").forEach((btn) => {
			btn.addEventListener("click", () => handleCollectDriver(btn));
		});
	}

	async function handleCollectDriver(btn) {
		const driverUsername = btn.dataset.driver;
		const amount = Number(btn.dataset.amount);

		const confirmed = await window.Dialog.confirm(
			`Collect $${amount.toLocaleString()} from ${driverUsername}?\n\nThis will mark all their delivered orders as COLLECTED.`,
			{ title: "Confirm Collection" },
		);
		if (!confirmed) return;

		btn.disabled = true;
		btn.textContent = "Processing…";

		try {
			const res = await fetch("/api/finance/collect-driver", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ driverUsername, paymentMethod: "Cash" }),
			});
			const result = await res.json();

			if (result.success) {
				collections = result.collections;
				payments = result.payments;
				renderCollectionsTable();
				renderPaymentsTable();
				showToast(`✓ Collected $${Number(result.amount).toLocaleString()} from ${driverUsername}`);
			} else {
				await window.Dialog.alert(result.error || "Something went wrong.", { title: "Error", danger: true });
				btn.disabled = false;
				btn.textContent = "Receive Cash";
			}
		} catch (err) {
			console.error("Collect driver error:", err);
			await window.Dialog.alert("Network error. Please try again.", { title: "Error", danger: true });
			btn.disabled = false;
			btn.textContent = "Receive Cash";
		}
	}

	// ─── Merchant Payments table ─────────────────────────────────────────────────

	function renderPaymentsTable() {
	const tbody = document.querySelector("#merchantPaymentsTable tbody");
	if (!tbody) return;
 
	if (!payments.length) {
		tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted,#888)">No merchants awaiting payment</td></tr>`;
		return;
	}
 
	tbody.innerHTML = payments.map((p) => {
		const hasDeductions = p.deductions && p.deductions.length > 0;
 
		// Deduction line shown as a sub-row inside the cell
		const deductionLine = hasDeductions ? `
			<div style="margin-top:6px;padding:6px 10px;background:#fff7ed;border-left:3px solid #f59e0b;border-radius:4px;font-size:12px;color:#92400e;">
				<strong>Less:</strong> ${p.deductions.length} customer cancellation${p.deductions.length > 1 ? "s" : ""} (returned after pickup)
				— <strong>−$${Number(p.deductionTotal).toLocaleString()}</strong>
			</div>` : "";
 
		const netStyle = p.amount < 0
			? "color:#dc2626;font-weight:700;"   // merchant owes us
			: "font-weight:700;";
 
		const netLabel = p.amount < 0
			? `<span style="color:#dc2626">Merchant owes $${Math.abs(p.amount).toLocaleString()}</span>`
			: `$${Number(p.amount).toLocaleString()}`;
 
		return `
		<tr data-merchant="${p.merchantUsername}">
			<td>${p.merchantName || p.merchantUsername}</td>
			<td>${p.orderIds.length}</td>
			<td>
				<div>$${Number(p.grossAmount).toLocaleString()}</div>
				${deductionLine}
			</td>
			<td style="${netStyle}">${netLabel}</td>
			<td>
				<button class="small-btn pay-merchant-btn"
					data-merchant="${p.merchantUsername}"
					data-amount="${p.amount}">
					${p.amount < 0 ? "Collect from Merchant" : p.amount > 0 ? "Pay" : "Settle"}
				</button>
			</td>
		</tr>`;
	}).join("");
 
	tbody.querySelectorAll(".pay-merchant-btn").forEach((btn) => {
		if (!btn.disabled) btn.addEventListener("click", () => handlePayMerchant(btn));
	});
}

	async function handlePayMerchant(btn) {
		const merchantUsername = btn.dataset.merchant;
		const amount = Number(btn.dataset.amount);
		// Negative net = the merchant owes us (delivery charges on cancelled
		// orders) → we collect from them. Zero net = payout and deductions
		// cancel out → just settle the orders with no cash movement.
		const isCollect = amount < 0;
		const isSettle = amount === 0;
		const absAmount = Math.abs(amount);
		const label = isCollect ? "Collect from Merchant" : isSettle ? "Settle" : "Pay";

		const confirmMsg = isCollect
			? `Collect $${absAmount.toLocaleString()} from ${merchantUsername}?\n\nThis settles the delivery charges they owe on cancelled orders.`
			: isSettle
				? `Settle ${merchantUsername}'s account?\n\nTheir payout and delivery-charge deductions cancel out. Orders will be marked as PAID with no cash movement.`
				: `Pay $${absAmount.toLocaleString()} to ${merchantUsername}?\n\nThis will mark all their collected orders as PAID.`;
		const confirmed = await window.Dialog.confirm(confirmMsg, { title: "Confirm" });
		if (!confirmed) return;

		btn.disabled = true;
		btn.textContent = "Processing…";

		try {
			const res = await fetch("/api/finance/pay-merchant", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ merchantUsername, paymentMethod: "Cash" }),
			});
			const result = await res.json();

			if (result.success) {
				collections = result.collections;
				payments = result.payments;
				renderCollectionsTable();
				renderPaymentsTable();
				const done = Math.abs(Number(result.amount));
				showToast(
					isCollect
						? `✓ Collected $${done.toLocaleString()} from ${merchantUsername}`
						: `✓ Paid $${done.toLocaleString()} to ${merchantUsername}`,
				);
			} else {
				await window.Dialog.alert(result.error || "Something went wrong.", { title: "Error", danger: true });
				btn.disabled = false;
				btn.textContent = label;
			}
		} catch (err) {
			console.error("Pay merchant error:", err);
			await window.Dialog.alert("Network error. Please try again.", { title: "Error", danger: true });
			btn.disabled = false;
			btn.textContent = label;
		}
	}

	// ─── Balances overview ───────────────────────────────────────────────────────

	let balances = initData.balances || {
		merchants: [],
		drivers: [],
		totals: { owedToMerchants: 0, owedByMerchants: 0, owedByDrivers: 0 },
	};

	const escapeHtml = (str) =>
		String(str ?? "").replace(
			/[&<>"']/g,
			(c) =>
				({
					"&": "&amp;",
					"<": "&lt;",
					">": "&gt;",
					'"': "&quot;",
					"'": "&#39;",
				})[c],
		);

	function money(n) {
		const v = Number(n || 0);
		return `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString(undefined, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})}`;
	}

	const STATUS_NAMES = [
		"Warehouse",
		"New",
		"Picked up",
		"Delivered",
		"Cancelled",
		"Paid",
		"Collected",
	];

	function setText(id, value) {
		const el = document.getElementById(id);
		if (el) el.textContent = value;
	}

	function renderBalances() {
		const totals = balances.totals || {};
		setText("totalOwedToMerchants", money(totals.owedToMerchants));
		setText("totalOwedByMerchants", money(totals.owedByMerchants));
		setText("totalOwedByDrivers", money(totals.owedByDrivers));

		const mBody = document.querySelector("#merchantBalancesTable tbody");
		if (mBody) {
			const rows = balances.merchants || [];
			mBody.innerHTML = rows.length
				? rows
						.map((m, i) => {
							const cls = m.balance < 0 ? "neg" : "";
							const detail = (m.orders || []).length
								? `<tr class="detail-row hidden" data-detail="${i}">
										<td colspan="6">
											<table class="detail-table">
												<thead><tr><th>Order</th><th>Total</th><th>Delivery</th><th>Value</th><th>Status</th></tr></thead>
												<tbody>
													${m.orders
														.map(
															(o) => `<tr>
																<td>${escapeHtml(o.id)}</td>
																<td>${money(o.total)}</td>
																<td>${money(o.deliveryCharge)}</td>
																<td>${money(o.value)}</td>
																<td>${STATUS_NAMES[o.status] || "—"}</td>
															</tr>`,
														)
														.join("")}
												</tbody>
											</table>
										</td>
									</tr>`
								: "";
							return `
								<tr class="balance-row" data-toggle="${i}">
									<td>${(m.orders || []).length ? '<span class="chevron">▸</span> ' : ""}${escapeHtml(m.merchantName || m.merchantUsername)}</td>
									<td><span class="pill ${m.accountType}">${m.accountType}</span></td>
									<td>${m.orderCount}</td>
									<td>${money(m.entitled)}</td>
									<td>${money(m.paid)}</td>
									<td class="balance-cell ${cls}">${money(m.balance)}</td>
								</tr>${detail}`;
						})
						.join("")
				: `<tr><td colspan="6" class="empty-cell">No merchant balances</td></tr>`;

			mBody.querySelectorAll(".balance-row[data-toggle]").forEach((row) => {
				row.addEventListener("click", () => {
					const detail = mBody.querySelector(
						`.detail-row[data-detail="${row.dataset.toggle}"]`,
					);
					if (!detail) return;
					detail.classList.toggle("hidden");
					const chev = row.querySelector(".chevron");
					if (chev)
						chev.textContent = detail.classList.contains("hidden") ? "▸" : "▾";
				});
			});
		}

		const dBody = document.querySelector("#driverBalancesTable tbody");
		if (dBody) {
			const rows = balances.drivers || [];
			dBody.innerHTML = rows.length
				? rows
						.map((d, i) => {
							const detail = (d.orders || []).length
								? `<tr class="detail-row hidden" data-ddetail="${i}">
										<td colspan="5">
											<table class="detail-table">
												<thead><tr><th>Order</th><th>Owed</th><th>Status</th></tr></thead>
												<tbody>
													${d.orders
														.map(
															(o) => `<tr>
																<td>${escapeHtml(o.id)}</td>
																<td>${money(o.value)}</td>
																<td>${
																	o.cancelledBy
																		? `Cancelled by ${o.cancelledBy}`
																		: STATUS_NAMES[o.status] || "—"
																}</td>
															</tr>`,
														)
														.join("")}
												</tbody>
											</table>
										</td>
									</tr>`
								: "";
							return `
								<tr class="balance-row" data-dtoggle="${i}">
									<td>${(d.orders || []).length ? '<span class="chevron">▸</span> ' : ""}${escapeHtml(d.driverName || d.driverUsername)}</td>
									<td>${d.orderCount}</td>
									<td>${money(d.gross)}</td>
									<td>-${money(d.feeTotal)}</td>
									<td class="balance-cell">${money(d.outstanding)}</td>
								</tr>${detail}`;
						})
						.join("")
				: `<tr><td colspan="5" class="empty-cell">No drivers holding cash</td></tr>`;

			dBody.querySelectorAll(".balance-row[data-dtoggle]").forEach((row) => {
				row.addEventListener("click", () => {
					const detail = dBody.querySelector(
						`.detail-row[data-ddetail="${row.dataset.dtoggle}"]`,
					);
					if (!detail) return;
					detail.classList.toggle("hidden");
					const chev = row.querySelector(".chevron");
					if (chev)
						chev.textContent = detail.classList.contains("hidden") ? "▸" : "▾";
				});
			});
		}
	}

	async function refreshBalances() {
		try {
			const res = await fetch("/api/finance/balances", {
				credentials: "include",
			});
			if (!res.ok) return;
			balances = await res.json();
			renderBalances();
			renderPrepaidBalance();
		} catch (err) {
			console.error("Failed to refresh balances:", err);
		}
	}

	// ─── Pay prepaid merchant ────────────────────────────────────────────────────

	const prepaidSelect = document.getElementById("prepaidMerchantSelect");
	const prepaidAmount = document.getElementById("prepaidAmount");
	const prepaidNotes = document.getElementById("prepaidNotes");
	const prepaidPayBtn = document.getElementById("prepaidPayBtn");
	const prepaidBalanceBox = document.getElementById("prepaidBalanceBox");
	const prepaidMessage = document.getElementById("prepaidMessage");
	const prepaidLegacyBox = document.getElementById("prepaidLegacyBox");
	const prepaidLegacyInput = document.getElementById("prepaidLegacyInput");
	const prepaidLegacySaveBtn = document.getElementById("prepaidLegacySaveBtn");
	const prepaidLegacyMessage = document.getElementById("prepaidLegacyMessage");

	if (prepaidSelect) {
		const prepaidMerchants = merchants.filter(
			(m) => m.accountType === "prepaid",
		);
		prepaidSelect.innerHTML =
			'<option value="">Select a prepaid merchant</option>' +
			prepaidMerchants
				.map(
					(m) =>
						`<option value="${escapeHtml(m.username)}">${escapeHtml(m.name || m.username)}</option>`,
				)
				.join("");
		if (!prepaidMerchants.length) {
			prepaidSelect.innerHTML =
				'<option value="">No prepaid merchants yet</option>';
			prepaidSelect.disabled = true;
		}
	}

	function currentPrepaidBalance() {
		const username = prepaidSelect?.value;
		if (!username) return null;
		return (
			(balances.merchants || []).find(
				(m) => m.merchantUsername === username && m.accountType === "prepaid",
			) || { entitled: 0, paid: 0, balance: 0, ordersValue: 0, legacyBalance: 0 }
		);
	}

	function renderPrepaidBalance() {
		if (!prepaidBalanceBox) return;
		const username = prepaidSelect?.value;
		const entry = currentPrepaidBalance();
		if (!entry || !username) {
			prepaidBalanceBox.classList.add("hidden");
			if (prepaidPayBtn) prepaidPayBtn.disabled = true;
			prepaidLegacyBox?.classList.add("hidden");
			return;
		}
		prepaidBalanceBox.classList.remove("hidden");
		setText("prepaidOrdersValue", money(entry.ordersValue ?? 0));
		setText("prepaidLegacyBalance", money(entry.legacyBalance ?? 0));
		setText("prepaidEntitled", money(entry.entitled));
		setText("prepaidPaid", money(entry.paid));
		setText("prepaidBalance", money(entry.balance));

		const balanceEl = document.getElementById("prepaidBalance");
		if (balanceEl)
			balanceEl.className = entry.balance < 0 ? "neg" : "";

		const hint = document.getElementById("prepaidBalanceHint");
		if (hint) {
			hint.textContent =
				entry.balance < 0
					? "This merchant has been paid more than their orders are worth — they owe the difference back."
					: entry.balance > 0
						? "This is the loan still outstanding to this merchant."
						: "Fully settled.";
		}
		if (prepaidPayBtn) prepaidPayBtn.disabled = false;

		prepaidLegacyBox?.classList.remove("hidden");
		if (prepaidLegacyInput) prepaidLegacyInput.value = entry.legacyBalance ?? 0;
		if (prepaidLegacyMessage) prepaidLegacyMessage.textContent = "";
	}

	function showPrepaidMessage(text, isError) {
		if (!prepaidMessage) return;
		prepaidMessage.textContent = text;
		prepaidMessage.className = `prepaid-message ${isError ? "error" : "success"}`;
	}

	function showLegacyMessage(text, isError) {
		if (!prepaidLegacyMessage) return;
		prepaidLegacyMessage.textContent = text;
		prepaidLegacyMessage.className = `prepaid-message ${isError ? "error" : "success"}`;
	}

	// ─── Advance payment history (view / print / PDF) ───────────────────────────

	function getFilenameFromResponse(response, fallback) {
		const header = response.headers.get("Content-Disposition") || "";
		const match = header.match(/filename="([^"]+)"/);
		return match ? match[1] : fallback;
	}

	async function loadPrepaidHistory(merchantUsername) {
		const tbody = document.querySelector("#prepaidHistoryTable tbody");
		if (!tbody) return;

		if (!merchantUsername) {
			tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">Select a prepaid merchant to see their payment history</td></tr>`;
			return;
		}

		tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">Loading…</td></tr>`;

		try {
			const res = await fetch(
				`/api/payments?merchant=${encodeURIComponent(merchantUsername)}&isAdvance=true&limit=50`,
				{ credentials: "include" },
			);
			if (!res.ok) throw new Error("Failed to load payment history");
			const result = await res.json();
			const rows = result.data || [];

			tbody.innerHTML = rows.length
				? rows
						.map((p) => {
							const adminName =
								`${p.admin?.firstName || ""} ${p.admin?.lastName || ""}`.trim() ||
								p.admin?.username ||
								"—";
							return `
								<tr>
									<td>#${p.number}</td>
									<td>${new Date(p.createdAt).toLocaleDateString()}</td>
									<td>${money(p.amount)}</td>
									<td>${escapeHtml(p.notes || "—")}</td>
									<td>${escapeHtml(adminName)}</td>
									<td>
										<div class="action-buttons">
											<button class="small-btn view-advance-btn" data-id="${p.id}" title="View details">
												<i class="bx bx-show"></i>
											</button>
											<button class="small-btn print-advance-btn" data-id="${p.id}" title="Print">
												<i class="bx bx-printer"></i>
											</button>
											<button class="small-btn download-advance-btn" data-id="${p.id}" title="Download PDF">
												<i class="bx bx-download"></i>
											</button>
										</div>
									</td>
								</tr>`;
						})
						.join("")
				: `<tr><td colspan="6" class="empty-cell">No advances paid to this merchant yet</td></tr>`;

			tbody.querySelectorAll(".view-advance-btn").forEach((btn) => {
				btn.addEventListener("click", () => viewAdvanceDetails(btn.dataset.id));
			});
			tbody.querySelectorAll(".print-advance-btn").forEach((btn) => {
				btn.addEventListener("click", () => printAdvanceSession(btn.dataset.id));
			});
			tbody.querySelectorAll(".download-advance-btn").forEach((btn) => {
				btn.addEventListener("click", () => downloadAdvancePDF(btn.dataset.id));
			});
		} catch (err) {
			console.error("Failed to load prepaid history:", err);
			tbody.innerHTML = `<tr><td colspan="6" class="empty-cell">Failed to load payment history</td></tr>`;
		}
	}

	function findMerchantBalance(username) {
		return (balances.merchants || []).find(
			(m) => m.merchantUsername === username && m.accountType === "prepaid",
		);
	}

	async function downloadAdvancePDF(paymentId) {
		try {
			const res = await fetch(`/api/payments/${paymentId}/pdf`, {
				credentials: "include",
			});
			if (!res.ok) throw new Error("Failed to download PDF");
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = getFilenameFromResponse(res, "advance.pdf");
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Error downloading advance PDF:", err);
			await window.Dialog.alert("Failed to download PDF", { title: "Error", danger: true });
		}
	}

	async function viewAdvanceDetails(paymentId) {
		try {
			const res = await fetch(`/api/payments/${paymentId}`, {
				credentials: "include",
			});
			if (!res.ok) throw new Error("Failed to fetch payment");
			const result = await res.json();
			const p = result.data;

			const merchantName =
				`${p.merchant.firstName || ""} ${p.merchant.lastName || ""}`.trim() ||
				p.merchant.username;
			const adminName =
				`${p.admin.firstName || ""} ${p.admin.lastName || ""}`.trim() ||
				p.admin.username;
			const bal = findMerchantBalance(p.merchant.username);
			const amountLeftRow =
				bal != null
					? `<div class="detail-row"><span class="label">Amount Left (current):</span><span class="amount ${bal.balance < 0 ? "neg" : ""}">${money(bal.balance)}</span></div>`
					: "";

			const modal = document.createElement("div");
			modal.className = "payment-modal";
			modal.innerHTML = `
				<div class="modal-content">
					<div class="modal-header">
						<h2>Advance #${p.number}</h2>
						<button class="modal-close">&times;</button>
					</div>
					<div class="modal-body">
						<div class="detail-row"><span class="label">Merchant:</span><span>${escapeHtml(merchantName)}</span></div>
						<div class="detail-row"><span class="label">Date:</span><span>${new Date(p.createdAt).toLocaleString()}</span></div>
						<div class="detail-row"><span class="label">${p.amount < 0 ? "Collected" : "Amount"}:</span><span class="amount">${money(p.amount)}</span></div>
						${amountLeftRow}
						<div class="detail-row"><span class="label">Note:</span><span>${escapeHtml(p.notes || "—")}</span></div>
						<div class="detail-row"><span class="label">Recorded by:</span><span>${escapeHtml(adminName)}</span></div>
					</div>
					<div class="modal-footer">
						<button class="btn-close">Close</button>
						<button class="btn-print" data-id="${p.id}">Print</button>
						<button class="btn-download" data-id="${p.id}">Download PDF</button>
					</div>
				</div>
			`;

			// Reuse pay.js's injected modal styles if present; otherwise add a
			// minimal set so this still looks right when Finance is loaded alone.
			if (!document.getElementById("payment-modal-styles")) {
				const style = document.createElement("style");
				style.id = "payment-modal-styles";
				style.innerHTML = `
					.payment-modal { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
					.payment-modal .modal-content { background: #fff; border-radius: 12px; max-width: 480px; width: 90%; box-shadow: 0 20px 25px rgba(0,0,0,.15); }
					.payment-modal .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #e2e8f0; }
					.payment-modal .modal-header h2 { margin: 0; font-size: 18px; }
					.payment-modal .modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #64748b; }
					.payment-modal .modal-body { padding: 20px; }
					.payment-modal .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
					.payment-modal .detail-row .label { font-weight: 600; color: #64748b; }
					.payment-modal .detail-row .amount { color: #16a34a; font-weight: 700; }
					.payment-modal .detail-row .amount.neg { color: #dc2626; }
					.payment-modal .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 20px; border-top: 1px solid #e2e8f0; }
					.payment-modal .btn-close, .payment-modal .btn-download, .payment-modal .btn-print { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600; font-size: 13px; }
					.payment-modal .btn-close { background: #f1f5f9; color: #64748b; }
					.payment-modal .btn-print { background: #475569; color: #fff; }
					.payment-modal .btn-download { background: #2563eb; color: #fff; }
				`;
				document.head.appendChild(style);
			}

			document.body.appendChild(modal);
			modal.querySelector(".modal-close").addEventListener("click", () => modal.remove());
			modal.querySelector(".btn-close").addEventListener("click", () => modal.remove());
			modal.querySelector(".btn-print").addEventListener("click", () => printAdvanceSession(p.id));
			modal.querySelector(".btn-download").addEventListener("click", () => downloadAdvancePDF(p.id));
			modal.addEventListener("click", (e) => {
				if (e.target === modal) modal.remove();
			});
		} catch (err) {
			console.error("Error viewing advance:", err);
			await window.Dialog.alert("Failed to load payment details", { title: "Error", danger: true });
		}
	}

	// Opens a formatted, print-ready window (real browser print, not a PDF
	// download) — mirrors printPaymentSession/printCollectionSession.
	async function printAdvanceSession(paymentId) {
		try {
			const res = await fetch(`/api/payments/${paymentId}`, {
				credentials: "include",
			});
			if (!res.ok) throw new Error("Failed to fetch payment");
			const result = await res.json();
			const p = result.data;

			const merchantName =
				`${p.merchant.firstName || ""} ${p.merchant.lastName || ""}`.trim() ||
				p.merchant.username;
			const adminName =
				`${p.admin.firstName || ""} ${p.admin.lastName || ""}`.trim() ||
				p.admin.username;
			const bal = findMerchantBalance(p.merchant.username);
			const isCollection = p.amount < 0;

			const printWindow = window.open("", "", "width=900,height=700");
			if (!printWindow) {
				await window.Dialog.alert("Popup blocked. Please allow popups for this site.", { title: "Popup Blocked", danger: true });
				return;
			}

			printWindow.document.write(`
				<!DOCTYPE html>
				<html>
				<head>
					<title>Advance #${p.number}</title>
					<style>
						* { margin: 0; padding: 0; box-sizing: border-box; }
						body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; }
						.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 15px; }
						.header .left h1 { font-size: 24px; margin-bottom: 10px; }
						.header .left p { margin: 5px 0; font-size: 14px; color: #64748b; }
						.header .right img { max-width: 100px; height: auto; }
						.info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 15px; border-radius: 8px; }
						.info-item { display: flex; justify-content: space-between; }
						.info-label { font-weight: 600; color: #64748b; }
						.info-value { color: #1e293b; }
						.summary { background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin-top: 10px; border-radius: 4px; }
						.summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-weight: 600; color: #1e40af; }
						.summary-row.net { font-size: 16px; }
						.summary-row.neg { color: #dc2626; }
						.footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
						@media print { body { padding: 0; } .footer { display: none; } }
					</style>
				</head>
				<body>
					<div class="header">
						<div class="left">
							<h1>Prepaid Advance Report</h1>
							<p><strong>Advance #${p.number}</strong></p>
						</div>
						<div class="right"><img src="/assets/logogo-removebg-preview.png" alt="Logo"></div>
					</div>

					<div class="info-section">
						<div class="info-item"><span class="info-label">Merchant:</span><span class="info-value">${escapeHtml(merchantName)}</span></div>
						<div class="info-item"><span class="info-label">Recorded by:</span><span class="info-value">${escapeHtml(adminName)}</span></div>
						<div class="info-item"><span class="info-label">Date:</span><span class="info-value">${new Date(p.createdAt).toLocaleString()}</span></div>
						<div class="info-item"><span class="info-label">Note:</span><span class="info-value">${escapeHtml(p.notes || "—")}</span></div>
					</div>

					<div class="summary">
						<div class="summary-row">
							<span>${isCollection ? "Amount Collected:" : "Amount Paid:"}</span>
							<span>${money(p.amount)}</span>
						</div>
						${
							bal != null
								? `<div class="summary-row net ${bal.balance < 0 ? "neg" : ""}">
									<span>Amount Left (current balance):</span>
									<span>${money(bal.balance)}</span>
								</div>`
								: ""
						}
					</div>

					<div class="footer">Generated ${new Date().toLocaleString()}</div>
				</body>
				</html>
			`);

			printWindow.document.close();
			setTimeout(() => printWindow.print(), 500);
		} catch (err) {
			console.error("Error printing advance:", err);
			await window.Dialog.alert("Failed to print advance", { title: "Error", danger: true });
		}
	}

	prepaidSelect?.addEventListener("change", () => {
		showPrepaidMessage("", false);
		renderPrepaidBalance();
		loadPrepaidHistory(prepaidSelect.value);
	});

	// Button label follows the sign of what's typed — negative means
	// collecting cash back from a merchant who owes us, not paying them.
	prepaidAmount?.addEventListener("input", () => {
		if (!prepaidPayBtn || prepaidPayBtn.disabled) return;
		const v = Number(prepaidAmount.value);
		prepaidPayBtn.textContent =
			Number.isFinite(v) && v < 0 ? "Collect from Merchant" : "Pay Merchant";
	});

	prepaidPayBtn?.addEventListener("click", async () => {
		const merchantUsername = prepaidSelect?.value;
		const amount = Number(prepaidAmount?.value);
		const isCollection = amount < 0;

		if (!merchantUsername) {
			showPrepaidMessage("Select a merchant first", true);
			return;
		}
		if (!Number.isFinite(amount) || amount === 0) {
			showPrepaidMessage("Enter a non-zero amount", true);
			return;
		}

		// Warn only when the action would flip which way the balance points —
		// e.g. paying more than is owed, or trying to collect more than the
		// merchant actually owes back.
		const entry = currentPrepaidBalance();
		if (entry) {
			const newBalance = entry.balance - amount;
			const flips =
				(entry.balance >= 0 && newBalance < 0) ||
				(entry.balance < 0 && newBalance >= 0);
			if (flips) {
				const msg = isCollection
					? `You're collecting ${money(Math.abs(amount))}, but the merchant only owes ${money(Math.abs(entry.balance))}.\n\n` +
						`This flips their balance to ${money(newBalance)} — you'd end up owing them. Continue?`
					: `You're paying ${money(amount)} but only ${money(entry.balance)} is outstanding.\n\n` +
						`This overpays by ${money(Math.abs(newBalance))} — the merchant will owe that back. Continue?`;
				const confirmed = await window.Dialog.confirm(msg, { title: "Confirm" });
				if (!confirmed) return;
			}
		}

		prepaidPayBtn.disabled = true;
		prepaidPayBtn.textContent = isCollection ? "Collecting…" : "Paying…";

		try {
			const res = await fetch("/api/finance/pay-prepaid-merchant", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					merchantUsername,
					amount,
					paymentMethod: "Cash",
					notes: prepaidNotes?.value || "",
				}),
			});
			const data = await res.json().catch(() => ({}));

			if (!res.ok || !data.success) {
				throw new Error(data.error || "Failed to record payment");
			}

			const label = isCollection ? "Collected" : "Paid";
			showPrepaidMessage(
				`${label} ${money(Math.abs(amount))} ${isCollection ? "from" : "to"} ${merchantUsername}.`,
				false,
			);
			showToast(`✓ ${label} ${money(Math.abs(amount))} ${isCollection ? "from" : "to"} ${merchantUsername}`);
			if (prepaidAmount) prepaidAmount.value = "";
			if (prepaidNotes) prepaidNotes.value = "";
			await refreshBalances();
			await loadPrepaidHistory(merchantUsername);
		} catch (err) {
			showPrepaidMessage(err.message, true);
		} finally {
			prepaidPayBtn.disabled = false;
			prepaidPayBtn.textContent = "Pay Merchant";
		}
	});

	prepaidLegacySaveBtn?.addEventListener("click", async () => {
		const merchantUsername = prepaidSelect?.value;
		const value = Number(prepaidLegacyInput?.value);

		if (!merchantUsername) {
			showLegacyMessage("Select a merchant first", true);
			return;
		}
		if (!Number.isFinite(value)) {
			showLegacyMessage("Enter a valid number", true);
			return;
		}

		prepaidLegacySaveBtn.disabled = true;
		prepaidLegacySaveBtn.textContent = "Saving…";

		try {
			const res = await fetch(
				`/api/finance/prepaid-merchant/${encodeURIComponent(merchantUsername)}/legacy-balance`,
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ legacyBalance: value }),
				},
			);
			const data = await res.json().catch(() => ({}));

			if (!res.ok || !data.success) {
				throw new Error(data.error || "Failed to save legacy balance");
			}

			showLegacyMessage(`Legacy balance set to ${money(value)}.`, false);
			showToast(`✓ Legacy balance for ${merchantUsername} set to ${money(value)}`);
			await refreshBalances();
		} catch (err) {
			showLegacyMessage(err.message, true);
		} finally {
			prepaidLegacySaveBtn.disabled = false;
			prepaidLegacySaveBtn.textContent = "Save Legacy Balance";
		}
	});

	// Initial render
	renderCollectionsTable();
	renderPaymentsTable();
	renderBalances();
	renderPrepaidBalance();
	loadPrepaidHistory(prepaidSelect?.value);

	// ─── Toast ───────────────────────────────────────────────────────────────────

	function showToast(message) {
		let toast = document.getElementById("financeToast");
		if (!toast) {
			toast = document.createElement("div");
			toast.id = "financeToast";
			toast.style.cssText = `
				position:fixed;bottom:24px;right:24px;background:#16a34a;color:#fff;
				padding:12px 20px;border-radius:8px;font-size:14px;font-weight:500;
				box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:9999;
				transition:opacity 0.3s;
			`;
			document.body.appendChild(toast);
		}
		toast.textContent = message;
		toast.style.opacity = "1";
		clearTimeout(toast._timeout);
		toast._timeout = setTimeout(() => { toast.style.opacity = "0"; }, 3000);
	}

	// ─── Modal (Quick Actions) ───────────────────────────────────────────────────

	function driverOptions() {
		return drivers.map((d) => `<option value="${d.username}">${d.name}</option>`).join("");
	}

	function merchantOptions() {
		return merchants.map((m) => `<option value="${m.username}">${m.name}</option>`).join("");
	}

	const forms = {
		"cash-in": {
			title: "Cash In",
			html: `
				<div class="form-group"><label>Amount</label><input type="number" id="amount" min="0.01" step="0.01" required></div>
				<div class="form-group"><label>Payment Method</label>
					<select id="paymentMethod"><option>Cash</option><option>OMT</option><option>Whish</option></select></div>
				<div class="form-group"><label>Description</label><input id="description"></div>
				<div class="form-group"><label>Notes</label><textarea id="notes"></textarea></div>`,
			buildBody: () => ({
				type: "Cash In",
				amount: Number(document.getElementById("amount").value),
				paymentMethod: document.getElementById("paymentMethod").value,
				description: document.getElementById("description").value,
				notes: document.getElementById("notes").value,
			}),
			endpoint: "/api/finance/transaction",
			successMsg: "Cash In recorded!",
		},
		"cash-out": {
			title: "Cash Out",
			html: `
				<div class="form-group"><label>Amount</label><input type="number" id="amount" min="0.01" step="0.01" required></div>
				<div class="form-group"><label>Payment Method</label>
					<select id="paymentMethod"><option>Cash</option><option>OMT</option><option>Whish</option></select></div>
				<div class="form-group"><label>Description</label><input id="description"></div>
				<div class="form-group"><label>Notes</label><textarea id="notes"></textarea></div>`,
			buildBody: () => ({
				type: "Cash Out",
				amount: Number(document.getElementById("amount").value),
				paymentMethod: document.getElementById("paymentMethod").value,
				description: document.getElementById("description").value,
				notes: document.getElementById("notes").value,
			}),
			endpoint: "/api/finance/transaction",
			successMsg: "Cash Out recorded!",
		},
		"driver-collect": {
			title: "Receive Driver Cash",
			html: `
				<div class="form-group"><label>Driver</label><select id="driver">${driverOptions()}</select></div>
				<div class="form-group"><label>Payment Method</label>
					<select id="paymentMethod"><option>Cash</option><option>OMT</option><option>Whish</option></select></div>`,
			buildBody: () => ({
				driverUsername: document.getElementById("driver").value,
				paymentMethod: document.getElementById("paymentMethod").value,
			}),
			endpoint: "/api/finance/collect-driver",
			successMsg: null,
		},
		"merchant-pay": {
			title: "Pay Merchant",
			html: `
				<div class="form-group"><label>Merchant</label><select id="merchant">${merchantOptions()}</select></div>
				<div class="form-group"><label>Payment Method</label>
					<select id="paymentMethod"><option>Cash</option><option>OMT</option><option>Whish</option></select></div>`,
			buildBody: () => ({
				merchantUsername: document.getElementById("merchant").value,
				paymentMethod: document.getElementById("paymentMethod").value,
			}),
			endpoint: "/api/finance/pay-merchant",
			successMsg: null,
		},
		expense: {
			title: "Add Expense",
			html: `
				<div class="form-group"><label>Amount</label><input type="number" id="amount" min="0.01" step="0.01" required></div>
				<div class="form-group"><label>Category</label>
					<select id="category">
						<option>Fuel</option><option>Rent</option><option>Electricity</option><option>Water</option>
						<option>Internet</option><option>Office Supplies</option><option>Equipment</option>
						<option>Maintenance</option><option>Marketing</option><option>Refunds</option>
						<option>Salaries</option><option>Other</option>
					</select></div>
				<div class="form-group"><label>Description</label><input id="description"></div>`,
			buildBody: () => ({
				amount: Number(document.getElementById("amount").value),
				category: document.getElementById("category").value,
				description: document.getElementById("description").value,
			}),
			endpoint: "/api/finance/expense",
			successMsg: "Expense recorded!",
		},
		report: {
			title: "Generate Report",
			html: `
				<div class="form-group"><label>Report Type</label>
					<select id="reportType">
						<option value="daily">Daily Summary</option>
						<option value="weekly">Weekly Summary</option>
						<option value="monthly">Monthly Summary</option>
						<option value="driverSettlement">Driver Settlement</option>
						<option value="merchantPayment">Merchant Payment</option>
						<option value="expenseBreakdown">Expense Breakdown</option>
					</select></div>`,
			buildBody: () => ({
				reportType: document.getElementById("reportType").value,
			}),
			endpoint: "report",
			successMsg: null,
		},
	};

	const financeModal = document.getElementById("financeModal");
	const modalTitle = document.getElementById("modalTitle");
	const modalBody = document.getElementById("modalBody");
	const financeForm = document.getElementById("financeForm");
	const saveBtn = financeModal?.querySelector(".save-btn");

	let currentAction = null;

	document.querySelectorAll(".action-btn").forEach((button) => {
		button.addEventListener("click", () => {
			const action = button.dataset.action;
			const config = forms[action];
			if (!config) return;
			currentAction = action;
			modalTitle.textContent = config.title;
			modalBody.innerHTML = config.html;
			if (saveBtn) {
				saveBtn.style.display = "";
				saveBtn.textContent = action === "report" ? "Generate" : "Save";
			}
			financeModal.classList.remove("hidden");
		});
	});

	function closeModal() {
		financeModal.classList.add("hidden");
		currentAction = null;
		modalBody.innerHTML = "";
	}

	document.getElementById("closeModal")?.addEventListener("click", closeModal);
	financeModal?.querySelector(".cancel-btn")?.addEventListener("click", closeModal);

	function generateFinanceReport(reportType, transactions, expenses, collections, payments) {
		let html = `<div style="font-family: Arial, sans-serif; padding: 20px; background: #f9fafb;">`;
		
		const formatDate = (date) => new Date(date).toLocaleDateString();
		const formatMoney = (num) => `$${Number(num).toLocaleString()}`;
		
		switch(reportType) {
			case "daily": {
				const today = new Date().toLocaleDateString();
				const todayTx = transactions.filter(tx => formatDate(tx.date) === today);
				const todayExp = expenses.filter(e => formatDate(e.date) === today);
				
				const cashIn = todayTx.filter(t => t.type === "Cash In" || t.type === "Driver Collection")
					.reduce((sum, t) => sum + (t.amount || 0), 0);
				const cashOut = todayTx.filter(t => t.type === "Cash Out" || t.type === "Merchant Payment")
					.reduce((sum, t) => sum + (t.amount || 0), 0);
				const exp = todayExp.reduce((sum, e) => sum + (e.amount || 0), 0);
				
				html += `<h1 style="border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Daily Summary - ${today}</h1>
					<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px;">
						<div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
							<div style="color: #6b7280; font-size: 12px;">Cash In</div>
							<div style="font-size: 28px; font-weight: bold; color: #10b981;">${formatMoney(cashIn)}</div>
						</div>
						<div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
							<div style="color: #6b7280; font-size: 12px;">Cash Out</div>
							<div style="font-size: 28px; font-weight: bold; color: #ef4444;">${formatMoney(cashOut)}</div>
						</div>
						<div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
							<div style="color: #6b7280; font-size: 12px;">Expenses</div>
							<div style="font-size: 28px; font-weight: bold; color: #f59e0b;">${formatMoney(exp)}</div>
						</div>
						<div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
							<div style="color: #6b7280; font-size: 12px;">Net Flow</div>
							<div style="font-size: 28px; font-weight: bold; color: #10b981;">${formatMoney(cashIn - cashOut - exp)}</div>
						</div>
					</div>`;
				break;
			}
			
			case "weekly": {
				const today = new Date();
				const weekStart = new Date(today);
				weekStart.setDate(today.getDate() - today.getDay());
				
				const weekTx = transactions.filter(t => {
					const tDate = new Date(t.date);
					return tDate >= weekStart && tDate <= today;
				});
				const weekExp = expenses.filter(e => {
					const eDate = new Date(e.date);
					return eDate >= weekStart && eDate <= today;
				});
				
				const cashIn = weekTx.filter(t => t.type === "Cash In" || t.type === "Driver Collection")
					.reduce((sum, t) => sum + (t.amount || 0), 0);
				const cashOut = weekTx.filter(t => t.type === "Cash Out" || t.type === "Merchant Payment")
					.reduce((sum, t) => sum + (t.amount || 0), 0);
				const exp = weekExp.reduce((sum, e) => sum + (e.amount || 0), 0);
				
				html += `<h1 style="border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Weekly Summary (${formatDate(weekStart)} - ${formatDate(today)})</h1>
					<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px;">
						<div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
							<div style="color: #6b7280; font-size: 12px;">Total Cash In</div>
							<div style="font-size: 24px; font-weight: bold; color: #10b981;">${formatMoney(cashIn)}</div>
						</div>
						<div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
							<div style="color: #6b7280; font-size: 12px;">Total Cash Out</div>
							<div style="font-size: 24px; font-weight: bold; color: #ef4444;">${formatMoney(cashOut)}</div>
						</div>
						<div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
							<div style="color: #6b7280; font-size: 12px;">Total Expenses</div>
							<div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${formatMoney(exp)}</div>
						</div>
						<div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
							<div style="color: #6b7280; font-size: 12px;">Net Flow</div>
							<div style="font-size: 24px; font-weight: bold; color: #10b981;">${formatMoney(cashIn - cashOut - exp)}</div>
						</div>
					</div>
					<div style="margin-top: 20px; background: #fff; padding: 15px; border-radius: 8px;">
						<h3>Transactions: ${weekTx.length} | Expenses: ${weekExp.length}</h3>
					</div>`;
				break;
			}
			
			case "monthly": {
				const today = new Date();
				const monthTx = transactions.filter(t => {
					const tDate = new Date(t.date);
					return tDate.getMonth() === today.getMonth() && tDate.getFullYear() === today.getFullYear();
				});
				const monthExp = expenses.filter(e => {
					const eDate = new Date(e.date);
					return eDate.getMonth() === today.getMonth() && eDate.getFullYear() === today.getFullYear();
				});
				
				const cashIn = monthTx.filter(t => t.type === "Cash In" || t.type === "Driver Collection")
					.reduce((sum, t) => sum + (t.amount || 0), 0);
				const cashOut = monthTx.filter(t => t.type === "Cash Out" || t.type === "Merchant Payment")
					.reduce((sum, t) => sum + (t.amount || 0), 0);
				const exp = monthExp.reduce((sum, e) => sum + (e.amount || 0), 0);
				
				const monthName = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
				
				html += `<h1 style="border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Monthly Summary - ${monthName}</h1>
					<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px;">
						<div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
							<div style="color: #6b7280; font-size: 12px;">Total Cash In</div>
							<div style="font-size: 24px; font-weight: bold; color: #10b981;">${formatMoney(cashIn)}</div>
						</div>
						<div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
							<div style="color: #6b7280; font-size: 12px;">Total Cash Out</div>
							<div style="font-size: 24px; font-weight: bold; color: #ef4444;">${formatMoney(cashOut)}</div>
						</div>
						<div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
							<div style="color: #6b7280; font-size: 12px;">Total Expenses</div>
							<div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${formatMoney(exp)}</div>
						</div>
						<div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
							<div style="color: #6b7280; font-size: 12px;">Net Flow</div>
							<div style="font-size: 24px; font-weight: bold; color: #10b981;">${formatMoney(cashIn - cashOut - exp)}</div>
						</div>
					</div>`;
				break;
			}
			
			case "driverSettlement": {
				const settled = collections.filter(c => c.settled);
				const pending = collections.filter(c => !c.settled);
				const totalSettled = settled.reduce((s, c) => s + (c.amount || 0), 0);
				const totalPending = pending.reduce((s, c) => s + (c.amount || 0), 0);
				
				html += `<h1 style="border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Driver Settlement Report</h1>
					<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px;">
						<div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
							<div style="color: #6b7280; font-size: 12px;">Settled Drivers</div>
							<div style="font-size: 24px; font-weight: bold; color: #10b981;">${settled.length}</div>
							<div style="color: #6b7280; font-size: 11px; margin-top: 5px;">${formatMoney(totalSettled)}</div>
						</div>
						<div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
							<div style="color: #6b7280; font-size: 12px;">Pending Drivers</div>
							<div style="font-size: 24px; font-weight: bold; color: #ef4444;">${pending.length}</div>
							<div style="color: #6b7280; font-size: 11px; margin-top: 5px;">${formatMoney(totalPending)}</div>
						</div>
					</div>`;
				break;
			}
			
			case "merchantPayment": {
				const paid = payments.filter(p => p.paid);
				const pending = payments.filter(p => !p.paid);
				const totalPaid = paid.reduce((s, p) => s + (p.amount || 0), 0);
				const totalPending = pending.reduce((s, p) => s + (p.amount || 0), 0);
				
				html += `<h1 style="border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Merchant Payment Report</h1>
					<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px;">
						<div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
							<div style="color: #6b7280; font-size: 12px;">Paid Merchants</div>
							<div style="font-size: 24px; font-weight: bold; color: #10b981;">${paid.length}</div>
							<div style="color: #6b7280; font-size: 11px; margin-top: 5px;">${formatMoney(totalPaid)}</div>
						</div>
						<div style="background: #fff; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
							<div style="color: #6b7280; font-size: 12px;">Pending Merchants</div>
							<div style="font-size: 24px; font-weight: bold; color: #ef4444;">${pending.length}</div>
							<div style="color: #6b7280; font-size: 11px; margin-top: 5px;">${formatMoney(totalPending)}</div>
						</div>
					</div>`;
				break;
			}
			
			case "expenseBreakdown": {
				const today = new Date();
				const monthExp = expenses.filter(e => {
					const eDate = new Date(e.date);
					return eDate.getMonth() === today.getMonth() && eDate.getFullYear() === today.getFullYear();
				});
				
				const byCategory = {};
				monthExp.forEach(e => {
					const cat = e.category || "Other";
					if (!byCategory[cat]) byCategory[cat] = 0;
					byCategory[cat] += e.amount || 0;
				});
				
				const monthName = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
				const total = Object.values(byCategory).reduce((s, v) => s + v, 0);
				
				html += `<h1 style="border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Expense Breakdown - ${monthName}</h1>
					<div style="background: #fff; padding: 15px; border-radius: 8px; margin-top: 20px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
						<div style="font-size: 24px; font-weight: bold; color: #f59e0b;">Total: ${formatMoney(total)}</div>
					</div>
					<table style="width: 100%; border-collapse: collapse; background: #fff;">
						<tr style="background: #f3f4f6;">
							<th style="padding: 10px; text-align: left; border: 1px solid #d1d5db;">Category</th>
							<th style="padding: 10px; text-align: right; border: 1px solid #d1d5db;">Amount</th>
						</tr>`;
				
				Object.entries(byCategory).forEach(([cat, amount]) => {
					html += `<tr><td style="padding: 10px; border: 1px solid #d1d5db;">${cat}</td>
						<td style="padding: 10px; text-align: right; border: 1px solid #d1d5db; font-weight: 500;">${formatMoney(amount)}</td></tr>`;
				});
				html += `</table>`;
				break;
			}
		}
		
		html += `<div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #d1d5db; display: flex; gap: 10px;">
			<button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">🖨️ Print</button>
		</div>
		<p style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px;">Generated: ${new Date().toLocaleString()}</p>
		</div>`;
		
		return html;
	}

	financeForm?.addEventListener("submit", async (e) => {
		e.preventDefault();
		const config = forms[currentAction];
		if (!config || !config.buildBody) return;
	
		// Special handling for reports
		if (currentAction === "report" || config.endpoint === "report") {
			const body = config.buildBody();
			const reportType = body.reportType;
			
			// Get data from init data
			const transactions = window.__INIT_DATA__?.transactions || [];
			const expenses = window.__INIT_DATA__?.expenses || [];
			const collections = window.__INIT_DATA__?.collections || [];
			const payments = window.__INIT_DATA__?.payments || [];
			
			// Generate report HTML
			const reportHTML = generateFinanceReport(reportType, transactions, expenses, collections, payments);
			
			// Open in new window
			const reportWindow = window.open("", "_blank");
			reportWindow.document.write(`
				<!DOCTYPE html>
				<html>
				<head>
					<meta charset="UTF-8">
					<title>Finance Report</title>
					<style>
						body { margin: 0; padding: 20px; background: #f3f4f6; }
						@media print { body { padding: 0; background: white; } }
					</style>
				</head>
				<body>
					${reportHTML}
				</body>
				</html>
			`);
			reportWindow.document.close();
			
			closeModal();
			showToast("✓ Report generated successfully");
			return;
		}
	
		// Regular form submission
		if (!config.endpoint || !config.buildBody) return;
	
		const body = config.buildBody();
	
		if (body.amount !== undefined && (!body.amount || body.amount <= 0)) {
			await window.Dialog.alert("Please enter a valid amount.", { title: "Notice" });
			return;
		}
	
		if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Saving…"; }
	
		try {
			const response = await fetch(config.endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const result = await response.json();
	
			if (result.success) {
				closeModal();
				if (result.collections !== undefined) {
					collections = result.collections;
					payments = result.payments;
					renderCollectionsTable();
					renderPaymentsTable();
					showToast(`✓ Done — ${formatMoney(result.amount)} processed`);
				} else {
					showToast(config.successMsg || "✓ Saved");
				}
			} else {
				await window.Dialog.alert(result.error || "Something went wrong.", { title: "Error", danger: true });
			}
		} catch (err) {
			console.error("Finance submit error:", err);
			await window.Dialog.alert("Network error. Please try again.", { title: "Error", danger: true });
		} finally {
			if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = "Save"; }
		}
	});

	// ─── Charts ──────────────────────────────────────────────────────────────────

	const revenueCtx = document.getElementById("revenueChart");
	if (revenueCtx) {
		const labels = [...new Set(transactions.map((tx) => new Date(tx.date).toLocaleDateString()))].slice(0, 8);
		const data = labels.map((label) =>
			transactions.filter((tx) => new Date(tx.date).toLocaleDateString() === label).reduce((sum, tx) => sum + (tx.amount || 0), 0),
		);
		new Chart(revenueCtx, {
			type: "line",
			data: { labels, datasets: [{ label: "Transactions", data, borderColor: "#2563eb", tension: 0.3, fill: true, backgroundColor: "rgba(37,99,235,0.12)" }] },
			options: { responsive: true, plugins: { legend: { display: false } } },
		});
	}

	const cashCtx = document.getElementById("cashFlowChart");
	if (cashCtx) {
		const cashIn = transactions.filter((tx) => tx.type === "Cash In" || tx.type === "Driver Collection").reduce((sum, tx) => sum + (tx.amount || 0), 0);
		const cashOut = transactions.filter((tx) => tx.type === "Cash Out" || tx.type === "Merchant Payment" || tx.type === "Expense").reduce((sum, tx) => sum + (tx.amount || 0), 0);
		new Chart(cashCtx, {
			type: "doughnut",
			data: { labels: ["Cash In", "Cash Out"], datasets: [{ data: [cashIn, cashOut], backgroundColor: ["#16a34a", "#dc2626"] }] },
			options: { responsive: true, plugins: { legend: { position: "bottom" } } },
		});
	}

	const expenseCtx = document.getElementById("expenseChart");
	if (expenseCtx) {
		const categories = [...new Set(expenses.map((e) => e.category || "Other"))];
		const values = categories.map((cat) => expenses.filter((e) => e.category === cat).reduce((sum, e) => sum + (e.amount || 0), 0));
		new Chart(expenseCtx, {
			type: "bar",
			data: { labels: categories, datasets: [{ label: "Expenses", data: values, backgroundColor: "#f59e0b" }] },
			options: { responsive: true, plugins: { legend: { display: false } } },
		});
	}

	// ─── Collapsible bottom sections (start closed) ───────────────────────────────

	function setupCollapsible(headerId, contentId, iconId) {
		const header = document.getElementById(headerId);
		const content = document.getElementById(contentId);
		const icon = document.getElementById(iconId);
		if (!header || !content || !icon) return;
		header.addEventListener("click", () => {
			const isHidden = content.style.display === "none";
			content.style.display = isHidden ? "" : "none";
			icon.className = isHidden ? "bx bx-chevron-up collapsible-icon" : "bx bx-chevron-down collapsible-icon";
		});
	}

	setupCollapsible("transactionsHeader", "transactionsTable", "transactionsIcon");
	setupCollapsible("expensesHeader", "expensesTable", "expensesIcon");
	setupCollapsible("auditLogHeader", "auditLogTable", "auditLogIcon");
	setupCollapsible("prepaidPanelHeader", "prepaidPanelContent", "prepaidPanelIcon");
	setupCollapsible("merchantBalancesHeader", "merchantBalancesContent", "merchantBalancesIcon");
	setupCollapsible("driverBalancesHeader", "driverBalancesContent", "driverBalancesIcon");
});
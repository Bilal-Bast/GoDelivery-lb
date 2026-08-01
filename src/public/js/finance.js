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

		if (!confirm(`Collect $${amount.toLocaleString()} from ${driverUsername}?\n\nThis will mark all their delivered orders as COLLECTED.`)) return;

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
				alert(result.error || "Something went wrong.");
				btn.disabled = false;
				btn.textContent = "Receive Cash";
			}
		} catch (err) {
			console.error("Collect driver error:", err);
			alert("Network error. Please try again.");
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

			const deductionLine = hasDeductions ? `
				<div style="margin-top:6px;padding:6px 10px;background:#fff7ed;border-left:3px solid #f59e0b;border-radius:4px;font-size:12px;color:#92400e;">
					<strong>Less:</strong> ${p.deductions.length} customer cancellation${p.deductions.length > 1 ? "s" : ""} (returned after pickup)
					— <strong>−$${Number(p.deductionTotal).toLocaleString()}</strong>
				</div>` : "";

			const netStyle = p.amount < 0
				? "color:#dc2626;font-weight:700;"
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

		const isCollect = amount < 0;
		const isSettle = amount === 0;
		const absAmount = Math.abs(amount);
		const label = isCollect ? "Collect from Merchant" : isSettle ? "Settle" : "Pay";

		const confirmMsg = isCollect
			? `Collect $${absAmount.toLocaleString()} from ${merchantUsername}?\n\nThis settles the delivery charges they owe on cancelled orders.`
			: isSettle
				? `Settle ${merchantUsername}'s account?\n\nTheir payout and delivery-charge deductions cancel out. Orders will be marked as PAID with no cash movement.`
				: `Pay $${absAmount.toLocaleString()} to ${merchantUsername}?\n\nThis will mark all their collected orders as PAID.`;

		if (!confirm(confirmMsg)) return;

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
				alert(result.error || "Something went wrong.");
				btn.disabled = false;
				btn.textContent = label;
			}
		} catch (err) {
			console.error("Pay merchant error:", err);
			alert("Network error. Please try again.");
			btn.disabled = false;
			btn.textContent = label;
		}
	}

	// Initial render
	renderCollectionsTable();
	renderPaymentsTable();

	// ─── Toast ───────────────────────────────────────────────────────────────────

	function showToast(message) {
		let toast = document.getElementById("financeToast");

		if (!toast) {
			toast = document.createElement("div");
			toast.id = "financeToast";
			toast.style.cssText = `
				position:fixed;
				bottom:24px;
				right:24px;
				background:#16a34a;
				color:#fff;
				padding:12px 20px;
				border-radius:8px;
				font-size:14px;
				font-weight:500;
				box-shadow:0 4px 12px rgba(0,0,0,0.15);
				z-index:9999;
				transition:opacity .3s;
			`;
			document.body.appendChild(toast);
		}

		toast.textContent = message;
		toast.style.opacity = "1";

		clearTimeout(toast._timeout);
		toast._timeout = setTimeout(() => {
			toast.style.opacity = "0";
		}, 3000);
	}

	// ─── Report Generation ───────────────────────────────────────────────────────

	function generateFinanceReport(
		reportType,
		transactions,
		expenses,
		collections,
		payments,
	) {
		let html = `
			<div style="font-family:Arial,sans-serif;padding:20px;background:#f9fafb;">
		`;

		const formatDate = (date) => new Date(date).toLocaleDateString();
		const formatMoney = (num) => `$${Number(num).toLocaleString()}`;

		switch (reportType) {

			case "daily": {

				const today = new Date().toLocaleDateString();

				const todayTx = transactions.filter(
					(tx) => formatDate(tx.date) === today,
				);

				const todayExp = expenses.filter(
					(e) => formatDate(e.date) === today,
				);

				const cashIn = todayTx
					.filter(
						(t) =>
							t.type === "Cash In" ||
							t.type === "Driver Collection",
					)
					.reduce((sum, t) => sum + (t.amount || 0), 0);

				const cashOut = todayTx
					.filter(
						(t) =>
							t.type === "Cash Out" ||
							t.type === "Merchant Payment",
					)
					.reduce((sum, t) => sum + (t.amount || 0), 0);

				const exp = todayExp.reduce(
					(sum, e) => sum + (e.amount || 0),
					0,
				);

				html += `
					<h1 style="border-bottom:2px solid #3b82f6;padding-bottom:10px;">
						Daily Summary - ${today}
					</h1>

					<div style="
						display:grid;
						grid-template-columns:repeat(2,1fr);
						gap:15px;
						margin-top:20px;
					">

						<div style="
							background:#fff;
							padding:15px;
							border-radius:8px;
							border-left:4px solid #10b981;
						">
							<div style="color:#6b7280;font-size:12px;">
								Cash In
							</div>

							<div style="
								font-size:28px;
								font-weight:bold;
								color:#10b981;
							">
								${formatMoney(cashIn)}
							</div>
						</div>

						<div style="
							background:#fff;
							padding:15px;
							border-radius:8px;
							border-left:4px solid #ef4444;
						">
							<div style="color:#6b7280;font-size:12px;">
								Cash Out
							</div>

							<div style="
								font-size:28px;
								font-weight:bold;
								color:#ef4444;
							">
								${formatMoney(cashOut)}
							</div>
						</div>

						<div style="
							background:#fff;
							padding:15px;
							border-radius:8px;
							border-left:4px solid #f59e0b;
						">
							<div style="color:#6b7280;font-size:12px;">
								Expenses
							</div>

							<div style="
								font-size:28px;
								font-weight:bold;
								color:#f59e0b;
							">
								${formatMoney(exp)}
							</div>
						</div>

						<div style="
							background:#fff;
							padding:15px;
							border-radius:8px;
							border-left:4px solid #10b981;
						">
							<div style="color:#6b7280;font-size:12px;">
								Net Flow
							</div>

							<div style="
								font-size:28px;
								font-weight:bold;
								color:#10b981;
							">
								${formatMoney(cashIn - cashOut - exp)}
							</div>
						</div>

					</div>
				`;

				break;
			}

			case "weekly": {

				const today = new Date();

				const weekStart = new Date(today);
				weekStart.setDate(today.getDate() - today.getDay());

				const weekTx = transactions.filter((t) => {
					const tDate = new Date(t.date);
					return tDate >= weekStart && tDate <= today;
				});

				const weekExp = expenses.filter((e) => {
					const eDate = new Date(e.date);
					return eDate >= weekStart && eDate <= today;
				});

				const cashIn = weekTx
					.filter(
						(t) =>
							t.type === "Cash In" ||
							t.type === "Driver Collection",
					)
					.reduce((sum, t) => sum + (t.amount || 0), 0);

				const cashOut = weekTx
					.filter(
						(t) =>
							t.type === "Cash Out" ||
							t.type === "Merchant Payment",
					)
					.reduce((sum, t) => sum + (t.amount || 0), 0);

				const exp = weekExp.reduce(
					(sum, e) => sum + (e.amount || 0),
					0,
				);

								html += `
					<h1 style="border-bottom:2px solid #3b82f6;padding-bottom:10px;">
						Weekly Summary (${formatDate(weekStart)} - ${formatDate(today)})
					</h1>

					<div style="
						display:grid;
						grid-template-columns:repeat(2,1fr);
						gap:15px;
						margin-top:20px;
					">

						<div style="
							background:#fff;
							padding:15px;
							border-radius:8px;
							border-left:4px solid #10b981;
						">
							<div style="color:#6b7280;font-size:12px;">
								Total Cash In
							</div>

							<div style="
								font-size:24px;
								font-weight:bold;
								color:#10b981;
							">
								${formatMoney(cashIn)}
							</div>
						</div>

						<div style="
							background:#fff;
							padding:15px;
							border-radius:8px;
							border-left:4px solid #ef4444;
						">
							<div style="color:#6b7280;font-size:12px;">
								Total Cash Out
							</div>

							<div style="
								font-size:24px;
								font-weight:bold;
								color:#ef4444;
							">
								${formatMoney(cashOut)}
							</div>
						</div>

						<div style="
							background:#fff;
							padding:15px;
							border-radius:8px;
							border-left:4px solid #f59e0b;
						">
							<div style="color:#6b7280;font-size:12px;">
								Total Expenses
							</div>

							<div style="
								font-size:24px;
								font-weight:bold;
								color:#f59e0b;
							">
								${formatMoney(exp)}
							</div>
						</div>

						<div style="
							background:#fff;
							padding:15px;
							border-radius:8px;
							border-left:4px solid #10b981;
						">
							<div style="color:#6b7280;font-size:12px;">
								Net Flow
							</div>

							<div style="
								font-size:24px;
								font-weight:bold;
								color:#10b981;
							">
								${formatMoney(cashIn - cashOut - exp)}
							</div>
						</div>

					</div>

					<div style="
						margin-top:20px;
						background:#fff;
						padding:15px;
						border-radius:8px;
					">
						<h3>
							Transactions: ${weekTx.length} |
							Expenses: ${weekExp.length}
						</h3>
					</div>
				`;

				break;
			}

			case "monthly": {

				const today = new Date();

				const monthTx = transactions.filter((t) => {
					const tDate = new Date(t.date);

					return (
						tDate.getMonth() === today.getMonth() &&
						tDate.getFullYear() === today.getFullYear()
					);
				});

				const monthExp = expenses.filter((e) => {
					const eDate = new Date(e.date);

					return (
						eDate.getMonth() === today.getMonth() &&
						eDate.getFullYear() === today.getFullYear()
					);
				});

				const cashIn = monthTx
					.filter(
						(t) =>
							t.type === "Cash In" ||
							t.type === "Driver Collection",
					)
					.reduce((sum, t) => sum + (t.amount || 0), 0);

				const cashOut = monthTx
					.filter(
						(t) =>
							t.type === "Cash Out" ||
							t.type === "Merchant Payment",
					)
					.reduce((sum, t) => sum + (t.amount || 0), 0);

				const exp = monthExp.reduce(
					(sum, e) => sum + (e.amount || 0),
					0,
				);

				const monthName = today.toLocaleDateString("en-US", {
					month: "long",
					year: "numeric",
				});

				html += `
                					<h1 style="border-bottom:2px solid #3b82f6;padding-bottom:10px;">
						Monthly Summary - ${monthName}
					</h1>

					<div style="
						display:grid;
						grid-template-columns:repeat(2,1fr);
						gap:15px;
						margin-top:20px;
					">

						<div style="
							background:#fff;
							padding:15px;
							border-radius:8px;
							border-left:4px solid #10b981;
						">
							<div style="color:#6b7280;font-size:12px;">
								Total Cash In
							</div>

							<div style="
								font-size:24px;
								font-weight:bold;
								color:#10b981;
							">
								${formatMoney(cashIn)}
							</div>
						</div>

						<div style="
							background:#fff;
							padding:15px;
							border-radius:8px;
							border-left:4px solid #ef4444;
						">
							<div style="color:#6b7280;font-size:12px;">
								Total Cash Out
							</div>

							<div style="
								font-size:24px;
								font-weight:bold;
								color:#ef4444;
							">
								${formatMoney(cashOut)}
							</div>
						</div>

						<div style="
							background:#fff;
							padding:15px;
							border-radius:8px;
							border-left:4px solid #f59e0b;
						">
							<div style="color:#6b7280;font-size:12px;">
								Total Expenses
							</div>

							<div style="
								font-size:24px;
								font-weight:bold;
								color:#f59e0b;
							">
								${formatMoney(exp)}
							</div>
						</div>

						<div style="
							background:#fff;
							padding:15px;
							border-radius:8px;
							border-left:4px solid #10b981;
						">
							<div style="color:#6b7280;font-size:12px;">
								Net Flow
							</div>

							<div style="
								font-size:24px;
								font-weight:bold;
								color:#10b981;
							">
								${formatMoney(cashIn - cashOut - exp)}
							</div>
						</div>

					</div>
				`;

				break;
			}

			case "driverSettlement": {

				const settled = collections.filter((c) => c.settled);
				const pending = collections.filter((c) => !c.settled);

				const totalSettled = settled.reduce(
					(sum, c) => sum + (c.amount || 0),
					0,
				);

				const totalPending = pending.reduce(
					(sum, c) => sum + (c.amount || 0),
					0,
				);

				html += `
                					<h1 style="border-bottom:2px solid #3b82f6;padding-bottom:10px;">
						Driver Settlement Report
					</h1>

					<div style="
						display:grid;
						grid-template-columns:repeat(2,1fr);
						gap:15px;
						margin-top:20px;
					">

						<div style="
							background:#fff;
							padding:15px;
							border-radius:8px;
							border-left:4px solid #10b981;
						">
							<div style="color:#6b7280;font-size:12px;">
								Settled Drivers
							</div>

							<div style="
								font-size:24px;
								font-weight:bold;
								color:#10b981;
							">
								${settled.length}
							</div>

							<div style="
								color:#6b7280;
								font-size:11px;
								margin-top:5px;
							">
								${formatMoney(totalSettled)}
							</div>
						</div>

						<div style="
							background:#fff;
							padding:15px;
							border-radius:8px;
							border-left:4px solid #ef4444;
						">
							<div style="color:#6b7280;font-size:12px;">
								Pending Drivers
							</div>

							<div style="
								font-size:24px;
								font-weight:bold;
								color:#ef4444;
							">
								${pending.length}
							</div>

							<div style="
								color:#6b7280;
								font-size:11px;
								margin-top:5px;
							">
								${formatMoney(totalPending)}
							</div>
						</div>

					</div>
				`;

				break;
			}

			case "merchantPayment": {

				const paid = payments.filter((p) => p.paid);
				const pending = payments.filter((p) => !p.paid);

				const totalPaid = paid.reduce(
					(sum, p) => sum + (p.amount || 0),
					0,
				);

				const totalPending = pending.reduce(
					(sum, p) => sum + (p.amount || 0),
					0,
				);

				html += `
                					<h1 style="border-bottom:2px solid #3b82f6;padding-bottom:10px;">
						Merchant Payment Report
					</h1>

					<div style="
						display:grid;
						grid-template-columns:repeat(2,1fr);
						gap:15px;
						margin-top:20px;
					">

						<div style="
							background:#fff;
							padding:15px;
							border-radius:8px;
							border-left:4px solid #10b981;
						">
							<div style="color:#6b7280;font-size:12px;">
								Paid Merchants
							</div>

							<div style="
								font-size:24px;
								font-weight:bold;
								color:#10b981;
							">
								${paid.length}
							</div>

							<div style="
								color:#6b7280;
								font-size:11px;
								margin-top:5px;
							">
								${formatMoney(totalPaid)}
							</div>
						</div>

						<div style="
							background:#fff;
							padding:15px;
							border-radius:8px;
							border-left:4px solid #ef4444;
						">
							<div style="color:#6b7280;font-size:12px;">
								Pending Merchants
							</div>

							<div style="
								font-size:24px;
								font-weight:bold;
								color:#ef4444;
							">
								${pending.length}
							</div>

							<div style="
								color:#6b7280;
								font-size:11px;
								margin-top:5px;
							">
								${formatMoney(totalPending)}
							</div>
						</div>

					</div>
				`;

				break;
			}

			case "expenseBreakdown": {

				const today = new Date();

				const monthExp = expenses.filter((e) => {
					const eDate = new Date(e.date);

					return (
						eDate.getMonth() === today.getMonth() &&
						eDate.getFullYear() === today.getFullYear()
					);
				});

				const byCategory = {};

				monthExp.forEach((e) => {
					const cat = e.category || "Other";

					if (!byCategory[cat]) byCategory[cat] = 0;

					byCategory[cat] += e.amount || 0;
				});

				const monthName = today.toLocaleDateString("en-US", {
					month: "long",
					year: "numeric",
				});

				const total = Object.values(byCategory).reduce(
					(sum, value) => sum + value,
					0,
				);

				html += `
                					<h1 style="border-bottom:2px solid #3b82f6;padding-bottom:10px;">
						Expense Breakdown - ${monthName}
					</h1>

					<div style="
						background:#fff;
						padding:15px;
						border-radius:8px;
						margin-top:20px;
						margin-bottom:20px;
						border-left:4px solid #f59e0b;
					">
						<div style="
							font-size:24px;
							font-weight:bold;
							color:#f59e0b;
						">
							Total: ${formatMoney(total)}
						</div>
					</div>

					<table style="
						width:100%;
						border-collapse:collapse;
						background:#fff;
					">

						<tr style="background:#f3f4f6;">
							<th style="
								padding:10px;
								text-align:left;
								border:1px solid #d1d5db;
							">
								Category
							</th>

							<th style="
								padding:10px;
								text-align:right;
								border:1px solid #d1d5db;
							">
								Amount
							</th>
						</tr>
				`;

				Object.entries(byCategory).forEach(([cat, amount]) => {
					html += `
						<tr>
							<td style="
								padding:10px;
								border:1px solid #d1d5db;
							">
								${cat}
							</td>

							<td style="
								padding:10px;
								text-align:right;
								border:1px solid #d1d5db;
								font-weight:500;
							">
								${formatMoney(amount)}
							</td>
						</tr>
					`;
				});

				html += `
					</table>
				`;

				break;
			}
		}

		html += `
			<div style="
				margin-top:20px;
				padding-top:20px;
				border-top:1px solid #d1d5db;
			">
				<button
					onclick="window.print()"
					style="
						padding:10px 20px;
						background:#3b82f6;
						color:white;
						border:none;
						border-radius:6px;
						cursor:pointer;
						font-weight:500;
					"
				>
					🖨️ Print
				</button>
			</div>

			<p style="
				text-align:center;
				color:#6b7280;
				font-size:12px;
				margin-top:20px;
			">
				Generated: ${new Date().toLocaleString()}
			</p>
		</div>`;

		return html;
	}

	// ─── Modal (Quick Actions) ───────────────────────────────────────────────────

	function driverOptions() {
		return drivers
			.map(
				(d) => `<option value="${d.username}">${d.name}</option>`,
			)
			.join("");
	}

	function merchantOptions() {
		return merchants
			.map(
				(m) => `<option value="${m.username}">${m.name}</option>`,
			)
			.join("");
	}

	const forms = {
        	quickAction: {
		open(action) {
			const modal = document.getElementById("quickActionModal");
			if (!modal) return;

			const title = document.getElementById("quickActionTitle");
			const form = document.getElementById("quickActionForm");
			const body = document.getElementById("quickActionBody");

			if (!form || !body) return;

			form.dataset.action = action;

			const configs = {
				collectDriver: {
					title: "Collect Money From Driver",
					fields: `
						<div class="form-group">
							<label>Driver</label>
							<select id="actionDriver" required>
								<option value="">Select Driver</option>
							</select>
						</div>

						<div class="form-group">
							<label>Amount</label>
							<input 
								type="number" 
								id="actionAmount"
								placeholder="Enter amount"
								required
							/>
						</div>

						<div class="form-group">
							<label>Payment Method</label>
							<select id="actionMethod">
								<option value="cash">Cash</option>
								<option value="omt">OMT</option>
								<option value="whish">Whish</option>
							</select>
						</div>

						<div class="form-group">
							<label>Notes</label>
							<textarea id="actionNotes" placeholder="Optional notes"></textarea>
						</div>
					`,
				},

				payMerchant: {
					title: "Pay Merchant",
					fields: `
						<div class="form-group">
							<label>Merchant</label>
							<select id="actionMerchant" required>
								<option value="">Select Merchant</option>
							</select>
						</div>

						<div class="form-group">
							<label>Amount</label>
							<input 
								type="number"
								id="actionAmount"
								placeholder="Enter amount"
								required
							/>
						</div>

						<div class="form-group">
							<label>Payment Method</label>
							<select id="actionMethod">
								<option value="cash">Cash</option>
								<option value="omt">OMT</option>
								<option value="whish">Whish</option>
								<option value="bank">Bank Transfer</option>
							</select>
						</div>

						<div class="form-group">
							<label>Reference</label>
							<input 
								type="text"
								id="actionReference"
								placeholder="Payment reference"
							/>
						</div>

						<div class="form-group">
							<label>Notes</label>
							<textarea id="actionNotes"></textarea>
						</div>
					`,
				},

				addExpense: {
					title: "Add Expense",
					fields: `
						<div class="form-group">
							<label>Category</label>
							<select id="expenseCategory">
								<option value="fuel">Fuel</option>
								<option value="maintenance">Maintenance</option>
								<option value="salary">Salary</option>
								<option value="other">Other</option>
							</select>
						</div>

						<div class="form-group">
							<label>Amount</label>
							<input 
								type="number"
								id="actionAmount"
								required
							/>
						</div>

						<div class="form-group">
							<label>Description</label>
							<textarea id="actionDescription"></textarea>
						</div>

						<div class="form-group">
							<label>Payment Method</label>
							<select id="actionMethod">
								<option value="cash">Cash</option>
								<option value="omt">OMT</option>
								<option value="whish">Whish</option>
							</select>
						</div>
					`,
				},
			};

			const config = configs[action];

			if (!config) {
				console.error("Unknown quick action:", action);
				return;
			}

			if (title) {
				title.textContent = config.title;
			}

			body.innerHTML = config.fields;

			this.populateSelects(action);

			modal.classList.remove("hidden");
		},

		close() {
			const modal = document.getElementById("quickActionModal");

			if (modal) {
				modal.classList.add("hidden");
			}

			const form = document.getElementById("quickActionForm");

			if (form) {
				form.reset();
				delete form.dataset.action;
			}
		},

		async populateSelects(action) {
			if (action === "collectDriver") {
				const select = document.getElementById("actionDriver");

				if (!select) return;

				const drivers = allFinanceData?.drivers || [];

				select.innerHTML = `
					<option value="">Select Driver</option>
					${drivers.map(driver => `
						<option value="${driver.id}">
							${driver.name || driver.username}
						</option>
					`).join("")}
				`;
			}

			if (action === "payMerchant") {
				const select = document.getElementById("actionMerchant");

				if (!select) return;

				const merchants = allFinanceData?.merchants || [];

				select.innerHTML = `
					<option value="">Select Merchant</option>
					${merchants.map(merchant => `
						<option value="${merchant.id}">
							${merchant.name || merchant.username}
						</option>
					`).join("")}
				`;
			}
		},
        		async submit(event) {
			event.preventDefault();

			const form = document.getElementById("quickActionForm");

			if (!form) return;

			const action = form.dataset.action;

			if (!action) {
				console.error("No action selected");
				return;
			}

			const submitBtn = form.querySelector("button[type='submit']");

			if (submitBtn) {
				submitBtn.disabled = true;
				submitBtn.textContent = "Processing...";
			}

			try {
				let endpoint = "";
				let payload = {};

				switch (action) {
					case "collectDriver":
						endpoint = "/api/finance/driver-collections";

						payload = {
							driverId: document.getElementById("actionDriver")?.value,
							amount: Number(
								document.getElementById("actionAmount")?.value || 0
							),
							method:
								document.getElementById("actionMethod")?.value || "cash",
							notes:
								document.getElementById("actionNotes")?.value || "",
						};

						break;


					case "payMerchant":
						endpoint = "/api/finance/merchant-payments";

						payload = {
							merchantId:
								document.getElementById("actionMerchant")?.value,

							amount: Number(
								document.getElementById("actionAmount")?.value || 0
							),

							method:
								document.getElementById("actionMethod")?.value || "cash",

							reference:
								document.getElementById("actionReference")?.value || "",

							notes:
								document.getElementById("actionNotes")?.value || "",
						};

						break;


					case "addExpense":
						endpoint = "/api/finance/expenses";

						payload = {
							category:
								document.getElementById("expenseCategory")?.value,

							amount: Number(
								document.getElementById("actionAmount")?.value || 0
							),

							description:
								document.getElementById("actionDescription")?.value ||
								"",

							method:
								document.getElementById("actionMethod")?.value ||
								"cash",
						};

						break;


					default:
						throw new Error("Invalid finance action");
				}


				if (!payload.amount || payload.amount <= 0) {
					throw new Error("Amount must be greater than zero");
				}


				const response = await fetch(endpoint, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(payload),
				});


				const result = await response.json();


				if (!response.ok) {
					throw new Error(
						result.message ||
						"Failed to complete transaction"
					);
				}


				showToast(
					"success",
					"Transaction completed successfully"
				);


				this.close();


				await loadFinanceData();


			} catch (error) {

				console.error(
					"Finance action error:",
					error
				);


				showToast(
					"error",
					error.message || "Something went wrong"
				);

			} finally {

				if (submitBtn) {
					submitBtn.disabled = false;
					submitBtn.textContent = "Save";
				}
			}
		},
	},


	// =====================================
	// Transactions
	// =====================================

	transactions: {

		render() {

			const tbody =
				document.getElementById("transactionsBody");


			if (!tbody) return;


			const transactions =
				allFinanceData?.transactions || [];


			if (!transactions.length) {

				tbody.innerHTML = `
					<tr>
						<td colspan="7" class="empty-state">
							No transactions found
						</td>
					</tr>
				`;

				return;
			}


			tbody.innerHTML =
				transactions.map(transaction => `

					<tr>

						<td>
							${formatDate(transaction.createdAt)}
						</td>


						<td>
							<span class="transaction-type ${transaction.type}">
								${transaction.type}
							</span>
						</td>


						<td>
							${transaction.description || "-"}
						</td>


						<td>
							${transaction.user || "-"}
						</td>


						<td>
							${formatMoney(transaction.amount)}
						</td>


						<td>
							${transaction.method || "-"}
						</td>


						<td>
							<button
								class="btn-view"
								onclick="viewTransaction('${transaction.id}')"
							>
								View
							</button>
						</td>

					</tr>

				`).join("");

		},
	},
    	// =====================================
	// Finance Dashboard Cards
	// =====================================

	dashboard: {

		render() {

			const data = allFinanceData || {};

			const cards = {
				totalRevenue:
					data.summary?.totalRevenue || 0,

				collected:
					data.summary?.collected || 0,

				merchantDebt:
					data.summary?.merchantDebt || 0,

				driverDebt:
					data.summary?.driverDebt || 0,

				expenses:
					data.summary?.expenses || 0,

				profit:
					data.summary?.profit || 0,
			};


			const elements = {
				totalRevenue:
					document.getElementById("totalRevenue"),

				collected:
					document.getElementById("totalCollected"),

				merchantDebt:
					document.getElementById("merchantDebt"),

				driverDebt:
					document.getElementById("driverDebt"),

				expenses:
					document.getElementById("totalExpenses"),

				profit:
					document.getElementById("netProfit"),
			};


			Object.keys(elements).forEach(key => {

				const el = elements[key];

				if (!el) return;


				el.textContent =
					formatMoney(cards[key]);

			});
		},
	},



	// =====================================
	// Charts
	// =====================================

	charts: {

		revenueChart: null,
		statusChart: null,


		renderRevenue() {

			const canvas =
				document.getElementById("revenueChart");


			if (!canvas || typeof Chart === "undefined") {
				return;
			}


			const monthly =
				allFinanceData?.monthlyRevenue || [];


			if (this.revenueChart) {
				this.revenueChart.destroy();
			}


			this.revenueChart =
				new Chart(canvas, {

					type: "line",

					data: {

						labels:
							monthly.map(
								item => item.month
							),


						datasets: [
							{
								label:
									"Revenue",

								data:
									monthly.map(
										item => item.amount
									),

								tension: 0.3,

								fill: true,
							}
						]
					},


					options: {

						responsive: true,

						plugins: {

							legend: {
								display: true
							}

						}

					}

				});

		},



		renderStatus() {

			const canvas =
				document.getElementById("orderStatusChart");


			if (!canvas || typeof Chart === "undefined") {
				return;
			}


			const status =
				allFinanceData?.orderStatus || {};


			if (this.statusChart) {
				this.statusChart.destroy();
			}



			this.statusChart =
				new Chart(canvas, {

					type: "doughnut",


					data: {

						labels:
							Object.keys(status),


						datasets: [
							{
								data:
									Object.values(status)
							}
						]

					},


					options: {

						responsive:true,

						plugins: {

							legend:{
								position:"bottom"
							}

						}

					}

				});
		},


		renderAll() {

			this.renderRevenue();

			this.renderStatus();

		},

	},



	// =====================================
	// Filters
	// =====================================

	filters: {

		current: {
			startDate: null,
			endDate: null,
			type: "all",
		},


		apply() {

			this.current.startDate =
				document.getElementById("financeStartDate")?.value || null;


			this.current.endDate =
				document.getElementById("financeEndDate")?.value || null;


			this.current.type =
				document.getElementById("financeType")?.value || "all";


			loadFinanceData(
				this.current
			);

		},


		reset() {

			this.current = {
				startDate:null,
				endDate:null,
				type:"all",
			};


			const inputs = [
				"financeStartDate",
				"financeEndDate",
				"financeType",
			];


			inputs.forEach(id => {

				const el =
					document.getElementById(id);

				if (el) {

					el.value =
						id === "financeType"
							? "all"
							: "";

				}

			});


			loadFinanceData();

		},

	},



};
//
// =====================================
// Global Finance Functions
// =====================================
//


window.openQuickAction = function(action) {

	if (!forms.quickAction) return;

	forms.quickAction.open(action);

};



window.closeQuickAction = function() {

	if (!forms.quickAction) return;

	forms.quickAction.close();

};



window.submitQuickAction = function(event) {

	if (!forms.quickAction) return;

	forms.quickAction.submit(event);

};



// =====================================
// Transaction View
// =====================================


window.viewTransaction = function(id) {

	const transaction =
		allFinanceData?.transactions?.find(
			t => t.id === id
		);


	if (!transaction) {

		showToast(
			"error",
			"Transaction not found"
		);

		return;
	}



	const modal =
		document.getElementById(
			"transactionModal"
		);


	const body =
		document.getElementById(
			"transactionDetails"
		);



	if (!modal || !body) return;



	body.innerHTML = `

		<div class="transaction-details">

			<div class="detail-row">
				<strong>ID</strong>
				<span>${transaction.id}</span>
			</div>


			<div class="detail-row">
				<strong>Type</strong>
				<span>${transaction.type}</span>
			</div>


			<div class="detail-row">
				<strong>Amount</strong>
				<span>
					${formatMoney(transaction.amount)}
				</span>
			</div>


			<div class="detail-row">
				<strong>Method</strong>
				<span>
					${transaction.method || "-"}
				</span>
			</div>


			<div class="detail-row">
				<strong>Date</strong>
				<span>
					${formatDate(transaction.createdAt)}
				</span>
			</div>


			<div class="detail-row">
				<strong>Notes</strong>
				<span>
					${transaction.notes || "-"}
				</span>
			</div>

		</div>

	`;



	modal.classList.remove("hidden");

};



window.closeTransactionModal = function() {

	const modal =
		document.getElementById(
			"transactionModal"
		);


	if (modal) {

		modal.classList.add(
			"hidden"
		);

	}

};



// =====================================
// Load Finance Data
// =====================================


async function loadFinanceData(filters = {}) {

	try {

		const params =
			new URLSearchParams();


		Object.entries(filters).forEach(
			([key,value]) => {

				if (value) {

					params.append(
						key,
						value
					);

				}

			}
		);



		const response =
			await fetch(
				`/api/finance?${params.toString()}`
			);



		const result =
			await response.json();



		if (!response.ok) {

			throw new Error(
				result.message ||
				"Unable to load finance data"
			);

		}



		allFinanceData =
			result.data || result;



		forms.dashboard.render();


		forms.transactions.render();


		forms.charts.renderAll();



		renderDriverCollections();


		renderMerchantPayments();


		renderExpenses();



	}
	catch(error) {


		console.error(
			"Finance loading error:",
			error
		);



		showToast(
			"error",
			"Finance data unavailable"
		);



		allFinanceData = {

			summary:{},

			transactions:[]

		};


		forms.dashboard.render();


		forms.transactions.render();

	}

}



// =====================================
// Page Initialization
// =====================================


document.addEventListener(
	"DOMContentLoaded",
	async () => {


		await loadFinanceData();



		const quickForm =
			document.getElementById(
				"quickActionForm"
			);



		if (quickForm) {

			quickForm.addEventListener(
				"submit",
				(e) => {

					forms.quickAction.submit(e);

				}
			);

		}



		const filterBtn =
			document.getElementById(
				"applyFinanceFilter"
			);



		if (filterBtn) {

			filterBtn.addEventListener(
				"click",
				() => {

					forms.filters.apply();

				}
			);

		}



		const resetBtn =
			document.getElementById(
				"resetFinanceFilter"
			);



		if (resetBtn) {

			resetBtn.addEventListener(
				"click",
				() => {

					forms.filters.reset();

				}
			);

		}



		const closeButtons =
			document.querySelectorAll(
				"[data-close-modal]"
			);



		closeButtons.forEach(btn => {

			btn.addEventListener(
				"click",
				() => {

					const modal =
						btn.closest(".modal");


					if (modal) {

						modal.classList.add(
							"hidden"
						);

					}

				}
			);

		});


	}
);
//
// =====================================
// Helper Functions
// =====================================
//


function formatMoney(amount) {

	const value =
		Number(amount || 0);


	return new Intl.NumberFormat(
		"en-US",
		{
			style: "currency",
			currency: "LBP",
			maximumFractionDigits: 0,
		}
	).format(value);

}



function formatDate(date) {

	if (!date) return "-";


	return new Date(date).toLocaleDateString(
		"en-GB",
		{
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}
	);

}



function showToast(type, message) {

	const container =
		document.getElementById(
			"toastContainer"
		);


	if (!container) {

		console.log(
			`${type}: ${message}`
		);

		return;
	}



	const toast =
		document.createElement(
			"div"
		);



	toast.className =
		`toast toast-${type}`;



	toast.innerHTML = `

		<span>
			${message}
		</span>

	`;



	container.appendChild(toast);



	setTimeout(() => {

		toast.classList.add(
			"hide"
		);


		setTimeout(() => {

			toast.remove();

		},300);


	},3000);

}




//
// =====================================
// Driver Collections Renderer
// =====================================
//


function renderDriverCollections() {


	const tbody =
		document.getElementById(
			"driverCollectionsBody"
		);



	if (!tbody) return;



	const collections =
		allFinanceData?.driverCollections || [];



	if (!collections.length) {

		tbody.innerHTML = `

			<tr>
				<td colspan="6">
					No driver collections found
				</td>
			</tr>

		`;

		return;

}



	tbody.innerHTML =
		collections.map(item => `

			<tr>

				<td>
					${formatDate(item.createdAt)}
				</td>


				<td>
					${item.driver?.name || "-"}
				</td>


				<td>
					${formatMoney(item.amount)}
				</td>


				<td>
					${item.method || "cash"}
				</td>


				<td>
					${item.status || "completed"}
				</td>


				<td>

					<button
						class="btn-view"
						onclick="
							viewTransaction('${item.id}')
						"
					>
						View
					</button>

				</td>

			</tr>

		`).join("");

}




//
// =====================================
// Merchant Payments Renderer
// =====================================
//


function renderMerchantPayments() {


	const tbody =
		document.getElementById(
			"merchantPaymentsBody"
		);



	if (!tbody) return;



	const payments =
		allFinanceData?.merchantPayments || [];



	if (!payments.length) {

		tbody.innerHTML = `

			<tr>
				<td colspan="6">
					No merchant payments found
				</td>
			</tr>

		`;

		return;

}



	tbody.innerHTML =
		payments.map(payment => `

			<tr>

				<td>
					${formatDate(payment.createdAt)}
				</td>


				<td>
					${payment.merchant?.name || "-"}
				</td>


				<td>
					${formatMoney(payment.amount)}
				</td>


				<td>
					${payment.method || "-"}
				</td>


				<td>
					${payment.reference || "-"}
				</td>


				<td>

					<button
						class="btn-view"
						onclick="
							viewTransaction('${payment.id}')
						"
					>
						View
					</button>

				</td>


			</tr>


		`).join("");

}




//
// =====================================
// Expenses Renderer
// =====================================
//


function renderExpenses() {


	const tbody =
		document.getElementById(
			"expensesBody"
		);



	if (!tbody) return;



	const expenses =
		allFinanceData?.expenses || [];



	if (!expenses.length) {


		tbody.innerHTML = `

			<tr>
				<td colspan="6">
					No expenses found
				</td>
			</tr>

		`;


		return;

	}



	tbody.innerHTML =
		expenses.map(expense => `


			<tr>


				<td>
					${formatDate(expense.createdAt)}
				</td>



				<td>
					${expense.category || "-"}
				</td>



				<td>
					${expense.description || "-"}
				</td>



				<td>
					${formatMoney(expense.amount)}
				</td>



				<td>
					${expense.method || "cash"}
				</td>



				<td>

					<button
						class="btn-view"
						onclick="
							viewTransaction('${expense.id}')
						"
					>
						View
					</button>

				</td>


			</tr>


		`).join("");

}




//
// =====================================
// Export Reports
// =====================================
//


window.exportFinanceReport = function(type = "all") {


	const params =
		new URLSearchParams({

			type,

			startDate:
				forms.filters.current.startDate || "",

			endDate:
				forms.filters.current.endDate || "",

		});



	window.open(
		`/api/finance/export?${params.toString()}`,
		"_blank"
	);

};



window.printFinanceReport = function() {

	window.print();

};
//
// =====================================
// Auto Refresh Finance Data
// =====================================
//


let financeRefreshTimer = null;



function startFinanceAutoRefresh() {


	if (financeRefreshTimer) {

		clearInterval(
			financeRefreshTimer
		);

	}



	financeRefreshTimer =
		setInterval(
			() => {

				if (
					document.visibilityState ===
					"visible"
				) {

					loadFinanceData(
						forms.filters.current
					);

				}

			},
			60000
		);

}



function stopFinanceAutoRefresh() {


	if (financeRefreshTimer) {

		clearInterval(
			financeRefreshTimer
		);


		financeRefreshTimer = null;

	}

}




//
// =====================================
// Page Visibility Handling
// =====================================
//


document.addEventListener(
	"visibilitychange",
	() => {


		if (
			document.visibilityState ===
			"visible"
		) {

			loadFinanceData(
				forms.filters.current
			);

		}

	}
);




//
// =====================================
// Search Transactions
// =====================================
//


window.searchFinanceTransactions = function(value) {


	const rows =
		document.querySelectorAll(
			"#transactionsBody tr"
		);



	const search =
		value
			.toLowerCase()
			.trim();



	rows.forEach(row => {


		const text =
			row.textContent
				.toLowerCase();



		if (
			text.includes(search)
		) {

			row.style.display = "";

		}
		else {

			row.style.display = "none";

		}


	});


};




//
// =====================================
// Sort Transactions
// =====================================
//


window.sortFinanceTable = function(
	column,
	direction = "asc"
) {


	const table =
		document.querySelector(
			"#transactionsTable tbody"
		);



	if (!table) return;



	const rows =
		Array.from(
			table.querySelectorAll("tr")
		);



	rows.sort(
		(a,b) => {


			const first =
				a.children[column]
					?.textContent
					.trim() || "";



			const second =
				b.children[column]
					?.textContent
					.trim() || "";



			if (
				!isNaN(first) &&
				!isNaN(second)
			) {

				return direction === "asc"
					? first - second
					: second - first;

			}



			return direction === "asc"
				? first.localeCompare(second)
				: second.localeCompare(first);


		}
	);



	rows.forEach(row => {

		table.appendChild(row);

	});

};





//
// =====================================
// Keyboard Shortcuts
// =====================================
//


document.addEventListener(
	"keydown",
	(event) => {


		// Ctrl + R reload finance data
		if (
			event.ctrlKey &&
			event.key === "r"
		) {

			event.preventDefault();


			loadFinanceData(
				forms.filters.current
			);

		}



		// Escape closes modals
		if (
			event.key === "Escape"
		) {


			document
				.querySelectorAll(
					".modal:not(.hidden)"
				)
				.forEach(modal => {

					modal.classList.add(
						"hidden"
					);

				});

		}


	}
);





//
// =====================================
// Start Services
// =====================================
//


document.addEventListener(
	"DOMContentLoaded",
	() => {


		startFinanceAutoRefresh();


	}
);





//
// =====================================
// Expose Main Functions
// =====================================
//


window.finance = {

	load:
		loadFinanceData,


	refresh:
		() =>
			loadFinanceData(
				forms.filters.current
			),


	openAction:
		forms.quickAction.open,


	closeAction:
		forms.quickAction.close,


	export:
		exportFinanceReport,


	print:
		printFinanceReport,

};

});


// End of finance.js
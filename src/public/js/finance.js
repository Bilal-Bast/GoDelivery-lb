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
			alert("Please enter a valid amount.");
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
				alert(result.error || "Something went wrong.");
			}
		} catch (err) {
			console.error("Finance submit error:", err);
			alert("Network error. Please try again.");
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
});
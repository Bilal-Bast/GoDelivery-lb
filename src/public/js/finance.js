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
					data-amount="${p.amount}"
					${p.amount <= 0 ? 'disabled title="Nothing to pay out"' : ""}>
					${p.amount <= 0 ? "Collect from Merchant" : "Pay"}
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

		if (!confirm(`Pay $${amount.toLocaleString()} to ${merchantUsername}?\n\nThis will mark all their collected orders as PAID.`)) return;

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
				showToast(`✓ Paid $${Number(result.amount).toLocaleString()} to ${merchantUsername}`);
			} else {
				alert(result.error || "Something went wrong.");
				btn.disabled = false;
				btn.textContent = "Pay";
			}
		} catch (err) {
			console.error("Pay merchant error:", err);
			alert("Network error. Please try again.");
			btn.disabled = false;
			btn.textContent = "Pay";
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
			html: `<p>Coming soon…</p>`,
			buildBody: null,
			endpoint: null,
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
			if (saveBtn) saveBtn.style.display = config.endpoint ? "" : "none";
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

	financeForm?.addEventListener("submit", async (e) => {
		e.preventDefault();
		const config = forms[currentAction];
		if (!config || !config.endpoint || !config.buildBody) return;

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
					showToast(`✓ Done — $${Number(result.amount).toLocaleString()} processed`);
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
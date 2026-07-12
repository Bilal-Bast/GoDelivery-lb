document.addEventListener("DOMContentLoaded", () => {
	const initData = window.__INIT_DATA__ || {};
	const stats = initData.stats || { cards: [], alerts: [] };
	const transactions = initData.transactions || [];
	const expenses = initData.expenses || [];

	const cards = stats.cards || [];
	const cardsContainer = document.querySelector(".stats-grid");
	if (cardsContainer) {
		cardsContainer.innerHTML = cards.map((card) => `
			<div class="stat-card">
				<div class="stat-icon"><i class='bx bx-wallet-alt'></i></div>
				<div class="stat-content">
					<div class="stat-title">${card.title}</div>
					<div class="stat-value">${card.value}</div>
					<div class="stat-meta">${card.description}</div>
					<div class="stat-trend">${card.trend}</div>
				</div>
			</div>
		`).join("");
	}

	const alertsContainer = document.querySelector(".alert-list");
	if (alertsContainer) {
		const alerts = stats.alerts || [];
		alertsContainer.innerHTML = alerts.length ? alerts.map((alert) => `
			<div class="alert-item ${alert.type || "info"}">
				<strong>${alert.title}</strong>
				<span>${alert.detail}</span>
			</div>
		`).join("") : '<div class="alert-item">No alerts at the moment.</div>';
	}

	const revenueCtx = document.getElementById("revenueChart");
	if (revenueCtx) {
		const labels = [...new Set(transactions.map((tx) => new Date(tx.date).toLocaleDateString()))].slice(0, 8);
		const data = labels.map((label) => transactions.filter((tx) => new Date(tx.date).toLocaleDateString() === label).reduce((sum, tx) => sum + (tx.amount || 0), 0));
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
		const categories = [...new Set(expenses.map((expense) => expense.category || "Other"))];
		const values = categories.map((category) => expenses.filter((expense) => expense.category === category).reduce((sum, expense) => sum + (expense.amount || 0), 0));
		new Chart(expenseCtx, {
			type: "bar",
			data: { labels: categories, datasets: [{ label: "Expenses", data: values, backgroundColor: "#f59e0b" }] },
			options: { responsive: true, plugins: { legend: { display: false } } },
		});
	}
});

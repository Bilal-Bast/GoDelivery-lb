document.addEventListener("DOMContentLoaded", () => {
	const initData = window.__INIT_DATA__ || {};
	const stats = initData.stats || { cards: [], alerts: [] };
	const transactions = initData.transactions || [];
	const expenses = initData.expenses || [];

	const cards = stats.cards || [];
	const cardsContainer = document.querySelector(".stats-grid");

	const financeModal = document.getElementById("financeModal");
	const modalTitle = document.getElementById("modalTitle");
	const modalBody = document.getElementById("modalBody");
	const financeForm = document.getElementById("financeForm");

	const drivers = window.__INIT_DATA__.drivers || [];
	const merchants = window.__INIT_DATA__.merchants || [];
	

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

	function driverOptions() {
		return drivers
			.map(driver => `<option value="${driver.username}">${driver.name}</option>`)
			.join("");
	}

	function merchantOptions() {
		return merchants
			.map(merchant => `<option value="${merchant.username}">${merchant.name}</option>`)
			.join("");
	}

	const forms = {

		cashIn: `
			<div class="form-group">
				<label>Amount</label>
				<input type="number" id="amount" required>
			</div>

			<div class="form-group">
				<label>Payment Method</label>

				<select id="paymentMethod">
					<option>Cash</option>
					<option>OMT</option>
					<option>Whish</option>
				</select>
			</div>

			<div class="form-group">
				<label>Description</label>
				<input id="description">
			</div>

			<div class="form-group">
				<label>Notes</label>
				<textarea id="notes"></textarea>
			</div>
		`,

		cashOut: `
			<div class="form-group">
				<label>Amount</label>
				<input type="number" id="amount" required>
			</div>

			<div class="form-group">
				<label>Payment Method</label>

				<select id="paymentMethod">
					<option>Cash</option>
					<option>OMT</option>
					<option>Whish</option>
				</select>
			</div>

			<div class="form-group">
				<label>Description</label>
				<input id="description">
			</div>

			<div class="form-group">
				<label>Notes</label>
				<textarea id="notes"></textarea>
			</div>
		`,

		expense: `
			<div class="form-group">
				<label>Amount</label>
				<input type="number" id="amount" required>
			</div>

			<div class="form-group">
				<label>Category</label>

				<select id="category">

					<option>Fuel</option>
					<option>Rent</option>
					<option>Electricity</option>
					<option>Water</option>
					<option>Internet</option>
					<option>Office Supplies</option>
					<option>Equipment</option>
					<option>Maintenance</option>
					<option>Marketing</option>
					<option>Refunds</option>
					<option>Salaries</option>
					<option>Other</option>

				</select>
			</div>

			<div class="form-group">
				<label>Description</label>
				<input id="description">
			</div>
		`,

		driverCollection: `
			<div class="form-group">

				<label>Driver</label>

				<select id="driver">

					${driverOptions()}

				</select>

			</div>
		`,

		merchantPayment: `
			<div class="form-group">

				<label>Merchant</label>

				<select id="merchant">

					${merchantOptions()}

				</select>

			</div>
		`
	};

	const cashInForm = document.getElementById("cashInForm");

	cashInForm?.addEventListener("submit", async (e) => {
		e.preventDefault();

		const body = {
			type: "Cash In",
			amount: Number(document.getElementById("cashInAmount").value),
			paymentMethod: document.getElementById("cashInMethod").value,
			description: document.getElementById("cashInDescription").value,
		};

		const response = await fetch("/api/finance/transaction", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});

		const result = await response.json();

		if (result.success) {
			alert("Cash In recorded!");
			location.reload();
		} else {
			alert(result.error);
		}
	});

	const cashOutForm = document.getElementById("cashOutForm");

	cashOutForm?.addEventListener("submit", async (e) => {
		e.preventDefault();

		const body = {
			type: "Cash Out",
			amount: Number(document.getElementById("cashOutAmount").value),
			paymentMethod: document.getElementById("cashOutMethod").value,
			description: document.getElementById("cashOutDescription").value,
		};

		const response = await fetch("/api/finance/transaction", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});

		const result = await response.json();

		if (result.success) {
			alert("Cash Out recorded!");
			location.reload();
		} else {
			alert(result.error);
		}
	});

	const driverCollectionForm = document.getElementById("driverCollectionForm");

	driverCollectionForm?.addEventListener("submit", async (e) => {
		e.preventDefault();

		const body = {
			type: "Driver Collection",
			amount,
			driver,
			relatedOrder,
			paymentMethod,
			description
		};

		const response = await fetch("/api/finance/transaction", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});

		const result = await response.json();

		if (result.success) {
			alert("Driver Collection recorded!");
			location.reload();
		} else {
			alert(result.error);
		}
	});

	const merchantPaymentForm = document.getElementById("merchantPaymentForm");

	merchantPaymentForm?.addEventListener("submit", async (e) => {
		e.preventDefault();

		const body = {
			type: "Merchant Payment",
			amount,
			driver,
			relatedOrder,
			paymentMethod,
			description
		};

		const response = await fetch("/api/finance/transaction", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});

		const result = await response.json();

		if (result.success) {
			alert("Merchant Payment recorded!");
			location.reload();
		} else {
			alert(result.error);
		}
	});

	fetch("/api/finance/expense", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			amount,
			category,
			description,
		}),
	});

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

	document.querySelectorAll(".action-btn").forEach(button => {

		button.addEventListener("click", () => {

			const action = button.dataset.action;

			financeModal.classList.remove("hidden");

			switch(action){

				case "cash-in":
					modalTitle.textContent = "Cash In";
					modalBody.innerHTML = forms.cashIn;
					break;

				case "cash-out":
					modalTitle.textContent = "Cash Out";
					modalBody.innerHTML = forms.cashOut;
					break;

				case "driver-collect":
					modalTitle.textContent = "Receive Driver Cash";
					modalBody.innerHTML = forms.driverCollection;
					break;

				case "merchant-pay":
					modalTitle.textContent = "Pay Merchant";
					modalBody.innerHTML = forms.merchantPayment;
					break;

				case "expense":
					modalTitle.textContent = "Add Expense";
					modalBody.innerHTML = forms.expense;
					break;

				case "report":
					modalTitle.textContent = "Generate Report";
					modalBody.innerHTML = "<p>Coming soon...</p>";
					break;

			}

		});

	});

	document.getElementById("closeModal").addEventListener("click", () => {
		financeModal.classList.add("hidden");
	});

	document.querySelector(".cancel-btn").addEventListener("click", () => {
		financeModal.classList.add("hidden");
	});

});


(() => {
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

	function updateSelectedTotal() {
		let total = 0;
		document
			.querySelectorAll('#ordersBody input[type="checkbox"]:checked')
			.forEach((cb) => {
				total += parseFloat(cb.dataset.amount) || 0;
			});
		const el = document.getElementById("selectedTotal");
		if (el) {
			const sign = total < 0 ? "-" : "";
			el.textContent = `${sign}$${Math.abs(total).toFixed(2)}`;
			el.style.color = total < 0 ? "#dc2626" : "";
		}
	}

	// Render Merchant Orders table. Two kinds of settleable rows:
	//  • Collected orders (s===6): admin owes merchant (total − delivery).
	//  • Customer-cancelled, collected-back orders (s===4): merchant owes admin
	//    the delivery charge. Shown as a negative deduction.
	function renderMerchantOrders(orders) {
		const ordersBody = document.getElementById("ordersBody");
		if (!ordersBody) return;

		const payable = orders.filter((o) => o.s === 6);
		const owed = orders.filter(
			(o) => o.s === 4 && o.collectedBack && o.cancelledBy === "customer",
		);

		ordersBody.innerHTML = "";

		if (payable.length === 0 && owed.length === 0) {
			ordersBody.innerHTML = `
				<tr>
					<td colspan="5" class="empty-msg">No orders to settle for this merchant.</td>
				</tr>
			`;
			updateSelectedTotal();
			return;
		}

		payable.forEach((order) => {
			const customer = `${order.c?.f || "-"} ${order.c?.l || ""}`.trim();
			const total = order.pr?.t || 0;
			const delivery = order.pr?.d || 0;
			const payout = total - delivery; // what admin actually pays out
			const row = document.createElement("tr");
			row.innerHTML = `
				<td><input type="checkbox" name="orderIds" value="${escapeHtml(order.id)}" data-amount="${payout}"></td>
				<td>${escapeHtml(order.id)}</td>
				<td>${escapeHtml(customer)}</td>
				<td class="amount-cell">$${payout.toFixed(2)}</td>
				<td>Collected</td>
			`;
			ordersBody.appendChild(row);
		});

		owed.forEach((order) => {
			const customer = `${order.c?.f || "-"} ${order.c?.l || ""}`.trim();
			const delivery = order.pr?.d || 0;
			const row = document.createElement("tr");
			row.innerHTML = `
				<td><input type="checkbox" name="orderIds" value="${escapeHtml(order.id)}" data-amount="${-delivery}"></td>
				<td>${escapeHtml(order.id)}</td>
				<td>${escapeHtml(customer)}</td>
				<td class="amount-cell" style="color:#dc2626;">-$${delivery.toFixed(2)}</td>
				<td><span style="color:#f59e0b;font-weight:bold;">Cancelled — owes delivery</span></td>
			`;
			ordersBody.appendChild(row);
		});

		ordersBody
			.querySelectorAll('input[type="checkbox"]')
			.forEach((cb) => cb.addEventListener("change", updateSelectedTotal));

		updateSelectedTotal();
	}

	// Render Payments History table — paid (5)
	function renderPaymentsHistory(orders) {
		const paymentsBody = document.getElementById("paymentsBody");
		if (!paymentsBody) return;

		const paid = orders.filter((o) => o.s === 5);

		paymentsBody.innerHTML = "";

		if (paid.length === 0) {
			paymentsBody.innerHTML = `
				<tr>
					<td colspan="5" class="empty-msg">No paid orders for this merchant.</td>
				</tr>
			`;
			return;
		}

		let totalAmount = 0;
		paid.forEach((order) => {
			const amount = order.pr?.t || 0;
			totalAmount += amount;
			const customer = `${order.c?.f || "-"} ${order.c?.l || ""}`.trim();
			const createdDate = new Date(order.createdAt).toLocaleDateString();
			const row = document.createElement("tr");
			row.innerHTML = `
				<td>${escapeHtml(order.id)}</td>
				<td>${escapeHtml(customer)}</td>
				<td class="amount-cell">$${amount.toFixed(2)}</td>
				<td><span style="color:#10b981;font-weight:bold;">Paid</span></td>
				<td>${createdDate}</td>
			`;
			paymentsBody.appendChild(row);
		});

		const totalRow = document.createElement("tr");
		totalRow.className = "total-row";
		totalRow.innerHTML = `
			<td colspan="2" style="text-align:right;">Total Paid</td>
			<td class="amount-cell">$${totalAmount.toFixed(2)}</td>
			<td colspan="2"></td>
		`;
		paymentsBody.appendChild(totalRow);
	}

	// Fetch all orders for a merchant and populate both tables
	async function loadMerchantData(merchantName) {
		const ordersBody = document.getElementById("ordersBody");
		const paymentsBody = document.getElementById("paymentsBody");

		if (!merchantName) {
			if (ordersBody)
				ordersBody.innerHTML = `
					<tr>
						<td colspan="5" class="empty-msg">Select a merchant to view orders</td>
					</tr>
				`;
			if (paymentsBody)
				paymentsBody.innerHTML = `
					<tr>
						<td colspan="5" class="empty-msg">Select a merchant to view paid orders.</td>
					</tr>
				`;
			updateSelectedTotal();
			return;
		}

		// Keep the hidden merchantUsername in sync for the Confirm Payment form
		const merchantInput = document.getElementById("merchantUsernameInput");
		if (merchantInput) merchantInput.value = merchantName;

		if (ordersBody)
			ordersBody.innerHTML = `
				<tr><td colspan="5" class="empty-msg">Loading…</td></tr>
			`;

		try {
			const response = await fetch(
				`/api/orders/merchant/${encodeURIComponent(merchantName)}`,
				{
					credentials: "include",
				}
			);

			if (!response.ok) throw new Error(`HTTP ${response.status}`);

			const result = await response.json();
			const orders = result.data || result;

			renderMerchantOrders(orders);
			renderPaymentsHistory(orders);
		} catch (error) {
			console.error("Error loading merchant data:", error);

			if (ordersBody)
				ordersBody.innerHTML = `
					<tr><td colspan="5" class="empty-msg">Failed to load orders.</td></tr>
				`;
		}
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

		window.updateSelectedTotal = updateSelectedTotal;

		// If a merchant was preselected (e.g. after a payment submit), load it
		const preselected = window.__SELECTED_MERCHANT__;
		if (preselected && merchantSelect) {
			merchantSelect.value = preselected;
			loadMerchantData(preselected);
		}
	});
})();

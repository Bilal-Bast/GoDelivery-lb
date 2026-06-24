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
				total +=
					parseFloat(cb.closest("tr").children[3].textContent) || 0;
			});
		const el = document.getElementById("selectedTotal");
		if (el) el.textContent = `$${total.toFixed(2)}`;
	}

	// Render Driver Orders table — delivered (3) and cancelled (4)
	function renderDriverOrders(orders) {
		const ordersBody = document.getElementById("ordersBody");
		if (!ordersBody) return;

		const driverOrders = orders.filter((o) => o.s === 3 || o.s === 4);

		ordersBody.innerHTML = "";

		if (driverOrders.length === 0) {
			ordersBody.innerHTML = `
				<tr>
					<td colspan="5" class="empty-msg">No delivered or cancelled orders for this driver.</td>
				</tr>
			`;
			updateSelectedTotal();
			return;
		}

		driverOrders.forEach((order) => {
			const customer = `${order.c?.f || "-"} ${order.c?.l || ""}`.trim();
			const total = order.pr?.t || 0;
			const statusText = order.s === 3 ? "Delivered" : "Cancelled";
			const row = document.createElement("tr");
			row.innerHTML = `
				<td><input type="checkbox" name="orderIds" value="${escapeHtml(order.id)}"></td>
				<td>${escapeHtml(order.id)}</td>
				<td>${escapeHtml(customer)}</td>
				<td class="amount-cell">${total}</td>
				<td>${statusText}</td>
			`;
			ordersBody.appendChild(row);
		});

		// Wire up checkbox totals
		ordersBody
			.querySelectorAll('input[type="checkbox"]')
			.forEach((cb) => cb.addEventListener("change", updateSelectedTotal));

		updateSelectedTotal();
	}

	// Render Collections History table — collected (6)
	function renderCollectionsHistory(orders, driverName) {
		const collectionsBody = document.getElementById("collectionsBody");
		if (!collectionsBody) return;

		const collected = orders.filter((o) => o.s === 6);

		collectionsBody.innerHTML = "";

		if (collected.length === 0) {
			collectionsBody.innerHTML = `
				<tr>
					<td colspan="5" class="empty-msg">No collected orders for this driver.</td>
				</tr>
			`;
			return;
		}

		let totalAmount = 0;
		collected.forEach((order) => {
			const amount = order.pr?.t || 0;
			totalAmount += amount;
			const customer = `${order.c?.f || "-"} ${order.c?.l || ""}`.trim();
			const createdDate = new Date(order.createdAt).toLocaleDateString();
			const row = document.createElement("tr");
			row.innerHTML = `
				<td>${escapeHtml(order.id)}</td>
				<td>${escapeHtml(customer)}</td>
				<td class="amount-cell">$${amount.toFixed(2)}</td>
				<td><span style="color:#3b82f6;font-weight:bold;">Collected</span></td>
				<td>${createdDate}</td>
			`;
			collectionsBody.appendChild(row);
		});

		const totalRow = document.createElement("tr");
		totalRow.className = "total-row";
		totalRow.innerHTML = `
			<td colspan="2" style="text-align:right;">Total</td>
			<td class="amount-cell">$${totalAmount.toFixed(2)}</td>
			<td colspan="2"></td>
		`;
		collectionsBody.appendChild(totalRow);
	}

	// Fetch all orders for a driver and populate both tables
	async function loadDriverData(driverName) {
		const ordersBody = document.getElementById("ordersBody");
		const collectionsBody = document.getElementById("collectionsBody");

		if (!driverName) {
			if (ordersBody)
				ordersBody.innerHTML = `
					<tr>
						<td colspan="5" class="empty-msg">Select a driver to view orders</td>
					</tr>
				`;
			if (collectionsBody)
				collectionsBody.innerHTML = `
					<tr>
						<td colspan="5" class="empty-msg">Select a driver to view collected orders.</td>
					</tr>
				`;
			updateSelectedTotal();
			return;
		}

		// Keep the hidden driverUsername in sync for the Confirm Collection form
		const driverInput = document.getElementById("driverUsernameInput");
		if (driverInput) driverInput.value = driverName;

		if (ordersBody)
			ordersBody.innerHTML = `
				<tr><td colspan="5" class="empty-msg">Loading…</td></tr>
			`;

		try {
			const response = await fetch(
				`/api/orders/driver/${encodeURIComponent(driverName)}`,
			);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const result = await response.json();
			const orders = result.data || result;

			renderDriverOrders(orders);
			renderCollectionsHistory(orders, driverName);
		} catch (error) {
			console.error("Error loading driver data:", error);
			if (ordersBody)
				ordersBody.innerHTML = `
					<tr><td colspan="5" class="empty-msg">Failed to load orders.</td></tr>
				`;
		}
	}

	document.addEventListener("DOMContentLoaded", () => {
		const driverSelect = document.getElementById("driverSelect");
		if (driverSelect) {
			driverSelect.addEventListener("change", function () {
				loadDriverData(this.value);
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

		// If a driver was preselected (e.g. after a collection submit), load it
		const preselected = window.__SELECTED_DRIVER__;
		if (preselected && driverSelect) {
			driverSelect.value = preselected;
			loadDriverData(preselected);
		}
	});
})();

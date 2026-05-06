(() => {
	const API = "http://localhost:3000/api";

	document.addEventListener("DOMContentLoaded", () => {
		const initData = window.__INIT_DATA__ || {};

		populateMerchantSelect(initData.merchants || []);
		renderPayments(initData.payments || []);

		document.getElementById("confirmBtn")?.addEventListener("click", confirmOrders);
	});

	function populateMerchantSelect(merchants) {
		const sel = document.getElementById("merchantSelect");
		if (!sel) return;
		merchants.forEach((m) => {
			const opt = document.createElement("option");
			opt.value = m.username;
			opt.textContent = `${m.firstName || ""} ${m.lastName || ""}`.trim() || m.username;
			sel.appendChild(opt);
		});
	}

	async function loadMerchantOrders(merchantUsername) {
		const tbody = document.getElementById("ordersBody");
		if (!tbody) return;
		tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">Loading orders...</td></tr>';
		try {
			const res = await fetch(`${API}/orders/merchant/${merchantUsername}`);
			if (!res.ok) throw new Error("Failed to fetch orders");
			const orders = await res.json();
			const collected = orders.filter((o) => o.s === 6);
			if (!collected.length) {
				tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">No collected orders found for this merchant.</td></tr>';
				return;
			}
			tbody.innerHTML = "";
			collected.forEach((o) => {
				const tr = document.createElement("tr");
				tr.innerHTML = `
					<td><input type="checkbox" value="${o.id}" onchange="updateSelectedTotal()" /></td>
					<td>${o.id}</td>
					<td>${o.c?.f || "-"} ${o.c?.l || ""}</td>
					<td class="amount-cell">${o.pr?.t || 0}</td>
					<td>Collected</td>`;
				tbody.appendChild(tr);
			});
			const totalRow = document.createElement("tr");
			totalRow.className = "total-row";
			totalRow.innerHTML = `<td colspan="3" style="text-align:right;">Selected Total</td><td class="amount-cell" id="selectedTotal">$0.00</td><td></td>`;
			tbody.appendChild(totalRow);
		} catch (e) {
			tbody.innerHTML = '<tr><td colspan="5" class="empty-msg" style="color:#ef4444;">Failed to load orders.</td></tr>';
		}
	}

	document.getElementById("merchantSelect")?.addEventListener("change", (e) => {
		if (e.target.value) loadMerchantOrders(e.target.value);
	});

	async function confirmOrders() {
		const checkboxes = document.querySelectorAll('#ordersBody input[type="checkbox"]:checked');
		if (!checkboxes.length) return showToast("Select at least one order", "error");
		const btn = document.getElementById("confirmBtn");
		btn.disabled = true;
		btn.textContent = "Confirming...";
		try {
			let total = 0;
			const orderIds = [];
			checkboxes.forEach((cb) => {
				total += parseFloat(cb.closest("tr").children[3].textContent) || 0;
				orderIds.push(cb.value);
			});
			for (const orderId of orderIds) {
				await fetch(`${API}/orders/${orderId}/status`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ s: 5 }),
				});
			}
			await fetch(`${API}/payments`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					merchantUsername: document.getElementById("merchantSelect").value,
					amount: total,
					orderIds,
				}),
			});
			showToast("Payment completed successfully!", "success");
			loadMerchantOrders(document.getElementById("merchantSelect").value);
			await refreshPayments();
		} catch {
			showToast("Failed to confirm orders", "error");
		} finally {
			btn.disabled = false;
			btn.textContent = "Confirm Payment";
		}
	}

	document.getElementById("selectAllOrders")?.addEventListener("change", function () {
		document.querySelectorAll('#ordersBody input[type="checkbox"]').forEach((cb) => (cb.checked = this.checked));
		updateSelectedTotal();
	});

	async function refreshPayments() {
		try {
			const res = await fetch(`${API}/payments`);
			if (!res.ok) throw new Error();
			renderPayments(await res.json());
		} catch {
			document.getElementById("paymentsBody").innerHTML =
				'<tr><td colspan="5" class="empty-msg" style="color:#ef4444;">Failed to load payments.</td></tr>';
		}
	}

	function renderPayments(data) {
		const tbody = document.getElementById("paymentsBody");
		if (!tbody) return;
		if (!data.length) {
			tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">No payments recorded yet.</td></tr>';
			return;
		}
		let total = 0;
		tbody.innerHTML = "";
		data.forEach((p) => {
			total += p.amount;
			const tr = document.createElement("tr");
			tr.innerHTML = `
				<td>${p.number}</td>
				<td>${p.merchantName || p.merchantUsername}</td>
				<td>${p.adminUsername}</td>
				<td class="amount-cell">$${Number(p.amount).toFixed(2)}</td>
				<td>${new Date(p.createdAt).toLocaleDateString()}</td>`;
			tbody.appendChild(tr);
		});
		const totalRow = document.createElement("tr");
		totalRow.className = "total-row";
		totalRow.innerHTML = `<td colspan="2" style="text-align:right;">Total Paid</td><td class="amount-cell">$${total.toFixed(2)}</td><td colspan="2"></td>`;
		tbody.appendChild(totalRow);
	}

	function showToast(msg, type) {
		const toast = document.getElementById("toast");
		if (!toast) return;
		toast.textContent = msg;
		toast.className = `toast ${type}`;
		setTimeout(() => { toast.className = "toast"; }, 4000);
	}

	window.updateSelectedTotal = function () {
		let total = 0;
		document.querySelectorAll('#ordersBody input[type="checkbox"]:checked').forEach((cb) => {
			total += parseFloat(cb.closest("tr").children[3].textContent) || 0;
		});
		const el = document.getElementById("selectedTotal");
		if (el) el.textContent = `$${total.toFixed(2)}`;
	};
})();

(() => {
	const API = "http://localhost:3000/api";

	document.addEventListener("DOMContentLoaded", () => {
		// Auth handled server-side. Use server-rendered data.
		const initData = window.__INIT_DATA__ || {};

		populateDriverSelect(initData.drivers || []);
		renderCollections(initData.collections || []);

		document
			.getElementById("confirmBtn")
			?.addEventListener("click", confirmOrders);
	});

	function populateDriverSelect(drivers) {
		const sel = document.getElementById("driverSelect");
		if (!sel) return;
		drivers.forEach((d) => {
			const opt = document.createElement("option");
			opt.value = d.id;
			opt.textContent = d.name || d.id;
			sel.appendChild(opt);
		});
	}

	async function loadDriverOrders(driverUsername) {
		const tbody = document.getElementById("ordersBody");
		if (!tbody) return;
		tbody.innerHTML =
			'<tr><td colspan="5" class="empty-msg">Loading orders...</td></tr>';
		try {
			const res = await fetch(`${API}/orders/driver/${driverUsername}`, {
				credentials: "include",
			});
			if (!res.ok) throw new Error("Failed to fetch orders");
			const orders = await res.json();
			if (!orders.length) {
				tbody.innerHTML =
					'<tr><td colspan="5" class="empty-msg">No orders found for this driver.</td></tr>';
				return;
			}
			tbody.innerHTML = "";
			orders.forEach((o) => {
				const tr = document.createElement("tr");
				tr.innerHTML = `
					<td><input type="checkbox" value="${o.id}" onchange="updateSelectedTotal()" /></td>
					<td>${o.id}</td>
					<td>${o.c?.f || "-"} ${o.c?.l || ""}</td>
					<td class="amount-cell">${o.pr?.t || 0}</td>
					<td>${o.s === 3 ? "Delivered" : "Cancelled"}</td>`;
				tbody.appendChild(tr);
			});
			const totalRow = document.createElement("tr");
			totalRow.className = "total-row";
			totalRow.innerHTML = `<td colspan="3" style="text-align:right;">Selected Total</td><td class="amount-cell" id="selectedTotal">$0.00</td><td></td>`;
			tbody.appendChild(totalRow);
		} catch (e) {
			tbody.innerHTML =
				'<tr><td colspan="5" class="empty-msg" style="color:#ef4444;">Failed to load orders.</td></tr>';
		}
	}

	document.getElementById("driverSelect")?.addEventListener("change", (e) => {
		if (e.target.value) loadDriverOrders(e.target.value);
	});

	async function confirmOrders() {
		const checkboxes = document.querySelectorAll(
			'#ordersBody input[type="checkbox"]:checked',
		);
		if (!checkboxes.length)
			return showToast("Select at least one order", "error");
		const btn = document.getElementById("confirmBtn");
		btn.disabled = true;
		btn.textContent = "Confirming...";
		try {
			let total = 0;
			const orderIds = [];
			checkboxes.forEach((cb) => {
				const row = cb.closest("tr");
				total += parseFloat(row.children[3].textContent) || 0;
				orderIds.push(cb.value);
			});
			for (const orderId of orderIds) {
				await fetch(`${API}/orders/${orderId}/status`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({ s: 6 }),
				});
			}
			await fetch(`${API}/collections`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					driverUsername:
						document.getElementById("driverSelect").value,
					amount: total,
					orderIds,
				}),
			});
			showToast("Collection completed successfully!", "success");
			loadDriverOrders(document.getElementById("driverSelect").value);
			await refreshCollections();
		} catch {
			showToast("Failed to confirm orders", "error");
		} finally {
			btn.disabled = false;
			btn.textContent = "Confirm Collection";
		}
	}

	document
		.getElementById("selectAllOrders")
		?.addEventListener("change", function () {
			document
				.querySelectorAll('#ordersBody input[type="checkbox"]')
				.forEach((cb) => (cb.checked = this.checked));
			updateSelectedTotal();
		});

	async function refreshCollections() {
		try {
			const res = await fetch(`${API}/collections`, {
				credentials: "include",
			});
			if (!res.ok) throw new Error();
			renderCollections(await res.json());
		} catch {
			document.getElementById("collectionsBody").innerHTML =
				'<tr><td colspan="5" class="empty-msg" style="color:#ef4444;">Failed to load collections.</td></tr>';
		}
	}

	function renderCollections(data) {
		const tbody = document.getElementById("collectionsBody");
		if (!tbody) return;
		if (!data.length) {
			tbody.innerHTML =
				'<tr><td colspan="5" class="empty-msg">No collections recorded yet.</td></tr>';
			return;
		}
		let total = 0;
		tbody.innerHTML = "";
		data.forEach((c) => {
			total += c.amount;
			const tr = document.createElement("tr");
			tr.innerHTML = `
				<td>${c.number}</td>
				<td>${c.driverName || c.driverUsername}</td>
				<td>${c.adminUsername}</td>
				<td class="amount-cell">$${Number(c.amount).toFixed(2)}</td>
				<td>${new Date(c.createdAt).toLocaleDateString()}</td>`;
			tbody.appendChild(tr);
		});
		const totalRow = document.createElement("tr");
		totalRow.className = "total-row";
		totalRow.innerHTML = `<td colspan="2" style="text-align:right;">Total</td><td class="amount-cell">$${total.toFixed(2)}</td><td colspan="2"></td>`;
		tbody.appendChild(totalRow);
	}

	function showToast(msg, type) {
		const toast = document.getElementById("toast");
		if (!toast) return;
		toast.textContent = msg;
		toast.className = `toast ${type}`;
		setTimeout(() => {
			toast.className = "toast";
		}, 4000);
	}

	window.updateSelectedTotal = function () {
		let total = 0;
		document
			.querySelectorAll('#ordersBody input[type="checkbox"]:checked')
			.forEach((cb) => {
				total +=
					parseFloat(cb.closest("tr").children[3].textContent) || 0;
			});
		const el = document.getElementById("selectedTotal");
		if (el) el.textContent = `$${total.toFixed(2)}`;
	};
})();

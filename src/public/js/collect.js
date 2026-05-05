(() => {
	const API = "http://localhost:3000";
	let token = null;

	document.addEventListener("DOMContentLoaded", async () => {
		token = localStorage.getItem("token");
		if (!token) {
			window.location.href = "signin.pug";
			return;
		}

		// Verify admin role
		try {
			const me = await fetch(`${API}/me`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			const user = await me.json();
			if (user.role !== "admin") throw new Error();
			document.getElementById("profileName").textContent =
				user.username || "Admin";
		} catch {
			localStorage.clear();
			window.location.href = "signin.pug";
			return;
		}

		await loadDrivers();
		await loadCollections();

		document
			.getElementById("confirmBtn")
			.addEventListener("click", confirmOrders);
	});

	async function loadDrivers() {
		try {
			const res = await fetch(`${API}/drivers`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			const drivers = await res.json();
			const sel = document.getElementById("driverSelect");
			drivers.forEach((d) => {
				const opt = document.createElement("option");
				opt.value = d.id;
				opt.textContent = d.name || d.id;
				sel.appendChild(opt);
			});
		} catch (e) {
			console.error("Failed to load drivers", e);
		}
	}

	// Load Orders
	async function loadDriverOrders(driverUsername) {
		const tbody = document.getElementById("ordersBody");
		if (!tbody) return console.error('No tbody with id "ordersBody" found');

		// show loading
		tbody.innerHTML =
			'<tr><td colspan="5" class="empty-msg">Loading orders...</td></tr>';

		try {
			const res = await fetch(`${API}/orders/driver/${driverUsername}`, {
				headers: { Authorization: `Bearer ${token}` },
			});

			if (!res.ok) throw new Error("Failed to fetch orders");

			const orders = await res.json();

			if (!orders.length) {
				tbody.innerHTML =
					'<tr><td colspan="5" class="empty-msg">No orders found for this driver.</td></tr>';
				return;
			}

			tbody.innerHTML = "";
			let totalSelected = 0;

			orders.forEach((o) => {
				const tr = document.createElement("tr");
				tr.innerHTML = `
                    <td>
                        <input type="checkbox" value="${o.id}" onchange="updateSelectedTotal()" />
                    </td>
                    <td>${o.id}</td>
                    <td>${o.c?.f || "-"} ${o.c?.l || ""}</td>
                    <td class="amount-cell">${o.pr?.t || 0}</td>
                    <td>${o.s === 3 ? "Delivered" : "Cancelled"}</td>
                `;
				tbody.appendChild(tr);
			});

			const totalRow = document.createElement("tr");
			totalRow.className = "total-row";
			totalRow.innerHTML = `
                <td colspan="3" style="text-align:right;">Selected Total</td>
                <td class="amount-cell" id="selectedTotal">$0.00</td>
                <td></td>
            `;
			tbody.appendChild(totalRow);
		} catch (e) {
			console.error(e);
			tbody.innerHTML =
				'<tr><td colspan="5" class="empty-msg" style="color:#ef4444;">Failed to load orders.</td></tr>';
		}
	}

	document.getElementById("driverSelect").addEventListener("change", (e) => {
		const driver = e.target.value;
		if (driver) loadDriverOrders(driver);
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
				const amount = parseFloat(row.children[3].textContent) || 0;
				total += amount;
				orderIds.push(cb.value);
			});

			for (const orderId of orderIds) {
				await fetch(`${API}/orders/${orderId}/status`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify({ s: 6 }),
				});
			}

			await fetch(`${API}/collections`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					driverUsername:
						document.getElementById("driverSelect").value,
					amount: total,
					orderIds: orderIds,
				}),
			});

			showToast("Collection completed successfully!", "success");

			loadDriverOrders(document.getElementById("driverSelect").value);
			loadCollections();
		} catch (e) {
			console.error(e);
			showToast("Failed to confirm orders", "error");
		} finally {
			btn.disabled = false;
			btn.textContent = "Confirm Collection";
		}
	}

	document
		.getElementById("selectAllOrders")
		.addEventListener("change", function () {
			const checkboxes = document.querySelectorAll(
				'#ordersBody input[type="checkbox"]',
			);
			checkboxes.forEach((cb) => (cb.checked = this.checked));
			updateSelectedTotal();
		});

	async function loadCollections() {
		const tbody = document.getElementById("collectionsBody");
		tbody.innerHTML =
			'<tr><td colspan="5" class="empty-msg">Loading...</td></tr>';
		try {
			const res = await fetch(`${API}/collections`, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error("Unauthorized");
			const data = await res.json();

			if (data.length === 0) {
				tbody.innerHTML =
					'<tr><td colspan="5" class="empty-msg">No collections recorded yet.</td></tr>';
				return;
			}

			let total = 0;
			tbody.innerHTML = "";
			data.forEach((c, i) => {
				total += c.amount;
				const tr = document.createElement("tr");
				tr.innerHTML = `
                    <td>${c.number}</td>
                    <td>${c.driverName || c.driverUsername}</td>
                    <td>${c.adminUsername}</td>
                    <td class="amount-cell">$${Number(c.amount).toFixed(2)}</td>
                    <td>${new Date(c.createdAt).toLocaleDateString()}</td>
                `;
				tbody.appendChild(tr);
			});

			// Total row
			const totalRow = document.createElement("tr");
			totalRow.className = "total-row";
			totalRow.innerHTML = `<td colspan="2" style="text-align:right;">Total</td><td class="amount-cell">$${total.toFixed(2)}</td><td colspan="2"></td>`;
			tbody.appendChild(totalRow);
		} catch (e) {
			console.error(e);
			tbody.innerHTML =
				'<tr><td colspan="5" class="empty-msg" style="color:#ef4444;">Failed to load collections.</td></tr>';
		}
	}

	function showToast(msg, type) {
		const toast = document.getElementById("toast");
		toast.textContent = msg;
		toast.className = `toast ${type}`;
		setTimeout(() => {
			toast.className = "toast";
		}, 4000);
	}

	window.updateSelectedTotal = function () {
		const checkboxes = document.querySelectorAll(
			'#ordersBody input[type="checkbox"]:checked',
		);
		let total = 0;
		checkboxes.forEach((cb) => {
			const row = cb.closest("tr");
			const amount = parseFloat(row.children[3].textContent) || 0;
			total += amount;
		});
		const totalEl = document.getElementById("selectedTotal");
		if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
	};
})();

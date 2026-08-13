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

	// Render Driver Orders table — delivered (3) and cancelled (4) that are
	// still pending collection. Once a cancelled order is collected back it
	// keeps status 4 but gets collectedBack=true, so exclude those here (they
	// move to the Collections History table) — same way collected delivered
	// orders drop out once they become status 6.
	function renderDriverOrders(orders) {
		const ordersBody = document.getElementById("ordersBody");
		if (!ordersBody) return;

		const driverOrders = orders.filter(
			(o) => (o.s === 3 || o.s === 4) && !o.collectedBack,
		);

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
			const statusText =
				order.s === 3
					? "Delivered"
					: order.cancelledBy === "customer"
						? "Cancelled by Customer"
						: order.cancelledBy === "merchant"
							? "Cancelled by Merchant"
							: "Cancelled";
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

	// Render Collections History table — cash-collected (6) plus cancelled
	// orders whose goods have been returned (collectedBack). Only the cash
	// collections count toward the money total; returned cancellations carry
	// no driver cash (the delivery charge is settled on the merchant side).
	function renderCollectionsHistory(orders, driverName) {
		const collectionsBody = document.getElementById("collectionsBody");
		if (!collectionsBody) return;

		const collected = orders.filter((o) => o.s === 6);
		const returned = orders.filter((o) => o.s === 4 && o.collectedBack);
		const history = [...collected, ...returned];

		collectionsBody.innerHTML = "";

		if (history.length === 0) {
			collectionsBody.innerHTML = `
				<tr>
					<td colspan="6" class="empty-msg">No collected orders for this driver.</td>
				</tr>
			`;
			return;
		}

		let totalAmount = 0;
		history.forEach((order) => {
			const isReturned = order.s === 4;
			const amount = isReturned ? 0 : order.pr?.t || 0;
			totalAmount += amount;
			const customer = `${order.c?.f || "-"} ${order.c?.l || ""}`.trim();
			const createdDate = new Date(order.createdAt).toLocaleDateString();
			const label = isReturned
				? `<span style="color:#f59e0b;font-weight:bold;">Returned (${order.cancelledBy === "customer" ? "Customer" : "Merchant"} Cancelled)</span>`
				: `<span style="color:#3b82f6;font-weight:bold;">Collected</span>`;
			const amountText = isReturned ? "—" : `$${amount.toFixed(2)}`;
			const row = document.createElement("tr");
			row.innerHTML = `
				<td>${escapeHtml(order.id)}</td>
				<td>${escapeHtml(customer)}</td>
				<td class="amount-cell">${amountText}</td>
				<td>${label}</td>
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

	// Load collection history from localStorage
	function loadCollectionHistory() {
		const history = JSON.parse(localStorage.getItem("collectionHistory") || "[]");
		return history;
	}

	// Save collection to history
	function saveCollectionToHistory(driverName, orders, totalAmount) {
		const history = loadCollectionHistory();
		const collectionRecord = {
			id: Date.now().toString(),
			driverName,
			numberOfOrders: orders.length,
			totalAmount,
			date: new Date().toLocaleString(),
			timestamp: new Date().getTime(),
			orders: orders.map(o => ({
				id: o.id,
				customer: `${o.c?.f || "-"} ${o.c?.l || ""}`,
				amount: o.pr?.t || 0,
				merchant: o.m,
				phone: o.c?.p,
				location: o.c?.loc?.cty || ""
			}))
		};
		history.unshift(collectionRecord);
		localStorage.setItem("collectionHistory", JSON.stringify(history));
		return collectionRecord;
	}

	// Render Collection Sessions History table
	function renderCollectionSessions() {
		const sessionsBody = document.getElementById("sessionsBody");
		if (!sessionsBody) return;

		const history = loadCollectionHistory();
		sessionsBody.innerHTML = "";

		if (history.length === 0) {
			sessionsBody.innerHTML = `
				<tr>
					<td colspan="6" class="empty-msg">No collection sessions recorded yet.</td>
				</tr>
			`;
			return;
		}

		history.forEach((session) => {
			const row = document.createElement("tr");
			row.innerHTML = `
				<td>${escapeHtml(session.driverName)}</td>
				<td style="text-align:center; font-weight:bold;">${session.numberOfOrders}</td>
				<td class="amount-cell">$${session.totalAmount.toFixed(2)}</td>
				<td>${new Date(session.timestamp).toLocaleDateString()}</td>
				<td>${new Date(session.timestamp).toLocaleTimeString()}</td>
				<td>
					<button class="print-session-btn" data-session-id="${session.id}" title="Print this collection session">
						<i class='bx bx-printer'></i> Print
					</button>
				</td>
			`;
			sessionsBody.appendChild(row);
		});

		// Wire up print buttons
		document.querySelectorAll(".print-session-btn").forEach(btn => {
			btn.addEventListener("click", (e) => {
				e.preventDefault();
				const sessionId = btn.dataset.sessionId;
				printCollectionSession(sessionId);
			});
		});
	}

	// Print individual collection session
	function printCollectionSession(sessionId) {
		const history = loadCollectionHistory();
		const session = history.find(s => s.id === sessionId);

		if (!session) {
			alert("Session not found");
			return;
		}

		const rows = session.orders
			.map((order) => {
				return `
					<tr>
						<td>${escapeHtml(order.id)}</td>
						<td>${escapeHtml(order.customer)}</td>
						<td>${escapeHtml(order.merchant || "-")}</td>
						<td>${escapeHtml(order.phone || "-")}</td>
						<td>${escapeHtml(order.location || "-")}</td>
						<td>$${order.amount.toFixed(2)}</td>
					</tr>
				`;
			})
			.join("");

		const printWindow = window.open("", "", "width=1200,height=800");
		if (!printWindow) {
			alert("Popup blocked. Please allow popups for this site.");
			return;
		}

		printWindow.document.write(`
			<html>
			<head>
				<title>Collection Session Report</title>
				<style>
					body { 
						font-family: Arial, sans-serif; 
						padding: 20px; 
						color: #1e293b;
					}
					.header {
						display: flex;
						justify-content: space-between;
						align-items: flex-start;
						margin-bottom: 20px;
						border-bottom: 2px solid #3b82f6;
						padding-bottom: 15px;
					}
					.header .left { text-align: left; }
					.header .left h2 { margin: 0; font-size: 20px; }
					.header .left p { margin: 5px 0; color: #64748b; }
					.header .right img { width: 80px; height: auto; }
					table { 
						width: 100%; 
						border-collapse: collapse; 
						margin-top: 20px;
					}
					th { 
						background: #f8fafc; 
						color: #64748b;
						font-size: 12px;
						text-transform: uppercase;
						font-weight: 700;
						padding: 10px 12px; 
						text-align: left;
						border-bottom: 2px solid #e2e8f0;
					}
					td { 
						padding: 10px 12px; 
						border-bottom: 1px solid #e2e8f0;
						font-size: 13px;
					}
					tr:hover td {
						background: #f8fafc;
					}
					.amount-col {
						text-align: right;
						font-weight: 700;
						color: #10b981;
					}
					.summary {
						margin-top: 20px;
						padding: 15px;
						background: #f0fdf4;
						border-left: 4px solid #10b981;
						border-radius: 4px;
					}
					.summary p {
						margin: 5px 0;
						font-weight: 600;
						color: #166534;
					}
					.print-time {
						text-align: right;
						font-size: 11px;
						color: #94a3b8;
						margin-top: 20px;
					}
					@media print {
						body { padding: 0; }
						.print-time { display: none; }
					}
				</style>
			</head>
			<body>
				<div class="header">
					<div class="left">
						<h2>Collection Session Report</h2>
						<p><strong>Driver:</strong> ${escapeHtml(session.driverName)}</p>
						<p><strong>Date:</strong> ${new Date(session.timestamp).toLocaleDateString()}</p>
						<p><strong>Time:</strong> ${new Date(session.timestamp).toLocaleTimeString()}</p>
					</div>
					<div class="right">
						<img src="/assets/logogo-removebg-preview.png" alt="Logo">
					</div>
				</div>

				<table>
					<thead>
						<tr>
							<th>Order ID</th>
							<th>Customer</th>
							<th>Merchant</th>
							<th>Phone</th>
							<th>Location</th>
							<th>Amount</th>
						</tr>
					</thead>
					<tbody>
						${rows}
					</tbody>
				</table>

				<div class="summary">
					<p>📊 Total Orders: ${session.numberOfOrders}</p>
					<p>💰 Total Collected: $${session.totalAmount.toFixed(2)}</p>
				</div>

				<div class="print-time">
					Printed: ${new Date().toLocaleString()}
				</div>
			</body>
			</html>
		`);

		printWindow.document.close();

		setTimeout(() => {
			printWindow.print();
		}, 500);
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
						<td colspan="6" class="empty-msg">Select a driver to view collected orders.</td>
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

	// Global function to save collection on form submit
	window.saveCollectionSession = function(driverName, selectedOrderIds, totalAmount) {
		if (!driverName || selectedOrderIds.length === 0) return;

		// Create order objects from the selected IDs
		const allOrdersData = [];
		document.querySelectorAll('#ordersBody tr').forEach(row => {
			const checkbox = row.querySelector('input[type="checkbox"]');
			if (checkbox && checkbox.checked) {
				allOrdersData.push({
					id: checkbox.value,
					c: {
						f: row.cells[2].textContent.split(' ')[0] || "",
						l: row.cells[2].textContent.split(' ')[1] || ""
					},
					pr: { t: parseFloat(row.cells[3].textContent) || 0 },
					m: "Unknown"
				});
			}
		});

		saveCollectionToHistory(driverName, allOrdersData, totalAmount);
		renderCollectionSessions();
	};

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

		// Hook into the collection form submission
		const collectForm = document.getElementById("collectForm");
		if (collectForm) {
			collectForm.addEventListener("submit", function(e) {
				const selectedIds = Array.from(
					document.querySelectorAll('#ordersBody input[type="checkbox"]:checked')
				).map(cb => cb.value);

				if (selectedIds.length > 0) {
					const driverName = document.getElementById("driverSelect").value;
					let totalAmount = 0;
					document.querySelectorAll('#ordersBody input[type="checkbox"]:checked').forEach(cb => {
						totalAmount += parseFloat(cb.closest("tr").children[3].textContent) || 0;
					});
					window.saveCollectionSession(driverName, selectedIds, totalAmount);
				}
			});
		}

		window.updateSelectedTotal = updateSelectedTotal;

		// Render collection sessions on page load
		renderCollectionSessions();

		// If a driver was preselected (e.g. after a collection submit), load it
		const preselected = window.__SELECTED_DRIVER__;
		if (preselected && driverSelect) {
			driverSelect.value = preselected;
			loadDriverData(preselected);
		}
	});

	// Expose functions globally
	window.printCollectionSession = printCollectionSession;
})();
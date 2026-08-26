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

	// Cash owed by the driver for one order at collection time — the raw
	// amount, before the driver's fee. The driver's fee is deducted exactly
	// once, on the backend, across every order that has revenue here (see
	// collectionController.js) — it is NOT subtracted again at the row level,
	// or it gets double-counted downstream in the net/profit figures.
	// - Delivered: the full total (driver collected this from the customer).
	// - Cancelled by the customer: the delivery charge (the driver still made
	//   the trip, so this is what's owed for it).
	// - Cancelled by the merchant: no trip value at all — nothing to collect.
	function getCollectibleAmount(order) {
		if (order.s === 3) return order.pr?.t || 0;
		if (order.s === 4) {
			if (order.cancelledBy === "merchant") return 0;
			return order.pr?.d || 0;
		}
		return 0;
	}

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
			const amount = getCollectibleAmount(order);
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
				<td class="amount-cell">${amount}</td>
				<td>${statusText}</td>
			`;
			ordersBody.appendChild(row);
		});

		ordersBody
			.querySelectorAll('input[type="checkbox"]')
			.forEach((cb) => cb.addEventListener("change", updateSelectedTotal));

		updateSelectedTotal();
	}

	function renderCollectionsHistory(orders) {
		const collectionsBody = document.getElementById("collectionsBody");
		if (!collectionsBody) return;

		// Cancelled orders move to COLLECTED (s===6) same as delivered ones once
		// they've been through this step — cancelledBy still tells us which.
		const history = orders.filter((o) => o.s === 6);

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
			const amount = getCollectibleAmount(order);
			totalAmount += amount;
			const customer = `${order.c?.f || "-"} ${order.c?.l || ""}`.trim();
			const createdDate = new Date(order.createdAt).toLocaleDateString();
			const label =
				order.cancelledBy === "customer"
					? `<span style="color:#f59e0b;font-weight:bold;">Cancelled by Customer</span>`
					: order.cancelledBy === "merchant"
						? `<span style="color:#f59e0b;font-weight:bold;">Cancelled by Merchant</span>`
						: `<span style="color:#3b82f6;font-weight:bold;">Collected</span>`;
			const amountText = `$${amount.toFixed(2)}`;
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

	// ✅ Load collection sessions from backend
	async function loadCollectionSessions() {
		const sessionsBody = document.getElementById("sessionsBody");
		if (!sessionsBody) return;

		try {
			const response = await fetch("/api/collections?limit=50");
			if (!response.ok) throw new Error("Failed to fetch collections");

			const result = await response.json();
			const sessions = result.data || [];

			sessionsBody.innerHTML = "";

			if (sessions.length === 0) {
				sessionsBody.innerHTML = `
					<tr>
						<td colspan="9" class="empty-msg">No collection sessions recorded yet.</td>
					</tr>
				`;
				return;
			}

			sessions.forEach((session) => {
				const driverName = `${session.driver.firstName} ${session.driver.lastName}`.trim() || session.driver.username;
				const deliveryFee = Number(session.deliveryFee || 0);
				const netReceived = session.amount - deliveryFee;

				const row = document.createElement("tr");
				row.innerHTML = `
					<td>#${session.number}</td>
					<td>${escapeHtml(driverName)}</td>
					<td style="text-align:center; font-weight:bold;">${session.orders.length}</td>
					<td class="amount-cell">$${session.amount.toFixed(2)}</td>
					<td class="amount-cell">$${deliveryFee.toFixed(2)}</td>
					<td class="amount-cell" style="font-weight:bold;">$${netReceived.toFixed(2)}</td>
					<td>${new Date(session.createdAt).toLocaleDateString()}</td>
					<td>${new Date(session.createdAt).toLocaleTimeString()}</td>
					<td>
						<div class="action-buttons">
							<button class="print-session-btn" data-session-id="${session.id}" title="Download PDF">
								<i class='bx bx-printer'></i>
							</button>
							<button class="view-session-btn" data-session-id="${session.id}" title="View details">
								<i class='bx bx-show'></i>
							</button>
						</div>
					</td>
				`;
				sessionsBody.appendChild(row);
			});

			// Wire up action buttons
			document.querySelectorAll(".print-session-btn").forEach(btn => {
				btn.addEventListener("click", async (e) => {
					e.preventDefault();
					const sessionId = btn.dataset.sessionId;
					await downloadCollectionPDF(sessionId);
				});
			});

			document.querySelectorAll(".view-session-btn").forEach(btn => {
				btn.addEventListener("click", async (e) => {
					e.preventDefault();
					const sessionId = btn.dataset.sessionId;
					await viewCollectionDetails(sessionId);
				});
			});
		} catch (error) {
			console.error("Error loading collections:", error);
			sessionsBody.innerHTML = `
				<tr>
					<td colspan="9" class="empty-msg">Failed to load collection sessions.</td>
				</tr>
			`;
		}
	}

	// ✅ Download PDF from backend
	async function downloadCollectionPDF(sessionId) {
		try {
			const response = await fetch(`/api/collections/${sessionId}/pdf`);
			if (!response.ok) throw new Error("Failed to download PDF");

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = getFilenameFromResponse(response, "collection.pdf");
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Error downloading PDF:", error);
			alert("Failed to download PDF");
		}
	}

	// Server sets the real filename via Content-Disposition — use it instead
	// of a hardcoded name so downloads match what the backend generated.
	function getFilenameFromResponse(response, fallback) {
		const header = response.headers.get("Content-Disposition") || "";
		const match = header.match(/filename="([^"]+)"/);
		return match ? match[1] : fallback;
	}

	// ✅ View collection details in modal
	async function viewCollectionDetails(sessionId) {
		try {
			const response = await fetch(`/api/collections/${sessionId}`);
			if (!response.ok) throw new Error("Failed to fetch collection");

			const result = await response.json();
			const session = result.data;

			const driverName = `${session.driver.firstName} ${session.driver.lastName}`.trim() || session.driver.username;
			const adminName = `${session.admin.firstName} ${session.admin.lastName}`.trim() || session.admin.username;
			const deliveryFee = Number(session.deliveryFee || 0);
			const netReceived = session.amount - deliveryFee;

			// Create modal HTML
			const modal = document.createElement("div");
			modal.className = "collection-modal";
			modal.innerHTML = `
				<div class="modal-content">
					<div class="modal-header">
						<h2>Collection #${session.number}</h2>
						<button class="modal-close">&times;</button>
					</div>
					<div class="modal-body">
						<div class="detail-row">
							<span class="label">Driver:</span>
							<span>${escapeHtml(driverName)}</span>
						</div>
						${session.driver.deliveryFee != null ? `
						<div class="detail-row">
							<span class="label">Delivery Fee / Order:</span>
							<span>$${Number(session.driver.deliveryFee).toFixed(2)}</span>
						</div>` : ""}
						<div class="detail-row">
							<span class="label">Date:</span>
							<span>${new Date(session.createdAt).toLocaleString()}</span>
						</div>
						<div class="detail-row">
							<span class="label"># Orders:</span>
							<span>${session.orders.length}</span>
						</div>
						<div class="detail-row">
							<span class="label">Total Collected:</span>
							<span class="amount">$${session.amount.toFixed(2)}</span>
						</div>
						<div class="detail-row">
							<span class="label">Driver Delivery Fee:</span>
							<span>-$${deliveryFee.toFixed(2)}</span>
						</div>
						<div class="detail-row">
							<span class="label">Net Received:</span>
							<span class="amount">$${netReceived.toFixed(2)}</span>
						</div>
						<div class="detail-row">
							<span class="label">Recorded by:</span>
							<span>${escapeHtml(adminName)}</span>
						</div>
						<div class="orders-list">
							<h3>Orders</h3>
							<table class="orders-table">
								<thead>
									<tr>
										<th>Order ID</th>
										<th>Customer</th>
										<th>Amount</th>
										<th>Status</th>
									</tr>
								</thead>
								<tbody>
									${session.orders.map(co => {
										const order = co.order;
										const customer = `${order.customerFirstName} ${order.customerLastName || ""}`.trim();
										return `
											<tr>
												<td>${escapeHtml(order.id)}</td>
												<td>${escapeHtml(customer)}</td>
												<td>$${order.total.toFixed(2)}</td>
												<td>${escapeHtml(order.status)}</td>
											</tr>
										`;
									}).join("")}
								</tbody>
							</table>
						</div>
					</div>
					<div class="modal-footer">
						<button class="btn-close">Close</button>
						<button class="btn-download" data-session-id="${session.id}">Download PDF</button>
						<button class="btn-print" data-session-id="${session.id}">Print</button>
					</div>
				</div>
			`;

			// Add modal styles if not already added
			if (!document.getElementById("collection-modal-styles")) {
				const style = document.createElement("style");
				style.id = "collection-modal-styles";
				style.innerHTML = `
					.collection-modal {
						position: fixed;
						top: 0;
						left: 0;
						right: 0;
						bottom: 0;
						background: rgba(0, 0, 0, 0.5);
						display: flex;
						align-items: center;
						justify-content: center;
						z-index: 2000;
					}
					.modal-content {
						background: white;
						border-radius: 12px;
						max-width: 600px;
						width: 90%;
						max-height: 80vh;
						overflow-y: auto;
						box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
					}
					.modal-header {
						display: flex;
						justify-content: space-between;
						align-items: center;
						padding: 20px;
						border-bottom: 1px solid #e2e8f0;
					}
					.modal-header h2 {
						margin: 0;
						font-size: 18px;
					}
					.modal-close {
						background: none;
						border: none;
						font-size: 24px;
						cursor: pointer;
						color: #64748b;
					}
					.modal-body {
						padding: 20px;
					}
					.detail-row {
						display: flex;
						justify-content: space-between;
						padding: 10px 0;
						border-bottom: 1px solid #f1f5f9;
					}
					.detail-row .label {
						font-weight: 600;
						color: #64748b;
					}
					.detail-row .amount {
						color: #10b981;
						font-weight: 700;
					}
					.orders-list {
						margin-top: 20px;
					}
					.orders-list h3 {
						font-size: 14px;
						margin-bottom: 10px;
					}
					.orders-table {
						width: 100%;
						font-size: 13px;
						border-collapse: collapse;
					}
					.orders-table th {
						background: #f8fafc;
						padding: 8px;
						text-align: left;
						border-bottom: 1px solid #e2e8f0;
					}
					.orders-table td {
						padding: 8px;
						border-bottom: 1px solid #f1f5f9;
					}
					.modal-footer {
						display: flex;
						justify-content: flex-end;
						gap: 10px;
						padding: 20px;
						border-top: 1px solid #e2e8f0;
					}
					.btn-close, .btn-download, .btn-print {
						padding: 8px 16px;
						border-radius: 6px;
						border: none;
						cursor: pointer;
						font-weight: 600;
						font-size: 13px;
					}
					.btn-close {
						background: #f1f5f9;
						color: #64748b;
					}
					.btn-download, .btn-print {
						background: #3b82f6;
						color: white;
					}
					.btn-download:hover, .btn-print:hover {
						background: #2563eb;
					}
					.action-buttons {
						display: flex;
						gap: 5px;
					}
					.print-session-btn, .view-session-btn {
						background: #10b981;
						color: white;
						border: none;
						border-radius: 6px;
						padding: 6px 10px;
						font-size: 12px;
						cursor: pointer;
						display: inline-flex;
						align-items: center;
						gap: 4px;
						font-weight: 600;
						transition: background 0.2s;
					}
					.print-session-btn:hover, .view-session-btn:hover {
						background: #059669;
					}
				`;
				document.head.appendChild(style);
			}

			document.body.appendChild(modal);

			// Close handlers
			const closeBtn = modal.querySelector(".modal-close");
			const closeBtnFooter = modal.querySelector(".btn-close");
			const downloadBtn = modal.querySelector(".btn-download");
			const printBtn = modal.querySelector(".btn-print");

			closeBtn.addEventListener("click", () => modal.remove());
			closeBtnFooter.addEventListener("click", () => modal.remove());
			downloadBtn.addEventListener("click", async (e) => {
				await downloadCollectionPDF(e.target.dataset.sessionId);
			});
			printBtn.addEventListener("click", async (e) => {
				await printCollectionSession(e.target.dataset.sessionId);
			});

			modal.addEventListener("click", (e) => {
				if (e.target === modal) modal.remove();
			});
		} catch (error) {
			console.error("Error viewing collection:", error);
			alert("Failed to load collection details");
		}
	}

	// ✅ Print collection (opens print dialog with HTML)
	async function printCollectionSession(sessionId) {
		try {
			const response = await fetch(`/api/collections/${sessionId}`);
			if (!response.ok) throw new Error("Failed to fetch collection");

			const result = await response.json();
			const session = result.data;

			const driverName = `${session.driver.firstName} ${session.driver.lastName}`.trim() || session.driver.username;
			const adminName = `${session.admin.firstName} ${session.admin.lastName}`.trim() || session.admin.username;

			const rows = session.orders.map((collOrder) => {
				const order = collOrder.order;
				const customerName = `${order.customerFirstName} ${order.customerLastName || ""}`.trim();
				return `
					<tr>
						<td>${escapeHtml(order.id)}</td>
						<td>${escapeHtml(customerName)}</td>
						<td>${escapeHtml(order.merchant?.username || "-")}</td>
						<td>${escapeHtml(order.customerPhone || "-")}</td>
						<td>$${order.total.toFixed(2)}</td>
					</tr>
				`;
			}).join("");

			const printWindow = window.open("", "", "width=1200,height=800");
			if (!printWindow) {
				alert("Popup blocked. Please allow popups for this site.");
				return;
			}

			printWindow.document.write(`
				<!DOCTYPE html>
				<html>
				<head>
					<title>Collection Report #${session.number}</title>
					<style>
						* {
							margin: 0;
							padding: 0;
							box-sizing: border-box;
						}
						body {
							font-family: Arial, sans-serif;
							padding: 20px;
							color: #1e293b;
						}
						.header {
							display: flex;
							justify-content: space-between;
							align-items: flex-start;
							margin-bottom: 30px;
							border-bottom: 2px solid #3b82f6;
							padding-bottom: 15px;
						}
						.header .left h1 {
							font-size: 24px;
							margin-bottom: 10px;
						}
						.header .left p {
							margin: 5px 0;
							font-size: 14px;
							color: #64748b;
						}
						.header .right {
							text-align: right;
						}
						.header .right img {
							max-width: 100px;
							height: auto;
						}
						.info-section {
							display: grid;
							grid-template-columns: 1fr 1fr;
							gap: 20px;
							margin-bottom: 30px;
							background: #f8fafc;
							padding: 15px;
							border-radius: 8px;
						}
						.info-item {
							display: flex;
							justify-content: space-between;
						}
						.info-label {
							font-weight: 600;
							color: #64748b;
						}
						.info-value {
							color: #1e293b;
						}
						table {
							width: 100%;
							border-collapse: collapse;
							margin-bottom: 20px;
						}
						th {
							background: #f8fafc;
							color: #64748b;
							font-size: 12px;
							text-transform: uppercase;
							font-weight: 700;
							padding: 12px;
							text-align: left;
							border-bottom: 2px solid #e2e8f0;
						}
						td {
							padding: 12px;
							border-bottom: 1px solid #e2e8f0;
							font-size: 13px;
						}
						tbody tr:hover {
							background: #f8fafc;
						}
						.summary {
							background: #f0fdf4;
							border-left: 4px solid #10b981;
							padding: 15px;
							margin-top: 20px;
							border-radius: 4px;
						}
						.summary-row {
							display: flex;
							justify-content: space-between;
							padding: 8px 0;
							font-weight: 600;
							color: #166534;
						}
						.footer {
							text-align: center;
							margin-top: 30px;
							padding-top: 15px;
							border-top: 1px solid #e2e8f0;
							font-size: 11px;
							color: #94a3b8;
						}
						@media print {
							body {
								padding: 0;
							}
							.footer {
								display: none;
							}
						}
					</style>
				</head>
				<body>
					<div class="header">
						<div class="left">
							<h1>Collection Report</h1>
							<p><strong>Collection #${session.number}</strong></p>
						</div>
						<div class="right">
							<img src="/assets/logogo-removebg-preview.png" alt="Logo">
						</div>
					</div>

					<div class="info-section">
						<div class="info-item">
							<span class="info-label">Driver:</span>
							<span class="info-value">${escapeHtml(driverName)}</span>
						</div>
						${session.driver.deliveryFee != null ? `
						<div class="info-item">
							<span class="info-label">Delivery Fee / Order:</span>
							<span class="info-value">$${Number(session.driver.deliveryFee).toFixed(2)}</span>
						</div>` : ""}
						<div class="info-item">
							<span class="info-label">Recorded by:</span>
							<span class="info-value">${escapeHtml(adminName)}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Date:</span>
							<span class="info-value">${new Date(session.createdAt).toLocaleString()}</span>
						</div>
						<div class="info-item">
							<span class="info-label"># Orders:</span>
							<span class="info-value">${session.orders.length}</span>
						</div>
					</div>

					<table>
						<thead>
							<tr>
								<th>Order ID</th>
								<th>Customer</th>
								<th>Merchant</th>
								<th>Phone</th>
								<th>Amount</th>
							</tr>
						</thead>
						<tbody>
							${rows}
						</tbody>
					</table>

					<div class="summary">
						<div class="summary-row">
							<span>Total Orders:</span>
							<span>${session.orders.length}</span>
						</div>
						<div class="summary-row">
							<span>Total Collected:</span>
							<span>$${session.amount.toFixed(2)}</span>
						</div>
						<div class="summary-row">
							<span>Driver Delivery Fee:</span>
							<span>-$${Number(session.deliveryFee || 0).toFixed(2)}</span>
						</div>
						<div class="summary-row">
							<span>Net Received:</span>
							<span>$${(session.amount - Number(session.deliveryFee || 0)).toFixed(2)}</span>
						</div>
					</div>

				</body>
				</html>
			`);

			printWindow.document.close();

			setTimeout(() => {
				printWindow.print();
			}, 500);
		} catch (error) {
			console.error("Error printing collection:", error);
			alert("Failed to print collection");
		}
	}

	// ✅ Save to backend on form submit
	async function saveCollectionToBackend(driverUsername, orderIds, totalAmount) {
		try {
			const response = await fetch("/api/collections", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					driverUsername,
					orderIds,
					totalAmount,
					notes: "",
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to save collection");
			}

			const result = await response.json();
			console.log("Collection saved:", result);
			loadCollectionSessions();
			return result.data;
		} catch (error) {
			console.error("Error saving collection:", error);
			throw error;
		}
	}

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
			renderCollectionsHistory(orders);
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

		// ✅ Hook into form submission
		const collectForm = document.getElementById("collectForm");
		if (collectForm) {
			collectForm.addEventListener("submit", async (e) => {
				e.preventDefault();

				const selectedIds = Array.from(
					document.querySelectorAll('#ordersBody input[type="checkbox"]:checked')
				).map(cb => cb.value);

				if (selectedIds.length === 0) {
					alert("Please select at least one order");
					return;
				}

				const driverUsername = document.getElementById("driverSelect").value;
				let totalAmount = 0;
				document.querySelectorAll('#ordersBody input[type="checkbox"]:checked').forEach(cb => {
					totalAmount += parseFloat(cb.closest("tr").children[3].textContent) || 0;
				});

				try {
					await saveCollectionToBackend(driverUsername, selectedIds, totalAmount);
					alert("Collection recorded successfully!");

					collectForm.reset();
					document.getElementById("selectAllOrders").checked = false;
					updateSelectedTotal();
					loadDriverData("");
				} catch (error) {
					alert(`Error: ${error.message}`);
				}
			});
		}

		window.updateSelectedTotal = updateSelectedTotal;

		// Load collection sessions
		loadCollectionSessions();

		const preselected = window.__SELECTED_DRIVER__;
		if (preselected && driverSelect) {
			driverSelect.value = preselected;
			loadDriverData(preselected);
		}
	});

	window.loadCollectionSessions = loadCollectionSessions;
	window.downloadCollectionPDF = downloadCollectionPDF;
	window.viewCollectionDetails = viewCollectionDetails;
	window.printCollectionSession = printCollectionSession;
})();
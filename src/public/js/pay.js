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
 
	// What the admin owes the merchant for one order: total minus the delivery
	// charge. Cancelled orders never reach this page — they're handed back on
	// the Return page instead.
	function getPayout(order) {
		return (order.pr?.t || 0) - (order.pr?.d || 0);
	}

	function getSettleLabel() {
		return "Collected";
	}

	function renderMerchantOrders(orders) {
		const ordersBody = document.getElementById("ordersBody");
		if (!ordersBody) return;

		// Collected, non-cancelled orders only. Cancelled ones are settled on
		// the Return page — listing them here too would give two places to
		// close out the same order.
		const rows = orders.filter((o) => o.s === 6 && !o.cancelledBy);

		ordersBody.innerHTML = "";

		if (rows.length === 0) {
			ordersBody.innerHTML = `
				<tr>
					<td colspan="5" class="empty-msg">No orders to settle for this merchant.</td>
				</tr>
			`;
			updateSelectedTotal();
			return;
		}

		rows.forEach((order) => {
			const customer = `${order.c?.f || "-"} ${order.c?.l || ""}`.trim();
			const payout = getPayout(order);
			const color = payout < 0 ? "color:#dc2626;" : "";
			const row = document.createElement("tr");
			row.innerHTML = `
				<td><input type="checkbox" name="orderIds" value="${escapeHtml(order.id)}" data-amount="${payout}"></td>
				<td>${escapeHtml(order.id)}</td>
				<td>${escapeHtml(customer)}</td>
				<td class="amount-cell" style="${color}">${payout < 0 ? "-" : ""}$${Math.abs(payout).toFixed(2)}</td>
				<td>${getSettleLabel(order)}</td>
			`;
			ordersBody.appendChild(row);
		});

		ordersBody
			.querySelectorAll('input[type="checkbox"]')
			.forEach((cb) => cb.addEventListener("change", updateSelectedTotal));

		updateSelectedTotal();
	}

	// ✅ Load payment sessions from backend
	async function loadPaymentSessions() {
		const sessionsBody = document.getElementById("sessionsBody");
		if (!sessionsBody) return;
 
		try {
			const response = await fetch("/api/payments?limit=50");
			if (!response.ok) throw new Error("Failed to fetch payments");
 
			const result = await response.json();
			const sessions = result.data || [];
 
			sessionsBody.innerHTML = "";
 
			if (sessions.length === 0) {
				sessionsBody.innerHTML = `
					<tr>
						<td colspan="7" class="empty-msg">No payment sessions recorded yet.</td>
					</tr>
				`;
				return;
			}
 
			sessions.forEach((session) => {
				const merchantName = `${session.merchant.firstName} ${session.merchant.lastName}`.trim() || session.merchant.username;
				
				const row = document.createElement("tr");
				row.innerHTML = `
					<td>#${session.number}</td>
					<td>${escapeHtml(merchantName)}</td>
					<td style="text-align:center; font-weight:bold;">${session.orders.length}</td>
					<td class="amount-cell">${session.amount >= 0 ? "$" : "-$"}${Math.abs(session.amount).toFixed(2)}</td>
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
					await downloadPaymentPDF(sessionId);
				});
			});
 
			document.querySelectorAll(".view-session-btn").forEach(btn => {
				btn.addEventListener("click", async (e) => {
					e.preventDefault();
					const sessionId = btn.dataset.sessionId;
					await viewPaymentDetails(sessionId);
				});
			});
		} catch (error) {
			console.error("Error loading payments:", error);
			sessionsBody.innerHTML = `
				<tr>
					<td colspan="7" class="empty-msg">Failed to load payment sessions.</td>
				</tr>
			`;
		}
	}
 
	// ✅ Download PDF from backend
	async function downloadPaymentPDF(sessionId) {
		try {
			const response = await fetch(`/api/payments/${sessionId}/pdf`);
			if (!response.ok) throw new Error("Failed to download PDF");

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = getFilenameFromResponse(response, "payment.pdf");
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Error downloading PDF:", error);
			await window.Dialog.alert("Failed to download PDF", { title: "Error", danger: true });
		}
	}

	// Server sets the real filename via Content-Disposition — use it instead
	// of a hardcoded name so downloads match what the backend generated.
	function getFilenameFromResponse(response, fallback) {
		const header = response.headers.get("Content-Disposition") || "";
		const match = header.match(/filename="([^"]+)"/);
		return match ? match[1] : fallback;
	}

	// ✅ View payment details in modal
	async function viewPaymentDetails(sessionId) {
		try {
			const response = await fetch(`/api/payments/${sessionId}`);
			if (!response.ok) throw new Error("Failed to fetch payment");
 
			const result = await response.json();
			const session = result.data;
 
			const merchantName = `${session.merchant.firstName} ${session.merchant.lastName}`.trim() || session.merchant.username;
			const adminName = `${session.admin.firstName} ${session.admin.lastName}`.trim() || session.admin.username;
 
			// Create modal HTML
			const modal = document.createElement("div");
			modal.className = "payment-modal";
			modal.innerHTML = `
				<div class="modal-content">
					<div class="modal-header">
						<h2>Payment #${session.number}</h2>
						<button class="modal-close">&times;</button>
					</div>
					<div class="modal-body">
						<div class="detail-row">
							<span class="label">Merchant:</span>
							<span>${escapeHtml(merchantName)}</span>
						</div>
						<div class="detail-row">
							<span class="label">Date:</span>
							<span>${new Date(session.createdAt).toLocaleString()}</span>
						</div>
						<div class="detail-row">
							<span class="label"># Orders:</span>
							<span>${session.orders.length}</span>
						</div>
						<div class="detail-row">
							<span class="label">Net Amount:</span>
							<span class="amount">${session.amount >= 0 ? "$" : "-$"}${Math.abs(session.amount).toFixed(2)}</span>
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
										<th>Total</th>
										<th>Delivery</th>
										<th>Payout</th>
									</tr>
								</thead>
								<tbody>
									${session.orders.map(po => {
										const order = po.order;
										const customer = `${order.customerFirstName} ${order.customerLastName || ""}`.trim();
										const payout = (order.total || 0) - (order.deliveryCharge || 0);
										return `
											<tr>
												<td>${escapeHtml(order.id)}</td>
												<td>${escapeHtml(customer)}</td>
												<td>$${(order.total || 0).toFixed(2)}</td>
												<td>$${(order.deliveryCharge || 0).toFixed(2)}</td>
												<td>$${payout.toFixed(2)}</td>
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
			if (!document.getElementById("payment-modal-styles")) {
				const style = document.createElement("style");
				style.id = "payment-modal-styles";
				style.innerHTML = `
					.payment-modal {
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
						color: #3b82f6;
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
						background: #3b82f6;
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
						background: #2563eb;
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
				await downloadPaymentPDF(e.target.dataset.sessionId);
			});
			printBtn.addEventListener("click", async (e) => {
				await printPaymentSession(e.target.dataset.sessionId);
			});
 
			modal.addEventListener("click", (e) => {
				if (e.target === modal) modal.remove();
			});
		} catch (error) {
			console.error("Error viewing payment:", error);
			await window.Dialog.alert("Failed to load payment details", { title: "Error", danger: true });
		}
	}
 
	// ✅ Print payment (opens print dialog with HTML)
	async function printPaymentSession(sessionId) {
		try {
			const response = await fetch(`/api/payments/${sessionId}`);
			if (!response.ok) throw new Error("Failed to fetch payment");
 
			const result = await response.json();
			const session = result.data;
 
			const merchantName = `${session.merchant.firstName} ${session.merchant.lastName}`.trim() || session.merchant.username;
			const adminName = `${session.admin.firstName} ${session.admin.lastName}`.trim() || session.admin.username;
 
			const rows = session.orders.map((payOrder) => {
				const order = payOrder.order;
				const customerName = `${order.customerFirstName} ${order.customerLastName || ""}`.trim();
				const payout = (order.total || 0) - (order.deliveryCharge || 0);
				return `
					<tr>
						<td>${escapeHtml(order.id)}</td>
						<td>${escapeHtml(customerName)}</td>
						<td>$${(order.total || 0).toFixed(2)}</td>
						<td>$${(order.deliveryCharge || 0).toFixed(2)}</td>
						<td>$${payout.toFixed(2)}</td>
					</tr>
				`;
			}).join("");
 
			const printWindow = window.open("", "", "width=1200,height=800");
			if (!printWindow) {
				await window.Dialog.alert("Popup blocked. Please allow popups for this site.", { title: "Popup Blocked", danger: true });
				return;
			}
 
			printWindow.document.write(`
				<!DOCTYPE html>
				<html>
				<head>
					<title>Payment Report #${session.number}</title>
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
							background: #eff6ff;
							border-left: 4px solid #3b82f6;
							padding: 15px;
							margin-top: 20px;
							border-radius: 4px;
						}
						.summary-row {
							display: flex;
							justify-content: space-between;
							padding: 8px 0;
							font-weight: 600;
							color: #1e40af;
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
							<h1>Payment Report</h1>
							<p><strong>Payment #${session.number}</strong></p>
						</div>
						<div class="right">
							<img src="/assets/logogo-removebg-preview.png" alt="Logo">
						</div>
					</div>
 
					<div class="info-section">
						<div class="info-item">
							<span class="info-label">Merchant:</span>
							<span class="info-value">${escapeHtml(merchantName)}</span>
						</div>
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
								<th>Total</th>
								<th>Delivery</th>
								<th>Payout</th>
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
							<span>Net Amount:</span>
							<span>${session.amount >= 0 ? "$" : "-$"}${Math.abs(session.amount).toFixed(2)}</span>
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
			console.error("Error printing payment:", error);
			await window.Dialog.alert("Failed to print payment", { title: "Error", danger: true });
		}
	}
 
	// ✅ Save to backend on form submit
	async function savePaymentToBackend(merchantUsername, orderIds, totalAmount) {
		try {
			const response = await fetch("/api/payments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					merchantUsername,
					orderIds,
					amount: totalAmount,
					notes: "",
				}),
			});
 
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to save payment");
			}
 
			const result = await response.json();
			console.log("Payment saved:", result);
			loadPaymentSessions();
			return result.data;
		} catch (error) {
			console.error("Error saving payment:", error);
			throw error;
		}
	}
 
	async function loadMerchantData(merchantName) {
		const ordersBody = document.getElementById("ordersBody");

		if (!merchantName) {
			if (ordersBody)
				ordersBody.innerHTML = `
					<tr>
						<td colspan="5" class="empty-msg">Select a merchant to view orders</td>
					</tr>
				`;
			updateSelectedTotal();
			return;
		}
 
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
 
		// ✅ Hook into form submission
		const payForm = document.getElementById("payForm");
		if (payForm) {
			payForm.addEventListener("submit", async (e) => {
				e.preventDefault();
 
				const selectedIds = Array.from(
					document.querySelectorAll('#ordersBody input[type="checkbox"]:checked')
				).map(cb => cb.value);
 
				if (selectedIds.length === 0) {
					await window.Dialog.alert("Please select at least one order", { title: "Notice" });
					return;
				}
 
				const merchantUsername = document.getElementById("merchantSelect").value;
				let totalAmount = 0;
				document.querySelectorAll('#ordersBody input[type="checkbox"]:checked').forEach(cb => {
					totalAmount += parseFloat(cb.dataset.amount) || 0;
				});
 
				try {
					await savePaymentToBackend(merchantUsername, selectedIds, totalAmount);
					await window.Dialog.alert("Payment recorded successfully!", { title: "Success" });
 
					payForm.reset();
					document.getElementById("selectAllOrders").checked = false;
					updateSelectedTotal();
					loadMerchantData("");
				} catch (error) {
					await window.Dialog.alert(error.message, { title: "Error", danger: true });
				}
			});
		}
 
		window.updateSelectedTotal = updateSelectedTotal;
 
		// Load payment sessions
		loadPaymentSessions();
 
		const preselected = window.__SELECTED_MERCHANT__;
		if (preselected && merchantSelect) {
			merchantSelect.value = preselected;
			loadMerchantData(preselected);
		}
	});
 
	window.loadPaymentSessions = loadPaymentSessions;
	window.downloadPaymentPDF = downloadPaymentPDF;
	window.viewPaymentDetails = viewPaymentDetails;
	window.printPaymentSession = printPaymentSession;
})();
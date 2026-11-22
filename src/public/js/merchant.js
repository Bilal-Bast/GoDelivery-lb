const API = "/api";
let currentUser = null;
let allOrders = [];
let filteredOrders = [];
let currentPage = 1;
const PAGE_SIZE = 15;
const t = (value) => (window.__t ? window.__t(String(value)) : String(value));
const locale = () => (document.documentElement.lang === "ar" ? "ar-LB-u-nu-latn" : "en-US");
let revenueChartInstance = null;
let statusChartInstance = null;
let merchantBalance = null;
let paymentSessions = [];
const statusMultiSelect = window.createStatusMultiSelect("statusFilter");
const driverMultiSelect = window.createStatusMultiSelect("driverFilter", {
	allLabel: "All Drivers", singularLabel: "driver", pluralLabel: "drivers",
});

// Init — auth is handled server-side; use server-rendered data
document.addEventListener("DOMContentLoaded", () => {
	const initData = window.__INIT_DATA__ || {};
	// Server only sends the JWT payload as __CURRENT_USER__; merge in the full
	// profile (deliveryCharges, phone, accountType, ...) fetched separately.
	currentUser = { ...(window.__CURRENT_USER__ || {}), ...(initData.profile || {}) };

	const navName = document.getElementById("navProfileName");
	if (navName)
		navName.textContent =
			currentUser.firstName || currentUser.username || "";

	allOrders = initData.orders || [];
	filteredOrders = [...allOrders];
	driverMultiSelect.setOptions([...new Set(allOrders.map((order) => order.driver || "Not assigned"))]
		.map((driver) => ({ value: driver, label: driver })));
	merchantBalance = initData.balance || null;
	paymentSessions = initData.payments || [];

	setupSidebar();
	setupNavButtons();
	setupSectionNav();
	setupOrdersSection();
	// Default to the last month; applyFilters narrows the list to match.
	document.getElementById("startDate").value = window.defaultDateFrom();
	applyFilters();
	initLocationSearch(initData.locations || []);
	setupSettings();
	setupNotifications();
	setupPayments();

	populateDashboard();
	populateAnalytics();
	populatePayments();
});

// SideBar
function setupSidebar() {
	const toggle = document.getElementById("sidebarToggle");
	const sidebar = document.getElementById("sidebar");
	const close = document.getElementById("closeSidebar");
	const main = document.querySelector(".main-content");

	if (toggle) {
		toggle.addEventListener("click", () => {
			sidebar.classList.toggle("active");
			main.classList.toggle("sidebar-open");
		});
	}
	if (close) {
		close.addEventListener("click", () => {
			sidebar.classList.remove("active");
			main.classList.remove("sidebar-open");
		});
	}
	if (sidebar) {
		sidebar.addEventListener("mouseleave", () => {
			sidebar.classList.remove("active");
			main.classList.remove("sidebar-open");
		});
	}
}

function setupNavButtons() {
	document.getElementById("logoutBtn")?.addEventListener("click", () => {
		window.location.href = "/logout";
	});
	document.getElementById("profileBtn")?.addEventListener("click", () => {
		switchSection("settings");
	});
}

// Navigation
function setupSectionNav() {
	document.querySelectorAll(".nav-link").forEach((link) => {
		link.addEventListener("click", (e) => {
			e.preventDefault();
			const section = link.dataset.section;
			switchSection(section);
			// Close sidebar on mobile
			document.getElementById("sidebar")?.classList.remove("active");
			document
				.querySelector(".main-content")
				?.classList.remove("sidebar-open");
		});
	});

	document
		.getElementById("viewAllOrdersBtn")
		?.addEventListener("click", () => {
			switchSection("orders");
			document.getElementById("showOrdersListBtn")?.click();
		});
}

function switchSection(name) {
	document
		.querySelectorAll(".page-section")
		.forEach((s) => s.classList.remove("active-section"));
	document.getElementById(`section-${name}`)?.classList.add("active-section");

	document
		.querySelectorAll(".nav-link")
		.forEach((l) => l.classList.remove("active"));
	document
		.querySelector(`.nav-link[data-section="${name}"]`)
		?.classList.add("active");

	if (name === "analytics") populateAnalytics();
}

// Load orders (used for manual refresh — initial data comes from window.__INIT_DATA__)
async function loadOrders() {
	try {
		const res = await fetch(`${API}/orders/my`, {
			credentials: "include",
		});
		if (!res.ok) throw new Error("Failed to load orders");
		allOrders = await res.json();
		filteredOrders = [...allOrders];
		driverMultiSelect.setOptions([...new Set(allOrders.map((order) => order.driver || "Not assigned"))]
			.map((driver) => ({ value: driver, label: driver })));
		currentPage = 1;
	} catch (err) {
		console.error("Error loading orders:", err);
		allOrders = [];
		filteredOrders = [];
	}
}

// Payments & Balance
function escapeHtml(value) {
	const div = document.createElement("div");
	div.textContent = value == null ? "" : String(value);
	return div.innerHTML;
}

// Address (free text) is shown first; the city/district location sits under it
// in smaller grey text when both are present.
function formatLocationCell(loc) {
	const place = [loc?.cty, loc?.d].filter(Boolean).map(locName).join(", ");
	const addr = (loc?.a || "").trim();
	if (addr && place) {
		return `${escapeHtml(addr)}<br><small style="color:#94a3b8">${escapeHtml(place)}</small>`;
	}
	return escapeHtml(addr || place) || "—";
}

function setupPayments() {
	document.getElementById("refreshPaymentsBtn")?.addEventListener("click", () => {
		// Balance/payment history is baked into the page on load (like the rest
		// of this dashboard) — a full reload is the simplest way to refresh it.
		window.location.reload();
	});
}

function populatePayments() {
	const banner = document.getElementById("merchantBalanceBanner");
	const label = document.getElementById("merchantBalanceLabel");
	const value = document.getElementById("merchantBalanceValue");
	if (banner && label && value) {
		const amount = merchantBalance?.amount || 0;
		banner.classList.remove("owed-to-you", "owed-by-you");
		if (amount > 0.005) {
			banner.classList.add("owed-to-you");
			label.textContent = "The admin owes you";
			value.textContent = `$${amount.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
		} else if (amount < -0.005) {
			banner.classList.add("owed-by-you");
			label.textContent = "You owe the admin";
			value.textContent = `$${Math.abs(amount).toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
		} else {
			label.textContent = "Your balance";
			value.textContent = "Settled — $0.00";
		}
	}

	const tbody = document.getElementById("paymentSessionsBody");
	if (!tbody) return;
	if (!paymentSessions.length) {
		tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No payment sessions yet</td></tr>';
		return;
	}
	tbody.innerHTML = paymentSessions
		.map((p, idx) => {
			const amountColor = p.amount < 0 ? "color:#ef4444;" : "color:#16a34a;";
			const rowId = `paymentSessionOrders-${idx}`;
			return `
				<tr class="session-row" data-target="${rowId}" style="cursor:pointer;">
					<td><i class="bx bx-chevron-right session-toggle-icon"></i> <strong>#${p.number}</strong></td>
					<td>${formatDate(p.createdAt)}</td>
					<td>${p.isAdvance ? "Advance" : "Settlement"}</td>
					<td style="${amountColor}font-weight:600;">${p.amount < 0 ? "-" : ""}$${Math.abs(p.amount).toFixed(2)}</td>
					<td>${p.orderCount}</td>
					<td>${escapeHtml(p.adminName || "-")}</td>
					<td>${escapeHtml(p.notes || "-")}</td>
				</tr>
				<tr class="session-detail-row" id="${rowId}" style="display:none;">
					<td colspan="7">${buildSessionOrdersTable(p.orders)}</td>
				</tr>
			`;
		})
		.join("");

	tbody.querySelectorAll("tr.session-row").forEach((row) => {
		row.addEventListener("click", () => {
			const target = document.getElementById(row.dataset.target);
			if (!target) return;
			const showing = target.style.display !== "none";
			target.style.display = showing ? "none" : "table-row";
			const icon = row.querySelector(".session-toggle-icon");
			if (icon) icon.classList.toggle("bx-chevron-down", !showing);
			if (icon) icon.classList.toggle("bx-chevron-right", showing);
		});
	});
}

function buildSessionOrdersTable(orders) {
	if (!orders || !orders.length) {
		return '<div class="empty-state">No orders in this session</div>';
	}
	const rows = orders
		.map(
			(o) => `
				<tr>
					<td>${escapeHtml(o.id)}</td>
					<td>${escapeHtml(o.customerName || "-")}</td>
					<td>${escapeHtml(o.phone || "-")}</td>
					<td>${formatLocationCell({ a: o.address, d: o.district, cty: o.city })}</td>
					<td>$${Number(o.total || 0).toFixed(2)}</td>
					<td>$${Number(o.deliveryCharge || 0).toFixed(2)}</td>
					<td>${statusBadge(o.status)}</td>
				</tr>
			`,
		)
		.join("");
	return `
		<table class="session-orders-table">
			<thead>
				<tr>
					<th>Order ID</th>
					<th>Customer</th>
					<th>Phone</th>
					<th>Location</th>
					<th>Total</th>
					<th>Delivery</th>
					<th>Status</th>
				</tr>
			</thead>
			<tbody>${rows}</tbody>
		</table>
	`;
}

// Dashboard
function populateDashboard() {
	const total = allOrders.length;
	const totalSales = allOrders.reduce(
		(sum, order) =>
			sum + (
				order.cancelledBy !== null || order.s === "CANCELED"
					? 0
					: (order.pr?.t || 0)
			),
		0
	);
	const pending = allOrders.filter((o) => o.s === 0 || o.s === 1).length;
	const delivered = allOrders.filter(
		(o) => 
			(o.s === 3 || o.s === 5 || o.s === 6) &&
			!o.cancelledBy
	).length;

	document.getElementById("dashTotalSales").textContent =
		`$${totalSales.toFixed(0)}`;
	document.getElementById("dashTotalOrders").textContent = total;
	document.getElementById("dashPending").textContent = pending;
	document.getElementById("dashDelivered").textContent = delivered;

	const tbody = document.getElementById("dashRecentOrders");
	const recent = allOrders.slice(0, 5);
	if (!recent.length) {
		tbody.innerHTML =
			'<tr><td colspan="5" class="empty-state">No orders yet</td></tr>';
		return;
	}
	tbody.innerHTML = recent
		.map(
			(o) => `
        <tr>
            <td><strong>${o.id || "N/A"}</strong></td>
            <td>${o.c?.f || ""}${o.c?.l ? " " + o.c.l : ""}</td>
            <td>$${(o.pr?.t || 0).toFixed(2)}</td>
            <td>${statusBadge(o.s, o)}</td>
            <td>${formatDate(o.createdAt)}</td>
        </tr>
    `,
		)
		.join("");
}

// Orders Section
function setupOrdersSection() {
	const showNew = document.getElementById("showNewOrderBtn");
	const showList = document.getElementById("showOrdersListBtn");
	const newPanel = document.getElementById("newOrderPanel");
	const listPanel = document.getElementById("ordersListPanel");

	showNew?.addEventListener("click", () => {
		showNew.classList.add("active");
		showList.classList.remove("active");
		newPanel.classList.remove("hidden");
		listPanel.classList.add("hidden");
	});

	showList?.addEventListener("click", () => {
		showList.classList.add("active");
		showNew.classList.remove("active");
		listPanel.classList.remove("hidden");
		newPanel.classList.add("hidden");
		renderOrdersTable();
	});

	// Submit order
	document
		.getElementById("submitOrder")
		?.addEventListener("click", submitNewOrder);

	// Address-only orders use Beirut's delivery charge; once a location is
	// selected, its district's charge wins (see initLocationSearch).
	document.getElementById("customerAddress")?.addEventListener("input", (e) => {
		const hasLocation = document.getElementById("selectedLocation")?.value;
		if (e.target.value.trim() && !hasLocation) autoFillDeliveryCharge("Beirut");
	});

	// Exchange toggle
	const exToggle = document.getElementById("exchangeToggle");
	exToggle?.addEventListener("change", () => {
		const notesField = document.getElementById("exchangeNotesField");
		const label = document.getElementById("exchangeStatus");
		if (exToggle.checked) {
			notesField.style.display = "block";
			label.textContent = "On";
		} else {
			notesField.style.display = "none";
			label.textContent = "Off";
		}
	});

	// Filters
	document.getElementById("statusFilter")
		?.addEventListener("statusmultiselectchange", applyFilters);
	document.getElementById("driverFilter")
		?.addEventListener("statusmultiselectchange", applyFilters);
	document
		.getElementById("searchInput")
		?.addEventListener("input", applyFilters);
	document
		.getElementById("startDate")
		?.addEventListener("change", applyFilters);
	document
		.getElementById("endDate")
		?.addEventListener("change", applyFilters);
	document
		.getElementById("clearFiltersBtn")
		?.addEventListener("click", clearFilters);
	document
		.getElementById("refreshOrdersBtn")
		?.addEventListener("click", async () => {
			await loadOrders();
			applyFilters();
			populateDashboard();
		});

	// Pagination
	document.getElementById("prevPageBtn")?.addEventListener("click", () => {
		if (currentPage > 1) {
			currentPage--;
			renderOrdersTable();
		}
	});
	document.getElementById("nextPageBtn")?.addEventListener("click", () => {
		const maxPage = Math.ceil(filteredOrders.length / PAGE_SIZE);
		if (currentPage < maxPage) {
			currentPage++;
			renderOrdersTable();
		}
	});
}

async function submitNewOrder() {
	const btn = document.getElementById("submitOrder");
	const msg = document.getElementById("orderMessage");
	// Visibility comes from the class alone (.message is hidden, .error/.success
	// are shown) — an inline display would outrank the stylesheet and keep every
	// message invisible.
	msg.className = "message";

	const orderId = document.getElementById("orderId").value.trim();
	const phone = document.getElementById("phoneNumber").value.trim();
	const firstName = document.getElementById("firstName").value.trim();
	const lastName = document.getElementById("lastName").value.trim();
	const district = document.getElementById("selectedLocation").value;
	const city = document.getElementById("selectedCity").value;
	const address = document.getElementById("customerAddress")?.value.trim() || "";
	const totalPriceRaw = document.getElementById("totalPrice").value.trim();
	const deliveryChargeRaw = document
		.getElementById("deliveryCharge")
		.value.trim();
	const exchange = document.getElementById("exchangeToggle").checked;
	const exchangeNotes = document.getElementById("exchangeNotes")?.value || "";
	const countryCode = document.getElementById("countryCode").value;

	// Price fields are excluded from the required check — 0 is a legitimate
	// total (free/replacement orders) and would fail a truthiness test.
	if (!orderId || !phone || !firstName) {
		msg.className = "message error";
		msg.textContent = "Please fill all required fields";
		return;
	}

	if (!address && !(district && city)) {
		msg.className = "message error";
		msg.textContent = "Please enter an address or choose a location";
		return;
	}

	// Parse prices - allow any number including 0 and negative
	let totalPrice = 0;
	let deliveryCharge = 0;

	if (totalPriceRaw) {
		totalPrice = parseFloat(totalPriceRaw);
		if (isNaN(totalPrice)) {
			msg.className = "message error";
			msg.textContent = "Total price must be a valid number";
			return;
		}
	}

	if (deliveryChargeRaw) {
		deliveryCharge = parseFloat(deliveryChargeRaw);
		if (isNaN(deliveryCharge)) {
			msg.className = "message error";
			msg.textContent = "Delivery charge must be a valid number";
			return;
		}
	}

	btn.disabled = true;
	btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Submitting...';

	try {
		const res = await fetch(`${API}/orders`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({
				id: orderId,
				m: currentUser.username,
				c: {
					f: firstName,
					l: lastName,
					p: `${countryCode}${phone}`,
					loc: { d: district, cty: city, a: address },
				},
				pr: { t: totalPrice, d: deliveryCharge },
				s: 1,
				e: exchange,
				eN: exchangeNotes,
				cb: currentUser.username,
			}),
		});

		const data = await res.json();
		if (!res.ok) throw new Error(data.error || "Failed to create order");

		msg.className = "message success";
		msg.textContent = `Order ${orderId} created successfully!`;

		// Reset form
		[
			"orderId",
			"phoneNumber",
			"firstName",
			"lastName",
			"totalPrice",
			"deliveryCharge",
			"locationSearch",
			"customerAddress",
			"exchangeNotes",
		].forEach((id) => {
			const el = document.getElementById(id);
			if (el) el.value = "";
		});
		document.getElementById("selectedLocation").value = "";
		document.getElementById("selectedCity").value = "";
		document.getElementById("exchangeToggle").checked = false;
		document.getElementById("exchangeNotesField").style.display = "none";
		document.getElementById("exchangeStatus").textContent = "Off";

		// Reload orders
		await loadOrders();
		populateDashboard();
	} catch (err) {
		msg.className = "message error";
		msg.textContent = err.message;
	} finally {
		btn.disabled = false;
		btn.innerHTML = '<i class="bx bx-check-circle"></i> Submit Order';
	}
}

function applyFilters() {
	const statuses = new Set(statusMultiSelect.getSelected());
	const selectedDrivers = new Set(driverMultiSelect.getSelected());
	const search = document.getElementById("searchInput").value.toLowerCase();
	const startDate = document.getElementById("startDate").value;
	const endDate = document.getElementById("endDate").value;

	filteredOrders = allOrders.filter((o) => {
		if (statuses.size && !statuses.has(String(o.s))) return false;
		if (selectedDrivers.size && !selectedDrivers.has(o.driver || "Not assigned")) return false;
		if (search) {
			const haystack =
				`${o.id} ${o.c?.f} ${o.c?.l} ${o.c?.p} ${o.c?.loc?.cty} ${o.c?.loc?.d} ${o.c?.loc?.a || ""}`.toLowerCase();
			if (!haystack.includes(search)) return false;
		}
		if (startDate && new Date(o.createdAt) < new Date(startDate))
			return false;
		if (endDate && new Date(o.createdAt) > new Date(endDate + "T23:59:59"))
			return false;
		return true;
	});

	currentPage = 1;
	renderOrdersTable();
}

function clearFilters() {
	statusMultiSelect.clear({ notify: false });
	driverMultiSelect.clear({ notify: false });
	document.getElementById("searchInput").value = "";
	document.getElementById("startDate").value = window.defaultDateFrom();
	document.getElementById("endDate").value = "";
	applyFilters();
}

function renderOrdersTable() {
	const tbody = document.getElementById("ordersTableBody");

	// Stats
	updateOrderStats();

	if (!filteredOrders.length) {
		tbody.innerHTML = `
			<tr><td colspan="11" class="empty-state">No orders found</td></tr>
			<tr class="orders-total-row">
				<td colspan="4"><strong>Filtered total</strong></td>
				<td><strong>$0.00</strong></td><td><strong>$0.00</strong></td><td><strong>$0.00</strong></td>
				<td colspan="4"></td>
			</tr>`;
		updatePagination(0);
		return;
	}

	const start = (currentPage - 1) * PAGE_SIZE;
	const pageOrders = filteredOrders.slice(start, start + PAGE_SIZE);

	const rows = pageOrders
		.map((o) => {
			const priceWithoutDelivery = (o.pr?.t || 0) - (o.pr?.d || 0);
			return `
        <tr>
            <td><strong>${o.id || "N/A"}</strong></td>
            <td>${o.c?.f || ""}${o.c?.l ? " " + o.c.l : ""}</td>
            <td>${o.c?.p || "—"}</td>
            <td>${formatLocationCell(o.c?.loc)}</td>
            <td>$${priceWithoutDelivery.toFixed(2)}</td>
            <td>$${(o.pr?.d || 0).toFixed(2)}</td>
            <td><strong>$${(o.pr?.t || 0).toFixed(2)}</strong></td>
            <td>${statusBadge(o.s, o)}</td>
            <td>${o.driver || '<span style="color:#94a3b8">—</span>'}</td>
            <td>${formatDate(o.createdAt)}</td>
            <td>${o.s === 2 ? `<button type="button" class="merchant-live-order" data-order-id="${escapeHtml(o.id)}">View live</button>` : "—"}</td>
        </tr>`;
		})
		.join("");
	const totals = filteredOrders.reduce((sum, order) => {
		const total = Number(order.pr?.t) || 0;
		const delivery = Number(order.pr?.d) || 0;
		sum.price += total - delivery;
		sum.delivery += delivery;
		sum.total += total;
		return sum;
	}, { price: 0, delivery: 0, total: 0 });
	tbody.innerHTML = `${rows}
		<tr class="orders-total-row">
			<td colspan="4"><strong>Filtered total</strong></td>
			<td><strong>$${totals.price.toFixed(2)}</strong></td>
			<td><strong>$${totals.delivery.toFixed(2)}</strong></td>
			<td><strong>$${totals.total.toFixed(2)}</strong></td>
			<td colspan="4"></td>
		</tr>`;
	tbody.querySelectorAll(".merchant-live-order").forEach((button) => {
		button.addEventListener("click", () => {
			window.GoDeliveryLiveTracking?.initMerchantOrder(button.dataset.orderId);
		});
	});

	updatePagination(filteredOrders.length);
}

function updateOrderStats() {
	document.getElementById("ordTotalOrders").textContent =
		filteredOrders.length;
	document.getElementById("ordWarehouse").textContent = filteredOrders.filter(
		(o) => o.s === 0,
	).length;
	document.getElementById("ordNew").textContent = filteredOrders.filter(
		(o) => o.s === 1,
	).length;
	document.getElementById("ordPicked").textContent = filteredOrders.filter(
		(o) => o.s === 2,
	).length;
	document.getElementById("ordDelivered").textContent = filteredOrders.filter(
		(o) => o.s === 3,
	).length;
	document.getElementById("ordCancelled").textContent = filteredOrders.filter(
		(o) => o.s === 4,
	).length;
	document.getElementById("ordPaid").textContent = filteredOrders.filter(
		(o) => o.s === 5,
	).length;
	document.getElementById("ordRevenue").textContent =
	`$${filteredOrders.reduce(
		(s, o) =>
			s + (
				o.cancelledBy !== null || o.s === "CANCELED"
					? 0
					: (o.pr?.t || 0)
			),
		0
	).toFixed(0)}`;
}

function updatePagination(total) {
	const maxPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
	document.getElementById("pageInfo").textContent =
		`Page ${currentPage} of ${maxPage}`;
	document.getElementById("prevPageBtn").disabled = currentPage <= 1;
	document.getElementById("nextPageBtn").disabled = currentPage >= maxPage;
}

// Analytics
function populateAnalytics() {
	if (!allOrders.length) return;

	const total = allOrders.length;
	const totalRev = allOrders.reduce(
		(sum, order) =>
			sum + (
				order.cancelledBy !== null || order.s === "CANCELED"
					? 0
					: (order.pr?.t || 0)
			),
		0
	);
	const delivered = allOrders.filter(
		(o) => 
			(o.s === 3 || o.s === 5) &&
			!o.cancelledBy
	).length;
	const cancelled = allOrders.filter(
		(o) => o.s === 4 || o.cancelledBy !== null
	).length;

	document.getElementById("anTotalRevenue").textContent =
		`$${totalRev.toFixed(0)}`;
	document.getElementById("anAvgOrder").textContent =
		`$${(totalRev / total).toFixed(0)}`;
	document.getElementById("anDeliveryRate").textContent =
		`${((delivered / total) * 100).toFixed(1)}%`;
	document.getElementById("anCancelRate").textContent =
		`${((cancelled / total) * 100).toFixed(1)}%`;

	renderRevenueChart();
	renderStatusChart();
	renderTopLocations();
}

function renderRevenueChart() {
	const ctx = document.getElementById("revenueChart");
	if (!ctx) return;

	// Group orders by day
	const dayMap = {};
	allOrders.forEach((o) => {
		if (!o.createdAt) return;
		const d = new Date(o.createdAt);
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");
		const key = `${y}-${m}-${day}`;
		dayMap[key] = (dayMap[key] || 0) + (o.pr?.t || 0);
	});

	const sorted = Object.entries(dayMap).sort((a, b) =>
		a[0].localeCompare(b[0]),
	);
	const labels = sorted.map(([k]) => {
		const [y, m, d] = k.split("-");
		return new Date(y, m - 1, d).toLocaleDateString(locale(), {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	});
	const data = sorted.map(([, v]) => v);

	if (revenueChartInstance) revenueChartInstance.destroy();
	revenueChartInstance = new Chart(ctx, {
		type: "line",
		data: {
			labels,
			datasets: [
				{
					label: t("Revenue ($)"),
					data,
					borderColor: "#3b82f6",
					backgroundColor: "rgba(59, 130, 246, 0.1)",
					fill: true,
					tension: 0.4,
					pointRadius: 4,
					pointBackgroundColor: "#3b82f6",
				},
			],
		},
		options: {
			responsive: true,
			plugins: { legend: { display: false } },
			scales: {
				y: { beginAtZero: true, ticks: { callback: (v) => "$" + v } },
				x: { grid: { display: false } },
			},
		},
	});
}

function renderStatusChart() {
	const ctx = document.getElementById("statusChart");
	if (!ctx) return;

	const counts = [0, 0, 0, 0, 0, 0, 0];
	allOrders.forEach((o) => {
		if (o.s >= 0 && o.s <= 6) counts[o.s]++;
	});

	if (statusChartInstance) statusChartInstance.destroy();
	statusChartInstance = new Chart(ctx, {
		type: "doughnut",
		data: {
			labels: [
				"Warehouse",
				"New",
				"Picked Up",
				"Delivered",
				"Cancelled",
				"Paid",				
				"Collected",
			].map(t),
			datasets: [
				{
					data: counts,
					backgroundColor: [
						"#f59e0b",
						"#41c0d6",
						"#8b5cf6",
						"#00f85b",
						"#ef4444",
						"#13305f",
						"#1b8864"
					],
					borderWidth: 0,
				},
			],
		},
		options: {
			responsive: true,
			cutout: "60%",
			plugins: {
				legend: {
					position: "bottom",
					labels: {
						padding: 16,
						usePointStyle: true,
						font: { size: 12 },
					},
				},
			},
		},
	});
}

function renderTopLocations() {
	const tbody = document.getElementById("topLocationsBody");
	const locMap = {};

	allOrders.forEach((o) => {
		// Skip cancelled orders
		if (o.cancelledBy !== null || o.s === 4) return;

		const loc = o.c?.loc?.cty || o.c?.loc?.d || "Unknown";

		if (!locMap[loc]) locMap[loc] = { count: 0, revenue: 0 };

		locMap[loc].count++;
		locMap[loc].revenue += o.pr?.t || 0;
	});

	const sorted = Object.entries(locMap)
		.sort((a, b) => b[1].count - a[1].count)
		.slice(0, 10);

	if (!sorted.length) {
		tbody.innerHTML =
			'<tr><td colspan="4" class="empty-state">No data</td></tr>';
		return;
	}

	tbody.innerHTML = sorted
		.map(
			([loc, data], i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(locName(loc))}</td>
            <td>${data.count}</td>
            <td>$${data.revenue.toFixed(0)}</td>
        </tr>
    `,
		)
		.join("");
}
// Location Search
let locationsData = [];

// District/city names are stored in English; show their Arabic names when the
// page language is Arabic.
const locationNameAr = new Map();
function locName(en) {
	if (!en) return en;
	return (document.documentElement.lang === "ar" && locationNameAr.get(en)) || en;
}

function initLocationSearch(locations) {
	locations.forEach((loc) => {
		const district = loc.district?.en || loc.district;
		if (district && loc.district?.ar) locationNameAr.set(district, loc.district.ar);
		(loc.cities || []).forEach((city) => {
			if (city.en && city.ar) locationNameAr.set(city.en, city.ar);
		});
	});
	const searchInput = document.getElementById("locationSearch");
	const dropdown = document.getElementById("locationDropdown");
	const selectedLoc = document.getElementById("selectedLocation");
	const selectedCity = document.getElementById("selectedCity");

	if (!searchInput) return;

	locationsData = [];
	locations.forEach((loc) => {
		if (loc.cities) {
			loc.cities.forEach((city) => {
				locationsData.push({
					cityEn: city.en,
					cityAr: city.ar || "",
					districtEn: loc.district?.en || loc.district,
					districtAr: loc.district?.ar || "",
				});
			});
		}
	});

	searchInput.addEventListener("focus", () => {
		// Select the current value so a keystroke (or Delete) replaces it
		// outright instead of having to clear it by hand first.
		searchInput.select();
		renderLocDropdown("", dropdown);
	});
	searchInput.addEventListener("input", () =>
		renderLocDropdown(searchInput.value, dropdown),
	);
	document.addEventListener("click", (e) => {
		if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
			dropdown.classList.remove("show");
		}
	});

	function renderLocDropdown(filter, dd) {
		const search = filter.trim().toLowerCase();
		const filtered = locationsData
			.filter(
				(l) =>
					l.cityEn.toLowerCase().includes(search) ||
					(l.cityAr && l.cityAr.includes(filter)) ||
					l.districtEn.toLowerCase().includes(search),
			)
			.slice(0, 80);

		dd.innerHTML = "";
		dd.classList.add("show");

		if (!filtered.length) {
			dd.innerHTML = '<div class="no-results">No locations found</div>';
			return;
		}

		filtered.forEach((loc) => {
			const item = document.createElement("div");
			item.innerHTML = `
                <span class="city">${loc.cityEn}${loc.cityAr ? " / " + loc.cityAr : ""}</span>
                <span class="district">${locName(loc.districtEn)}</span>
            `;
			item.onclick = () => {
				searchInput.value = `${locName(loc.cityEn)}, ${locName(loc.districtEn)}`;
				selectedLoc.value = loc.districtEn;
				selectedCity.value = loc.cityEn;
				dd.classList.remove("show");
				autoFillDeliveryCharge(loc.districtEn);
			};
			dd.appendChild(item);
		});
	}
}

// Optional per-merchant order-ID prefix, set by an admin (Users page) or at
// account creation. No prefix means the order ID is just the typed number.
const prefix = (window.__INIT_DATA__?.profile?.orderIdPrefix || '').toLowerCase();

// Listen to order number input
const orderNumberInput = document.getElementById('orderNumber');
const orderIdInput = document.getElementById('orderId');
const generatedIdSpan = document.getElementById('generatedId');

orderNumberInput.addEventListener('input', function() {
    // Remove non-digits from input
    const cleanNumber = this.value.replace(/\D/g, '');
    
    // Generate full ID
    const fullId = prefix + cleanNumber;
    
    // Update display
    generatedIdSpan.textContent = fullId || '—';
    
    // Set hidden input for submission
    orderIdInput.value = fullId;
});

// Auto-fill delivery charge
const districtToCityMap = {
	Beirut: "Beirut",
	"Mount Lebanon - Baabda": "Mount Lebanon",
	"Mount Lebanon - Aley": "Mount Lebanon",
	"Mount Lebanon - Chouf": "Mount Lebanon",
	"Mount Lebanon - Keserwan": "Mount Lebanon",
	"Mount Lebanon - Jbeil": "Mount Lebanon",
	"Mount Lebanon - Matn": "Mount Lebanon",
	"North Lebanon - Tripoli": "North",
	"North Lebanon - Koura": "North",
	"North Lebanon - Zgharta": "North",
	"North Lebanon - Bcharri": "North",
	"North Lebanon - Batroun": "North",
	"North Lebanon - Minieh-Danniyeh": "North",
	"South Lebanon - Sidon": "South",
	"South Lebanon - Tyre": "South",
	"South Lebanon - Jezzine": "South",
	"Bekaa - Zahle": "Bekaa",
	"Bekaa - West Bekaa": "Bekaa",
	"Bekaa - Rashaya": "Bekaa",
	"Bekaa - Baalbek El Hermel": "Baalbek-Hermel",
	Nabatieh: "El Nabatieh",
	Akkar: "Akkar",
};

function autoFillDeliveryCharge(district) {
	if (!currentUser?.deliveryCharges || !district) return;
	const mainCity = districtToCityMap[district];
	if (!mainCity) return;

	let charge = currentUser.deliveryCharges[mainCity];
	if (charge === undefined) {
		charge = currentUser.deliveryCharges[mainCity.replace(/\s+/g, "")] || 0;
	}

	const input = document.getElementById("deliveryCharge");
	if (input) input.value = charge;
}

// ── Country Codes (compact) ───────────────────────────
const countryCodes = [
	{ code: "+93", name: "Afghanistan", flag: "🇦🇫" },
	{ code: "+355", name: "Albania", flag: "🇦🇱" },
	{ code: "+213", name: "Algeria", flag: "🇩🇿" },
	{ code: "+1", name: "American Samoa", flag: "🇦🇸" },
	{ code: "+376", name: "Andorra", flag: "🇦🇩" },
	{ code: "+244", name: "Angola", flag: "🇦🇴" },
	{ code: "+1", name: "Anguilla", flag: "🇦🇮" },
	{ code: "+1", name: "Antigua & Barbuda", flag: "🇦🇬" },
	{ code: "+54", name: "Argentina", flag: "🇦🇷" },
	{ code: "+374", name: "Armenia", flag: "🇦🇲" },
	{ code: "+297", name: "Aruba", flag: "🇦🇼" },
	{ code: "+61", name: "Australia", flag: "🇦🇺" },
	{ code: "+43", name: "Austria", flag: "🇦🇹" },
	{ code: "+994", name: "Azerbaijan", flag: "🇦🇿" },
	{ code: "+1", name: "Bahamas", flag: "🇧🇸" },
	{ code: "+973", name: "Bahrain", flag: "🇧🇭" },
	{ code: "+880", name: "Bangladesh", flag: "🇧🇩" },
	{ code: "+1", name: "Barbados", flag: "🇧🇧" },
	{ code: "+375", name: "Belarus", flag: "🇧🇾" },
	{ code: "+32", name: "Belgium", flag: "🇧🇪" },
	{ code: "+501", name: "Belize", flag: "🇧🇿" },
	{ code: "+229", name: "Benin", flag: "🇧🇯" },
	{ code: "+1", name: "Bermuda", flag: "🇧🇲" },
	{ code: "+975", name: "Bhutan", flag: "🇧🇹" },
	{ code: "+591", name: "Bolivia", flag: "🇧🇴" },
	{ code: "+387", name: "Bosnia & Herzegovina", flag: "🇧🇦" },
	{ code: "+267", name: "Botswana", flag: "🇧🇼" },
	{ code: "+55", name: "Brazil", flag: "🇧🇷" },
	{ code: "+1", name: "British Virgin Islands", flag: "🇻🇬" },
	{ code: "+673", name: "Brunei", flag: "🇧🇳" },
	{ code: "+359", name: "Bulgaria", flag: "🇧🇬" },
	{ code: "+226", name: "Burkina Faso", flag: "🇧🇫" },
	{ code: "+257", name: "Burundi", flag: "🇧🇮" },
	{ code: "+855", name: "Cambodia", flag: "🇰🇭" },
	{ code: "+237", name: "Cameroon", flag: "🇨🇲" },
	{ code: "+1", name: "Canada", flag: "🇨🇦" },
	{ code: "+238", name: "Cape Verde", flag: "🇨🇻" },
	{ code: "+1", name: "Cayman Islands", flag: "🇰🇾" },
	{ code: "+236", name: "Central African Republic", flag: "🇨🇫" },
	{ code: "+235", name: "Chad", flag: "🇹🇩" },
	{ code: "+56", name: "Chile", flag: "🇨🇱" },
	{ code: "+86", name: "China", flag: "🇨🇳" },
	{ code: "+57", name: "Colombia", flag: "🇨🇴" },
	{ code: "+269", name: "Comoros", flag: "🇰🇲" },
	{ code: "+242", name: "Congo - Brazzaville", flag: "🇨🇬" },
	{ code: "+243", name: "Congo - Kinshasa", flag: "🇨🇩" },
	{ code: "+682", name: "Cook Islands", flag: "🇨🇰" },
	{ code: "+506", name: "Costa Rica", flag: "🇨🇷" },
	{ code: "+225", name: "Côte d’Ivoire", flag: "🇨🇮" },
	{ code: "+385", name: "Croatia", flag: "🇭🇷" },
	{ code: "+53", name: "Cuba", flag: "🇨🇺" },
	{ code: "+357", name: "Cyprus", flag: "🇨🇾" },
	{ code: "+420", name: "Czechia", flag: "🇨🇿" },
	{ code: "+45", name: "Denmark", flag: "🇩🇰" },
	{ code: "+253", name: "Djibouti", flag: "🇩🇯" },
	{ code: "+1", name: "Dominica", flag: "🇩🇲" },
	{ code: "+1", name: "Dominican Republic", flag: "🇩🇴" },
	{ code: "+593", name: "Ecuador", flag: "🇪🇨" },
	{ code: "+20", name: "Egypt", flag: "🇪🇬" },
	{ code: "+503", name: "El Salvador", flag: "🇸🇻" },
	{ code: "+240", name: "Equatorial Guinea", flag: "🇬🇶" },
	{ code: "+291", name: "Eritrea", flag: "🇪🇷" },
	{ code: "+372", name: "Estonia", flag: "🇪🇪" },
	{ code: "+268", name: "Eswatini", flag: "🇸🇿" },
	{ code: "+251", name: "Ethiopia", flag: "🇪🇹" },
	{ code: "+500", name: "Falkland Islands", flag: "🇫🇰" },
	{ code: "+298", name: "Faroe Islands", flag: "🇫🇴" },
	{ code: "+679", name: "Fiji", flag: "🇫🇯" },
	{ code: "+358", name: "Finland", flag: "🇫🇮" },
	{ code: "+33", name: "France", flag: "🇫🇷" },
	{ code: "+594", name: "French Guiana", flag: "🇬🇫" },
	{ code: "+689", name: "French Polynesia", flag: "🇵🇫" },
	{ code: "+241", name: "Gabon", flag: "🇬🇦" },
	{ code: "+220", name: "Gambia", flag: "🇬🇲" },
	{ code: "+995", name: "Georgia", flag: "🇬🇪" },
	{ code: "+49", name: "Germany", flag: "🇩🇪" },
	{ code: "+233", name: "Ghana", flag: "🇬🇭" },
	{ code: "+350", name: "Gibraltar", flag: "🇬🇮" },
	{ code: "+30", name: "Greece", flag: "🇬🇷" },
	{ code: "+299", name: "Greenland", flag: "🇬🇱" },
	{ code: "+1", name: "Grenada", flag: "🇬🇩" },
	{ code: "+590", name: "Guadeloupe", flag: "🇬🇵" },
	{ code: "+1", name: "Guam", flag: "🇬🇺" },
	{ code: "+502", name: "Guatemala", flag: "🇬🇹" },
	{ code: "+44", name: "Guernsey", flag: "🇬🇬" },
	{ code: "+224", name: "Guinea", flag: "🇬🇳" },
	{ code: "+245", name: "Guinea-Bissau", flag: "🇬🇼" },
	{ code: "+592", name: "Guyana", flag: "🇬🇾" },
	{ code: "+509", name: "Haiti", flag: "🇭🇹" },
	{ code: "+504", name: "Honduras", flag: "🇭🇳" },
	{ code: "+852", name: "Hong Kong", flag: "🇭🇰" },
	{ code: "+36", name: "Hungary", flag: "🇭🇺" },
	{ code: "+354", name: "Iceland", flag: "🇮🇸" },
	{ code: "+91", name: "India", flag: "🇮🇳" },
	{ code: "+62", name: "Indonesia", flag: "🇮🇩" },
	{ code: "+98", name: "Iran", flag: "🇮🇷" },
	{ code: "+964", name: "Iraq", flag: "🇮🇶" },
	{ code: "+353", name: "Ireland", flag: "🇮🇪" },
	{ code: "+44", name: "Isle of Man", flag: "🇮🇲" },
	{ code: "+972", name: "Israel", flag: "🇮🇱" },
	{ code: "+39", name: "Italy", flag: "🇮🇹" },
	{ code: "+1", name: "Jamaica", flag: "🇯🇲" },
	{ code: "+81", name: "Japan", flag: "🇯🇵" },
	{ code: "+44", name: "Jersey", flag: "🇯🇪" },
	{ code: "+962", name: "Jordan", flag: "🇯🇴" },
	{ code: "+7", name: "Kazakhstan", flag: "🇰🇿" },
	{ code: "+254", name: "Kenya", flag: "🇰🇪" },
	{ code: "+686", name: "Kiribati", flag: "🇰🇮" },
	{ code: "+383", name: "Kosovo", flag: "🇽🇰" },
	{ code: "+965", name: "Kuwait", flag: "🇰🇼" },
	{ code: "+996", name: "Kyrgyzstan", flag: "🇰🇬" },
	{ code: "+856", name: "Laos", flag: "🇱🇦" },
	{ code: "+371", name: "Latvia", flag: "🇱🇻" },
	{ code: "+961", name: "Lebanon", flag: "🇱🇧" },
	{ code: "+266", name: "Lesotho", flag: "🇱🇸" },
	{ code: "+231", name: "Liberia", flag: "🇱🇷" },
	{ code: "+218", name: "Libya", flag: "🇱🇾" },
	{ code: "+423", name: "Liechtenstein", flag: "🇱🇮" },
	{ code: "+370", name: "Lithuania", flag: "🇱🇹" },
	{ code: "+352", name: "Luxembourg", flag: "🇱🇺" },
	{ code: "+853", name: "Macau", flag: "🇲🇴" },
	{ code: "+389", name: "North Macedonia", flag: "🇲🇰" },
	{ code: "+261", name: "Madagascar", flag: "🇲🇬" },
	{ code: "+265", name: "Malawi", flag: "🇲🇼" },
	{ code: "+60", name: "Malaysia", flag: "🇲🇾" },
	{ code: "+960", name: "Maldives", flag: "🇲🇻" },
	{ code: "+223", name: "Mali", flag: "🇲🇱" },
	{ code: "+356", name: "Malta", flag: "🇲🇹" },
	{ code: "+692", name: "Marshall Islands", flag: "🇲🇭" },
	{ code: "+596", name: "Martinique", flag: "🇲🇶" },
	{ code: "+222", name: "Mauritania", flag: "🇲🇷" },
	{ code: "+230", name: "Mauritius", flag: "🇲🇺" },
	{ code: "+262", name: "Mayotte", flag: "🇾🇹" },
	{ code: "+52", name: "Mexico", flag: "🇲🇽" },
	{ code: "+691", name: "Micronesia", flag: "🇫🇲" },
	{ code: "+373", name: "Moldova", flag: "🇲🇩" },
	{ code: "+377", name: "Monaco", flag: "🇲🇨" },
	{ code: "+976", name: "Mongolia", flag: "🇲🇳" },
	{ code: "+382", name: "Montenegro", flag: "🇲🇪" },
	{ code: "+1", name: "Montserrat", flag: "🇲🇸" },
	{ code: "+212", name: "Morocco", flag: "🇲🇦" },
	{ code: "+258", name: "Mozambique", flag: "🇲🇿" },
	{ code: "+95", name: "Myanmar", flag: "🇲🇲" },
	{ code: "+264", name: "Namibia", flag: "🇳🇦" },
	{ code: "+674", name: "Nauru", flag: "🇳🇷" },
	{ code: "+977", name: "Nepal", flag: "🇳🇵" },
	{ code: "+31", name: "Netherlands", flag: "🇳🇱" },
	{ code: "+687", name: "New Caledonia", flag: "🇳🇨" },
	{ code: "+64", name: "New Zealand", flag: "🇳🇿" },
	{ code: "+505", name: "Nicaragua", flag: "🇳🇮" },
	{ code: "+227", name: "Niger", flag: "🇳🇪" },
	{ code: "+234", name: "Nigeria", flag: "🇳🇬" },
	{ code: "+683", name: "Niue", flag: "🇳🇺" },
	{ code: "+672", name: "Norfolk Island", flag: "🇳🇫" },
	{ code: "+850", name: "North Korea", flag: "🇰🇵" },
	{ code: "+1", name: "Northern Mariana Islands", flag: "🇲🇵" },
	{ code: "+47", name: "Norway", flag: "🇳🇴" },
	{ code: "+968", name: "Oman", flag: "🇴🇲" },
	{ code: "+92", name: "Pakistan", flag: "🇵🇰" },
	{ code: "+680", name: "Palau", flag: "🇵🇼" },
	{ code: "+970", name: "Palestine", flag: "🇵🇸" },
	{ code: "+507", name: "Panama", flag: "🇵🇦" },
	{ code: "+675", name: "Papua New Guinea", flag: "🇵🇬" },
	{ code: "+595", name: "Paraguay", flag: "🇵🇾" },
	{ code: "+51", name: "Peru", flag: "🇵🇪" },
	{ code: "+63", name: "Philippines", flag: "🇵🇭" },
	{ code: "+48", name: "Poland", flag: "🇵🇱" },
	{ code: "+351", name: "Portugal", flag: "🇵🇹" },
	{ code: "+1", name: "Puerto Rico", flag: "🇵🇷" },
	{ code: "+974", name: "Qatar", flag: "🇶🇦" },
	{ code: "+262", name: "Réunion", flag: "🇷🇪" },
	{ code: "+40", name: "Romania", flag: "🇷🇴" },
	{ code: "+7", name: "Russia", flag: "🇷🇺" },
	{ code: "+250", name: "Rwanda", flag: "🇷🇼" },
	{ code: "+590", name: "Saint Barthélemy", flag: "🇧🇱" },
	{ code: "+290", name: "Saint Helena", flag: "🇸🇭" },
	{ code: "+1", name: "Saint Kitts & Nevis", flag: "🇰🇳" },
	{ code: "+1", name: "Saint Lucia", flag: "🇱🇨" },
	{ code: "+590", name: "Saint Martin", flag: "🇲🇫" },
	{ code: "+508", name: "Saint Pierre & Miquelon", flag: "🇵🇲" },
	{ code: "+1", name: "Saint Vincent & Grenadines", flag: "🇻🇨" },
	{ code: "+685", name: "Samoa", flag: "🇼🇸" },
	{ code: "+378", name: "San Marino", flag: "🇸🇲" },
	{ code: "+239", name: "São Tomé & Príncipe", flag: "🇸🇹" },
	{ code: "+966", name: "Saudi Arabia", flag: "🇸🇦" },
	{ code: "+221", name: "Senegal", flag: "🇸🇳" },
	{ code: "+381", name: "Serbia", flag: "🇷🇸" },
	{ code: "+248", name: "Seychelles", flag: "🇸🇨" },
	{ code: "+232", name: "Sierra Leone", flag: "🇸🇱" },
	{ code: "+65", name: "Singapore", flag: "🇸🇬" },
	{ code: "+1", name: "Sint Maarten", flag: "🇸🇽" },
	{ code: "+421", name: "Slovakia", flag: "🇸🇰" },
	{ code: "+386", name: "Slovenia", flag: "🇸🇮" },
	{ code: "+677", name: "Solomon Islands", flag: "🇸🇧" },
	{ code: "+252", name: "Somalia", flag: "🇸🇴" },
	{ code: "+27", name: "South Africa", flag: "🇿🇦" },
	{ code: "+82", name: "South Korea", flag: "🇰🇷" },
	{ code: "+211", name: "South Sudan", flag: "🇸🇸" },
	{ code: "+34", name: "Spain", flag: "🇪🇸" },
	{ code: "+94", name: "Sri Lanka", flag: "🇱🇰" },
	{ code: "+249", name: "Sudan", flag: "🇸🇩" },
	{ code: "+597", name: "Suriname", flag: "🇸🇷" },
	{ code: "+47", name: "Svalbard & Jan Mayen", flag: "🇸🇯" },
	{ code: "+46", name: "Sweden", flag: "🇸🇪" },
	{ code: "+41", name: "Switzerland", flag: "🇨🇭" },
	{ code: "+963", name: "Syria", flag: "🇸🇾" },
	{ code: "+886", name: "Taiwan", flag: "🇹🇼" },
	{ code: "+992", name: "Tajikistan", flag: "🇹🇯" },
	{ code: "+255", name: "Tanzania", flag: "🇹🇿" },
	{ code: "+66", name: "Thailand", flag: "🇹🇭" },
	{ code: "+670", name: "Timor-Leste", flag: "🇹🇱" },
	{ code: "+228", name: "Togo", flag: "🇹🇬" },
	{ code: "+690", name: "Tokelau", flag: "🇹🇰" },
	{ code: "+676", name: "Tonga", flag: "🇹🇴" },
	{ code: "+1", name: "Trinidad & Tobago", flag: "🇹🇹" },
	{ code: "+216", name: "Tunisia", flag: "🇹🇳" },
	{ code: "+90", name: "Turkey", flag: "🇹🇷" },
	{ code: "+993", name: "Turkmenistan", flag: "🇹🇲" },
	{ code: "+1", name: "Turks & Caicos Islands", flag: "🇹🇨" },
	{ code: "+688", name: "Tuvalu", flag: "🇹🇻" },
	{ code: "+256", name: "Uganda", flag: "🇺🇬" },
	{ code: "+380", name: "Ukraine", flag: "🇺🇦" },
	{ code: "+971", name: "United Arab Emirates", flag: "🇦🇪" },
	{ code: "+44", name: "United Kingdom", flag: "🇬🇧" },
	{ code: "+1", name: "United States", flag: "🇺🇸" },
	{ code: "+598", name: "Uruguay", flag: "🇺🇾" },
	{ code: "+1", name: "US Virgin Islands", flag: "🇻🇮" },
	{ code: "+998", name: "Uzbekistan", flag: "🇺🇿" },
	{ code: "+678", name: "Vanuatu", flag: "🇻🇺" },
	{ code: "+39", name: "Vatican City", flag: "🇻🇦" },
	{ code: "+58", name: "Venezuela", flag: "🇻🇪" },
	{ code: "+84", name: "Vietnam", flag: "🇻🇳" },
	{ code: "+681", name: "Wallis & Futuna", flag: "🇼🇫" },
	{ code: "+212", name: "Western Sahara", flag: "🇪🇭" },
	{ code: "+967", name: "Yemen", flag: "🇾🇪" },
	{ code: "+260", name: "Zambia", flag: "🇿🇲" },
	{ code: "+263", name: "Zimbabwe", flag: "🇿🇼" },
];

(function setupCountrySelector() {
	const display = document.getElementById("countryDisplay");
	const search = document.getElementById("countrySearch");
	const dropdown = document.getElementById("countryDropdown");
	const codeInput = document.getElementById("countryCode");
	const flagEl = document.getElementById("countryFlag");
	const nameEl = document.getElementById("countryName");

	if (!display) return;

	let highlightedIndex = -1;
	let currentFiltered = [];

	function selectCountry(c) {
		codeInput.value = c.code;
		flagEl.textContent = c.flag;
		nameEl.textContent = c.name;
		dropdown.style.display = "none";
		search.style.display = "none";
		display.style.display = "flex";
	}

	function setHighlighted(index) {
		const items = dropdown.querySelectorAll(".country-option");
		items.forEach((el) => (el.style.background = ""));
		if (index >= 0 && index < items.length) {
			items[index].style.background = "#f1f5f9";
			items[index].scrollIntoView({ block: "nearest" });
		}
		highlightedIndex = index;
	}

	function render(filter = "") {
		dropdown.innerHTML = "";
		highlightedIndex = -1;
		const f = filter.trim().toLowerCase();
		const filtered = countryCodes.filter(
			(c) => c.name.toLowerCase().includes(f) || c.code.includes(f),
		);
		currentFiltered = filtered;

		if (filtered.length === 0) {
			dropdown.innerHTML =
				'<div style="padding:10px;color:#94a3b8;font-size:13px;">No countries found</div>';
			return;
		}

		filtered.forEach((c, i) => {
			const item = document.createElement("div");
			item.className = "country-option";
			item.style.cssText =
				"padding:10px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;";
			item.innerHTML = `<span style="font-size:18px">${c.flag}</span> ${c.name} (${c.code})`;
			item.addEventListener("mouseenter", () => setHighlighted(i));
			item.onclick = () => selectCountry(c);
			dropdown.appendChild(item);
		});
	}

	display.addEventListener("click", () => {
		display.style.display = "none";
		search.style.display = "block";
		// Clear whatever was typed last time so reopening always starts
		// from a clean slate instead of a stale filter.
		search.value = "";
		search.focus();
		dropdown.style.display = "block";
		render();
	});

	search.addEventListener("input", (e) => render(e.target.value));

	search.addEventListener("keydown", (e) => {
		const items = dropdown.querySelectorAll(".country-option");
		if (!items.length) return;

		if (e.key === "ArrowDown") {
			e.preventDefault();
			setHighlighted((highlightedIndex + 1) % items.length);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setHighlighted((highlightedIndex - 1 + items.length) % items.length);
		} else if (e.key === "Enter") {
			e.preventDefault();
			const index = highlightedIndex >= 0 ? highlightedIndex : 0;
			const c = currentFiltered[index];
			if (c) selectCountry(c);
		} else if (e.key === "Escape") {
			dropdown.style.display = "none";
			search.style.display = "none";
			display.style.display = "flex";
		}
	});

	document.addEventListener("click", (e) => {
		if (!e.target.closest(".country-selector")) {
			dropdown.style.display = "none";
			search.style.display = "none";
			display.style.display = "flex";
		}
	});
})();

// Settings
function setupSettings() {
	if (!currentUser) return;

	const set = (id, val) => {
		const el = document.getElementById(id);
		if (el) el.textContent = val || "—";
	};

	set("settUsername", currentUser.username);
	set(
		"settName",
		`${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim(),
	);
	set("settPhone", currentUser.phone);
	set("settAccountType", currentUser.accountType);
	set("settPaymentDay", currentUser.paymentDay);

	// Delivery charges table
	const chargesBody = document.getElementById("deliveryChargesBody");
	if (chargesBody && currentUser.deliveryCharges) {
		const entries = Object.entries(currentUser.deliveryCharges);
		if (entries.length) {
			chargesBody.innerHTML = entries
				.map(
					([region, charge]) => `
                <tr>
                    <td>${region}</td>
                    <td>$${charge}</td>
                </tr>
            `,
				)
				.join("");
		} else {
			chargesBody.innerHTML =
				'<tr><td colspan="2" class="empty-state">No charges configured</td></tr>';
		}
	}

	// Password change
	document
		.getElementById("changePasswordBtn")
		?.addEventListener("click", async () => {
			const newPw = document.getElementById("newPassword").value;
			const confirmPw = document.getElementById("confirmPassword").value;
			const msg = document.getElementById("passwordMessage");
			msg.className = "message";

			if (!newPw || newPw.length < 6) {
				msg.className = "message error";
				msg.textContent = "Password must be at least 6 characters";
				return;
			}
			if (newPw !== confirmPw) {
				msg.className = "message error";
				msg.textContent = "Passwords do not match";
				return;
			}

			try {
				const res = await fetch(
					`${API}/users/${currentUser.id}/password`,
					{
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						credentials: "include",
						body: JSON.stringify({ password: newPw }),
					},
				);

				if (!res.ok) throw new Error("Failed to update password");

				msg.className = "message success";
				msg.textContent = "Password updated successfully!";
				document.getElementById("newPassword").value = "";
				document.getElementById("confirmPassword").value = "";
			} catch (err) {
				msg.className = "message error";
				msg.textContent = err.message;
			}
		});
}

// Notifications
function setupNotifications() {
	if (!currentUser) return;
	if (currentUser.accountType === "postpaid") {
		const today = new Date().toLocaleDateString(locale(), {
			weekday: "long",
		});
		if (currentUser.paymentDay === today) {
			const badge = document.querySelector(".notification-badge");
			if (badge) badge.classList.add("active");
			document
				.getElementById("notificationBtn")
				?.addEventListener("click", () => {
					window.Dialog.alert("💰 Payment Due Today! Please make your payment.", { title: "Payment Reminder" });
				});
		}
	}
}

// Helpers
function statusBadge(s, order) {
	// A cancelled order that was later collected/paid keeps its cancellation.
	if (order?.cancelledBy && s === 6) {
		return '<span class="status-badge status-collected">Cancelled Collected</span>';
	}
	if (order?.cancelledBy && s === 5) {
		return '<span class="status-badge status-paid">Returned</span>';
	}
	const map = {
		0: { label: "Warehouse", cls: "warehouse" },
		1: { label: "New", cls: "new" },
		2: { label: "Picked Up", cls: "picked" },
		3: { label: "Delivered", cls: "delivered" },
		4: { label: "Cancelled", cls: "cancelled" },
		5: { label: "Paid", cls: "paid" },
		6: { label: "Collected", cls: "collected" },
	};
	const info = map[s] || { label: "Unknown", cls: "warehouse" };
	return `<span class="status-badge status-${info.cls}">${info.label}</span>`;
}

function formatDate(dateStr) {
	if (!dateStr) return "—";
	return new Date(dateStr).toLocaleDateString(locale(), {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

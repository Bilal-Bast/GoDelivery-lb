const API_BASE = "/api";
const STATUS_NAMES = [
	"Warehouse",
	"New",
	"Picked Up",
	"Delivered",
	"Cancelled",
	"Paid",
	"Collected",
];
const STATUS_CLASSES = [
	"warehouse",
	"new",
	"picked",
	"delivered",
	"cancelled",
	"paid",
	"collected",
];
const STATUS_COLORS = [
	"#f59e0b",
	"#06b6d4",
	"#8b5cf6",
	"#22c55e",
	"#ef4444",
	"#10b981",
	"#6366f1",
];

// Chart instances for destroy/re-render
let chartRevenue, chartStatus, chartOrders, chartLocations;
let merchantFilterPopulated = false;

// DOM Helpers
const $ = (id) => document.getElementById(id);
const setText = (id, val) => {
	const el = $(id);
	if (el) el.textContent = val;
};

function showLoading(show) {
	const el = $("loadingOverlay");
	if (el) el.classList.toggle("active", show);
}

function showError(msg) {
	const banner = $("errorBanner");
	const msgEl = $("errorMessage");
	if (banner) banner.classList.add("active");
	if (msgEl) msgEl.textContent = msg;
}

function hideError() {
	const banner = $("errorBanner");
	if (banner) banner.classList.remove("active");
}

// Fetch server-aggregated analytics with the current filters applied
async function loadAllData() {
	showLoading(true);
	hideError();
	try {
		const params = new URLSearchParams();
		const startDate = $("filterStartDate")?.value;
		const endDate = $("filterEndDate")?.value;
		const statusVal = $("filterStatus")?.value;
		const merchantVal = $("filterMerchant")?.value;
		if (startDate) params.set("startDate", startDate);
		if (endDate) params.set("endDate", endDate);
		if (statusVal !== "" && statusVal !== undefined)
			params.set("status", statusVal);
		if (merchantVal) params.set("merchant", merchantVal);

		const res = await fetch(`${API_BASE}/analytics?${params.toString()}`, {
			credentials: "include",
		});
		if (!res.ok) throw new Error(res.statusText);
		const data = await res.json();

		// Merchant dropdown is filter-independent; populate it once
		if (!merchantFilterPopulated) {
			populateMerchantFilter(data.merchants || []);
			merchantFilterPopulated = true;
		}

		renderAll(data);

		const now = new Date();
		setText("lastUpdated", `Last updated: ${now.toLocaleTimeString()}`);
	} catch (err) {
		console.error("Error loading analytics data:", err);
		showError("Failed to load data. Make sure the backend is running.");
	} finally {
		showLoading(false);
	}
}

// Filters
function populateMerchantFilter(merchants) {
	const sel = $("filterMerchant");
	if (!sel) return;
	sel.innerHTML = '<option value="">All Merchants</option>';
	merchants.forEach((m) => {
		const opt = document.createElement("option");
		opt.value = m.username;
		opt.textContent = m.name || m.username;
		sel.appendChild(opt);
	});
}

// Apply / reset re-query the server
function applyFilters() {
	loadAllData();
}

function resetFilters() {
	if ($("filterStartDate")) $("filterStartDate").value = "";
	if ($("filterEndDate")) $("filterEndDate").value = "";
	if ($("filterStatus")) $("filterStatus").value = "";
	if ($("filterMerchant")) $("filterMerchant").value = "";
	loadAllData();
}

// Render Everything
function renderAll(data) {
	renderSummaryCards(data.summary);
	renderRevenueChart(data.revenueByDay);
	renderStatusChart(data.summary.statusCounts);
	renderOrdersChart(data.ordersByDay);
	renderLocationsChart(data.topLocations);
	renderTopMerchants(data.topMerchants);
	renderTopDrivers(data.topDrivers);
	renderRecentOrders(data.recentOrders);
}

// Summary Cards
function renderSummaryCards(summary) {
	const s = summary || {};
	const counts = s.statusCounts || [0, 0, 0, 0, 0, 0, 0];
	setText("cardTotalOrders", (s.totalOrders || 0).toLocaleString());
	setText("cardTotalRevenue", "$" + (s.totalRevenue || 0).toLocaleString());
	setText("cardOrdersToday", (s.ordersToday || 0).toLocaleString());
	setText("cardWarehouse", counts[0]);
	setText("cardDelivered", counts[3]);
	setText("cardCancelled", counts[4]);
	setText("cardPaid", counts[5]);
	setText("cardActiveDrivers", s.activeDrivers || 0);
}

function dayLabel(key) {
	const [y, m, d] = key.split("-");
	return new Date(y, m - 1, d).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

// Revenue Chart (Line)
function renderRevenueChart(revenueByDay = []) {
	const ctx = $("chartRevenue");
	if (!ctx) return;
	if (chartRevenue) chartRevenue.destroy();

	const labels = revenueByDay.map((r) => dayLabel(r.date));
	const data = revenueByDay.map((r) => r.value);

	chartRevenue = new Chart(ctx, {
		type: "line",
		data: {
			labels,
			datasets: [
				{
					label: "Revenue ($)",
					data,
					borderColor: "#3b82f6",
					backgroundColor: "rgba(59,130,246,0.1)",
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
				y: {
					beginAtZero: true,
					ticks: { callback: (v) => "$" + v.toLocaleString() },
				},
			},
		},
	});
}

// Status Chart
function renderStatusChart(counts = [0, 0, 0, 0, 0, 0, 0]) {
	const ctx = $("chartStatus");
	if (!ctx) return;
	if (chartStatus) chartStatus.destroy();

	chartStatus = new Chart(ctx, {
		type: "doughnut",
		data: {
			labels: STATUS_NAMES,
			datasets: [
				{
					data: counts,
					backgroundColor: STATUS_COLORS,
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
					labels: { padding: 14, font: { size: 11 } },
				},
			},
		},
	});
}

// Orders Over Time
function renderOrdersChart(ordersByDay = []) {
	const ctx = $("chartOrders");
	if (!ctx) return;
	if (chartOrders) chartOrders.destroy();

	const labels = ordersByDay.map((o) => dayLabel(o.date));
	const data = ordersByDay.map((o) => o.count);

	chartOrders = new Chart(ctx, {
		type: "bar",
		data: {
			labels,
			datasets: [
				{
					label: "Orders",
					data,
					backgroundColor: "rgba(99,102,241,0.7)",
					borderRadius: 6,
					maxBarThickness: 40,
				},
			],
		},
		options: {
			responsive: true,
			plugins: { legend: { display: false } },
			scales: { y: { beginAtZero: true } },
		},
	});
}

// Top Locations
function renderLocationsChart(topLocations = []) {
	const ctx = $("chartLocations");
	if (!ctx) return;
	if (chartLocations) chartLocations.destroy();

	const labels = topLocations.map((l) => l.district);
	const data = topLocations.map((l) => l.count);

	chartLocations = new Chart(ctx, {
		type: "bar",
		data: {
			labels,
			datasets: [
				{
					label: "Orders",
					data,
					backgroundColor: "rgba(34,197,94,0.7)",
					borderRadius: 6,
					maxBarThickness: 24,
				},
			],
		},
		options: {
			responsive: true,
			indexAxis: "y",
			plugins: { legend: { display: false } },
			scales: { x: { beginAtZero: true } },
		},
	});
}

// Top Merchants
function renderTopMerchants(topMerchants = []) {
	const tbody = $("tableMerchants");
	if (!tbody) return;

	if (topMerchants.length === 0) {
		tbody.innerHTML =
			'<tr><td colspan="4" style="text-align:center; color:#94a3b8;">No data</td></tr>';
		return;
	}

	tbody.innerHTML = topMerchants
		.map(
			(m, i) => `
        <tr>
            <td><div class="rank ${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""}">${i + 1}</div></td>
            <td>${escapeHtml(m.name)}</td>
            <td>${m.orders}</td>
            <td>$${m.revenue.toLocaleString()}</td>
        </tr>
    `,
		)
		.join("");
}

// Top Drivers
function renderTopDrivers(topDrivers = []) {
	const tbody = $("tableDrivers");
	if (!tbody) return;

	if (topDrivers.length === 0) {
		tbody.innerHTML =
			'<tr><td colspan="4" style="text-align:center; color:#94a3b8;">No data</td></tr>';
		return;
	}

	tbody.innerHTML = topDrivers
		.map(
			(d, i) => `
        <tr>
            <td><div class="rank ${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""}">${i + 1}</div></td>
            <td>${escapeHtml(d.name || d.username)}</td>
            <td>${d.deliveries}</td>
            <td>$${d.revenue.toLocaleString()}</td>
        </tr>
    `,
		)
		.join("");
}

// Recent Orders Table
function renderRecentOrders(recentOrders = []) {
	const tbody = $("tableRecentOrders");
	if (!tbody) return;

	if (recentOrders.length === 0) {
		tbody.innerHTML =
			'<tr><td colspan="7" style="text-align:center; color:#94a3b8;">No orders found</td></tr>';
		return;
	}

	tbody.innerHTML = recentOrders
		.map((o) => {
			const date = o.createdAt
				? new Date(o.createdAt).toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
						year: "numeric",
					})
				: "—";
			const statusClass = STATUS_CLASSES[o.s] || "";
			const statusName = STATUS_NAMES[o.s] || "Unknown";
			const customer = `${o.c?.f || ""} ${o.c?.l || ""}`.trim() || "—";
			const location = o.c?.loc?.d
				? `${o.c.loc.cty || ""}, ${o.c.loc.d}`
				: "—";
			return `
            <tr>
                <td style="font-weight:600;">${escapeHtml(o.id)}</td>
                <td>${escapeHtml(o.m)}</td>
                <td>${escapeHtml(customer)}</td>
                <td>${escapeHtml(location)}</td>
                <td>$${(o.pr?.t || 0).toLocaleString()}</td>
                <td><span class="an-status ${statusClass}">${statusName}</span></td>
                <td>${date}</td>
            </tr>
        `;
		})
		.join("");
}

// Utilities
function escapeHtml(str) {
	if (!str) return "";
	const div = document.createElement("div");
	div.textContent = str;
	return div.innerHTML;
}

// Init — everything comes from the server-aggregated /api/analytics endpoint
document.addEventListener("DOMContentLoaded", () => {
	loadAllData();

	$("applyFiltersBtn")?.addEventListener("click", applyFilters);
	$("resetFiltersBtn")?.addEventListener("click", resetFilters);
	$("retryBtn")?.addEventListener("click", loadAllData);
	$("refreshBtn")?.addEventListener("click", loadAllData);

	// Re-query automatically when a filter control changes
	["filterStartDate", "filterEndDate", "filterStatus", "filterMerchant"].forEach(
		(id) => $(id)?.addEventListener("change", applyFilters),
	);
});

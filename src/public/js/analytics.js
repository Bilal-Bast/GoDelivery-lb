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

// State
let allOrders = [];
let allDrivers = [];
let allMerchants = [];
let filteredOrders = [];

// Chart instances for destroy/re-render
let chartRevenue, chartStatus, chartOrders, chartLocations;

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

// API Fetching (used for manual refresh only)
async function fetchJSON(endpoint) {
	const res = await fetch(`${API_BASE}${endpoint}`, {
		credentials: "include",
	});
	if (!res.ok) throw new Error(`${endpoint}: ${res.statusText}`);
	return res.json();
}

async function loadAllData() {
	showLoading(true);
	hideError();
	try {
		const [orders, drivers, merchants] = await Promise.all([
			fetchJSON("/orders"),
			fetchJSON("/drivers"),
			fetchJSON("/merchants"),
		]);
		allOrders = orders;
		allDrivers = drivers;
		allMerchants = merchants;

		populateMerchantFilter();
		applyFilters();

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
function populateMerchantFilter() {
	const sel = $("filterMerchant");
	if (!sel) return;

	sel.innerHTML = '<option value="">All Merchants</option>';

	// extract unique merchant names from orders
	const names = [...new Set(allOrders.map((o) => o.m))].sort();
	names.forEach((n) => {
		const opt = document.createElement("option");
		opt.value = n;
		opt.textContent = n;
		sel.appendChild(opt);
	});
}

function applyFilters() {
	const startDate = $("filterStartDate")?.value;
	const endDate = $("filterEndDate")?.value;
	const statusVal = $("filterStatus")?.value;
	const merchantVal = $("filterMerchant")?.value;

	filteredOrders = allOrders.filter((o) => {
		if (startDate && o.createdAt) {
			if (new Date(o.createdAt) < new Date(startDate)) return false;
		}
		if (endDate && o.createdAt) {
			const end = new Date(endDate);
			end.setHours(23, 59, 59, 999);
			if (new Date(o.createdAt) > end) return false;
		}
		if (statusVal !== "" && statusVal !== undefined) {
			if (o.s !== Number(statusVal)) return false;
		}
		if (merchantVal) {
			if (o.m !== merchantVal) return false;
		}
		return true;
	});

	renderAll();
}

function resetFilters() {
	if ($("filterStartDate")) $("filterStartDate").value = "";
	if ($("filterEndDate")) $("filterEndDate").value = "";
	if ($("filterStatus")) $("filterStatus").value = "";
	if ($("filterMerchant")) $("filterMerchant").value = "";
	applyFilters();
}

// Render Everything
function renderAll() {
	renderSummaryCards();
	renderRevenueChart();
	renderStatusChart();
	renderOrdersChart();
	renderLocationsChart();
	renderTopMerchants();
	renderTopDrivers();
	renderRecentOrders();
}

// Summary Cards
function renderSummaryCards() {
	const orders = filteredOrders;
	const total = orders.length;
	const revenue = orders.reduce((sum, o) => sum + (o.pr?.t || 0), 0);

	const today = new Date().toDateString();
	const ordersToday = orders.filter(
		(o) => new Date(o.createdAt).toDateString() === today,
	).length;

	const counts = [0, 0, 0, 0, 0, 0, 0];
	orders.forEach((o) => {
		if (o.s >= 0 && o.s <= 6) counts[o.s]++;
	});

	// Active drivers = unique driver names assigned to non-delivered/cancelled orders
	const activeDriverNames = new Set(
		orders.filter((o) => o.driver && o.s < 3).map((o) => o.driver),
	);

	setText("cardTotalOrders", total.toLocaleString());
	setText("cardTotalRevenue", "$" + revenue.toLocaleString());
	setText("cardOrdersToday", ordersToday.toLocaleString());
	setText("cardWarehouse", counts[0]);
	setText("cardDelivered", counts[3]);
	setText("cardCancelled", counts[4]);
	setText("cardPaid", counts[5]);
	setText("cardActiveDrivers", activeDriverNames.size);
}

// Revenue Chart (Line)
function renderRevenueChart() {
	const ctx = $("chartRevenue");
	if (!ctx) return;
	if (chartRevenue) chartRevenue.destroy();

	const dayMap = {};
	filteredOrders.forEach((o) => {
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
		return new Date(y, m - 1, d).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	});
	const data = sorted.map(([, v]) => v);

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
function renderStatusChart() {
	const ctx = $("chartStatus");
	if (!ctx) return;
	if (chartStatus) chartStatus.destroy();

	const counts = [0, 0, 0, 0, 0, 0, 0];
	filteredOrders.forEach((o) => {
		if (o.s >= 0 && o.s <= 6) counts[o.s]++;
	});

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
function renderOrdersChart() {
	const ctx = $("chartOrders");
	if (!ctx) return;
	if (chartOrders) chartOrders.destroy();

	const dayMap = {};
	filteredOrders.forEach((o) => {
		if (!o.createdAt) return;
		const d = new Date(o.createdAt);
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");
		const key = `${y}-${m}-${day}`;
		dayMap[key] = (dayMap[key] || 0) + 1;
	});

	const sorted = Object.entries(dayMap).sort((a, b) =>
		a[0].localeCompare(b[0]),
	);
	const labels = sorted.map(([k]) => {
		const [y, m, d] = k.split("-");
		return new Date(y, m - 1, d).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	});
	const data = sorted.map(([, v]) => v);

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
function renderLocationsChart() {
	const ctx = $("chartLocations");
	if (!ctx) return;
	if (chartLocations) chartLocations.destroy();

	const locMap = {};
	filteredOrders.forEach((o) => {
		const district = o.c?.loc?.d;
		if (district) locMap[district] = (locMap[district] || 0) + 1;
	});

	const sorted = Object.entries(locMap)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10);
	const labels = sorted.map(([k]) => k);
	const data = sorted.map(([, v]) => v);

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
function renderTopMerchants() {
	const tbody = $("tableMerchants");
	if (!tbody) return;

	const map = {};
	filteredOrders.forEach((o) => {
		const merchantName = o.m || "Unknown";
		if (!map[merchantName]) map[merchantName] = { orders: 0, revenue: 0 };
		map[merchantName].orders++;
		map[merchantName].revenue += o.pr?.t || 0;
	});

	const sorted = Object.entries(map)
		.sort((a, b) => b[1].orders - a[1].orders)
		.slice(0, 10);

	if (sorted.length === 0) {
		tbody.innerHTML =
			'<tr><td colspan="4" style="text-align:center; color:#94a3b8;">No data</td></tr>';
		return;
	}

	tbody.innerHTML = sorted
		.map(
			([name, d], i) => `
        <tr>
            <td><div class="rank ${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""}">${i + 1}</div></td>
            <td>${escapeHtml(name)}</td>
            <td>${d.orders}</td>
            <td>$${d.revenue.toLocaleString()}</td>
        </tr>
    `,
		)
		.join("");
}

// Top Drivers
function renderTopDrivers() {
	const tbody = $("tableDrivers");
	if (!tbody) return;

	const map = {};
	filteredOrders.forEach((o) => {
		const driverName = o.driver;
		if (!driverName) return;
		if (!map[driverName]) map[driverName] = { deliveries: 0, revenue: 0 };
		map[driverName].deliveries++;
		map[driverName].revenue += o.pr?.t || 0;
	});

	const sorted = Object.entries(map)
		.sort((a, b) => b[1].deliveries - a[1].deliveries)
		.slice(0, 10);

	if (sorted.length === 0) {
		tbody.innerHTML =
			'<tr><td colspan="4" style="text-align:center; color:#94a3b8;">No data</td></tr>';
		return;
	}

	// Lookup driver display names
	const driverLookup = {};
	allDrivers.forEach((d) => {
		driverLookup[d.username] =
			d.name ||
			`${d.firstName || ""} ${d.lastName || ""}`.trim() ||
			d.username;
	});

	tbody.innerHTML = sorted
		.map(
			([username, d], i) => `
        <tr>
            <td><div class="rank ${i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : ""}">${i + 1}</div></td>
            <td>${escapeHtml(driverLookup[username] || username)}</td>
            <td>${d.deliveries}</td>
            <td>$${d.revenue.toLocaleString()}</td>
        </tr>
    `,
		)
		.join("");
}

// Recent Orders Table
function renderRecentOrders() {
	const tbody = $("tableRecentOrders");
	if (!tbody) return;

	// Explicitly sort by date descending to guarantee latest orders
	const sortedCopy = [...filteredOrders].sort((a, b) => {
		const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
		const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
		return db - da;
	});
	const recent = sortedCopy.slice(0, 20);

	if (recent.length === 0) {
		tbody.innerHTML =
			'<tr><td colspan="7" style="text-align:center; color:#94a3b8;">No orders found</td></tr>';
		return;
	}

	tbody.innerHTML = recent
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

// Init — use server-rendered data on first load; loadAllData() is kept for refresh
document.addEventListener("DOMContentLoaded", () => {
	const initData = window.__INIT_DATA__ || {};
	if (initData.orders) {
		allOrders = initData.orders;
		allDrivers = initData.drivers || [];
		allMerchants = initData.merchants || [];
		populateMerchantFilter();
		applyFilters();
		setText(
			"lastUpdated",
			`Last updated: ${new Date().toLocaleTimeString()}`,
		);
	} else {
		loadAllData();
	}

	document
		.getElementById("refreshBtn")
		?.addEventListener("click", loadAllData);
});

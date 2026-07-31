const API = "/api";
let currentUser = null;
let allOrders = [];
let filteredOrders = [];
let currentPage = 1;
const PAGE_SIZE = 15;
let revenueChartInstance = null;
let statusChartInstance = null;

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

	setupSidebar();
	setupNavButtons();
	setupSectionNav();
	setupOrdersSection();
	initLocationSearch(initData.locations || []);
	setupSettings();
	setupNotifications();

	populateDashboard();
	populateAnalytics();
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
		currentPage = 1;
	} catch (err) {
		console.error("Error loading orders:", err);
		allOrders = [];
		filteredOrders = [];
	}
}

// Dashboard
function populateDashboard() {
	const total = allOrders.length;
	const totalSales = allOrders.reduce(
		(sum, order) =>
			sum + (
				order.cancelledBy !== null || order.s === "CANCELED" || order.collectedBack
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
            <td>$${(o.pr?.t || 0).toFixed(0)}</td>
            <td>${statusBadge(o.s)}</td>
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
	document
		.getElementById("statusFilter")
		?.addEventListener("change", applyFilters);
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
	msg.className = "message";
	msg.style.display = "none";

	const orderId = document.getElementById("orderId").value.trim();
	const phone = document.getElementById("phoneNumber").value.trim();
	const firstName = document.getElementById("firstName").value.trim();
	const lastName = document.getElementById("lastName").value.trim();
	const district = document.getElementById("selectedLocation").value;
	const city = document.getElementById("selectedCity").value;
	const totalPrice =
		parseFloat(document.getElementById("totalPrice").value) || 0;
	const deliveryCharge =
		parseFloat(document.getElementById("deliveryCharge").value) || 0;
	const exchange = document.getElementById("exchangeToggle").checked;
	const exchangeNotes = document.getElementById("exchangeNotes")?.value || "";
	const countryCode = document.getElementById("countryCode").value;

	if (!orderId || !phone || !firstName || !district || !totalPrice) {
		msg.className = "message error";
		msg.textContent = "Please fill all required fields";
		return;
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
					loc: { d: district, cty: city },
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
	const status = document.getElementById("statusFilter").value;
	const search = document.getElementById("searchInput").value.toLowerCase();
	const startDate = document.getElementById("startDate").value;
	const endDate = document.getElementById("endDate").value;

	filteredOrders = allOrders.filter((o) => {
		if (status !== "" && o.s !== parseInt(status)) return false;
		if (search) {
			const haystack =
				`${o.id} ${o.c?.f} ${o.c?.l} ${o.c?.p} ${o.c?.loc?.cty} ${o.c?.loc?.d}`.toLowerCase();
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
	document.getElementById("statusFilter").value = "";
	document.getElementById("searchInput").value = "";
	document.getElementById("startDate").value = "";
	document.getElementById("endDate").value = "";
	filteredOrders = [...allOrders];
	currentPage = 1;
	renderOrdersTable();
}

function renderOrdersTable() {
	const tbody = document.getElementById("ordersTableBody");

	// Stats
	updateOrderStats();

	if (!filteredOrders.length) {
		tbody.innerHTML =
			'<tr><td colspan="10" class="empty-state">No orders found</td></tr>';
		updatePagination(0);
		return;
	}

	const start = (currentPage - 1) * PAGE_SIZE;
	const pageOrders = filteredOrders.slice(start, start + PAGE_SIZE);

	tbody.innerHTML = pageOrders
		.map((o) => {
			const priceWithoutDelivery = (o.pr?.t || 0) - (o.pr?.d || 0);
			return `
        <tr>
            <td><strong>${o.id || "N/A"}</strong></td>
            <td>${o.c?.f || ""}${o.c?.l ? " " + o.c.l : ""}</td>
            <td>${o.c?.p || "—"}</td>
            <td>${o.c?.loc?.cty || ""}${o.c?.loc?.d ? ", " + o.c.loc.d : ""}</td>
            <td>$${priceWithoutDelivery.toFixed(0)}</td>
            <td>$${(o.pr?.d || 0).toFixed(0)}</td>
            <td><strong>$${(o.pr?.t || 0).toFixed(0)}</strong></td>
            <td>${statusBadge(o.s)}</td>
            <td>${o.driver || '<span style="color:#94a3b8">—</span>'}</td>
            <td>${formatDate(o.createdAt)}</td>
        </tr>`;
		})
		.join("");

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
				o.cancelledBy !== null || o.s === "CANCELED" || o.collectedBack
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
				order.cancelledBy !== null || order.s === "CANCELED" || order.collectedBack
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
		return new Date(y, m - 1, d).toLocaleDateString("en-US", {
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
					label: "Revenue ($)",
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
			],
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
		if (o.cancelledBy !== null || o.s === 4 || o.collectedBack) return;

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
            <td>${loc}</td>
            <td>${data.count}</td>
            <td>$${data.revenue.toFixed(0)}</td>
        </tr>
    `,
		)
		.join("");
}
// Location Search
let locationsData = [];

function initLocationSearch(locations) {
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

	searchInput.addEventListener("focus", () =>
		renderLocDropdown("", dropdown),
	);
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
                <span class="district">${loc.districtEn}</span>
            `;
			item.onclick = () => {
				searchInput.value = `${loc.cityEn}, ${loc.districtEn}`;
				selectedLoc.value = loc.districtEn;
				selectedCity.value = loc.cityEn;
				dd.classList.remove("show");
				autoFillDeliveryCharge(loc.districtEn);
			};
			dd.appendChild(item);
		});
	}
}

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
	{ code: "+961", name: "Lebanon", flag: "🇱🇧" },
	{ code: "+1", name: "United States", flag: "🇺🇸" },
	{ code: "+44", name: "United Kingdom", flag: "🇬🇧" },
	{ code: "+33", name: "France", flag: "🇫🇷" },
	{ code: "+49", name: "Germany", flag: "🇩🇪" },
	{ code: "+971", name: "UAE", flag: "🇦🇪" },
	{ code: "+966", name: "Saudi Arabia", flag: "🇸🇦" },
	{ code: "+20", name: "Egypt", flag: "🇪🇬" },
	{ code: "+962", name: "Jordan", flag: "🇯🇴" },
	{ code: "+964", name: "Iraq", flag: "🇮🇶" },
	{ code: "+963", name: "Syria", flag: "🇸🇾" },
	{ code: "+90", name: "Turkey", flag: "🇹🇷" },
	{ code: "+61", name: "Australia", flag: "🇦🇺" },
	{ code: "+86", name: "China", flag: "🇨🇳" },
	{ code: "+91", name: "India", flag: "🇮🇳" },
	{ code: "+55", name: "Brazil", flag: "🇧🇷" },
];

(function setupCountrySelector() {
	const display = document.getElementById("countryDisplay");
	const search = document.getElementById("countrySearch");
	const dropdown = document.getElementById("countryDropdown");
	const codeInput = document.getElementById("countryCode");
	const flagEl = document.getElementById("countryFlag");
	const nameEl = document.getElementById("countryName");

	if (!display) return;

	function render(filter = "") {
		dropdown.innerHTML = "";
		const f = filter.toLowerCase();
		countryCodes
			.filter(
				(c) => c.name.toLowerCase().includes(f) || c.code.includes(f),
			)
			.forEach((c) => {
				const item = document.createElement("div");
				item.style.cssText =
					"padding:10px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;";
				item.innerHTML = `<span style="font-size:18px">${c.flag}</span> ${c.name} (${c.code})`;
				item.onmouseenter = () => (item.style.background = "#f1f5f9");
				item.onmouseleave = () => (item.style.background = "");
				item.onclick = () => {
					codeInput.value = c.code;
					flagEl.textContent = c.flag;
					nameEl.textContent = c.code;
					dropdown.style.display = "none";
					search.style.display = "none";
					display.style.display = "flex";
				};
				dropdown.appendChild(item);
			});
	}

	display.addEventListener("click", () => {
		display.style.display = "none";
		search.style.display = "block";
		search.focus();
		dropdown.style.display = "block";
		render();
	});

	search.addEventListener("input", (e) => render(e.target.value));

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
	set(
		"settCashPct",
		currentUser.cashPercentage != null
			? currentUser.cashPercentage + "%"
			: null,
	);

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
		const today = new Date().toLocaleDateString("en-US", {
			weekday: "long",
		});
		if (currentUser.paymentDay === today) {
			const badge = document.querySelector(".notification-badge");
			if (badge) badge.classList.add("active");
			document
				.getElementById("notificationBtn")
				?.addEventListener("click", () => {
					alert("💰 Payment Due Today! Please make your payment.");
				});
		}
	}
}

// Helpers
function statusBadge(s) {
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
	return new Date(dateStr).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

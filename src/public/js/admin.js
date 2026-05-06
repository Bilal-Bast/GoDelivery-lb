// Shared admin page initializer — included by admin, orders, users, analytics, settings, collect, pay pages.
// Auth is handled server-side; this only sets up UI behavior.

function initAdminPage() {
	const currentUser = window.__CURRENT_USER__ || {};
	const username = currentUser.username || "Admin";
	const profileNameEl = document.getElementById("profileName");
	if (profileNameEl) profileNameEl.textContent = username;

	// Sidebar
	const sidebarToggle = document.getElementById("sidebarToggle");
	const closeSidebar = document.getElementById("closeSidebar");
	const sidebar = document.getElementById("sidebar");
	const mainContent = document.querySelector(".main-content");

	if (sidebarToggle && sidebar) {
		sidebarToggle.addEventListener("click", () => {
			sidebar.classList.toggle("active");
			mainContent?.classList.toggle("sidebar-open");
		});

		sidebarToggle.addEventListener("mouseenter", () => {
			sidebar.classList.add("active");
			mainContent?.classList.add("sidebar-open");
		});

		sidebar.addEventListener("mouseenter", () => {
			sidebar.classList.add("active");
			mainContent?.classList.add("sidebar-open");
		});

		sidebar.addEventListener("mouseleave", () => {
			sidebar.classList.remove("active");
			mainContent?.classList.remove("sidebar-open");
		});
	}

	if (closeSidebar && sidebar) {
		closeSidebar.addEventListener("click", () => {
			sidebar.classList.remove("active");
			mainContent?.classList.remove("sidebar-open");
		});
	}

	const menuLinks = document.querySelectorAll(".sidebar-menu a");
	menuLinks.forEach((link) => {
		link.addEventListener("click", () => {
			sidebar?.classList.remove("active");
			mainContent?.classList.remove("sidebar-open");
		});
	});

	document.getElementById("profileBtn")?.addEventListener("click", () => {
		window.location.href = "/settings";
	});

	// Logout — clears HTTP-only cookie server-side
	document.getElementById("logoutBtn")?.addEventListener("click", () => {
		window.location.href = "/logout";
	});

	document.addEventListener("click", (e) => {
		if (sidebar && sidebarToggle &&
			!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
			sidebar.classList.remove("active");
			mainContent?.classList.remove("sidebar-open");
		}
	});

	// Notifications — use server-provided merchant data
	function checkNotifications() {
		const badge = document.getElementById("notificationBadge");
		const list = document.getElementById("notificationList");
		const btn = document.getElementById("notificationBtn");
		const dropdown = document.getElementById("notificationDropdown");
		if (!badge || !list || !btn || !dropdown) return;

		const merchants = window.__INIT_DATA__?.merchants || [];
		const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

		const dueMerchants = merchants.filter(
			(m) =>
				m.accountType === "postpaid" &&
				m.paymentDay?.toLowerCase() === today.toLowerCase(),
		);

		if (dueMerchants.length > 0) {
			badge.classList.add("active");
			list.innerHTML = dueMerchants
				.map((m) => {
					const name = [m.firstName, m.lastName].filter(Boolean).join(" ") || m.username;
					return `<div class="notification-item">
						<div class="notif-icon"><i class='bx bx-money'></i></div>
						<div class="notif-text">
							<p>Postpaid payment is required today for <strong>${name}</strong></p>
							<div class="notif-time">Due: ${today}</div>
						</div>
					</div>`;
				})
				.join("");
		} else {
			badge.classList.remove("active");
			list.innerHTML = '<div class="notification-empty">No notifications</div>';
		}

		btn.addEventListener("click", (e) => {
			e.stopPropagation();
			dropdown.classList.toggle("show");
		});
		document.addEventListener("click", (e) => {
			if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
				dropdown.classList.remove("show");
			}
		});
	}

	// Admin dashboard stats — use server-provided order data
	function loadDashboardData() {
		if (!document.getElementById("anTotalRevenue")) return;

		const orders = window.__INIT_DATA__?.orders || [];
		const counts = { warehouse: 0, new: 0, picked: 0, delivered: 0, canceled: 0, paid: 0 };
		let totalRevenue = 0;
		let deliveredCount = 0;

		orders.forEach((o) => {
			if (o.s === 0) counts.warehouse++;
			else if (o.s === 1) counts.new++;
			else if (o.s === 2) counts.picked++;
			else if (o.s === 3) { counts.delivered++; deliveredCount++; }
			else if (o.s === 4) counts.canceled++;
			else if (o.s === 5) { counts.paid++; deliveredCount++; }
			if (o.pr?.t) totalRevenue += o.pr.t;
		});

		const safeSet = (id, val) => {
			const el = document.getElementById(id);
			if (el) el.textContent = val;
		};
		safeSet("warehouse", counts.warehouse);
		safeSet("new", counts.new);
		safeSet("picked", counts.picked);
		safeSet("delivered", counts.delivered);
		safeSet("canceled", counts.canceled);
		safeSet("paid", counts.paid);

		const totalOrders = orders.length;
		safeSet("anTotalRevenue", `$${totalRevenue.toFixed(0)}`);
		safeSet("anAvgOrder", totalOrders ? `$${(totalRevenue / totalOrders).toFixed(0)}` : "$0");
		safeSet("anDeliveryRate", totalOrders ? `${((deliveredCount / totalOrders) * 100).toFixed(1)}%` : "0%");
		safeSet("anCancelRate", totalOrders ? `${((counts.canceled / totalOrders) * 100).toFixed(1)}%` : "0%");

		renderRevenueChart(orders);
		renderStatusChart(counts);
	}

	function renderRevenueChart(orders) {
		const ctx = document.getElementById("revenueChart");
		if (!ctx) return;
		const dayMap = {};
		orders.forEach((o) => {
			if (!o.createdAt) return;
			const d = new Date(o.createdAt);
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
			dayMap[key] = (dayMap[key] || 0) + (o.pr?.t || 0);
		});
		const sorted = Object.entries(dayMap).sort((a, b) => a[0].localeCompare(b[0]));
		new Chart(ctx, {
			type: "line",
			data: {
				labels: sorted.map(([k]) => {
					const [y, m, d] = k.split("-");
					return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
				}),
				datasets: [{ label: "Revenue ($)", data: sorted.map(([, v]) => v), borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.1)", fill: true, tension: 0.4 }],
			},
			options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => "$" + v } } } },
		});
	}

	function renderStatusChart(counts) {
		const ctx = document.getElementById("statusChart");
		if (!ctx) return;
		new Chart(ctx, {
			type: "doughnut",
			data: {
				labels: ["Warehouse", "New", "Picked Up", "Delivered", "Cancelled", "Paid"],
				datasets: [{ data: [counts.warehouse, counts.new, counts.picked, counts.delivered, counts.canceled, counts.paid], backgroundColor: ["#f59e0b", "#06b6d4", "#8b5cf6", "#22c55e", "#ef4444", "#10b981"], borderWidth: 0 }],
			},
			options: { responsive: true, cutout: "60%", plugins: { legend: { position: "bottom" } } },
		});
	}

	checkNotifications();
	loadDashboardData();
}

document.addEventListener("DOMContentLoaded", initAdminPage);

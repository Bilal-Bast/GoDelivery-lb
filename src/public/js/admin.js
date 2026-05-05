async function loadComponent(slotId, componentPath) {
	const slot = document.getElementById(slotId);
	if (!slot) return;
	const res = await fetch(componentPath);
	slot.innerHTML = await res.text();
}

async function initAdminPage() {
	await Promise.all([
		loadComponent("adminNav", "./components/nav/admin-nav.pug"),
		loadComponent("adminSidebar", "./components/nav/admin-sidebar.pug"),
	]);

	const currentPage = window.location.pathname.split("/").pop();
	const role = localStorage.getItem("role");
	const token = localStorage.getItem("token");

	if (!token) {
		window.location.href = "signin.pug";
	}

	// Role-based protection
	if (
		(currentPage === "admin.pug" || currentPage === "settings.pug") &&
		role !== "admin"
	) {
		window.location.href = "signin.pug";
	}

	if (currentPage === "driver.pug" && role !== "driver") {
		window.location.href = "signin.pug";
	}

	// Get the username from localStorage and display it
	const username = localStorage.getItem("username") || "Admin";
	document.getElementById("profileName").textContent = username;

	// Sidebar Toggle Functionality
	const sidebarToggle = document.getElementById("sidebarToggle");
	const closeSidebar = document.getElementById("closeSidebar");
	const sidebar = document.getElementById("sidebar");
	const mainContent = document.querySelector(".main-content");

	sidebarToggle.addEventListener("click", () => {
		sidebar.classList.toggle("active");
		mainContent.classList.toggle("sidebar-open");
	});

	closeSidebar.addEventListener("click", () => {
		sidebar.classList.remove("active");
		mainContent.classList.remove("sidebar-open");
	});

	// Open sidebar when hovering the hamburger button
	sidebarToggle.addEventListener("mouseenter", () => {
		sidebar.classList.add("active");
		mainContent.classList.add("sidebar-open");
	});

	// Sidebar Hover Functionality
	sidebar.addEventListener("mouseenter", () => {
		sidebar.classList.add("active");
		mainContent.classList.add("sidebar-open");
	});

	sidebar.addEventListener("mouseleave", () => {
		sidebar.classList.remove("active");
		mainContent.classList.remove("sidebar-open");
	});

	// Close sidebar when clicking on a menu item
	const menuLinks = document.querySelectorAll(".sidebar-menu a");
	menuLinks.forEach((link) => {
		link.addEventListener("click", () => {
			sidebar.classList.remove("active");
			mainContent.classList.remove("sidebar-open");
		});
	});

	// Profile Button Navigation
	const profileBtn = document.getElementById("profileBtn");
	profileBtn?.addEventListener("click", () => {
		window.location.href = "settings.pug";
	});

	// Logout Button
	const logoutBtn = document.getElementById("logoutBtn");
	if (logoutBtn) {
		logoutBtn.addEventListener("click", () => {
			localStorage.removeItem("signedIn");
			localStorage.removeItem("role");
			localStorage.removeItem("username");
			window.location.href = "signin.pug";
		});
	}

	// Close sidebar when clicking outside of it
	document.addEventListener("click", (e) => {
		if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
			if (sidebar.classList.contains("active")) {
				sidebar.classList.remove("active");
				mainContent.classList.remove("sidebar-open");
			}
		}
	});

	// Notifications Logic
	async function checkNotifications() {
		const badge = document.getElementById("notificationBadge");
		const list = document.getElementById("notificationList");
		const btn = document.getElementById("notificationBtn");
		const dropdown = document.getElementById("notificationDropdown");

		if (!badge || !list || !btn || !dropdown) return;

		try {
			const res = await fetch("http://localhost:3000/merchants");
			if (!res.ok) throw new Error("Failed to fetch merchants");
			const merchants = await res.json();

			// Get today
			const today = new Date().toLocaleDateString("en-US", {
				weekday: "long",
			});

			// Filter postpaid
			const dueMerchants = merchants.filter(
				(m) =>
					m.accountType === "postpaid" &&
					m.paymentDay &&
					m.paymentDay.toLowerCase() === today.toLowerCase(),
			);

			if (dueMerchants.length > 0) {
				badge.classList.add("active");

				list.innerHTML = dueMerchants
					.map((m) => {
						const name =
							[m.firstName, m.lastName]
								.filter(Boolean)
								.join(" ") || m.username;
						return `
                    <div class="notification-item">
                        <div class="notif-icon"><i class='bx bx-money'></i></div>
                        <div class="notif-text">
                            <p>Postpaid payment is required today for <strong>${name}</strong></p>
                            <div class="notif-time">Due: ${today}</div>
                        </div>
                    </div>
                `;
					})
					.join("");
			} else {
				badge.classList.remove("active");
				list.innerHTML =
					'<div class="notification-empty">No notifications</div>';
			}

			// Toggle dropdown bell
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				dropdown.classList.toggle("show");
			});

			// Close dropdown
			document.addEventListener("click", (e) => {
				if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
					dropdown.classList.remove("show");
				}
			});
		} catch (err) {
			console.error("Error checking notifications:", err);
		}
	}

	// Analytics and Dashboard Logic
	async function loadDashboardData() {
		if (currentPage !== "admin.pug") return;

		try {
			const res = await fetch("http://localhost:3000/orders", {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error("Failed to fetch orders");

			const orders = await res.json();

			const counts = {
				warehouse: 0,
				new: 0,
				picked: 0,
				delivered: 0,
				canceled: 0,
				paid: 0,
			};
			let totalRevenue = 0;
			let deliveredCount = 0;

			orders.forEach((o) => {
				if (o.s === 0) counts.warehouse++;
				else if (o.s === 1) counts.new++;
				else if (o.s === 2) counts.picked++;
				else if (o.s === 3) {
					counts.delivered++;
					deliveredCount++;
				} else if (o.s === 4) counts.canceled++;
				else if (o.s === 5) {
					counts.paid++;
					deliveredCount++;
				}

				if (o.pr && o.pr.t) totalRevenue += o.pr.t;
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

			// Analytics Cards
			const totalOrders = orders.length;
			safeSet("anTotalRevenue", `$${totalRevenue.toFixed(0)}`);
			safeSet(
				"anAvgOrder",
				totalOrders
					? `$${(totalRevenue / totalOrders).toFixed(0)}`
					: "$0",
			);
			safeSet(
				"anDeliveryRate",
				totalOrders
					? `${((deliveredCount / totalOrders) * 100).toFixed(1)}%`
					: "0%",
			);
			safeSet(
				"anCancelRate",
				totalOrders
					? `${((counts.canceled / totalOrders) * 100).toFixed(1)}%`
					: "0%",
			);

			// Render Charts
			renderRevenueChart(orders);
			renderStatusChart(counts);
		} catch (err) {
			console.error("Error loading dashboard data:", err);
		}
	}

	function renderRevenueChart(orders) {
		const ctx = document.getElementById("revenueChart");
		if (!ctx) return;

		// Group by day
		const dayMap = {};
		orders.forEach((o) => {
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

		new Chart(ctx, {
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
					},
				],
			},
			options: {
				responsive: true,
				plugins: { legend: { display: false } },
				scales: {
					y: {
						beginAtZero: true,
						ticks: { callback: (v) => "$" + v },
					},
				},
			},
		});
	}

	function renderStatusChart(counts) {
		const ctx = document.getElementById("statusChart");
		if (!ctx) return;

		new Chart(ctx, {
			type: "doughnut",
			data: {
				labels: [
					"Warehouse",
					"New",
					"Picked Up",
					"Delivered",
					"Cancelled",
					"Paid",
				],
				datasets: [
					{
						data: [
							counts.warehouse,
							counts.new,
							counts.picked,
							counts.delivered,
							counts.canceled,
							counts.paid,
						],
						backgroundColor: [
							"#f59e0b",
							"#06b6d4",
							"#8b5cf6",
							"#22c55e",
							"#ef4444",
							"#10b981",
						],
						borderWidth: 0,
					},
				],
			},
			options: {
				responsive: true,
				cutout: "60%",
				plugins: { legend: { position: "bottom" } },
			},
		});
	}

	// Check notifications on load
	document.addEventListener("DOMContentLoaded", () => {
		checkNotifications();
		loadDashboardData();
	});
}

document.addEventListener("DOMContentLoaded", initAdminPage);

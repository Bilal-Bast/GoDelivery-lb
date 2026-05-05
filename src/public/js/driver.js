const API_BASE_URL = "http://localhost:3000";
let currentToken = null;

// Auth Check & Initialization
document.addEventListener("DOMContentLoaded", async () => {
	currentToken = localStorage.getItem("token");
	if (!currentToken) {
		window.location.href = "signin.pug";
		return;
	}

	// Verify token
	try {
		const meRes = await fetch(`${API_BASE_URL}/me`, {
			headers: { Authorization: `Bearer ${currentToken}` },
		});

		if (!meRes.ok) throw new Error("Unauthorized");

		const userData = await meRes.json();
		if (userData.role !== "driver") {
			throw new Error("Not a driver");
		}

		document.getElementById("navDriverName").textContent =
			userData.username;
		document.getElementById("welcomeName").textContent =
			userData.firstName || userData.username;
		document.getElementById("profName").textContent =
			`${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
			userData.username;
		document.getElementById("profPhone").textContent =
			userData.phone || "No phone provided";

		loadDashboardStats();
		loadAssignedOrders();

		initSidebar();
		initNavigation();
		initPasswordChangeForm();
	} catch (err) {
		console.error("Auth verification failed:", err);
		localStorage.clear();
		window.location.href = "signin.pug";
	}
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
	localStorage.clear();
	window.location.href = "signin.pug";
});

// Sidebar Logic
function initSidebar() {
	const sidebar = document.getElementById("sidebar");
	const sidebarToggle = document.getElementById("sidebarToggle");
	const closeSidebar = document.getElementById("closeSidebar");

	sidebarToggle.addEventListener("click", () =>
		sidebar.classList.add("active"),
	);
	closeSidebar.addEventListener("click", () =>
		sidebar.classList.remove("active"),
	);

	document.addEventListener("click", (e) => {
		if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
			sidebar.classList.remove("active");
		}
	});
}

// Navigation Logic
function initNavigation() {
	const navLinks = {
		navDashboard: "dashboardSection",
		navOrders: "ordersSection",
		navProfile: "profileSection",
	};

	for (let linkId in navLinks) {
		document.getElementById(linkId).addEventListener("click", (e) => {
			e.preventDefault();
			document
				.querySelectorAll(".view-section")
				.forEach((sec) => sec.classList.remove("active"));
			document
				.querySelectorAll(".sidebar-menu a")
				.forEach((a) => a.classList.remove("active"));

			document.getElementById(navLinks[linkId]).classList.add("active");
			e.currentTarget.classList.add("active");

			if (window.innerWidth <= 768) {
				document.getElementById("sidebar").classList.remove("active");
			}

			if (linkId === "navOrders") loadAssignedOrders();
			if (linkId === "navDashboard") loadDashboardStats();
		});
	}

	// Call-to-action button on dashboard
	document.getElementById("goToOrdersBtn").addEventListener("click", () => {
		document.getElementById("navOrders").click();
	});

	document
		.getElementById("refreshOrdersBtn")
		.addEventListener("click", () => {
			loadAssignedOrders();
		});
}

// Data Loaders
async function loadDashboardStats() {
	try {
		const res = await fetch(`${API_BASE_URL}/api/driver/stats`, {
			headers: { Authorization: `Bearer ${currentToken}` },
		});
		if (!res.ok) throw new Error("Failed to load stats");

		const stats = await res.json();

		document.getElementById("statActive").textContent = stats.activeOrders;
		document.getElementById("bannerActiveCount").textContent =
			stats.activeOrders;
		document.getElementById("statToday").textContent =
			stats.todaysDeliveries;
		document.getElementById("statTotal").textContent =
			stats.totalDeliveries;
	} catch (err) {
		console.error("Error fetching stats:", err);
	}
}

async function loadAssignedOrders() {
	const container = document.getElementById("ordersContainer");
	container.innerHTML = `<div class="loading-state"><i class='bx bx-loader-alt bx-spin'></i> Loading your orders...</div>`;

	try {
		const res = await fetch(`${API_BASE_URL}/api/driver/orders`, {
			headers: { Authorization: `Bearer ${currentToken}` },
		});
		if (!res.ok) throw new Error("Failed to load orders");

		const orders = await res.json();
		container.innerHTML = "";

		const actionableOrders = orders.filter(
			(order) => order.s === 0 || order.s === 1 || order.s === 2,
		);

		if (actionableOrders.length === 0) {
			container.innerHTML = `
                <div class="empty-state">
                    <i class='bx bx-package' style="font-size: 48px; color: #cbd5e1; margin-bottom: 10px;"></i>
                    <h3>No Assigned Orders</h3>
                    <p>You currently do not have any orders assigned to you.</p>
                </div>
            `;
			return;
		}

		actionableOrders.forEach((order) => {
			container.appendChild(buildOrderCard(order));
		});
	} catch (err) {
		console.error("Error fetching orders:", err);
		container.innerHTML = `<div class="empty-state" style="color:var(--danger-color)">Failed to load orders. Please try again.</div>`;
	}
}

function buildOrderCard(order) {
	const statusMap = {
		0: "Warehouse",
		1: "New",
		2: "Picked Up",
		3: "Delivered",
		4: "Cancelled",
		5: "Paid",
	};
	const sClassMap = {
		0: "warehouse",
		1: "new",
		2: "picked",
		3: "delivered",
		4: "warehouse",
		5: "delivered",
	};

	const card = document.createElement("div");
	card.className = "order-card";

	let actionButtons = "";
	if (order.s === 0 || order.s === 1) {
		actionButtons = `<button class="btn primary-btn action-btn bg-blue" onclick="openActionModal('${order.id}', 2)">Mark Picked Up</button>`;
	} else if (order.s === 2) {
		actionButtons = `<button class="btn primary-btn action-btn" style="background:#6366f1" onclick="openActionModal('${order.id}', 'delivery')">Update Delivery Status</button>`;
	} else {
		actionButtons = `<button class="btn secondary-btn action-btn" disabled>No Actions Available</button>`;
	}

	card.innerHTML = `
        <div class="order-header">
            <span class="order-id">#${order.id}</span>
            <span class="status-badge ${sClassMap[order.s]}">${statusMap[order.s]}</span>
        </div>
        <div class="order-body">
            <div class="info-row">
                <i class='bx bx-user'></i>
                <div class="info-text">
                    <h4>Customer Name</h4>
                    <p>${order.c.f} ${order.c.l || ""} <br> <span style="color:var(--accent); font-size:13px; font-weight:600;"><a href="tel:${order.c.p}" style="text-decoration:none; color:inherit;">${order.c.p}</a></span></p>
                </div>
            </div>
            <div class="info-row">
                <i class='bx bx-map'></i>
                <div class="info-text">
                    <h4>Delivery Address</h4>
                    <p>${order.c.loc.cty}, ${order.c.loc.d}</p>
                </div>
            </div>
            <div class="info-row" style="margin-bottom:0;">
                <i class='bx bx-money'></i>
                <div class="info-text">
                    <h4>To Collect</h4>
                    <p style="font-weight:700; color:var(--success)">$${order.pr.t}</p>
                </div>
            </div>
        </div>
        <div class="order-footer">
            ${actionButtons}
        </div>
    `;

	return card;
}

// Action Modal Logic
const modal = document.getElementById("actionModal");
const closeBtn = document.querySelector(".close-modal");
const cancelBtn = document.getElementById("cancelActionBtn");

function openActionModal(orderId, mode) {
	document.getElementById("modalOrderId").textContent = orderId;
	document.getElementById("modalOrderRealId").value = orderId;
	document.getElementById("actionNote").value = "";

	const isPickup = mode === 2;
	document.getElementById("pickupGroup").style.display = isPickup
		? ""
		: "none";
	document.getElementById("deliveryGroup").style.display = isPickup
		? "none"
		: "";
	document.getElementById("confirmPickupBtn").style.display = isPickup
		? ""
		: "none";
	document.getElementById("confirmDeliveredBtn").style.display = isPickup
		? "none"
		: "";
	document.getElementById("confirmCanceledBtn").style.display = isPickup
		? "none"
		: "";

	modal.style.display = "flex";
}

function closeModalAlert() {
	modal.style.display = "none";
}

closeBtn.addEventListener("click", closeModalAlert);
cancelBtn.addEventListener("click", closeModalAlert);

async function submitStatusUpdate(orderId, statusCode, btn, originalLabel) {
	const note = document.getElementById("actionNote").value.trim();
	btn.disabled = true;
	btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Processing...`;

	try {
		const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${currentToken}`,
			},
			body: JSON.stringify({
				s: statusCode,
				note: note || undefined,
			}),
		});

		const data = await res.json().catch(() => ({}));

		if (!res.ok)
			throw new Error(data.error || data.message || "Failed to update");

		closeModalAlert();
		loadAssignedOrders();
		loadDashboardStats();
	} catch (err) {
		console.error(err);
		alert(err.message);
	} finally {
		btn.disabled = false;
		btn.innerHTML = originalLabel;
	}
}

// Pick Up button
document
	.getElementById("confirmPickupBtn")
	.addEventListener("click", function () {
		const orderId = document.getElementById("modalOrderRealId").value;
		submitStatusUpdate(orderId, 2, this, "✔ Confirm Pick Up");
	});

// Delivered button
document
	.getElementById("confirmDeliveredBtn")
	.addEventListener("click", function () {
		const orderId = document.getElementById("modalOrderRealId").value;
		submitStatusUpdate(orderId, 3, this, "✅ Delivered");
	});

// Canceled button
document
	.getElementById("confirmCanceledBtn")
	.addEventListener("click", function () {
		const orderId = document.getElementById("modalOrderRealId").value;
		submitStatusUpdate(orderId, 4, this, "✖ Canceled");
	});

// Profile Password Change
function initPasswordChangeForm() {
	const form = document.getElementById("passwordForm");
	const msg = document.getElementById("passwordMessage");

	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		const p1 = document.getElementById("newPassword").value;
		const p2 = document.getElementById("confirmPassword").value;

		if (p1 !== p2) {
			msg.textContent = "Passwords do not match.";
			msg.style.color = "var(--danger-color)";
			return;
		}

		const btn = form.querySelector("button");
		btn.disabled = true;
		btn.textContent = "Updating...";

		try {
			const res = await fetch(`${API_BASE_URL}/me`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${currentToken}`,
				},
				body: JSON.stringify({ password: p1 }),
			});

			if (!res.ok) throw new Error("Failed to update");

			msg.textContent = "Password updated successfully.";
			msg.style.color = "var(--success)";
			form.reset();
		} catch (err) {
			console.error(err);
			msg.textContent = "Failed to update password.";
			msg.style.color = "var(--danger-color)";
		} finally {
			btn.disabled = false;
			btn.textContent = "Update Password";
		}
	});
}

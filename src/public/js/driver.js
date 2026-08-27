const API_BASE_URL = "/api";
let driverBalance = null;
let collectionSessions = [];

// Auth is handled server-side. Use server-rendered data for initial load.
document.addEventListener("DOMContentLoaded", () => {
	const currentUser = window.__CURRENT_USER__ || {};
	const initData = window.__INIT_DATA__ || {};

	// Populate UI from server data
	const safeSet = (id, val) => {
		const el = document.getElementById(id);
		if (el) el.textContent = val;
	};
	safeSet("navDriverName", currentUser.username || "");
	safeSet(
		"welcomeName",
		currentUser.firstName || currentUser.username || "Driver",
	);

	const profile = initData.profile || currentUser;
	safeSet(
		"profName",
		`${profile.firstName || ""} ${profile.lastName || ""}`.trim() ||
			currentUser.username,
	);
	safeSet("profPhone", profile.phone || "No phone provided");

	// Populate stats from server data
	const stats = initData.stats || {};
	safeSet("statActive", stats.activeOrders ?? 0);
	safeSet("bannerActiveCount", stats.activeOrders ?? 0);
	safeSet("statToday", stats.todaysDeliveries ?? 0);
	safeSet("statTotal", stats.totalDeliveries ?? 0);

	// Render initial orders from server data
	renderOrders(initData.orders || []);

	driverBalance = initData.balance || null;
	collectionSessions = initData.collections || [];
	renderBalance();
	renderCollectionSessions();

	initSidebar();
	initNavigation();
	initPasswordChangeForm(currentUser);
});

// Logout — clears cookie server-side
document.getElementById("logoutBtn")?.addEventListener("click", () => {
	window.location.href = "/logout";
});

function initSidebar() {
	const sidebar = document.getElementById("sidebar");
	const sidebarToggle = document.getElementById("sidebarToggle");
	const closeSidebar = document.getElementById("closeSidebar");

	sidebarToggle?.addEventListener("click", () =>
		sidebar?.classList.add("active"),
	);
	closeSidebar?.addEventListener("click", () =>
		sidebar?.classList.remove("active"),
	);
	document.addEventListener("click", (e) => {
		if (
			sidebar &&
			sidebarToggle &&
			!sidebar.contains(e.target) &&
			!sidebarToggle.contains(e.target)
		) {
			sidebar.classList.remove("active");
		}
	});
}

function initNavigation() {
	const navLinks = {
		navDashboard: "dashboardSection",
		navOrders: "ordersSection",
		navBalance: "balanceSection",
		navProfile: "profileSection",
	};
	for (const linkId in navLinks) {
		document.getElementById(linkId)?.addEventListener("click", (e) => {
			e.preventDefault();
			document
				.querySelectorAll(".view-section")
				.forEach((s) => s.classList.remove("active"));
			document
				.querySelectorAll(".sidebar-menu a")
				.forEach((a) => a.classList.remove("active"));
			document.getElementById(navLinks[linkId])?.classList.add("active");
			e.currentTarget.classList.add("active");
			if (window.innerWidth <= 768)
				document.getElementById("sidebar")?.classList.remove("active");
			if (linkId === "navOrders") loadAssignedOrders();
			if (linkId === "navDashboard") loadDashboardStats();
		});
	}
	document
		.getElementById("goToOrdersBtn")
		?.addEventListener("click", () =>
			document.getElementById("navOrders")?.click(),
		);
	document
		.getElementById("refreshOrdersBtn")
		?.addEventListener("click", loadAssignedOrders);
	document
		.getElementById("refreshCollectionsBtn")
		?.addEventListener("click", () => {
			// Balance/collection history is baked into the page on load (like
			// the rest of this dashboard) — a full reload is the simplest way
			// to refresh it.
			window.location.reload();
		});
}

// Data loaders — still use API for refreshes
async function loadDashboardStats() {
	try {
		const res = await fetch(`${API_BASE_URL}/drivers/stats`, {
			credentials: "include",
		});
		if (!res.ok) throw new Error();
		const stats = await res.json();
		const safeSet = (id, val) => {
			const el = document.getElementById(id);
			if (el) el.textContent = val;
		};
		safeSet("statActive", stats.activeOrders);
		safeSet("bannerActiveCount", stats.activeOrders);
		safeSet("statToday", stats.todaysDeliveries);
		safeSet("statTotal", stats.totalDeliveries);
	} catch (err) {
		console.error("Error fetching stats:", err);
	}
}

async function loadAssignedOrders() {
	const container = document.getElementById("ordersContainer");
	if (!container) return;
	container.innerHTML = `<div class="loading-state"><i class='bx bx-loader-alt bx-spin'></i> Loading your orders...</div>`;
	try {
		const res = await fetch(`${API_BASE_URL}/drivers/orders`, {
			credentials: "include",
		});
		if (!res.ok) throw new Error();
		renderOrders(await res.json());
	} catch {
		container.innerHTML = `<div class="empty-state" style="color:var(--danger-color)">Failed to load orders. Please try again.</div>`;
	}
}

function renderOrders(orders) {
	const container = document.getElementById("ordersContainer");
	if (!container) return;
	const actionable = orders.filter(
		(o) => o.s === 0 || o.s === 1 || o.s === 2,
	);
	if (actionable.length === 0) {
		container.innerHTML = `<div class="empty-state"><i class='bx bx-package' style="font-size:48px;color:#cbd5e1;margin-bottom:10px;"></i><h3>No Assigned Orders</h3><p>You currently do not have any orders assigned to you.</p></div>`;
		return;
	}
	container.innerHTML = "";
	actionable.forEach((order) => container.appendChild(buildOrderCard(order)));
}

function escapeHtml(value) {
	const div = document.createElement("div");
	div.textContent = value == null ? "" : String(value);
	return div.innerHTML;
}

// Drivers only ever owe cash to the admin (their delivery fee is kept at
// collection time, never paid separately) — so there's no "admin owes you"
// direction here, just "outstanding" vs "settled".
function renderBalance() {
	const banner = document.getElementById("driverBalanceBanner");
	const label = document.getElementById("driverBalanceLabel");
	const value = document.getElementById("driverBalanceValue");
	if (!banner || !label || !value) return;

	const outstanding = driverBalance?.outstanding || 0;
	banner.classList.remove("owed-by-you");
	if (outstanding > 0.005) {
		banner.classList.add("owed-by-you");
		label.textContent = "You owe the admin";
		value.textContent = `$${outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	} else {
		label.textContent = "Your balance";
		value.textContent = "Settled — $0.00";
	}
}

function renderCollectionSessions() {
	const container = document.getElementById("collectionsContainer");
	if (!container) return;

	if (!collectionSessions.length) {
		container.innerHTML = `<div class="empty-state"><i class='bx bx-receipt' style="font-size:48px;color:#cbd5e1;margin-bottom:10px;"></i><h3>No Collection Sessions Yet</h3><p>Cash you hand over to the admin will show up here.</p></div>`;
		return;
	}

	container.innerHTML = "";
	collectionSessions.forEach((c) => {
		const net = c.amount - (c.deliveryFee || 0);
		const card = document.createElement("div");
		card.className = "order-card";
		card.innerHTML = `
			<div class="order-header">
				<span class="order-id">Collection #${c.number}</span>
				<span class="status-badge delivered">${new Date(c.createdAt).toLocaleDateString()}</span>
			</div>
			<div class="order-body">
				<div class="info-row"><i class='bx bx-package'></i><div class="info-text"><h4>Orders</h4><p>${c.orderCount}</p></div></div>
				<div class="info-row"><i class='bx bx-money'></i><div class="info-text"><h4>Handed Over (net of your fee)</h4><p style="font-weight:700;color:var(--success)">$${net.toFixed(2)}</p></div></div>
				<div class="info-row" style="margin-bottom:0;"><i class='bx bx-user'></i><div class="info-text"><h4>Received By</h4><p>${escapeHtml(c.adminName || "-")}</p></div></div>
			</div>
		`;
		container.appendChild(card);
	});
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
	card.innerHTML = `
		<div class="order-header">
			<span class="order-id">#${order.id}</span>
			<span class="status-badge ${sClassMap[order.s]}">${statusMap[order.s]}</span>
		</div>
		<div class="order-body">
			<div class="info-row"><i class='bx bx-user'></i><div class="info-text"><h4>Customer Name</h4><p>${order.c.f} ${order.c.l || ""}<br><span style="color:var(--accent);font-size:13px;font-weight:600;"><a href="tel:${order.c.p}" style="text-decoration:none;color:inherit;">${order.c.p}</a></span></p></div></div>
			<div class="info-row"><i class='bx bx-map'></i><div class="info-text"><h4>Delivery Address</h4><p>${order.c.loc.cty}, ${order.c.loc.d}</p></div></div>
			<div class="info-row" style="margin-bottom:0;"><i class='bx bx-money'></i><div class="info-text"><h4>To Collect</h4><p style="font-weight:700;color:var(--success)">$${order.pr.t}</p></div></div>
		</div>`;

	const footer = document.createElement("div");
	footer.className = "order-footer";

	if (order.s === 0 || order.s === 1) {
		const button = document.createElement("button");
		button.className = "btn primary-btn action-btn bg-blue";
		button.textContent = "Mark Picked Up";
		button.addEventListener("click", () => openActionModal(order.id, 2));
		footer.appendChild(button);
	} else if (order.s === 2) {
		const button = document.createElement("button");
		button.className = "btn primary-btn action-btn";
		button.style.background = "#6366f1";
		button.textContent = "Update Delivery Status";
		button.addEventListener("click", () =>
			openActionModal(order.id, "delivery"),
		);
		footer.appendChild(button);
	} else {
		const button = document.createElement("button");
		button.className = "btn secondary-btn action-btn";
		button.disabled = true;
		button.textContent = "No Actions Available";
		footer.appendChild(button);
	}

	card.appendChild(footer);
	return card;
}

// Modal
const modal = document.getElementById("actionModal");
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
	if (modal) modal.style.display = "none";
}
document
	.querySelector(".close-modal")
	?.addEventListener("click", closeModalAlert);
document
	.getElementById("cancelActionBtn")
	?.addEventListener("click", closeModalAlert);

async function submitStatusUpdate(orderId, statusCode, btn, originalLabel) {
	const note = document.getElementById("actionNote").value.trim();
	btn.disabled = true;
	btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Processing...`;
	try {
		const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify({ s: statusCode, note: note || undefined }),
		});
		if (!res.ok)
			throw new Error(
				(await res.json().catch(() => ({}))).error || "Failed",
			);
		closeModalAlert();
		loadAssignedOrders();
		loadDashboardStats();
	} catch (err) {
		await window.Dialog.alert(err.message, { title: "Error", danger: true });
	} finally {
		btn.disabled = false;
		btn.innerHTML = originalLabel;
	}
}

document
	.getElementById("confirmPickupBtn")
	?.addEventListener("click", function () {
		submitStatusUpdate(
			document.getElementById("modalOrderRealId").value,
			2,
			this,
			"✔ Confirm Pick Up",
		);
	});
document
	.getElementById("confirmDeliveredBtn")
	?.addEventListener("click", function () {
		submitStatusUpdate(
			document.getElementById("modalOrderRealId").value,
			3,
			this,
			"✅ Delivered",
		);
	});
document
	.getElementById("confirmCanceledBtn")
	?.addEventListener("click", function () {
		submitStatusUpdate(
			document.getElementById("modalOrderRealId").value,
			4,
			this,
			"✖ Canceled",
		);
	});

function initPasswordChangeForm(currentUser) {
	const form = document.getElementById("passwordForm");
	const msg = document.getElementById("passwordMessage");
	if (!form) return;
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
			const res = await fetch(`${API_BASE_URL}/users/${currentUser.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({ password: p1 }),
			});
			if (!res.ok) throw new Error("Failed to update");
			msg.textContent = "Password updated successfully.";
			msg.style.color = "var(--success)";
			form.reset();
		} catch {
			msg.textContent = "Failed to update password.";
			msg.style.color = "var(--danger-color)";
		} finally {
			btn.disabled = false;
			btn.textContent = "Update Password";
		}
	});
}

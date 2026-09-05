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

	checkNotifications();
}

document.addEventListener("DOMContentLoaded", initAdminPage);

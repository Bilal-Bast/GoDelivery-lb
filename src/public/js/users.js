/// Users Management Page
(function () {
	const API = "http://localhost:3000";

	function getToken() {
		return localStorage.getItem("token") || "";
	}

	// Fetch all users
	async function fetchUsers() {
		try {
			const token = localStorage.getItem("token");

			const res = await fetch("http://localhost:3000/users", {
				method: "GET",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || "Failed to fetch users");
			}
			return data;
		} catch (err) {
			console.error("Error:", err.message);
		}
	}

	// Delete user
	async function apiDelete(id) {
		const res = await fetch(`${API}/users/${id}`, {
			method: "DELETE",
			headers: { Authorization: getToken() },
		});
		if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
	}

	// Get initials from name
	function getInitials(user) {
		if (user.firstName && user.lastName) {
			return (user.firstName[0] + user.lastName[0]).toUpperCase();
		}
		if (user.firstName) return user.firstName[0].toUpperCase();
		if (user.lastName) return user.lastName[0].toUpperCase();
		return user.username[0].toUpperCase();
	}

	// Build user card
	function buildCard(user) {
		const name =
			[user.firstName, user.lastName].filter(Boolean).join(" ") ||
			user.username;
		const initials = getInitials(user);

		const card = document.createElement("div");
		card.className = `user-card ${user.role}-card`;

		// Basic details
		let detailsHTML = `
            <div class="user-card-header">
                <div class="user-avatar">${initials}</div>
                <div class="user-info">
                    <h4>${name}</h4>
                    <span class="user-role-badge role-${user.role}">${user.role}</span>
                </div>
            </div>
            
            <div class="user-details">
                <div class="detail-item">
                    <i class='bx bx-user-circle'></i>
                    <span class="detail-label">Username:</span>
                    <span class="detail-value">${user.username}</span>
                </div>
        `;

		if (user.phone) {
			detailsHTML += `
                <div class="detail-item">
                    <i class='bx bx-phone'></i>
                    <span class="detail-label">Phone:</span>
                    <span class="detail-value">${user.phone}</span>
                </div>
            `;
		}

		detailsHTML += `</div>`;

		// Merchant-specific details
		if (user.role === "merchant") {
			detailsHTML += `
                <div class="merchant-details">
                    <div class="merchant-detail">
                        <span class="label">Account Type:</span>
                        <span class="value">${user.accountType || "N/A"}</span>
                    </div>
            `;

			if (user.accountType === "prepaid") {
				detailsHTML += `
                    <div class="merchant-detail">
                        <span class="label">Cash Percentage:</span>
                        <span class="value">${user.cashPercentage ?? "N/A"}%</span>
                    </div>
                `;
			}

			if (user.accountType === "postpaid") {
				detailsHTML += `
                    <div class="merchant-detail">
                        <span class="label">Payment Day:</span>
                        <span class="value">${user.paymentDay || "N/A"}</span>
                    </div>
                `;
			}

			detailsHTML += `</div>`;
		}

		// Actions
		detailsHTML += `
            <div class="user-card-actions">
                <button class="delete-btn" data-id="${user._id}" data-name="${user.username}">
                    <i class='bx bx-trash'></i> Delete
                </button>
            </div>
        `;

		card.innerHTML = detailsHTML;

		// Delete handler
		card.querySelector(".delete-btn").addEventListener(
			"click",
			async function () {
				const id = this.dataset.id;
				const name = this.dataset.name;
				if (!confirm(`Delete user "${name}"? This cannot be undone.`))
					return;

				try {
					await apiDelete(id);
					card.remove();

					// Update stats after deletion
					updateStats();

					// Check if list is empty
					const list = card.closest(".scrollable-list");
					if (
						list &&
						list.querySelectorAll(".user-card").length === 0
					) {
						list.innerHTML =
							'<div class="empty-text">No users found</div>';
					}
				} catch (err) {
					alert("Could not delete user. " + err.message);
				}
			},
		);

		return card;
	}

	// Update statistics
	function updateStats() {
		const adminCount = document.querySelectorAll(".admin-card").length;
		const merchantCount =
			document.querySelectorAll(".merchant-card").length;
		const driverCount = document.querySelectorAll(".driver-card").length;

		document.getElementById("totalAdmins").textContent = adminCount;
		document.getElementById("totalMerchants").textContent = merchantCount;
		document.getElementById("totalDrivers").textContent = driverCount;
	}

	// Render users in container
	function renderList(container, users) {
		container.innerHTML = "";
		if (users.length === 0) {
			container.innerHTML =
				'<div class="empty-text">No users found</div>';
			return;
		}

		const grid = document.createElement("div");
		grid.className = "users-grid";

		users.forEach((u) => grid.appendChild(buildCard(u)));
		container.appendChild(grid);

		updateStats();
	}

	// Collapsible setup
	function setupCollapsible(headerId, contentId, iconId) {
		const header = document.getElementById(headerId);
		const content = document.getElementById(contentId);
		const icon = document.getElementById(iconId);

		if (!header || !content || !icon) return;

		header.addEventListener("click", () => {
			const isHidden = content.style.display === "none";
			content.style.display = isHidden ? "block" : "none";
			icon.className = isHidden
				? "bx bx-chevron-up"
				: "bx bx-chevron-down";
		});
	}

	// Main
	document.addEventListener("DOMContentLoaded", async () => {
		setupCollapsible("adminsHeader", "adminsList", "adminsIcon");
		setupCollapsible("merchantsHeader", "merchantsList", "merchantsIcon");
		setupCollapsible("driversHeader", "driversList", "driversIcon");

		const adminsList = document.getElementById("adminsList");
		const merchantsList = document.getElementById("merchantsList");
		const driversList = document.getElementById("driversList");

		try {
			const users = await fetchUsers();

			renderList(
				adminsList,
				users.filter((u) => u.role === "admin"),
			);
			renderList(
				merchantsList,
				users.filter((u) => u.role === "merchant"),
			);
			renderList(
				driversList,
				users.filter((u) => u.role === "driver"),
			);
		} catch (err) {
			const errorMsg = `<div class="empty-text" style="color: var(--danger);">Failed to load users — ${err.message}</div>`;
			[adminsList, merchantsList, driversList].forEach((el) => {
				if (el) el.innerHTML = errorMsg;
			});
		}
	});
})();

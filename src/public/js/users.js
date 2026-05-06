(function () {
	const API = "http://localhost:3000/api";

	async function apiDelete(id) {
		const res = await fetch(`${API}/users/${id}`, { method: "DELETE" });
		if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
	}

	function getInitials(user) {
		if (user.firstName && user.lastName) return (user.firstName[0] + user.lastName[0]).toUpperCase();
		if (user.firstName) return user.firstName[0].toUpperCase();
		if (user.lastName) return user.lastName[0].toUpperCase();
		return user.username[0].toUpperCase();
	}

	function buildCard(user) {
		const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username;
		const initials = getInitials(user);
		const card = document.createElement("div");
		card.className = `user-card ${user.role}-card`;

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
				</div>`;

		if (user.phone) {
			detailsHTML += `
				<div class="detail-item">
					<i class='bx bx-phone'></i>
					<span class="detail-label">Phone:</span>
					<span class="detail-value">${user.phone}</span>
				</div>`;
		}

		detailsHTML += `</div>`;

		if (user.role === "merchant") {
			detailsHTML += `
				<div class="merchant-details">
					<div class="merchant-detail">
						<span class="label">Account Type:</span>
						<span class="value">${user.accountType || "N/A"}</span>
					</div>`;
			if (user.accountType === "prepaid") {
				detailsHTML += `
					<div class="merchant-detail">
						<span class="label">Cash Percentage:</span>
						<span class="value">${user.cashPercentage ?? "N/A"}%</span>
					</div>`;
			}
			if (user.accountType === "postpaid") {
				detailsHTML += `
					<div class="merchant-detail">
						<span class="label">Payment Day:</span>
						<span class="value">${user.paymentDay || "N/A"}</span>
					</div>`;
			}
			detailsHTML += `</div>`;
		}

		detailsHTML += `
			<div class="user-card-actions">
				<button class="delete-btn" data-id="${user._id}" data-name="${user.username}">
					<i class='bx bx-trash'></i> Delete
				</button>
			</div>`;

		card.innerHTML = detailsHTML;

		card.querySelector(".delete-btn").addEventListener("click", async function () {
			const id = this.dataset.id;
			const name = this.dataset.name;
			if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
			try {
				await apiDelete(id);
				card.remove();
				updateStats();
				const list = card.closest(".scrollable-list");
				if (list && list.querySelectorAll(".user-card").length === 0) {
					list.innerHTML = '<div class="empty-text">No users found</div>';
				}
			} catch (err) {
				alert("Could not delete user. " + err.message);
			}
		});

		return card;
	}

	function updateStats() {
		document.getElementById("totalAdmins").textContent = document.querySelectorAll(".admin-card").length;
		document.getElementById("totalMerchants").textContent = document.querySelectorAll(".merchant-card").length;
		document.getElementById("totalDrivers").textContent = document.querySelectorAll(".driver-card").length;
	}

	function renderList(container, users) {
		if (!container) return;
		container.innerHTML = "";
		if (!users.length) {
			container.innerHTML = '<div class="empty-text">No users found</div>';
			return;
		}
		const grid = document.createElement("div");
		grid.className = "users-grid";
		users.forEach((u) => grid.appendChild(buildCard(u)));
		container.appendChild(grid);
		updateStats();
	}

	function setupCollapsible(headerId, contentId, iconId) {
		const header = document.getElementById(headerId);
		const content = document.getElementById(contentId);
		const icon = document.getElementById(iconId);
		if (!header || !content || !icon) return;
		header.addEventListener("click", () => {
			const isHidden = content.style.display === "none";
			content.style.display = isHidden ? "block" : "none";
			icon.className = isHidden ? "bx bx-chevron-up" : "bx bx-chevron-down";
		});
	}

	document.addEventListener("DOMContentLoaded", () => {
		setupCollapsible("adminsHeader", "adminsList", "adminsIcon");
		setupCollapsible("merchantsHeader", "merchantsList", "merchantsIcon");
		setupCollapsible("driversHeader", "driversList", "driversIcon");

		const users = (window.__INIT_DATA__ || {}).users || [];
		renderList(document.getElementById("adminsList"), users.filter((u) => u.role === "admin"));
		renderList(document.getElementById("merchantsList"), users.filter((u) => u.role === "merchant"));
		renderList(document.getElementById("driversList"), users.filter((u) => u.role === "driver"));
	});
})();

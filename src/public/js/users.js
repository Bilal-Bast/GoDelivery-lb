(function () {
	const API = "/api";

	async function fetchUsers() {
		const res = await fetch(`${API}/users`, { credentials: "include" });
		if (!res.ok) {
			throw new Error(`Fetch failed: ${res.status}`);
		}
		return res.json();
	}

	async function apiDelete(id) {
		const res = await fetch(`${API}/users/${id}`, {
			method: "DELETE",
			credentials: "include",
		});
		if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
	}

	function getInitials(user) {
		if (user.firstName && user.lastName)
			return (user.firstName[0] + user.lastName[0]).toUpperCase();
		if (user.firstName) return user.firstName[0].toUpperCase();
		if (user.lastName) return user.lastName[0].toUpperCase();
		return user.username[0].toUpperCase();
	}

	function buildCard(user) {
		const name =
			[user.firstName, user.lastName].filter(Boolean).join(" ") ||
			user.username;
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

		if (user.role === "driver" && user.deliveryFee != null) {
			detailsHTML += `
				<div class="merchant-details">
					<div class="merchant-detail">
						<span class="label">Delivery Fee:</span>
						<span class="value">$${Number(user.deliveryFee).toFixed(2)}</span>
					</div>
				</div>`;
		}

		detailsHTML += `
			<div class="user-card-actions">
				<button class="delete-btn" data-id="${user._id}" data-name="${user.username}">
					<i class='bx bx-trash'></i> Delete
				</button>
			</div>`;

		card.innerHTML = detailsHTML;

		card.querySelector(".delete-btn").addEventListener(
			"click",
			function () {
				const id = this.dataset.id;
				const name = this.dataset.name;
				if (!confirm(`Delete user "${name}"? This cannot be undone.`))
					return;
				const form = document.createElement("form");
				form.method = "POST";
				form.action = "/users/delete";
				const input = document.createElement("input");
				input.type = "hidden";
				input.name = "id";
				input.value = id;
				form.appendChild(input);

				const csrfInput = document.createElement("input");
				csrfInput.type = "hidden";
				csrfInput.name = "_csrf";
				csrfInput.value = window.__CSRF_TOKEN__ || "";
				form.appendChild(csrfInput);
				document.body.appendChild(form);
				form.submit();
			},
		);

		return card;
	}

	function updateStats() {
		document.getElementById("totalAdmins").textContent =
			document.querySelectorAll(".admin-card:not([style*='display: none'])").length;
		document.getElementById("totalMerchants").textContent =
			document.querySelectorAll(".merchant-card:not([style*='display: none'])").length;
		document.getElementById("totalDrivers").textContent =
			document.querySelectorAll(".driver-card:not([style*='display: none'])").length;
	}

	function renderList(container, users) {
		if (!container) return;
		container.innerHTML = "";
		if (!users.length) {
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

	function setupCollapsible(headerId, contentId, iconId, searchContainerId) {
		const header = document.getElementById(headerId);
		const content = document.getElementById(contentId);
		const icon = document.getElementById(iconId);
		const searchContainer = searchContainerId
			? document.getElementById(searchContainerId)
			: null;
		if (!header || !content || !icon) return;
		header.addEventListener("click", () => {
			const isHidden = content.style.display === "none";
			content.style.display = isHidden ? "block" : "none";
			if (searchContainer) {
				searchContainer.style.display = isHidden ? "block" : "none";
			}
			icon.className = isHidden
				? "bx bx-chevron-up"
				: "bx bx-chevron-down";
		});
	}

	function setupSearch(searchInputId, containerId) {
		const searchInput = document.getElementById(searchInputId);
		const container = document.getElementById(containerId);
		
		if (!searchInput || !container) return;

		searchInput.addEventListener("input", (e) => {
			const query = e.target.value.toLowerCase();
			const cards = container.querySelectorAll(".user-card");
			let visibleCount = 0;

			cards.forEach((card) => {
				const name = card.querySelector("h4")?.textContent.toLowerCase() || "";
				const username = card.querySelector(".detail-value")?.textContent.toLowerCase() || "";
				const phone = card.querySelector(".detail-item:last-child .detail-value")?.textContent.toLowerCase() || "";
				
				const matches = name.includes(query) || username.includes(query) || phone.includes(query);
				
				if (matches) {
					card.style.display = "";
					visibleCount++;
				} else {
					card.style.display = "none";
				}
			});

			// Show "no results" message if nothing matches
			if (visibleCount === 0 && query.length > 0) {
				if (!container.querySelector(".no-results")) {
					const noResults = document.createElement("div");
					noResults.className = "no-results";
					noResults.textContent = `No results for "${query}"`;
					container.appendChild(noResults);
				}
			} else {
				const noResults = container.querySelector(".no-results");
				if (noResults) noResults.remove();
			}
		});

		// Clear search when input is cleared
		searchInput.addEventListener("keydown", (e) => {
			if (e.key === "Escape") {
				searchInput.value = "";
				searchInput.dispatchEvent(new Event("input"));
			}
		});
	}

	document.addEventListener("DOMContentLoaded", async () => {
		setupCollapsible(
			"adminsHeader",
			"adminsList",
			"adminsIcon",
			"adminsSearchContainer",
		);
		setupCollapsible(
			"merchantsHeader",
			"merchantsList",
			"merchantsIcon",
			"merchantsSearchContainer",
		);
		setupCollapsible(
			"driversHeader",
			"driversList",
			"driversIcon",
			"driversSearchContainer",
		);

		// Setup search for each category
		setupSearch("adminsSearch", "adminsList");
		setupSearch("merchantsSearch", "merchantsList");
		setupSearch("driversSearch", "driversList");

		const users = (window.__INIT_DATA__ || {}).users || [];

		renderList(
			document.getElementById("adminsList"),
			users.filter((u) => u.role === "admin"),
		);
		renderList(
			document.getElementById("merchantsList"),
			users.filter((u) => u.role === "merchant"),
		);
		renderList(
			document.getElementById("driversList"),
			users.filter((u) => u.role === "driver"),
		);
	});
})();
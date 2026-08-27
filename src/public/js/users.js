(function () {
	const API = "/api";

	// ═══════════════════════════════════════════════════════════════════════════
	// MODAL MANAGEMENT
	// ═══════════════════════════════════════════════════════════════════════════

	const editModal = document.getElementById("editUserModal");
	const closeModalBtn = document.querySelector(".modal-close");
	const editForm = document.getElementById("editUserForm");
	let currentEditingUser = null;
	let allUsers = [];

	// Blocker type → role a reassignment target must have.
	const REASSIGN_ROLE = {
		driverCollectionsAsDriver: "driver",
		driverCollectionsAsAdmin: "admin",
		merchantPaymentsAsAdmin: "admin",
	};

	function displayName(u) {
		return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username;
	}

	function openEditModal(user) {
		currentEditingUser = user;
		populateEditForm(user);
		editModal.classList.add("active");
		document.body.style.overflow = "hidden";
	}

	function closeEditModal() {
		editModal.classList.remove("active");
		document.body.style.overflow = "auto";
		currentEditingUser = null;
		editForm.reset();
	}

	closeModalBtn?.addEventListener("click", closeEditModal);
	editModal?.addEventListener("click", (e) => {
		if (e.target === editModal) closeEditModal();
	});

	// ═══════════════════════════════════════════════════════════════════════════
	// CONFIRM / MESSAGE DIALOG — thin wrappers over the shared window.Dialog
	// (see /js/dialog.js, loaded site-wide from layout.pug)
	// ═══════════════════════════════════════════════════════════════════════════

	const escapeHtml = window.Dialog.escapeHtml;

	function showDialog({ title, bodyHtml, okLabel = "Delete", showCancel = true, danger = true }) {
		if (!showCancel) {
			return window.Dialog.alert(null, { title, html: bodyHtml, okLabel, danger });
		}
		return window.Dialog.confirm(null, { title, html: bodyHtml, okLabel, danger });
	}

	function showNotice(title, bodyHtml, { danger = false } = {}) {
		return window.Dialog.alert(null, { title, html: bodyHtml, danger });
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// FORM POPULATION & FIELD VISIBILITY
	// ═══════════════════════════════════════════════════════════════════════════

	// Maps each district's delivery-charge input to the region key used in
	// the DeliveryCharge table (matches the naming used on the Settings page).
	const DELIVERY_REGION_FIELDS = {
		editChargeAkkar: "Akkar",
		editChargeBaalbek: "Baalbek-Hermel",
		editChargeBeirut: "Beirut",
		editChargeBekaa: "Bekaa",
		editChargeNabatieh: "El Nabatieh",
		editChargeMountLebanon: "Mount Lebanon",
		editChargeNorth: "North",
		editChargeSouth: "South",
	};

	function populateEditForm(user) {
		document.getElementById("editUserId").value = user.id || user._id;
		document.getElementById("editRoleDisplay").textContent = user.role || "—";
		document.getElementById("editUsername").value = user.username || "";
		document.getElementById("editEmail").value = user.email || "";
		document.getElementById("editFirstName").value = user.firstName || "";
		document.getElementById("editLastName").value = user.lastName || "";
		document.getElementById("editPhone").value = user.phone || "";
		document.getElementById("editCreatedAt").textContent = user.createdAt
			? new Date(user.createdAt).toLocaleDateString()
			: "—";

		// Show/hide fields based on role
		showHideFieldsByRole(user.role);

		// Merchant-specific fields
		if (user.role === "merchant") {
			const accountTypeSelect = document.getElementById("editAccountType");
			accountTypeSelect.value = user.accountType || "prepaid";
			updateMerchantFields(user.accountType || "prepaid", user);

			const charges = user.deliveryCharges || {};
			Object.entries(DELIVERY_REGION_FIELDS).forEach(([inputId, region]) => {
				const input = document.getElementById(inputId);
				if (input) input.value = charges[region] ?? "";
			});
		}

		// Driver-specific fields
		if (user.role === "driver") {
			document.getElementById("editDriverFee").value =
				user.deliveryFee != null ? user.deliveryFee : "";
		}

		// Password fields (optional)
		document.getElementById("editPassword").value = "";
		document.getElementById("editConfirmPassword").value = "";
	}

	function showHideFieldsByRole(role) {
		// Hide all conditional sections first
		document.getElementById("merchantFieldsSection").style.display = "none";
		document.getElementById("driverFieldsSection").style.display = "none";

		// Show based on role
		if (role === "merchant") {
			document.getElementById("merchantFieldsSection").style.display = "block";
		} else if (role === "driver") {
			document.getElementById("driverFieldsSection").style.display = "block";
		}
	}

	function updateMerchantFields(accountType, user = null) {
		const postpaidFields = document.getElementById("postpaidFields");

		// Prepaid merchants have no extra settings — they're paid by advance
		// against a running balance, managed on the Finance page.
		if (accountType === "postpaid") {
			postpaidFields.style.display = "block";
			if (user) {
				document.getElementById("editPaymentDay").value = user.paymentDay || "";
			}
		} else {
			postpaidFields.style.display = "none";
		}
	}

	document.getElementById("editAccountType")?.addEventListener("change", (e) => {
		updateMerchantFields(e.target.value);
	});

	// ═══════════════════════════════════════════════════════════════════════════
	// FORM SUBMISSION
	// ═══════════════════════════════════════════════════════════════════════════

	async function putJson(url, payload) {
		const res = await fetch(url, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify(payload),
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			const message =
				data.message ||
				data.error ||
				data.errors?.[0]?.msg ||
				"Failed to update user";
			throw new Error(message);
		}
		return data;
	}

	async function postJson(url, payload) {
		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify(payload),
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			throw new Error(data.error || data.message || `Request failed: ${res.status}`);
		}
		return data;
	}

	editForm?.addEventListener("submit", async (e) => {
		e.preventDefault();

		const userId = document.getElementById("editUserId").value;
		const username = document.getElementById("editUsername").value.trim();
		const email = document.getElementById("editEmail").value.trim();
		const firstName = document.getElementById("editFirstName").value.trim();
		const lastName = document.getElementById("editLastName").value.trim();
		const phone = document.getElementById("editPhone").value.trim();
		const role = currentEditingUser?.role;
		const password = document.getElementById("editPassword").value.trim();
		const confirmPassword = document.getElementById("editConfirmPassword").value.trim();

		// Validation
		if (!username || !firstName || !lastName) {
			showMessage("editMessage", "Please fill in all required fields", true);
			return;
		}

		if (password && password !== confirmPassword) {
			showMessage("editMessage", "Passwords do not match", true);
			return;
		}

		// Base payload (applies to every role)
		const payload = {
			username,
			email,
			firstName,
			lastName,
			phone,
		};

		if (password) {
			payload.password = password;
		}

		// Role-specific payload, sent to its own endpoint — role itself is not editable
		let roleUrl = null;
		let rolePayload = null;

		if (role === "merchant") {
			const accountType = document.getElementById("editAccountType").value;
			rolePayload = { accountType };
			if (accountType === "postpaid") {
				const paymentDay = document.getElementById("editPaymentDay").value.trim();
				if (paymentDay !== "") {
					rolePayload.paymentDay = paymentDay;
				}
			}

			const deliveryCharges = {};
			for (const [inputId, region] of Object.entries(DELIVERY_REGION_FIELDS)) {
				const raw = document.getElementById(inputId)?.value.trim();
				deliveryCharges[region] = raw ? parseFloat(raw) : 0;
			}
			rolePayload.deliveryCharges = deliveryCharges;

			roleUrl = `${API}/users/merchants/${userId}`;
		} else if (role === "driver") {
			const driverFee = document.getElementById("editDriverFee").value.trim();
			const deliveryFee = driverFee === "" ? null : parseFloat(driverFee);

			if (
				deliveryFee != null &&
				(!Number.isFinite(deliveryFee) || deliveryFee < 0)
			) {
				showMessage("editMessage", "Please enter a valid delivery fee", true);
				return;
			}

			rolePayload = { deliveryFee };
			roleUrl = `${API}/users/drivers/${userId}`;
		}

		const submitBtn = editForm.querySelector('button[type="submit"]');
		submitBtn.dataset.label = submitBtn.dataset.label || submitBtn.textContent;
		setLoading(submitBtn, true);

		try {
			await putJson(`${API}/users/${userId}`, payload);
			if (roleUrl) {
				await putJson(roleUrl, rolePayload);
			}

			showMessage("editMessage", "✓ User updated successfully!", false);
			setTimeout(() => {
				closeEditModal();
				location.reload(); // Refresh to show updated data
			}, 1500);
		} catch (err) {
			showMessage("editMessage", err.message, true);
		} finally {
			setLoading(submitBtn, false);
		}
	});

	// ═══════════════════════════════════════════════════════════════════════════
	// UTILITY FUNCTIONS
	// ═══════════════════════════════════════════════════════════════════════════

	function setLoading(btn, isLoading) {
		if (isLoading) {
			btn.disabled = true;
			btn.innerHTML = '<span class="spinner"></span> Saving...';
		} else {
			btn.disabled = false;
			btn.textContent = btn.dataset.label || "Save Changes";
		}
	}

	function showMessage(elementId, message, isError = false) {
		const el = document.getElementById(elementId);
		if (!el) return;
		el.textContent = message;
		el.className = isError ? "message error-message" : "message success-message";
		el.style.display = "block";
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// USER CARD & LIST RENDERING
	// ═══════════════════════════════════════════════════════════════════════════

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
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			throw new Error(
				data.error || data.message || `Delete failed: ${res.status}`,
			);
		}
	}

	async function fetchDeletePreview(id) {
		const res = await fetch(`${API}/users/${id}/delete-preview`, {
			credentials: "include",
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			throw new Error(data.error || data.message || `Failed to load delete preview: ${res.status}`);
		}
		return data;
	}

	function formatMoney(amount) {
		const value = Number(amount) || 0;
		return `$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	}

	function buildDeleteConfirmBody(preview) {
		const items = [];

		if (preview.role === "merchant") {
			items.push(`<li><i class='bx bx-package'></i> <b>${preview.ordersToDelete}</b>&nbsp;order(s) will be permanently deleted</li>`);
			items.push(`<li><i class='bx bx-receipt'></i> <b>${preview.paymentsToDelete}</b>&nbsp;payment record(s) will be permanently deleted</li>`);
			if (preview.balance > 0.005) {
				items.push(`<li class="gd-row-danger"><i class='bx bx-wallet'></i> We still owe them <b>${formatMoney(preview.balance)}</b> — that debt will be wiped out</li>`);
			} else if (preview.balance < -0.005) {
				items.push(`<li class="gd-row-success"><i class='bx bx-wallet'></i> They still owe us <b>${formatMoney(preview.balance)}</b> — that debt will be wiped out</li>`);
			} else {
				items.push(`<li><i class='bx bx-wallet'></i> Balance is settled ($0)</li>`);
			}
		} else if (preview.role === "driver") {
			items.push(`<li><i class='bx bx-package'></i> <b>${preview.ordersToUnassign}</b>&nbsp;order(s) will be unassigned from them (kept, not deleted)</li>`);
			if (preview.outstanding > 0.005) {
				items.push(`<li class="gd-row-success"><i class='bx bx-wallet'></i> They still owe us <b>${formatMoney(preview.outstanding)}</b> in uncollected cash — that debt will be wiped out</li>`);
			} else {
				items.push(`<li><i class='bx bx-wallet'></i> No outstanding cash owed</li>`);
			}
		} else {
			items.push(`<li><i class='bx bx-user-x'></i> This admin account will be permanently removed</li>`);
		}

		return `
			<div class="gd-dialog-warning">
				<i class='bx bx-error-circle'></i>
				<p>This action <b>cannot be undone</b>.</p>
			</div>
			<ul class="gd-dialog-list">${items.join("")}</ul>
		`;
	}

	// ═══════════════════════════════════════════════════════════════════════════
	// RESOLVE BLOCKING RECORDS MODAL — lets an admin reassign a blocked user's
	// driver-collection/merchant-payment records to someone else, or delete
	// those records outright, so the account can then actually be deleted.
	// ═══════════════════════════════════════════════════════════════════════════

	const resolveBlockersModal = document.getElementById("resolveBlockersModal");
	const resolveBlockersCloseBtn = document.getElementById("resolveBlockersCloseBtn");
	const resolveBlockersCancelBtn = document.getElementById("resolveBlockersCancelBtn");
	const resolveBlockersDeleteBtn = document.getElementById("resolveBlockersDeleteBtn");
	const resolveBlockersIntro = document.getElementById("resolveBlockersIntro");
	const resolveBlockersList = document.getElementById("resolveBlockersList");
	let latestResolvePreview = null;

	function closeResolveBlockersModal() {
		resolveBlockersModal.classList.remove("active");
		document.body.style.overflow = "auto";
		resolveBlockersDeleteBtn.onclick = null;
	}

	resolveBlockersCloseBtn?.addEventListener("click", closeResolveBlockersModal);
	resolveBlockersCancelBtn?.addEventListener("click", closeResolveBlockersModal);
	resolveBlockersModal?.addEventListener("click", (e) => {
		if (e.target === resolveBlockersModal) closeResolveBlockersModal();
	});

	function buildBlockerCardHtml(id, blocker) {
		const role = REASSIGN_ROLE[blocker.type];
		const eligible = allUsers.filter((u) => u.role === role && u.id !== id);
		const options = eligible.length
			? eligible
					.map((u) => `<option value="${u.id}">${escapeHtml(displayName(u))} (${escapeHtml(u.username)})</option>`)
					.join("")
			: `<option value="">No eligible ${escapeHtml(role)}s</option>`;

		return `
			<div class="blocker-card" data-type="${blocker.type}">
				<p class="blocker-card-label"><i class='bx bx-error'></i> ${escapeHtml(blocker.label)}</p>
				<div class="blocker-card-row">
					<select class="blocker-reassign-select" ${eligible.length ? "" : "disabled"}>${options}</select>
					<button type="button" class="btn btn-primary btn-sm blocker-reassign-btn" ${eligible.length ? "" : "disabled"}>
						<i class='bx bx-transfer'></i><span>Reassign</span>
					</button>
					<button type="button" class="btn btn-danger-outline btn-sm blocker-clear-btn">
						<i class='bx bx-trash'></i><span>Delete Permanently</span>
					</button>
				</div>
				<div class="blocker-card-status"></div>
			</div>
		`;
	}

	function wireBlockerCard(id, card) {
		const type = card.dataset.type;
		const select = card.querySelector(".blocker-reassign-select");
		const reassignBtn = card.querySelector(".blocker-reassign-btn");
		const clearBtn = card.querySelector(".blocker-clear-btn");
		const statusEl = card.querySelector(".blocker-card-status");

		function setStatus(text, isError) {
			statusEl.textContent = text;
			statusEl.className = `blocker-card-status visible ${isError ? "error" : "success"}`;
		}

		function setBusy(busy) {
			reassignBtn.disabled = busy;
			clearBtn.disabled = busy;
			if (select) select.disabled = busy || select.options.length === 0 || !select.value;
		}

		reassignBtn?.addEventListener("click", async () => {
			const toUserId = select?.value;
			if (!toUserId) {
				setStatus("Choose someone to reassign to first", true);
				return;
			}
			setBusy(true);
			try {
				const res = await postJson(`${API}/users/${id}/blockers/reassign`, { type, toUserId });
				setStatus(res.message || "Reassigned", false);
				await refreshResolveModal(id);
			} catch (err) {
				setStatus(err.message, true);
				setBusy(false);
			}
		});

		clearBtn?.addEventListener("click", async () => {
			const confirmed = await window.Dialog.confirm(
				"Permanently delete these records?\n\nThis removes the collection/payment history itself — the underlying orders and cash already recorded are not affected. This cannot be undone.",
				{ title: "Delete Records Permanently", okLabel: "Delete Permanently", danger: true },
			);
			if (!confirmed) return;
			setBusy(true);
			try {
				const res = await postJson(`${API}/users/${id}/blockers/clear`, { type });
				setStatus(res.message || "Deleted", false);
				await refreshResolveModal(id);
			} catch (err) {
				setStatus(err.message, true);
				setBusy(false);
			}
		});
	}

	function renderBlockerCards(id, blockers) {
		if (blockers.length === 0) {
			resolveBlockersList.innerHTML = `
				<div class="resolve-blockers-success">
					<i class='bx bx-check-circle'></i>
					<span>All blocking records resolved — this user can now be deleted.</span>
				</div>
			`;
			resolveBlockersDeleteBtn.style.display = "";
			return;
		}
		resolveBlockersDeleteBtn.style.display = "none";
		resolveBlockersList.innerHTML = blockers.map((b) => buildBlockerCardHtml(id, b)).join("");
		resolveBlockersList.querySelectorAll(".blocker-card").forEach((card) => wireBlockerCard(id, card));
	}

	async function refreshResolveModal(id) {
		try {
			const preview = await fetchDeletePreview(id);
			latestResolvePreview = preview;
			renderBlockerCards(id, preview.blockers);
		} catch {
			// Leave the modal as-is — the card that was just acted on already
			// shows its own success/error status.
		}
	}

	function openResolveBlockersModal(id, name, preview, onAllResolved) {
		latestResolvePreview = preview;
		resolveBlockersIntro.textContent = `"${name}" has records tied to their account that need to be reassigned or removed before they can be deleted.`;
		renderBlockerCards(id, preview.blockers);
		resolveBlockersDeleteBtn.onclick = async () => {
			closeResolveBlockersModal();
			await onAllResolved(latestResolvePreview);
		};
		resolveBlockersModal.classList.add("active");
		document.body.style.overflow = "hidden";
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
				<button class="edit-btn" data-id="${user.id || user._id}">
					<i class='bx bx-edit'></i> Edit
				</button>
				<button class="delete-btn" data-id="${user.id || user._id}" data-name="${user.username}">
					<i class='bx bx-trash'></i> Delete
				</button>
			</div>`;

		card.innerHTML = detailsHTML;

		// Edit button handler
		card.querySelector(".edit-btn").addEventListener("click", function () {
			openEditModal(user);
		});

		// Delete button handler
		card.querySelector(".delete-btn").addEventListener("click", async function () {
			const id = this.dataset.id;
			const name = this.dataset.name;
			const btn = this;

			btn.disabled = true;
			const originalLabel = btn.innerHTML;
			btn.innerHTML = '<span class="spinner"></span> Checking...';

			let preview;
			try {
				preview = await fetchDeletePreview(id);
			} catch (err) {
				btn.disabled = false;
				btn.innerHTML = originalLabel;
				await showNotice("Couldn't check user", `<p>${escapeHtml(err.message)}</p>`, { danger: true });
				return;
			}

			btn.innerHTML = originalLabel;
			btn.disabled = false;

			async function proceedToDeleteConfirm(p) {
				const confirmed = await showDialog({
					title: `Delete ${p.role} "${name}"?`,
					bodyHtml: buildDeleteConfirmBody(p),
					okLabel: "Delete",
					showCancel: true,
					danger: true,
				});
				if (!confirmed) return;

				btn.disabled = true;
				btn.innerHTML = '<span class="spinner"></span> Deleting...';

				try {
					await apiDelete(id);
					card.remove();
					updateStats();
				} catch (err) {
					btn.disabled = false;
					btn.innerHTML = "<i class='bx bx-trash'></i> Delete";
					await showNotice("Couldn't delete user", `<p>${escapeHtml(err.message)}</p>`, { danger: true });
				}
			}

			if (!preview.canDelete) {
				openResolveBlockersModal(id, name, preview, proceedToDeleteConfirm);
				return;
			}

			await proceedToDeleteConfirm(preview);
		});

		return card;
	}

	function updateStats() {
		document.getElementById("totalAdmins").textContent = document.querySelectorAll(
			".admin-card:not([style*='display: none'])",
		).length;
		document.getElementById("totalMerchants").textContent =
			document.querySelectorAll(
				".merchant-card:not([style*='display: none'])",
			).length;
		document.getElementById("totalDrivers").textContent = document.querySelectorAll(
			".driver-card:not([style*='display: none'])",
		).length;
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
			icon.className = isHidden ? "bx bx-chevron-up" : "bx bx-chevron-down";
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
				const username =
					card.querySelector(".detail-value")?.textContent.toLowerCase() || "";
				const phone =
					card.querySelector(".detail-item:last-child .detail-value")?.textContent.toLowerCase() ||
					"";

				const matches =
					name.includes(query) || username.includes(query) || phone.includes(query);

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
		allUsers = users;

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
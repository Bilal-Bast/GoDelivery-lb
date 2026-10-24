(() => {
	const root = document.querySelector(".dispatch-page");
	if (!root) return;
	const t = (value) => (window.__t ? window.__t(String(value)) : String(value));
	const csrfToken = root.dataset.csrfToken || "";
	const summary = document.getElementById("dispatchSummary");
	const groups = document.getElementById("dispatchGroups");
	const driversPanel = document.getElementById("dispatchDrivers");
	const errorPanel = document.getElementById("dispatchError");
	const dialog = document.getElementById("assignmentDialog");
	const form = document.getElementById("assignmentForm");
	const driverSelect = document.getElementById("assignmentDriver");
	let board = null;
	let currentPage = 1;
	let selectedOrder = null;

	function node(tag, className, text) {
		const element = document.createElement(tag);
		if (className) element.className = className;
		if (text !== undefined) element.textContent = text;
		return element;
	}

	function showError(message) {
		errorPanel.textContent = t(message);
		errorPanel.classList.remove("hidden");
	}

	function hideError() {
		errorPanel.textContent = "";
		errorPanel.classList.add("hidden");
	}

	function filters() {
		return {
			status: document.getElementById("dispatchStatus").value,
			assignment: document.getElementById("dispatchAssignment").value,
			scope: document.getElementById("dispatchScope").value,
			express: document.getElementById("dispatchExpress").value,
			district: document.getElementById("dispatchDistrict").value.trim(),
			city: document.getElementById("dispatchCity").value.trim(),
			merchantUsername: document.getElementById("dispatchMerchant").value.trim(),
			page: currentPage,
			limit: 50,
		};
	}

	async function loadBoard() {
		hideError();
		summary.textContent = t("Loading dispatch board…");
		const query = new URLSearchParams();
		Object.entries(filters()).forEach(([key, value]) => {
			if (value !== "") query.set(key, value);
		});
		try {
			const response = await fetch(`/api/dispatch/board?${query}`, { credentials: "same-origin", headers: { Accept: "application/json" } });
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || "Could not load dispatch board.");
			board = data;
			renderBoard();
		} catch (error) {
			summary.textContent = t("Dispatch board unavailable.");
			showError(error.message || "Could not load dispatch board.");
		}
	}

	function renderBoard() {
		const pageCount = board.totalOrders === 0 ? 0 : board.totalPages;
		summary.textContent = t(`${board.totalOrders} waiting order${board.totalOrders === 1 ? "" : "s"} · page ${board.page} of ${pageCount || 1} · ${board.timeZone} · ${board.liveTrackingEnabled ? "fresh driver sharing available" : "live sharing disabled"}`);
		document.getElementById("dispatchPage").textContent = t(`Page ${board.page} of ${pageCount || 1}`);
		document.getElementById("dispatchPrevious").disabled = !board.hasPrevious;
		document.getElementById("dispatchNext").disabled = !board.hasNext;
		renderDrivers(board.drivers || []);
		renderGroups(board.groups || []);
	}

	function renderDrivers(drivers) {
		driversPanel.replaceChildren();
		if (!drivers.length) {
			driversPanel.append(node("div", "dispatch-empty", t("No DRIVER accounts are available for recommendation.")));
			return;
		}
		for (const driver of drivers) {
			const card = node("article", "dispatch-driver");
			card.append(node("strong", "", driver.displayName || driver.username));
			card.append(node("p", "", t(`${driver.workload.activeCount} active · ${driver.workload.waitingCount} waiting · ${driver.workload.pickedUpCount} picked up · ${driver.workload.weightedUnits} weighted units`)));
			card.append(node("p", driver.liveTracking.isLive ? "dispatch-live" : "", driver.liveTracking.isLive ? t(`Sharing fresh location at ${new Date(driver.liveTracking.updatedAt).toLocaleTimeString()}`) : t("No fresh location shared")));
			driversPanel.append(card);
		}
	}

	function renderGroups(districts) {
		groups.replaceChildren();
		if (!districts.length) {
			groups.append(node("div", "dispatch-empty", t("No orders match these filters.")));
			return;
		}
		for (const district of districts) {
			const area = node("section", "dispatch-area");
			area.append(node("h2", "", district.district));
			for (const city of district.cities) {
				const citySection = node("section", "dispatch-city");
				citySection.append(node("h3", "", t(`${city.city} · ${city.orderCount} order${city.orderCount === 1 ? "" : "s"} · ${city.expressCount} Express`)));
				const list = node("div", "dispatch-order-list");
				for (const order of city.orders) list.append(renderOrder(order));
				citySection.append(list);
				area.append(citySection);
			}
			groups.append(area);
		}
	}

	function renderOrder(order) {
		const card = node("article", "dispatch-order");
		const header = node("div");
		header.append(node("strong", "", `#${order.id}`));
		if (order.isExpress) header.append(node("span", "express", " EXPRESS "));
		card.append(header);
		card.append(node("p", "", `${t(order.status)} · ${order.merchant.displayName} · ${new Date(order.createdAt).toLocaleString(document.documentElement.lang === "ar" ? "ar-LB-u-nu-latn" : "en-US")}`));
		if (order.currentDriver) {
			card.append(node("p", "", `${t("Currently assigned to")} ${order.currentDriver.displayName || order.currentDriver.username}`));
		} else if (order.recommendation?.recommendedDriver) {
			const recommended = order.recommendation.recommendedDriver;
			card.append(node("p", "", `${t("Suggested:")} ${recommended.displayName || recommended.username} · ${recommended.workload.activeCount} ${t("active")}`));
			const reasons = node("ul", "dispatch-reasons");
			for (const reason of recommended.reasons || []) reasons.append(node("li", "", reason));
			card.append(reasons);
			const review = node("button", "btn-filter btn-apply", "Review assignment");
			review.type = "button";
			review.addEventListener("click", () => openReview(order));
			card.append(review);
		} else {
			card.append(node("p", "", t("No driver recommendation is available.")));
		}
		return card;
	}

	function openReview(order) {
		selectedOrder = order;
		document.getElementById("assignmentOrder").textContent = `#${order.id} · ${t(order.status)} · ${order.district}, ${order.city}${order.isExpress ? " · " + t("Express") : ""}`;
		driverSelect.replaceChildren();
		for (const driver of board.drivers || []) {
			const option = node("option", "", `${driver.displayName || driver.username} · ${driver.workload.activeCount} active`);
			option.value = driver.username;
			if (driver.username === order.recommendation?.recommendedDriver?.username) option.selected = true;
			driverSelect.append(option);
		}
		const reasons = document.getElementById("assignmentReasons");
		reasons.replaceChildren(node("strong", "", "Recommendation reasons"));
		for (const reason of order.recommendation?.reasons || []) reasons.append(node("p", "", reason));
		dialog.showModal();
	}

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (!selectedOrder || !driverSelect.value) return;
		const button = document.getElementById("assignmentConfirm");
		button.disabled = true;
		button.textContent = t("Assigning…");
		try {
			const response = await fetch(`/api/dispatch/orders/${encodeURIComponent(selectedOrder.id)}/assign`, {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
				body: JSON.stringify({ driverUsername: driverSelect.value, expectedUpdatedAt: selectedOrder.updatedAt }),
			});
			const result = await response.json();
			if (!response.ok) throw new Error(t(result.error || "Assignment could not be saved."));
			dialog.close();
			await loadBoard();
		} catch (error) {
			showError(error.message || t("Assignment could not be saved."));
		} finally {
			button.disabled = false;
			button.textContent = t("Confirm assignment");
		}
	});

	document.getElementById("assignmentCancel").addEventListener("click", () => dialog.close());
	document.getElementById("dispatchRefresh").addEventListener("click", loadBoard);
	document.getElementById("dispatchApply").addEventListener("click", () => { currentPage = 1; loadBoard(); });
	document.getElementById("dispatchPrevious").addEventListener("click", () => { currentPage = Math.max(1, currentPage - 1); loadBoard(); });
	document.getElementById("dispatchNext").addEventListener("click", () => { currentPage++; loadBoard(); });
	loadBoard();
})();

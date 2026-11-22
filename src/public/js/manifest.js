(() => {
	const dataNode = document.getElementById("manifestData");
	const groupsNode = document.getElementById("manifestGroups");
	if (!dataNode || !groupsNode) return;

	let manifest;
	try {
		manifest = JSON.parse(dataNode.textContent || "{}");
	} catch (error) {
		groupsNode.innerHTML = '<div class="manifest-error" role="alert">Unable to load manifest data. Refresh the page and try again.</div>';
		return;
	}

	const drivers = Array.isArray(manifest.drivers) ? manifest.drivers : [];
	const searchInput = document.getElementById("manifestSearch");
	const driverFilter = document.getElementById("manifestDriverFilter");
	const driverList = document.getElementById("manifestDriverList");
	const driverCombo = document.getElementById("manifestDriverCombo");
	// "" = nothing selected (default), "all" = every driver, otherwise a driver id.
	let selectedDriver = "";
	const loadedDrivers = new Set();
	let loadError = "";
	let loading = false;
	const statusMultiSelect = window.createStatusMultiSelect("manifestStatusFilter");
	const fromInput = document.getElementById("manifestDateFrom");
	const toInput = document.getElementById("manifestDateTo");
	const results = document.getElementById("manifestResults");
	const empty = document.getElementById("manifestEmpty");
	const locale = document.documentElement.lang === "ar" ? "ar-LB-u-nu-latn" : "en-LB";
	const statusNames = {
		WAREHOUSE: "Warehouse",
		NEW: "New",
		Picked_up: "Picked up",
		DELIVERED: "Delivered",
		Canceled: "Cancelled",
		Paid: "Paid",
		COLLECTED: "Collected",
	};
	const waitingStatuses = new Set(["WAREHOUSE", "NEW"]);
	let currentGroups = [];
	const t = (value) => (window.__t ? window.__t(String(value)) : String(value));
	const isArabic = document.documentElement.lang === "ar";

	const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;",
	})[character]);

	function dateKey(value) {
		if (!value) return "";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return "";
		return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
	}

	function formatPickupDate(value) {
		if (!value) return "";
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return "";
		return new Intl.DateTimeFormat(locale, {
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		}).format(date);
	}

	function placeText(order) {
		const location = [order.district, order.city].filter(Boolean).join(", ");
		return [order.address, location].filter(Boolean).join(" — ") || "—";
	}

	function formatMoney(value) {
		const amount = Number(value);
		return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "$0.00";
	}

	function isAwaitingPickup(order) {
		return waitingStatuses.has(order.status) || Boolean(order.needsRepickup);
	}

	function statusLabel(order) {
		return order.needsRepickup ? "Needs new pickup" : (statusNames[order.status] || "Unknown");
	}

	function pickupLabel(order) {
		if (order.needsRepickup) return "Re-pickup required";
		if (order.pickedUpAt) return formatPickupDate(order.pickedUpAt);
		if (waitingStatuses.has(order.status)) return "Awaiting pickup";
		return "Pickup time unavailable";
	}

	function driverLabel(driver) {
		return driver.name || driver.username;
	}

	function selectedLabel() {
		if (selectedDriver === "all") return "All drivers";
		const driver = drivers.find((item) => item.id === selectedDriver);
		return driver ? driverLabel(driver) : "";
	}

	let comboOptions = [];
	let comboActive = -1;

	function setComboOpen(open) {
		driverList.hidden = !open;
		driverFilter.setAttribute("aria-expanded", String(open));
	}

	function renderComboList() {
		const query = driverFilter.value.trim().toLocaleLowerCase();
		const showingAll = !query || query === selectedLabel().toLocaleLowerCase();
		const matches = drivers.filter((driver) => showingAll
			|| `${driver.name} ${driver.username} ${driver.phone || ""}`.toLocaleLowerCase().includes(query));
		comboOptions = [];
		if (showingAll || "all drivers".includes(query)) comboOptions.push({ id: "all", label: "All drivers", sub: "" });
		for (const driver of matches) comboOptions.push({ id: driver.id, label: driverLabel(driver), sub: `@${driver.username}` });
		comboActive = comboOptions.findIndex((option) => option.id === selectedDriver);
		if (!comboOptions.length) {
			driverList.innerHTML = '<li class="manifest-combobox-empty">No drivers found</li>';
			return;
		}
		driverList.innerHTML = comboOptions.map((option, index) => `<li class="manifest-combobox-option${option.id === selectedDriver ? " selected" : ""}${index === comboActive ? " active" : ""}" role="option" data-id="${escapeHtml(option.id)}" aria-selected="${option.id === selectedDriver}">${escapeHtml(option.label)}${option.sub ? `<small>${escapeHtml(option.sub)}</small>` : ""}</li>`).join("");
	}

	function setActiveOption(index) {
		const items = driverList.querySelectorAll(".manifest-combobox-option");
		if (!items.length) return;
		comboActive = (index + items.length) % items.length;
		items.forEach((item, itemIndex) => item.classList.toggle("active", itemIndex === comboActive));
		items[comboActive].scrollIntoView({ block: "nearest" });
	}

	function openCombo() {
		renderComboList();
		setComboOpen(true);
	}

	async function chooseDriver(id) {
		selectedDriver = id;
		driverFilter.value = selectedLabel();
		setComboOpen(false);
		await loadDriverOrders();
	}

	async function loadDriverOrders() {
		loadError = "";
		if (!selectedDriver || loadedDrivers.has(selectedDriver)) {
			render();
			return;
		}
		const requested = selectedDriver;
		loading = true;
		render();
		try {
			const response = await fetch(`/api/manifest/orders?driver=${encodeURIComponent(requested)}`, { credentials: "include" });
			const data = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(data.error || "Could not load driver orders");
			for (const loaded of data.drivers || []) {
				const target = drivers.find((driver) => driver.id === loaded.id);
				if (target) target.orders = loaded.orders || [];
			}
			if (requested === "all") drivers.forEach((driver) => loadedDrivers.add(driver.id));
			loadedDrivers.add(requested);
		} catch (error) {
			if (requested === selectedDriver) loadError = error.message || "Could not load driver orders";
		} finally {
			loading = false;
		}
		if (requested === selectedDriver) render();
	}

	function setupDriverCombo() {
		driverFilter.addEventListener("focus", () => {
			driverFilter.select();
			openCombo();
		});
		driverFilter.addEventListener("input", () => {
			if (!driverFilter.value.trim() && selectedDriver) {
				selectedDriver = "";
				loadError = "";
				render();
			}
			renderComboList();
			setComboOpen(true);
		});
		driverFilter.addEventListener("keydown", (event) => {
			if (event.key === "ArrowDown" || event.key === "ArrowUp") {
				event.preventDefault();
				if (driverList.hidden) openCombo();
				else setActiveOption(comboActive + (event.key === "ArrowDown" ? 1 : -1));
			} else if (event.key === "Enter") {
				event.preventDefault();
				const option = comboOptions[comboActive] || (comboOptions.length === 1 ? comboOptions[0] : null);
				if (option) chooseDriver(option.id);
			} else if (event.key === "Escape") {
				driverFilter.value = selectedLabel();
				setComboOpen(false);
			}
		});
		driverList.addEventListener("mousedown", (event) => {
			const item = event.target.closest(".manifest-combobox-option");
			if (!item) return;
			event.preventDefault();
			chooseDriver(item.dataset.id);
		});
		document.addEventListener("mousedown", (event) => {
			if (driverCombo.contains(event.target)) return;
			driverFilter.value = selectedLabel();
			setComboOpen(false);
		});
	}

	function matchesFilters(order, searchText, driverNameMatch, selectedStatuses) {
		if (selectedStatuses.length && !selectedStatuses.includes(order.status)) return false;

		const pickupKey = dateKey(order.pickedUpAt);
		if ((fromInput.value || toInput.value) && !pickupKey) return false;
		if (fromInput.value && pickupKey < fromInput.value) return false;
		if (toInput.value && pickupKey > toInput.value) return false;

		if (!searchText || driverNameMatch) return true;
		const searchable = [
			order.id,
			order.customerName,
			order.phone,
			order.address,
			order.district,
			order.city,
			statusNames[order.status],
		].join(" ").toLocaleLowerCase();
		return searchable.includes(searchText);
	}

	function renderOrder(order) {
		const statusClass = order.needsRepickup
			? "needs-pickup"
			: order.status === "DELIVERED" || order.status === "Paid" || order.status === "COLLECTED"
				? "complete"
				: order.status === "Canceled"
					? "cancelled"
					: order.status === "Picked_up"
						? "picked-up"
						: "waiting";
		const place = placeText(order);
		const pickupTone = order.needsRepickup || waitingStatuses.has(order.status) ? "pickup-pending" : order.pickedUpAt ? "pickup-recorded" : "pickup-unknown";
		return `<tr>
			<td><span class="manifest-order-id">${escapeHtml(order.id)}</span>${order.isExpress ? '<span class="manifest-express">Express</span>' : ""}</td>
			<td><span class="manifest-customer-name">${escapeHtml(order.customerName || "Unnamed customer")}</span>${order.phone ? `<span class="manifest-secondary">${escapeHtml(order.phone)}</span>` : ""}</td>
			<td>${escapeHtml(place)}</td>
			<td><span class="manifest-pickup ${pickupTone}">${escapeHtml(pickupLabel(order))}</span></td>
			<td><span class="manifest-status ${statusClass}">${escapeHtml(statusLabel(order))}</span></td>
			<td class="manifest-amount">${escapeHtml(formatMoney(order.total))}</td>
		</tr>`;
	}

	function renderDriver(driver, orders, index) {
		const pickedCount = orders.filter((order) => order.pickedUpAt).length;
		const waitingCount = orders.filter(isAwaitingPickup).length;
		const contact = driver.phone
			? `<a class="manifest-driver-phone" href="tel:${escapeHtml(driver.phone)}"><i class="bx bx-phone" aria-hidden="true"></i>${escapeHtml(driver.phone)}</a>`
			: '<span class="manifest-driver-phone muted">No phone number</span>';
		const rows = orders.length
			? orders.map(renderOrder).join("")
			: '<tr><td colspan="6" class="manifest-table-empty">No assigned orders match these filters.</td></tr>';

		return `<details class="manifest-driver" open>
			<summary class="manifest-driver-summary">
				<span class="manifest-driver-avatar" aria-hidden="true">${escapeHtml((driver.name || driver.username || "D").trim().slice(0, 1).toUpperCase())}</span>
				<span class="manifest-driver-identity"><strong>${escapeHtml(driver.name || driver.username)}</strong><span>@${escapeHtml(driver.username)}</span></span>
				<span class="manifest-driver-contact">${contact}</span>
				<span class="manifest-driver-count"><strong>${orders.length}</strong><span>${orders.length === 1 ? "order" : "orders"}</span></span>
				<span class="manifest-driver-mini-stats"><span class="recorded">${pickedCount} pickup dates</span><span class="waiting">${waitingCount} awaiting</span></span>
				<i class="bx bx-chevron-down manifest-chevron" aria-hidden="true"></i>
			</summary>
			<div class="manifest-table-scroll">
				<table class="manifest-table">
					<thead><tr><th>Order ID</th><th>Customer</th><th>Address / location</th><th>Picked up</th><th>Status</th><th>Total</th></tr></thead>
					<tbody>${rows}</tbody>
				</table>
			</div>
		</details>`;
	}

	function setEmptyMessage(title, message) {
		empty.querySelector("h2").textContent = title;
		empty.querySelector("p").textContent = message;
	}

	function render() {
		const searchText = (searchInput.value || "").trim().toLocaleLowerCase();
		const selectedStatuses = statusMultiSelect.getSelected();
		const hasFilters = Boolean(searchText || selectedStatuses.length || fromInput.value || toInput.value || (selectedDriver && selectedDriver !== "all"));
		const visibleGroups = [];
		let filteredOrders = 0;
		let datedPickups = 0;
		let awaitingPickup = 0;

		const ready = selectedDriver && !loading && !loadError;
		if (ready) {
			for (const driver of drivers) {
				if (selectedDriver !== "all" && driver.id !== selectedDriver) continue;
				const nameSearchMatches = Boolean(searchText && `${driver.name} ${driver.username}`.toLocaleLowerCase().includes(searchText));
				const orders = [...(driver.orders || [])]
					.filter((order) => matchesFilters(order, searchText, nameSearchMatches, selectedStatuses))
					.sort((left, right) => {
						const dateDifference = new Date(right.pickedUpAt || 0) - new Date(left.pickedUpAt || 0);
						return dateDifference || String(left.id).localeCompare(String(right.id));
					});
				if (orders.length || !hasFilters || nameSearchMatches || selectedDriver === driver.id) {
					visibleGroups.push({ driver, orders });
				}
				filteredOrders += orders.length;
				for (const order of orders) {
					if (order.pickedUpAt) datedPickups += 1;
					if (isAwaitingPickup(order)) awaitingPickup += 1;
				}
			}
		}

		currentGroups = visibleGroups;
		groupsNode.innerHTML = visibleGroups.map(({ driver, orders }, index) => renderDriver(driver, orders, index)).join("");
		empty.classList.toggle("hidden", visibleGroups.length > 0);
		groupsNode.classList.toggle("hidden", visibleGroups.length === 0);
		document.getElementById("manifestDriverCount").textContent = String(visibleGroups.length);
		document.getElementById("manifestOrderCount").textContent = String(filteredOrders);
		document.getElementById("manifestPickedUpCount").textContent = String(datedPickups);
		document.getElementById("manifestAwaitingCount").textContent = String(awaitingPickup);

		if (!drivers.length) {
			setEmptyMessage("No drivers found", "Add a driver account to start building the manifest.");
			results.textContent = "No drivers found";
		} else if (!selectedDriver) {
			setEmptyMessage("Select a driver", "Search and choose a driver above to load their assigned orders.");
			results.textContent = "Select a driver to load their orders";
		} else if (loading) {
			setEmptyMessage("Loading orders…", "Fetching the assigned orders.");
			results.textContent = "Loading driver orders…";
		} else if (loadError) {
			setEmptyMessage("Could not load orders", loadError);
			results.textContent = loadError;
		} else {
			setEmptyMessage("No assigned orders found", "Adjust the filters or assign orders to a driver to populate this manifest.");
			results.textContent = `${filteredOrders} ${filteredOrders === 1 ? "order" : "orders"} across ${visibleGroups.length} ${visibleGroups.length === 1 ? "driver" : "drivers"}`;
		}
	}

	function printManifest() {
		const orderCount = currentGroups.reduce((count, group) => count + group.orders.length, 0);
		if (!orderCount) {
			const message = t("There are no matching assigned orders to print.");
			if (window.Dialog?.alert) window.Dialog.alert(message, { title: t("Nothing to print") });
			else window.alert(message);
			return;
		}

		const printWindow = window.open("", "_blank", "width=1120,height=780");
		if (!printWindow) {
			const message = t("Please allow pop-ups for this site to print the manifest.");
			if (window.Dialog?.alert) window.Dialog.alert(message, { title: t("Print manifest") });
			else window.alert(message);
			return;
		}

		const groupsMarkup = currentGroups
			.filter((group) => group.orders.length)
			.map(({ driver, orders }) => {
				const rows = orders.map((order) => {
					const location = placeText(order);
					const statusClass = order.needsRepickup
						? "status-attention"
						: order.status === "DELIVERED" || order.status === "Paid" || order.status === "COLLECTED"
							? "status-complete"
							: order.status === "Canceled"
								? "status-cancelled"
								: order.status === "Picked_up"
									? "status-picked"
									: "status-waiting";
					return `<tr>
						<td class="order-id">#${escapeHtml(order.id)}</td>
						<td><strong>${escapeHtml(order.customerName || t("Unnamed customer"))}</strong></td>
						<td>${escapeHtml(order.phone || "—")}</td>
						<td>${escapeHtml(location)}</td>
						<td>${escapeHtml(t(pickupLabel(order)))}</td>
						<td><span class="status ${statusClass}">${escapeHtml(t(statusLabel(order)))}</span></td>
						<td class="amount">${escapeHtml(formatMoney(order.total))}</td>
					</tr>`;
				}).join("");
				const phone = driver.phone ? ` · ${escapeHtml(driver.phone)}` : "";
				return `<section class="driver-section">
					<div class="driver-heading">
						<div><h2>${escapeHtml(driver.name || driver.username)}</h2><p>@${escapeHtml(driver.username)}${phone}</p></div>
						<strong>${orders.length} ${t(orders.length === 1 ? "order" : "orders")}</strong>
					</div>
					<table>
						<thead><tr><th>${t("Order ID")}</th><th>${t("Customer")}</th><th>${t("Phone")}</th><th>${t("Address / location")}</th><th>${t("Picked up")}</th><th>${t("Status")}</th><th>${t("Total")}</th></tr></thead>
						<tbody>${rows}</tbody>
					</table>
				</section>`;
			})
			.join("");
		const printedAt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date());
		const visibleDriverCount = currentGroups.filter((group) => group.orders.length).length;
		const allVisibleOrders = currentGroups.flatMap((group) => group.orders);
		const pickupDateCount = allVisibleOrders.filter((order) => order.pickedUpAt).length;
		const awaitingCount = allVisibleOrders.filter(isAwaitingPickup).length;
		const totalValue = allVisibleOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);

		printWindow.document.write(`<!doctype html>
		<html lang="${escapeHtml(document.documentElement.lang || "en")}" dir="${isArabic ? "rtl" : "ltr"}">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Go Delivery — ${escapeHtml(t("Driver Manifest"))}</title>
			<style>
				@page { size: landscape; margin: 11mm; }
				* { box-sizing: border-box; }
				body { margin: 0; color: #152238; font: 10px Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
				.print-sheet { max-width: 1500px; margin: 0 auto; }
				.print-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding: 0 0 14px; border-bottom: 2px solid #1e293b; }
				.brand { margin-bottom: 5px; color: #3269d6; font-size: 9px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
				h1 { margin: 0; color: #152238; font-size: 23px; line-height: 1.1; }
				.subtitle { margin: 6px 0 0; color: #65758b; font-size: 10px; }
				.print-meta { min-width: 180px; color: #66758a; text-align: end; }
				.print-meta strong { display: block; margin: 4px 0 7px; color: #293a53; font-size: 11px; }
				.print-meta .totals { display: block; margin-bottom: 4px; color: #3269d6; font-weight: 700; }
				.print-meta .detail { display: block; margin-top: 4px; color: #66758a; font-size: 9px; }
				.driver-section { margin-top: 16px; }
				.driver-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 10px; border: 1px solid #dbe3ee; border-bottom: 0; border-radius: 7px 7px 0 0; background: #f1f5fa; break-after: avoid; page-break-after: avoid; }
				.driver-heading h2 { margin: 0; color: #1e314c; font-size: 12px; }
				.driver-heading p { margin: 3px 0 0; color: #708097; font-size: 9px; }
				.driver-heading > strong { padding: 5px 9px; border-radius: 99px; background: #fff; color: #344761; font-size: 9px; white-space: nowrap; }
				table { width: 100%; border-collapse: collapse; table-layout: fixed; }
				th { padding: 7px 8px; background: #1e293b; color: #fff; font-size: 8px; font-weight: 700; text-align: start; }
				td { padding: 7px 8px; border-bottom: 1px solid #e3e9f1; color: #33445b; font-size: 9px; line-height: 1.3; overflow-wrap: anywhere; }
				tr:nth-child(even) td { background: #f8fafc; }
				th:nth-child(1) { width: 12%; } th:nth-child(2) { width: 19%; } th:nth-child(3) { width: 13%; } th:nth-child(4) { width: 17%; } th:nth-child(5) { width: 17%; } th:nth-child(6) { width: 13%; } th:nth-child(7) { width: 9%; }
				.order-id, .amount { font-weight: 700; white-space: nowrap; }
				.order-id { color: #285bb3; }
				.amount { text-align: end; }
				.status { display: inline-block; padding: 3px 6px; border-radius: 99px; font-size: 8px; font-weight: 700; }
				.status-waiting { background: #eef4ff; color: #4267a5; }
				.status-picked { background: #eaf6ff; color: #1970a7; }
				.status-complete { background: #eaf8f1; color: #19805d; }
				.status-cancelled { background: #fff0ef; color: #b44940; }
				.status-attention { background: #fff3df; color: #9b6100; }
				.print-footer { margin-top: 16px; padding-top: 7px; border-top: 1px solid #dbe3ee; color: #8491a3; font-size: 8px; text-align: center; }
				thead { display: table-header-group; }
				tr { break-inside: avoid; }
				@media screen { body { padding: 24px; background: #edf1f6; } .print-sheet { padding: 24px; background: white; box-shadow: 0 10px 35px #16253c24; } }
			</style>
		</head>
		<body><main class="print-sheet">
			<header class="print-header">
				<div><div class="brand">Go Delivery</div><h1>${escapeHtml(t("Driver Manifest"))}</h1><p class="subtitle">${escapeHtml(t("Assigned orders with pickup date and status"))}</p></div>
				<div class="print-meta"><span>${escapeHtml(t("Printed"))}</span><strong>${escapeHtml(printedAt)}</strong><span class="totals">${orderCount} ${t("orders")} · ${visibleDriverCount} ${t("drivers")} · ${escapeHtml(formatMoney(totalValue))}</span><span class="detail">${pickupDateCount} ${escapeHtml(t("Pickup dates recorded").toLocaleLowerCase())} · ${awaitingCount} ${escapeHtml(t("Awaiting pickup").toLocaleLowerCase())}</span></div>
			</header>
			${groupsMarkup}
			<footer class="print-footer">${escapeHtml(t("Pickup date reflects when the order was marked picked up for its assigned driver."))}</footer>
		</main></body></html>`);
		printWindow.document.close();
		printWindow.focus();
		printWindow.setTimeout(() => {
			printWindow.print();
			printWindow.close();
		}, 250);
	}

	setupDriverCombo();
	[searchInput, fromInput, toInput].forEach((element) => element.addEventListener("input", render));
	document.getElementById("manifestStatusFilter").addEventListener("statusmultiselectchange", render);
	document.getElementById("manifestToday").addEventListener("click", () => {
		const today = dateKey(new Date());
		fromInput.value = today;
		toInput.value = today;
		render();
	});
	document.getElementById("manifestClear").addEventListener("click", () => {
		searchInput.value = "";
		selectedDriver = "";
		driverFilter.value = "";
		loadError = "";
		statusMultiSelect.clear({ notify: false });
		fromInput.value = window.defaultDateFrom();
		toInput.value = "";
		render();
	});
	document.getElementById("manifestRefresh").addEventListener("click", () => {
		loadedDrivers.clear();
		drivers.forEach((driver) => { driver.orders = []; });
		loadDriverOrders();
	});
	document.getElementById("manifestPrint").addEventListener("click", printManifest);

	// Default to the last month of pickups.
	fromInput.value = window.defaultDateFrom();
	render();
})();

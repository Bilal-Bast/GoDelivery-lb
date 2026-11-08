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

	function populateDrivers() {
		for (const driver of drivers) {
			const option = document.createElement("option");
			option.value = driver.id;
			option.textContent = driver.name || driver.username;
			driverFilter.append(option);
		}
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
		const place = [order.district, order.city].filter(Boolean).join(", ") || "—";
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
					<thead><tr><th>Order ID</th><th>Customer</th><th>District / city</th><th>Picked up</th><th>Status</th><th>Total</th></tr></thead>
					<tbody>${rows}</tbody>
				</table>
			</div>
		</details>`;
	}

	function render() {
		const searchText = (searchInput.value || "").trim().toLocaleLowerCase();
		const selectedDriver = driverFilter.value;
		const selectedStatuses = statusMultiSelect.getSelected();
		const hasFilters = Boolean(searchText || selectedStatuses.length || fromInput.value || toInput.value || selectedDriver !== "all");
		const visibleGroups = [];
		let filteredOrders = 0;
		let datedPickups = 0;
		let awaitingPickup = 0;

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

		currentGroups = visibleGroups;
		groupsNode.innerHTML = visibleGroups.map(({ driver, orders }, index) => renderDriver(driver, orders, index)).join("");
		empty.classList.toggle("hidden", visibleGroups.length > 0);
		groupsNode.classList.toggle("hidden", visibleGroups.length === 0);
		document.getElementById("manifestDriverCount").textContent = String(visibleGroups.length);
		document.getElementById("manifestOrderCount").textContent = String(filteredOrders);
		document.getElementById("manifestPickedUpCount").textContent = String(datedPickups);
		document.getElementById("manifestAwaitingCount").textContent = String(awaitingPickup);
		results.textContent = `${filteredOrders} ${filteredOrders === 1 ? "order" : "orders"} across ${visibleGroups.length} ${visibleGroups.length === 1 ? "driver" : "drivers"}`;
	}

	function printManifest() {
		const orderCount = currentGroups.reduce((count, group) => count + group.orders.length, 0);
		if (!orderCount) {
			const message = "There are no matching assigned orders to print.";
			if (window.Dialog?.alert) window.Dialog.alert(message, { title: "Nothing to print" });
			else window.alert(message);
			return;
		}

		const printWindow = window.open("", "_blank", "width=1120,height=780");
		if (!printWindow) {
			const message = "Please allow pop-ups for this site to print the manifest.";
			if (window.Dialog?.alert) window.Dialog.alert(message, { title: "Print manifest" });
			else window.alert(message);
			return;
		}

		const groupsMarkup = currentGroups
			.filter((group) => group.orders.length)
			.map(({ driver, orders }) => {
				const rows = orders.map((order) => {
					const location = [order.district, order.city].filter(Boolean).join(", ") || "—";
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
						<td><strong>${escapeHtml(order.customerName || "Unnamed customer")}</strong></td>
						<td>${escapeHtml(order.phone || "—")}</td>
						<td>${escapeHtml(location)}</td>
						<td>${escapeHtml(pickupLabel(order))}</td>
						<td><span class="status ${statusClass}">${escapeHtml(statusLabel(order))}</span></td>
						<td class="amount">${escapeHtml(formatMoney(order.total))}</td>
					</tr>`;
				}).join("");
				const phone = driver.phone ? ` · ${escapeHtml(driver.phone)}` : "";
				return `<section class="driver-section">
					<div class="driver-heading">
						<div><h2>${escapeHtml(driver.name || driver.username)}</h2><p>@${escapeHtml(driver.username)}${phone}</p></div>
						<strong>${orders.length} ${orders.length === 1 ? "order" : "orders"}</strong>
					</div>
					<table>
						<thead><tr><th>Order ID</th><th>Customer</th><th>Phone</th><th>District / city</th><th>Picked up</th><th>Status</th><th>Total</th></tr></thead>
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
		<html lang="${escapeHtml(document.documentElement.lang || "en")}">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Go Delivery — Driver Manifest</title>
			<style>
				@page { size: landscape; margin: 11mm; }
				* { box-sizing: border-box; }
				body { margin: 0; color: #152238; font: 10px Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
				.print-sheet { max-width: 1500px; margin: 0 auto; }
				.print-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding: 0 0 14px; border-bottom: 2px solid #1e293b; }
				.brand { margin-bottom: 5px; color: #3269d6; font-size: 9px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
				h1 { margin: 0; color: #152238; font-size: 23px; line-height: 1.1; }
				.subtitle { margin: 6px 0 0; color: #65758b; font-size: 10px; }
				.print-meta { min-width: 180px; color: #66758a; text-align: right; }
				.print-meta strong { display: block; margin: 4px 0 7px; color: #293a53; font-size: 11px; }
				.print-meta .totals { display: block; margin-bottom: 4px; color: #3269d6; font-weight: 700; }
				.print-meta .detail { display: block; margin-top: 4px; color: #66758a; font-size: 9px; }
				.driver-section { margin-top: 16px; }
				.driver-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 10px; border: 1px solid #dbe3ee; border-bottom: 0; border-radius: 7px 7px 0 0; background: #f1f5fa; break-after: avoid; page-break-after: avoid; }
				.driver-heading h2 { margin: 0; color: #1e314c; font-size: 12px; }
				.driver-heading p { margin: 3px 0 0; color: #708097; font-size: 9px; }
				.driver-heading > strong { padding: 5px 9px; border-radius: 99px; background: #fff; color: #344761; font-size: 9px; white-space: nowrap; }
				table { width: 100%; border-collapse: collapse; table-layout: fixed; }
				th { padding: 7px 8px; background: #1e293b; color: #fff; font-size: 8px; font-weight: 700; text-align: left; }
				td { padding: 7px 8px; border-bottom: 1px solid #e3e9f1; color: #33445b; font-size: 9px; line-height: 1.3; overflow-wrap: anywhere; }
				tr:nth-child(even) td { background: #f8fafc; }
				th:nth-child(1) { width: 12%; } th:nth-child(2) { width: 19%; } th:nth-child(3) { width: 13%; } th:nth-child(4) { width: 17%; } th:nth-child(5) { width: 17%; } th:nth-child(6) { width: 13%; } th:nth-child(7) { width: 9%; }
				.order-id, .amount { font-weight: 700; white-space: nowrap; }
				.order-id { color: #285bb3; }
				.amount { text-align: right; }
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
				<div><div class="brand">Go Delivery</div><h1>Driver Manifest</h1><p class="subtitle">Assigned orders with pickup date and status</p></div>
				<div class="print-meta"><span>Printed</span><strong>${escapeHtml(printedAt)}</strong><span class="totals">${orderCount} orders · ${visibleDriverCount} drivers · ${escapeHtml(formatMoney(totalValue))}</span><span class="detail">${pickupDateCount} pickup dates recorded · ${awaitingCount} awaiting pickup</span></div>
			</header>
			${groupsMarkup}
			<footer class="print-footer">Pickup date reflects when the order was marked picked up for its assigned driver.</footer>
		</main></body></html>`);
		printWindow.document.close();
		printWindow.focus();
		printWindow.setTimeout(() => {
			printWindow.print();
			printWindow.close();
		}, 250);
	}

	populateDrivers();
	[searchInput, driverFilter, fromInput, toInput].forEach((element) => element.addEventListener("input", render));
	driverFilter.addEventListener("change", render);
	document.getElementById("manifestStatusFilter").addEventListener("statusmultiselectchange", render);
	document.getElementById("manifestToday").addEventListener("click", () => {
		const today = dateKey(new Date());
		fromInput.value = today;
		toInput.value = today;
		render();
	});
	document.getElementById("manifestClear").addEventListener("click", () => {
		searchInput.value = "";
		driverFilter.value = "all";
		statusMultiSelect.clear({ notify: false });
		fromInput.value = "";
		toInput.value = "";
		render();
	});
	document.getElementById("manifestRefresh").addEventListener("click", () => window.location.reload());
	document.getElementById("manifestPrint").addEventListener("click", printManifest);

	if (!drivers.length) {
		groupsNode.classList.add("hidden");
		empty.classList.remove("hidden");
		empty.querySelector("h2").textContent = "No drivers found";
		empty.querySelector("p").textContent = "Add a driver account to start building the manifest.";
	}
	render();
})();

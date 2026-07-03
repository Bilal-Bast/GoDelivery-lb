const API_URL = "/api";

document.addEventListener("DOMContentLoaded", () => {
	const urlParams = new URLSearchParams(window.location.search);
	const orderId = urlParams.get("id");

	// If server pre-fetched the order, render immediately (no extra round-trip)
	const serverOrder = (window.__INIT_DATA__ || {}).order;
	if (serverOrder) {
		if (orderId) document.getElementById("orderIdInput").value = orderId;
		renderOrderSummary(serverOrder);
		renderTimeline(serverOrder.history || []);
		document.getElementById("orderContent").classList.remove("hidden");
	} else if (orderId) {
		document.getElementById("orderIdInput").value = orderId;
		fetchOrder(orderId);
	}

	document.getElementById("trackForm").addEventListener("submit", (e) => {
		e.preventDefault();
		const id = document.getElementById("orderIdInput").value;
		window.history.pushState({}, "", `?id=${id}`);
		fetchOrder(id);
	});

	document.getElementById("orderIdInput").addEventListener("input", (e) => {
		if (e.target.value.trim()) return;

		window.history.pushState({}, "", window.location.pathname);
		document.getElementById("loadingIndicator").classList.add("hidden");
		document.getElementById("errorState").classList.add("hidden");
		document.getElementById("orderContent").classList.add("hidden");

		const timelineContainer = document.getElementById("timelineContainer");
		if (timelineContainer) timelineContainer.innerHTML = "";
	});
});

const STATUS_MAP = {
	0: "Warehouse",
	1: "New",
	2: "Picked Up",
	3: "Delivered",
	4: "Cancelled",
	5: "Paid",
	6: "Collected",
};

const STATUS_CLASS_MAP = {
	0: "warehouse",
	1: "new",
	2: "picked",
	3: "delivered",
	4: "canceled",
	5: "paid",
	6: "collected",
};

const HISTORY_FIELD_LABELS = {
	s: "Status",
	driver: "Driver",
	e: "Exchange",
	eN: "Exchange Note",
	m: "Merchant",
	id: "Order ID",
	"c.f": "First Name",
	"c.l": "Last Name",
	"c.p": "Phone",
	"c.loc.d": "District",
	"c.loc.cty": "City",
	"pr.t": "Total Price",
	"pr.d": "Delivery Charge",
};

function describeHistoryValue(key, value) {
	if (key === "s") return STATUS_MAP[value] ?? value;
	if (key === "driver") return value || "Unassigned";
	if (key === "e") return value ? "Yes" : "No";
	return value;
}

function flattenHistoryChanges(obj, prefix = "") {
	const out = [];
	Object.entries(obj || {}).forEach(([key, value]) => {
		const path = prefix ? `${prefix}.${key}` : key;
		if (value && typeof value === "object" && !Array.isArray(value)) {
			out.push(...flattenHistoryChanges(value, path));
		} else if (value !== undefined && value !== null && value !== "") {
			out.push([path, value]);
		}
	});
	return out;
}

function formatHistoryChanges(details) {
	const changes = flattenHistoryChanges(details);
	if (!changes.length) return "";
	return changes
		.map(
			([key, value]) =>
				`<div class="diff-item">${HISTORY_FIELD_LABELS[key] || key}: <span class="diff-value">${escapeHtml(describeHistoryValue(key, value))}</span></div>`,
		)
		.join("");
}

async function fetchOrder(id) {
	const loading = document.getElementById("loadingIndicator");
	const errorState = document.getElementById("errorState");
	const orderContent = document.getElementById("orderContent");

	loading.classList.remove("hidden");
	errorState.classList.add("hidden");
	orderContent.classList.add("hidden");

	try {
		const res = await fetch(
			`${API_URL}/orders/track/${encodeURIComponent(id)}`,
		);

		if (!res.ok) {
			throw new Error("Order not found");
		}

		const order = await res.json();
		renderOrderSummary(order);
		renderTimeline(order.history || []);

		loading.classList.add("hidden");
		orderContent.classList.remove("hidden");
	} catch (err) {
		loading.classList.add("hidden");
		errorState.classList.remove("hidden");
	}
}

function renderOrderSummary(order) {
	document.getElementById("displayOrderId").textContent = `#${order.id}`;

	const badge = document.getElementById("displayStatus");
	badge.textContent = STATUS_MAP[order.s] || "Unknown";
	badge.className = `status-badge ${STATUS_CLASS_MAP[order.s]}`;

	document.getElementById("cusName").textContent =
		`${order.c?.f || ""} ${order.c?.l || ""}`;
	document.getElementById("cusPhone").textContent = order.c?.p || "-";

	document.getElementById("destDistrict").textContent =
		order.c?.loc?.d || "-";
	document.getElementById("destCity").textContent = order.c?.loc?.cty || "-";

	document.getElementById("totalPrice").textContent = order.pr.t
		? `$${order.pr.t}`
		: "-";

	document.getElementById("driverName").textContent =
		order.driver || "Not assigned";
}

const ACTION_TYPE_LABELS = {
	creation: "Order Created",
	update: "Order Updated",
	status_change: "Status Updated",
};

function renderTimeline(history) {
	const container = document.getElementById("timelineContainer");
	container.innerHTML = "";

	const visibleHistory = (history || []).filter(
		(entry) => entry.action_type !== "note",
	);

	if (visibleHistory.length === 0) {
		container.innerHTML =
			'<p style="color: #64748b; font-size: 14px;">No adjustments recorded yet.</p>';
		return;
	}

	// Sort history by oldest first
	const sortedHistory = [...visibleHistory].sort(
		(a, b) => new Date(a.created_at) - new Date(b.created_at),
	);

	sortedHistory.forEach((entry) => {
		const dateObj = new Date(entry.created_at);
		const dateStr = dateObj.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
		const timeStr = dateObj.toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
		});

		const card = document.createElement("div");
		card.className = "timeline-item";

		let title = ACTION_TYPE_LABELS[entry.action_type] || "System Action";
		let detailsHtml = "";

		if (entry.action_type === "status_change") {
			title = `Status: ${STATUS_MAP[entry.new_value] || "Unknown"}`;
			if (entry.metadata && entry.metadata.note) {
				detailsHtml = `<div class="diff-item">Note: <span class="diff-value">${escapeHtml(entry.metadata.note)}</span></div>`;
			}
		} else if (entry.action_type === "update") {
			detailsHtml = formatHistoryChanges(entry.new_value);
		} else if (entry.action_type === "creation") {
			detailsHtml = "Order injected into the system.";
		}

		detailsHtml = detailsHtml || "No additional details provided.";

		card.innerHTML = `
            <div class="timeline-card">
                <div class="timeline-card-header">
                    <div>
                        <div class="action-title">${escapeHtml(title)}</div>
                        <div class="action-by">By <span>${escapeHtml(entry.performed_by || "System")}</span></div>
                    </div>
                    <div class="time-stamp">
                        <i class='bx bx-time'></i> ${dateStr} at ${timeStr}
                    </div>
                </div>
                <div class="timeline-details">
                    <div class="diff-grid">
                        ${detailsHtml}
                    </div>
                </div>
            </div>
        `;
		container.appendChild(card);
	});
}

function escapeHtml(unsafe) {
	if (!unsafe) return "";
	return unsafe
		.toString()
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

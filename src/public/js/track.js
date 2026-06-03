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

function renderTimeline(history) {
	const container = document.getElementById("timelineContainer");
	container.innerHTML = "";

	if (history.length === 0) {
		container.innerHTML =
			'<p style="color: #64748b; font-size: 14px;">No adjustments recorded yet.</p>';
		return;
	}

	// Sort history by newest first
	const sortedHistory = [...history].sort(
		(a, b) => new Date(b.timestamp) - new Date(a.timestamp),
	);

	sortedHistory.forEach((entry) => {
		const dateObj = new Date(entry.timestamp);
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

		// Format details beautifully
		let detailsHtml = "";
		if (entry.details) {
			if (
				entry.details.status !== undefined &&
				STATUS_MAP[entry.details.status]
			) {
				detailsHtml += `<div class="diff-item">Changed status to: <span class="diff-value">${STATUS_MAP[entry.details.status]}</span></div>`;
			} else if (entry.details.driver !== undefined) {
				detailsHtml += `<div class="diff-item">Assigned driver: <span class="diff-value">${entry.details.driver || "Unassigned"}</span></div>`;
			} else if (entry.details.s !== undefined) {
				detailsHtml += `<div class="diff-item">Updated order details.</div>`;
			} else {
				detailsHtml += `<div class="diff-item">Full details provided on creation/update.</div>`;
			}

			if (entry.details.eN) {
				detailsHtml += `<div class="diff-item change-note"><p><strong>Note:</strong> ${escapeHtml(entry.details.eN)}</p></div>`;
			}
		} else {
			detailsHtml = "No additional details provided.";
		}

		card.innerHTML = `
            <div class="timeline-card">
                <div class="timeline-card-header">
                    <div>
                        <div class="action-title">${escapeHtml(entry.action)}</div>
                        <div class="action-by">By <span>${escapeHtml(entry.by || "System")}</span></div>
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

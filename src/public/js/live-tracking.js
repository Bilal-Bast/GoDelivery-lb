(() => {
	const POLL_MS = 12000;
	const locale = () => (document.documentElement.lang === "ar" ? "ar-LB-u-nu-latn" : "en-US");
	const timers = new Set();
	const inFlight = new Set();
	const maps = new Map();
	const markers = new Map();
	let publicOrderId = null;
	let publicStatus = null;
	let merchantOrderId = null;
	let adminDrivers = [];

	function statusMessage(payload) {
		if (!payload || payload.available === false) return "Live tracking is currently unavailable.";
		if (payload.isStale) return "Driver location is temporarily stale. Waiting for a fresh update.";
		if (!payload.deliveryActive) return "Live location is available while the order is out for delivery.";
		if (!payload.isLive || !Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
			return "Waiting for the driver to share a fresh location.";
		}
		return `Live location updated ${new Date(payload.updatedAt).toLocaleTimeString(locale())}.`;
	}

	function ensureMap(id, center = [33.8938, 35.5018], zoom = 10) {
		if (!window.L || !document.getElementById(id)) return null;
		if (!maps.has(id)) {
			const map = window.L.map(id, { zoomControl: true }).setView(center, zoom);
			window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
				maxZoom: 19,
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
			}).addTo(map);
			maps.set(id, map);
		}
		return maps.get(id);
	}

	function putMarker(mapId, key, point, label) {
		const map = ensureMap(mapId, [point.latitude, point.longitude], 14);
		if (!map) return;
		const markerKey = `${mapId}:${key}`;
		let marker = markers.get(markerKey);
		if (!marker) {
			marker = window.L.marker([point.latitude, point.longitude]).addTo(map);
			const popup = document.createElement("span");
			popup.textContent = label;
			marker.bindPopup(popup);
			markers.set(markerKey, marker);
		} else {
			marker.setLatLng([point.latitude, point.longitude]);
		}
		map.setView([point.latitude, point.longitude], Math.max(map.getZoom(), 14));
	}

	function clearMarker(mapId, key) {
		const markerKey = `${mapId}:${key}`;
		const marker = markers.get(markerKey);
		const map = maps.get(mapId);
		if (marker && map) map.removeLayer(marker);
		markers.delete(markerKey);
	}

	function startPolling(callback, shouldRun) {
		const run = () => {
			if (!document.hidden && shouldRun()) callback();
		};
		run();
		const timer = window.setInterval(run, POLL_MS);
		timers.add(timer);
		return () => { window.clearInterval(timer); timers.delete(timer); };
	}

	async function loadPublic() {
		const state = document.getElementById("publicLiveState");
		if (!publicOrderId || !state || inFlight.has("public")) return;
		const requestedOrderId = publicOrderId;
		inFlight.add("public");
		try {
			const response = await fetch(`/api/orders/track/${encodeURIComponent(requestedOrderId)}/live`, { cache: "no-store" });
			if (!response.ok) throw new Error("Unavailable");
			const point = await response.json();
			if (publicOrderId !== requestedOrderId) return;
			state.textContent = statusMessage(point);
			if (point.isLive && !point.isStale) putMarker("publicLiveMap", "driver", point, "Driver's current location");
			else clearMarker("publicLiveMap", "driver");
		} catch (_) {
			if (publicOrderId !== requestedOrderId) return;
			state.textContent = "Live location is temporarily unavailable.";
			clearMarker("publicLiveMap", "driver");
		} finally {
			inFlight.delete("public");
		}
	}

	function initPublicOrder(orderId, status) {
		if (publicOrderId && publicOrderId !== orderId) clearMarker("publicLiveMap", "driver");
		publicOrderId = typeof orderId === "string" ? orderId : null;
		publicStatus = Number(status);
		const panel = document.getElementById("publicLivePanel");
		if (!panel) return;
		if (publicStatus !== 2 || !publicOrderId) {
			panel.classList.add("hidden");
			clearMarker("publicLiveMap", "driver");
			return;
		}
		panel.classList.remove("hidden");
		ensureMap("publicLiveMap");
		loadPublic();
	}

	async function loadAdmin() {
		const state = document.getElementById("adminLiveState");
		const list = document.getElementById("adminLiveList");
		if (!state || !list || inFlight.has("admin")) return;
		inFlight.add("admin");
		try {
			const response = await fetch("/api/tracking/drivers/live", { credentials: "same-origin", cache: "no-store" });
			if (!response.ok) throw new Error("Unavailable");
			const data = await response.json();
			adminDrivers = data.drivers || [];
			state.textContent = data.enabled ? `${adminDrivers.length} driver${adminDrivers.length === 1 ? "" : "s"} sharing a fresh location.` : "Live tracking is disabled by server configuration.";
			list.replaceChildren();
			for (const driver of adminDrivers) {
				putMarker("adminLiveMap", driver.driverId, driver, `${driver.displayName} · ${driver.activeOrderIds.length} active order${driver.activeOrderIds.length === 1 ? "" : "s"}`);
				const row = document.createElement("li");
				const name = document.createElement("strong");
				name.textContent = driver.displayName;
				const detail = document.createElement("span");
				detail.textContent = ` · ${driver.activeOrderIds.length} active · ${new Date(driver.updatedAt).toLocaleTimeString(locale())}`;
				row.append(name, detail);
				list.append(row);
			}
			for (const [key] of markers) if (key.startsWith("adminLiveMap:")) {
				const driverId = key.slice("adminLiveMap:".length);
				if (!adminDrivers.some((driver) => driver.driverId === driverId)) clearMarker("adminLiveMap", driverId);
			}
		} catch (_) {
			state.textContent = "Driver location service is temporarily unavailable.";
		} finally {
			inFlight.delete("admin");
		}
	}

	async function loadMerchant() {
		const state = document.getElementById("merchantLiveState");
		if (!merchantOrderId || !state || inFlight.has("merchant")) return;
		const requestedOrderId = merchantOrderId;
		inFlight.add("merchant");
		try {
			const response = await fetch(`/api/orders/${encodeURIComponent(requestedOrderId)}/live`, { credentials: "same-origin", cache: "no-store" });
			if (!response.ok) throw new Error("Unavailable");
			const point = await response.json();
			if (merchantOrderId !== requestedOrderId || !document.getElementById("merchantLiveDialog")?.open) return;
			state.textContent = statusMessage(point);
			if (point.isLive && !point.isStale) putMarker("merchantLiveMap", "driver", point, "Driver's current location");
			else clearMarker("merchantLiveMap", "driver");
		} catch (_) {
			if (merchantOrderId !== requestedOrderId) return;
			state.textContent = "Live location is unavailable for this order.";
			clearMarker("merchantLiveMap", "driver");
		} finally {
			inFlight.delete("merchant");
		}
	}

	function initMerchantOrder(orderId) {
		merchantOrderId = orderId;
		const dialog = document.getElementById("merchantLiveDialog");
		if (!dialog) return;
		if (typeof dialog.showModal === "function") dialog.showModal();
		else dialog.setAttribute("open", "");
		clearMarker("merchantLiveMap", "driver");
		ensureMap("merchantLiveMap");
		loadMerchant();
	}

	document.addEventListener("visibilitychange", () => {
		if (document.hidden) {
			for (const [key] of markers) {
				const [mapId, ...parts] = key.split(":");
				clearMarker(mapId, parts.join(":"));
			}
		} else {
			if (publicOrderId && publicStatus === 2) loadPublic();
			if (document.getElementById("adminLiveState")) loadAdmin();
			if (merchantOrderId && document.getElementById("merchantLiveDialog")?.open) loadMerchant();
		}
	});

	if (document.getElementById("adminLiveState")) ensureMap("adminLiveMap");
	const stopAdmin = document.getElementById("adminLiveState")
		? startPolling(loadAdmin, () => !!document.getElementById("adminLiveState"))
		: null;
	const publicTimer = startPolling(loadPublic, () => !!publicOrderId && publicStatus === 2);
	const merchantTimer = startPolling(loadMerchant, () => !!merchantOrderId && !!document.getElementById("merchantLiveDialog")?.open);

	document.getElementById("merchantLiveClose")?.addEventListener("click", () => {
		const dialog = document.getElementById("merchantLiveDialog");
		if (typeof dialog?.close === "function") dialog.close();
		else dialog?.removeAttribute("open");
		merchantOrderId = null;
		clearMarker("merchantLiveMap", "driver");
	});
	document.getElementById("merchantLiveDialog")?.addEventListener("cancel", () => {
		merchantOrderId = null;
		clearMarker("merchantLiveMap", "driver");
	});

	window.GoDeliveryLiveTracking = { initPublicOrder, initMerchantOrder, loadAdmin, stopAdmin, publicTimer, merchantTimer };
})();

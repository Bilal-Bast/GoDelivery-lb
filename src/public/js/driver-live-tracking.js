(() => {
	const container = document.querySelector(".driver-location-control");
	if (!container) return;
	const csrfToken = container.dataset.csrfToken || window.__CSRF_TOKEN__ || "";
	const state = document.getElementById("driverLocationState");
	const startButton = document.getElementById("startDriverLocation");
	const pauseButton = document.getElementById("pauseDriverLocation");
	const stopButton = document.getElementById("stopDriverLocation");
	let watchId = null;
	let active = false;
	let paused = false;
	let lastSentAt = 0;
	let lastPosition = null;
	let requestInFlight = false;

	function hasPickedUpOrder() {
		return (window.__INIT_DATA__?.orders || []).some((order) => Number(order.s) === 2);
	}

	function render() {
		const canShare = active && !paused && hasPickedUpOrder();
		startButton.disabled = canShare;
		startButton.textContent = paused ? "Resume sharing" : "Start sharing";
		pauseButton.disabled = !canShare;
		stopButton.disabled = !active;
	}

	async function stopRemote() {
		try {
			await fetch("/api/tracking/location", {
				method: "DELETE",
				credentials: "same-origin",
				headers: { "X-CSRF-Token": csrfToken },
				keepalive: true,
			});
		} catch (_) {
			// Phase 13 TTL bounds any point that cannot be cleared remotely.
		}
	}

	function clearWatch({ clearServer = true, asPause = false } = {}) {
		if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
		watchId = null;
		if (clearServer) stopRemote();
		if (asPause) {
			paused = true;
			state.textContent = "Sharing paused. Resume manually to share again.";
		} else {
			active = false;
			paused = false;
			state.textContent = "Location sharing is off.";
		}
		render();
	}

	function distanceMeters(a, b) {
		const radians = (degrees) => degrees * Math.PI / 180;
		const dLat = radians(b.latitude - a.latitude);
		const dLon = radians(b.longitude - a.longitude);
		const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
		return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
	}

	async function publish(position) {
		const point = position.coords;
		if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) || !Number.isFinite(point.accuracy) || point.accuracy > 100) {
			state.textContent = "GPS accuracy is too low for sharing. Waiting for a better reading.";
			return;
		}
		const now = Date.now();
		if (requestInFlight || (lastSentAt && now - lastSentAt < 10000 && (!lastPosition || distanceMeters(lastPosition, point) < 25))) return;
		requestInFlight = true;
		try {
			const response = await fetch("/api/tracking/location", {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
				body: JSON.stringify({ latitude: point.latitude, longitude: point.longitude, accuracy: point.accuracy, ...(Number.isFinite(point.heading) ? { heading: point.heading } : {}), ...(Number.isFinite(point.speed) && point.speed >= 0 ? { speed: point.speed } : {}), capturedAt: new Date(position.timestamp || now).toISOString() }),
			});
			const result = await response.json().catch(() => ({}));
			if (!response.ok) {
				if (response.status === 409 || response.status === 503) clearWatch({ asPause: true });
				state.textContent = response.status === 503 ? "Live location sharing is disabled by server configuration." : result.error || "Could not share location.";
				return;
			}
			lastSentAt = now;
			lastPosition = { latitude: point.latitude, longitude: point.longitude };
			state.textContent = `Sharing current location · updated ${new Date().toLocaleTimeString()}.`;
		} catch (_) {
			state.textContent = "Location update failed. Sharing will retry with the next GPS reading.";
		} finally {
			requestInFlight = false;
		}
	}

	function start() {
		if (!hasPickedUpOrder()) {
			state.textContent = "Location sharing is available only while you have an active Picked Up order.";
			return;
		}
		if (!window.isSecureContext || !navigator.geolocation) {
			state.textContent = "This browser cannot provide secure location access. Use the GoDelivery mobile app.";
			return;
		}
		active = true;
		paused = false;
		state.textContent = "Waiting for browser location permission…";
		try {
			watchId = navigator.geolocation.watchPosition(publish, (error) => {
				const message = error.code === error.PERMISSION_DENIED ? "Location permission was denied. Allow it in the browser to share." : "Unable to read location. Check browser location availability.";
				clearWatch({ asPause: true });
				state.textContent = message;
			}, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
		} catch (_) {
			active = false;
			paused = false;
			state.textContent = "Browser location could not be started. Check permissions and try again.";
		}
		render();
	}

	startButton.addEventListener("click", start);
	pauseButton.addEventListener("click", () => clearWatch({ asPause: true }));
	stopButton.addEventListener("click", () => clearWatch());
	document.addEventListener("visibilitychange", () => {
		if (document.hidden && watchId !== null) clearWatch({ asPause: true });
	});
	window.addEventListener("pagehide", () => {
		if (watchId !== null) clearWatch({ asPause: true });
	});
	render();
})();

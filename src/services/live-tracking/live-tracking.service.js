import prisma from "../../config/prisma.js";
import { InMemoryLiveLocationRepository } from "./live-location-repository.js";

const DELIVERY_STATUS = "Picked_up";
const ALLOWED_FIELDS = new Set([
	"latitude",
	"longitude",
	"accuracy",
	"heading",
	"speed",
	"capturedAt",
]);

class LiveTrackingError extends Error {
	constructor(message, statusCode = 400) {
		super(message);
		this.name = "LiveTrackingError";
		this.statusCode = statusCode;
	}
}

function enabledFromEnvironment() {
	return process.env.LIVE_TRACKING_ENABLED?.trim().toLowerCase() === "true";
}

function boundedInteger(value, fallback, min, max) {
	const parsed = Number.parseInt(value, 10);
	return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function getLiveTrackingConfig(env = process.env) {
	const ttlSeconds = boundedInteger(env.LIVE_LOCATION_TTL_SECONDS, 120, 30, 3600);
	const freshSeconds = boundedInteger(
		env.LIVE_LOCATION_FRESH_SECONDS,
		45,
		5,
		Math.max(5, ttlSeconds),
	);
	return {
		enabled: env.LIVE_TRACKING_ENABLED?.trim().toLowerCase() === "true",
		ttlMs: ttlSeconds * 1000,
		freshMs: freshSeconds * 1000,
		maxCapturedAgeMs: 2 * 60 * 1000,
		maxFutureSkewMs: 30 * 1000,
	};
}

function numericField(body, name, { min, max, optional = false }) {
	const value = body[name];
	if (value === undefined && optional) return undefined;
	if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
		throw new LiveTrackingError(`Invalid ${name}`);
	}
	return value;
}

function validateLocationPayload(body, now, config) {
	if (!body || typeof body !== "object" || Array.isArray(body)) {
		throw new LiveTrackingError("Invalid location payload");
	}
	if (Object.keys(body).some((field) => !ALLOWED_FIELDS.has(field))) {
		throw new LiveTrackingError("Unexpected location payload field");
	}
	const latitude = numericField(body, "latitude", { min: -90, max: 90 });
	const longitude = numericField(body, "longitude", { min: -180, max: 180 });
	const accuracy = numericField(body, "accuracy", { min: 0, max: 100 });
	const heading = numericField(body, "heading", { min: 0, max: 360, optional: true });
	const speed = numericField(body, "speed", { min: 0, max: 80, optional: true });
	const capturedAt = body.capturedAt === undefined ? now : new Date(body.capturedAt);
	if (!(capturedAt instanceof Date) || !Number.isFinite(capturedAt.getTime())) {
		throw new LiveTrackingError("Invalid capturedAt timestamp");
	}
	const ageMs = now.getTime() - capturedAt.getTime();
	if (ageMs > config.maxCapturedAgeMs || ageMs < -config.maxFutureSkewMs) {
		throw new LiveTrackingError("Location timestamp is stale or in the future");
	}
	return {
		latitude,
		longitude,
		accuracy,
		...(heading === undefined ? {} : { heading }),
		...(speed === undefined ? {} : { speed }),
		capturedAt: capturedAt.toISOString(),
	};
}

function unavailableLocation({
	enabled = true,
	deliveryActive = false,
	isStale = false,
	updatedAt = null,
} = {}) {
	return {
		available: enabled,
		deliveryActive,
		locationAvailable: false,
		isLive: false,
		isStale,
		updatedAt,
	};
}

function createLiveTrackingService({
	repository = new InMemoryLiveLocationRepository(),
	db = prisma,
	config = getLiveTrackingConfig,
	now = () => new Date(),
} = {}) {
	const currentConfig = () => (typeof config === "function" ? config() : config);

	function prune(configValue, currentTime = now()) {
		repository.pruneExpired(currentTime.getTime(), configValue.ttlMs);
	}

	async function publish(user, body) {
		if (user?.role !== "driver" || !user?.id) {
			throw new LiveTrackingError("Driver access required", user ? 403 : 401);
		}
		const configValue = currentConfig();
		if (!configValue.enabled) {
			throw new LiveTrackingError("Live tracking is disabled", 503);
		}
		const currentTime = now();
		const location = validateLocationPayload(body, currentTime, configValue);
		const activeDeliveries = await db.order.count({
			where: { driverId: user.id, status: DELIVERY_STATUS },
		});
		if (!activeDeliveries) {
			repository.delete(user.id);
			throw new LiveTrackingError("Live tracking is available while an order is out for delivery", 409);
		}
		prune(configValue, currentTime);
		const record = { ...location, receivedAt: currentTime.toISOString() };
		repository.set(user.id, record);
		return {
			available: true,
			locationAvailable: true,
			isLive: true,
			isStale: false,
			latitude: record.latitude,
			longitude: record.longitude,
			accuracy: record.accuracy,
			updatedAt: record.receivedAt,
		};
	}

	function stop(driverId) {
		if (typeof driverId !== "string" || !driverId) {
			throw new LiveTrackingError("Driver identity is required", 401);
		}
		repository.delete(driverId);
		return { stopped: true };
	}

	function forOrder(order) {
		const configValue = currentConfig();
		const deliveryActive = order?.status === DELIVERY_STATUS && !!order?.driverId;
		if (!configValue.enabled) {
			return unavailableLocation({ enabled: false, deliveryActive });
		}
		if (order?.status !== DELIVERY_STATUS || !order?.driverId) {
			return unavailableLocation();
		}
		const currentTime = now();
		prune(configValue, currentTime);
		const location = repository.get(order.driverId);
		if (!location) return unavailableLocation({ deliveryActive: true });
		const ageMs = Math.max(
			currentTime.getTime() - Date.parse(location.receivedAt),
			currentTime.getTime() - Date.parse(location.capturedAt),
		);
		if (ageMs > configValue.ttlMs) {
			repository.delete(order.driverId);
			return unavailableLocation();
		}
		if (ageMs > configValue.freshMs) {
			return unavailableLocation({
				deliveryActive: true,
				isStale: true,
				updatedAt: location.receivedAt,
			});
		}
		return {
			available: true,
			deliveryActive: true,
			locationAvailable: true,
			isLive: true,
			isStale: false,
			latitude: location.latitude,
			longitude: location.longitude,
			accuracy: location.accuracy,
			updatedAt: location.receivedAt,
		};
	}

	function freshLocations() {
		const configValue = currentConfig();
		if (!configValue.enabled) return [];
		const currentTime = now();
		prune(configValue, currentTime);
		return repository.list().filter((location) => {
			const ageMs = Math.max(
				currentTime.getTime() - Date.parse(location.receivedAt),
				currentTime.getTime() - Date.parse(location.capturedAt),
			);
			return ageMs <= configValue.freshMs;
		});
	}

	function isEnabled() {
		return currentConfig().enabled === true;
	}

	return { publish, stop, forOrder, freshLocations, isEnabled, repository };
}

const liveTracking = createLiveTrackingService({
	config: () => ({ ...getLiveTrackingConfig(), enabled: enabledFromEnvironment() }),
});

export {
	DELIVERY_STATUS,
	LiveTrackingError,
	createLiveTrackingService,
	getLiveTrackingConfig,
	validateLocationPayload,
	liveTracking,
};

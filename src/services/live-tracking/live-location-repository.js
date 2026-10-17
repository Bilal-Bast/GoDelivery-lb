function copyLocation(location) {
	return location ? { ...location } : null;
}

/** Process-local storage for the latest point only. It never keeps a route. */
class InMemoryLiveLocationRepository {
	#locations = new Map();

	set(driverId, location) {
		this.#locations.set(driverId, copyLocation(location));
	}

	get(driverId) {
		return copyLocation(this.#locations.get(driverId));
	}

	list() {
		return [...this.#locations.entries()].map(([driverId, location]) => ({
			driverId,
			...copyLocation(location),
		}));
	}

	delete(driverId) {
		return this.#locations.delete(driverId);
	}

	pruneExpired(now, ttlMs) {
		let removed = 0;
		for (const [driverId, location] of this.#locations) {
			if (now - Date.parse(location.receivedAt) > ttlMs) {
				this.#locations.delete(driverId);
				removed++;
			}
		}
		return removed;
	}

	clear() {
		this.#locations.clear();
	}
}

class DisabledLiveLocationRepository {
	set() {}
	get() { return null; }
	list() { return []; }
	delete() { return false; }
	pruneExpired() { return 0; }
	clear() {}
}

export { InMemoryLiveLocationRepository, DisabledLiveLocationRepository };

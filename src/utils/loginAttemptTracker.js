// Track login attempts to prevent brute force
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

export function recordFailedAttempt(username) {
	const now = Date.now();
	const attempt = loginAttempts.get(username) || { count: 0, firstAttempt: now };

	// Reset if lockout period has passed
	if (now - attempt.firstAttempt > LOCKOUT_TIME) {
		loginAttempts.set(username, { count: 1, firstAttempt: now });
		return false;
	}

	attempt.count += 1;
	loginAttempts.set(username, attempt);

	return attempt.count >= MAX_ATTEMPTS;
}

export function resetAttempts(username) {
	loginAttempts.delete(username);
}

export function getAttempts(username) {
	const attempt = loginAttempts.get(username);
	if (!attempt) return { count: 0, locked: false, remainingTime: 0 };

	const now = Date.now();
	const elapsed = now - attempt.firstAttempt;

	if (elapsed > LOCKOUT_TIME) {
		loginAttempts.delete(username);
		return { count: 0, locked: false, remainingTime: 0 };
	}

	return {
		count: attempt.count,
		locked: attempt.count >= MAX_ATTEMPTS,
		remainingTime: Math.ceil((LOCKOUT_TIME - elapsed) / 1000),
	};
}

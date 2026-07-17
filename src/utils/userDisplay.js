function formatUserDisplayName(user) {
	if (!user) return null;
	const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
	return name || user.username;
}

export { formatUserDisplayName };

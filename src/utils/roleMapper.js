// Single source of truth for converting between the app-level lowercase role/accountType
// strings (used in JWTs, req.user, and route guards like pageAuth/authorize) and the
// uppercase Prisma enum values (Role, AccountType) stored in Postgres.

function mapRoleToPrisma(role) {
	if (!role) return null;
	const normalized = String(role).toUpperCase();
	return ["ADMIN", "MERCHANT", "DRIVER"].includes(normalized) ? normalized : null;
}

function normalizeRoleForOutput(role) {
	return role ? String(role).toLowerCase() : role;
}

function mapAccountTypeToPrisma(accountType) {
	if (!accountType) return null;
	const normalized = String(accountType).toUpperCase();
	return ["PREPAID", "POSTPAID"].includes(normalized) ? normalized : null;
}

function normalizeAccountTypeForOutput(accountType) {
	return accountType ? String(accountType).toLowerCase() : accountType;
}

export {
	mapRoleToPrisma,
	normalizeRoleForOutput,
	mapAccountTypeToPrisma,
	normalizeAccountTypeForOutput,
};

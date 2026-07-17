import {
	normalizeRoleForOutput,
	normalizeAccountTypeForOutput,
} from "../../utils/roleMapper.js";

const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME;

function isSuperAdminUsername(username) {
	return Boolean(SUPER_ADMIN_USERNAME && username === SUPER_ADMIN_USERNAME);
}

function transformDeliveryCharges(deliveryCharges) {
	if (!Array.isArray(deliveryCharges)) return {};
	return deliveryCharges.reduce((result, item) => {
		if (!item || item.region == null || item.price == null) {
			return result;
		}
		result[item.region] = item.price;
		return result;
	}, {});
}

function serializeUser(user) {
	if (!user) return user;
	const result = { ...user };
	if (Array.isArray(result.deliveryCharges)) {
		result.deliveryCharges = transformDeliveryCharges(result.deliveryCharges);
	} else {
		result.deliveryCharges = {};
	}
	if (result.role) {
		result.role = normalizeRoleForOutput(result.role);
	}
	if (result.accountType) {
		result.accountType = normalizeAccountTypeForOutput(result.accountType);
	}
	delete result.password;
	return result;
}

function serializeUsers(users) {
	return users.map(serializeUser);
}

function normalizeDeliveryCharges(value) {
	if (value == null) return {};
	let parsed = value;
	if (typeof parsed === "string") {
		parsed = JSON.parse(parsed);
	}
	if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
		return {};
	}
	return Object.entries(parsed).reduce((result, [region, price]) => {
		if (region == null) return result;
		const numericPrice = Number(price);
		if (!Number.isFinite(numericPrice)) return result;
		result[region] = numericPrice;
		return result;
	}, {});
}

function deliveryChargesRelationData(deliveryCharges) {
	return Object.entries(deliveryCharges).map(([region, price]) => ({
		region,
		price,
	}));
}

export {
	isSuperAdminUsername,
	serializeUser,
	serializeUsers,
	normalizeDeliveryCharges,
	deliveryChargesRelationData,
};

import prisma from "../../config/prisma.js";
import {
	statusNumberToEnum,
	statusEnumToNumber,
	legacyStatusMap,
} from "../../utils/orderStatus.js";

function orderFromPrisma(order, history) {
	const merchantUsername = order.merchant?.username || null;
	const driverUsername = order.driver?.username || null;

	const mapped = {
		id: order.id,
		m: merchantUsername,
		driver: driverUsername,
		c: {
			f: order.customerFirstName || "",
			l: order.customerLastName || "",
			p: order.customerPhone || "",
			loc: {
				d: order.district || "",
				cty: order.city || "",
			},
		},
		pr: {
			t: order.total ?? 0,
			d: order.deliveryCharge ?? 0,
		},
		cb: order.createdBy || "admin",
		s: statusEnumToNumber[order.status] ?? 0,
		statusUpdatedAt: order.statusUpdatedAt,
		e: order.isExpress ?? false,
		eN: order.expressNote || "",
		createdAt: order.createdAt,
		updatedAt: order.updatedAt,
	};

	if (history !== undefined) {
		mapped.history = history;
	}

	return mapped;
}

function orderHistoryFromPrisma(entry) {
	return {
		id: entry.id,
		order_id: entry.orderId,
		action_type: entry.actionType,
		old_value: entry.oldValue,
		new_value: entry.newValue,
		performed_by: entry.performedBy,
		location: entry.location,
		metadata: entry.metadata,
		created_at: entry.createdAt,
	};
}

function normalizeOrderPayload(orderData) {
	if (!orderData) return null;
	let payload = orderData;

	if (payload.merchant && !payload.m) {
		const status = legacyStatusMap[payload.status];
		if (status === undefined) {
			return null;
		}

		payload = {
			id: payload.id,
			m: payload.merchant,
			c: {
				f: payload.customer?.firstName,
				l: payload.customer?.lastName,
				p: payload.customer?.phone,
				loc: {
					d: payload.customer?.location?.district,
					cty: payload.customer?.location?.city,
				},
			},
			pr: {
				t: payload.pricing?.totalPrice,
				d: payload.pricing?.deliveryCharge,
			},
			s: status,
			e: payload.e === true,
			eN: payload.eN || "",
			cb: payload.createdBy || "admin",
		};
	}

	return {
		id: payload.id,
		merchantUsername: payload.m,
		customerFirstName: payload.c?.f,
		customerLastName: payload.c?.l || "",
		customerPhone: payload.c?.p,
		district: payload.c?.loc?.d,
		city: payload.c?.loc?.cty,
		total: payload.pr?.t,
		deliveryCharge: payload.pr?.d,
		status: Number.isFinite(Number(payload.s))
			? Number(payload.s)
			: legacyStatusMap[payload.status] ?? undefined,
	};
}

async function resolveMerchantId(username) {
	if (!username) return null;
	const merchant = await prisma.user.findFirst({
		where: { username, role: "MERCHANT" },
	});
	return merchant?.id || null;
}

async function resolveDriverId(username) {
	if (!username) return null;
	const driver = await prisma.user.findFirst({
		where: { username, role: "DRIVER" },
	});
	return driver?.id || null;
}

async function buildOrderCreateData(orderData) {
	const payload = normalizeOrderPayload(orderData);
	if (!payload) {
		return { error: "Invalid order payload" };
	}

	const merchantId = await resolveMerchantId(payload.merchantUsername);
	if (!merchantId) {
		return { error: "Invalid merchant username" };
	}

	if (
		!payload.customerFirstName ||
		!payload.customerPhone ||
		!payload.district ||
		!payload.city ||
		!payload.total ||
		payload.deliveryCharge == null
	) {
		return { error: "Missing required customer or pricing fields" };
	}

	return {
		data: {
			id: payload.id,
			merchantId,
			customerFirstName: payload.customerFirstName,
			customerLastName: payload.customerLastName || "",
			customerPhone: payload.customerPhone,
			district: payload.district,
			city: payload.city,
			total: Number(payload.total),
			deliveryCharge: Number(payload.deliveryCharge),
			createdBy: payload.createdBy || "admin",
			status:
				Number.isFinite(payload.status) &&
				payload.status >= 0 &&
				payload.status <= 6
					? statusNumberToEnum[payload.status]
					: "WAREHOUSE",
			statusUpdatedAt: new Date(),
			isExpress: Boolean(payload.isExpress),
			expressNote: payload.expressNote || "",
		},
	};
}

function buildOrderUpdateData(body) {
	const data = {};

	if (body.m) {
		data.merchantUsername = body.m;
	}
	if (body.driver !== undefined) {
		data.driverUsername = body.driver || null;
	}
	if (body.c) {
		if (body.c.f !== undefined) data.customerFirstName = body.c.f;
		if (body.c.l !== undefined) data.customerLastName = body.c.l;
		if (body.c.p !== undefined) data.customerPhone = body.c.p;
		if (body.c.loc) {
			if (body.c.loc.d !== undefined) data.district = body.c.loc.d;
			if (body.c.loc.cty !== undefined) data.city = body.c.loc.cty;
		}
	}
	if (body.pr) {
		if (body.pr.t !== undefined) data.total = Number(body.pr.t);
		if (body.pr.d !== undefined) data.deliveryCharge = Number(body.pr.d);
	}
	if (body.cb !== undefined) data.createdBy = body.cb;
	if (body.s !== undefined && Number.isFinite(Number(body.s))) {
		const numeric = Number(body.s);
		if (numeric >= 0 && numeric <= 6) {
			data.status = statusNumberToEnum[numeric];
		}
	}
	if (body.e !== undefined) data.isExpress = Boolean(body.e);
	if (body.eN !== undefined) data.expressNote = body.eN;

	return data;
}

export {
	orderFromPrisma,
	orderHistoryFromPrisma,
	normalizeOrderPayload,
	resolveMerchantId,
	resolveDriverId,
	buildOrderCreateData,
	buildOrderUpdateData,
};

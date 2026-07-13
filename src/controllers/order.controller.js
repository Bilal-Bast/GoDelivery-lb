import prisma from "../config/prisma.js";
import { validatePaginationParams } from "../utils/queryValidator.js";

const statusNumberToEnum = [
"WAREHOUSE",
"NEW",
"Picked_up",
"DELIVERED",
"Canceled",
"Paid",
"COLLECTED",
];

const statusEnumToNumber = {
WAREHOUSE: 0,
NEW: 1,
Picked_up: 2,
DELIVERED: 3,
Canceled: 4,
Paid: 5,
COLLECTED: 6,
};

const statusNames = [
"Warehouse",
"New",
"Picked Up",
"Delivered",
"Cancelled",
"Paid",
"Collected",
];

const legacyStatusMap = {
	Warehouse: 0,
	New: 1,
	"Picked up": 2,
	Delivered: 3,
	Cancelled: 4,
	Paid: 5,
	Collected: 6,
};

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
const statusMap = {
Warehouse: 0,
New: 1,
"Picked up": 2,
Delivered: 3,
Cancelled: 4,
Paid: 5,
Collected: 6,
};
const status = statusMap[payload.status];
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

async function getOrders(req, res, next) {
	try {
		const { page, limit } = validatePaginationParams(req);
		const skip = (page - 1) * limit;

		const total = await prisma.order.count();
		const orders = await prisma.order.findMany({
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
			include: {
				merchant: { select: { username: true } },
				driver: { select: { username: true } },
			},
		});

		res.json({
			data: orders.map((order) => orderFromPrisma(order)),
			pagination: {
				total,
				page,
				limit,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		next(error);
	}
}

async function getOrdersByCurrentMerchant(req, res, next) {
	try {
		const merchantUsername = req.user?.username;
		if (!merchantUsername) {
			return res.status(400).json({ error: "Invalid user" });
		}

		const orders = await prisma.order.findMany({
			where: {
				merchant: { username: merchantUsername },
			},
			orderBy: { createdAt: "desc" },
			include: {
				merchant: { select: { username: true } },
				driver: { select: { username: true } },
			},
		});

		res.json(orders.map((order) => orderFromPrisma(order)));
	} catch (error) {
		next(error);
	}
}

async function getOrderById(req, res, next) {
try {
if (!req.params.id || req.params.id.length > 50) {
return res.status(400).json({ error: "Invalid order ID" });
}

const order = await prisma.order.findUnique({
where: { id: req.params.id },
include: {
merchant: { select: { username: true } },
driver: { select: { username: true } },
},
});

if (!order) return res.status(404).json({ error: "Order not found" });

const history = await prisma.orderHistory.findMany({
where: { orderId: order.id },
orderBy: { createdAt: "asc" },
});

res.json(orderFromPrisma(order, history.map(orderHistoryFromPrisma)));
} catch (error) {
next(error);
}
}

async function getOrdersByDriver(req, res, next) {
try {
const orders = await prisma.order.findMany({
where: {
driver: { username: req.params.driverUsername },
},
orderBy: { createdAt: "desc" },
include: {
merchant: { select: { username: true } },
driver: { select: { username: true } },
},
});
res.json(orders.map((order) => orderFromPrisma(order)));
} catch (error) {
next(error);
}
}

async function getOrdersByMerchant(req, res, next) {
try {
if (req.user.role === "merchant" && req.user.username !== req.params.merchantName) {
return res.status(403).json({ error: "Forbidden" });
}
const orders = await prisma.order.findMany({
where: {
merchant: { username: req.params.merchantName },
},
orderBy: { createdAt: "desc" },
include: {
merchant: { select: { username: true } },
driver: { select: { username: true } },
},
});
res.json(orders.map((order) => orderFromPrisma(order)));
} catch (error) {
next(error);
}
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

async function createOrder(req, res, next) {
try {
let orderData = { ...req.body };
delete orderData.driver;

const createInfo = await buildOrderCreateData(orderData);
if (createInfo.error) {
return res.status(400).json({ error: createInfo.error });
}

const historyEntry = {
orderId: createInfo.data.id,
actionType: "creation",
newValue: orderData,
performedBy: createInfo.data.createdBy,
metadata: { message: "Order created" },
};

const [order] = await prisma.$transaction([
prisma.order.create({
data: createInfo.data,
include: {
merchant: { select: { username: true } },
driver: { select: { username: true } },
},
}),
prisma.orderHistory.create({ data: historyEntry }),
]);

res.status(201).json({
message: "Order created successfully",
order: orderFromPrisma(order, [historyEntry]),
});
} catch (error) {
if (error.code === "P2002") {
return res.status(400).json({ error: "Order with this ID already exists" });
}
next(error);
}
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

async function updateOrder(req, res, next) {
try {
const order = await prisma.order.findUnique({
where: { id: req.params.id },
});
if (!order) return res.status(404).json({ error: "Order not found" });

const updateData = buildOrderUpdateData(req.body);

const relations = {};
if (updateData.merchantUsername) {
const merchantId = await resolveMerchantId(updateData.merchantUsername);
if (!merchantId) {
return res.status(400).json({ error: "Invalid merchant username" });
}
relations.merchant = { connect: { id: merchantId } };
delete updateData.merchantUsername;
}
if (Object.prototype.hasOwnProperty.call(updateData, "driverUsername")) {
const driverId = updateData.driverUsername
? await resolveDriverId(updateData.driverUsername)
: null;
if (updateData.driverUsername && !driverId) {
return res.status(400).json({ error: "Invalid driver username" });
}
relations.driver = driverId ? { connect: { id: driverId } } : { disconnect: true };
delete updateData.driverUsername;
}

if (Object.keys(updateData).length === 0 && Object.keys(relations).length === 0) {
return res.status(400).json({ error: "No valid fields to update" });
}

const historyEntry = {
orderId: req.params.id,
actionType: "update",
newValue: req.body,
performedBy: req.user.username,
};

const [updatedOrder] = await prisma.$transaction([
prisma.order.update({
where: { id: req.params.id },
data: { ...updateData, ...relations },
include: {
merchant: { select: { username: true } },
driver: { select: { username: true } },
},
}),
prisma.orderHistory.create({ data: historyEntry }),
]);

const fullHistory = await prisma.orderHistory.findMany({
where: { orderId: req.params.id },
orderBy: { createdAt: "asc" },
});

res.json({
message: "Order updated successfully",
order: orderFromPrisma(updatedOrder, fullHistory.map(orderHistoryFromPrisma)),
});
} catch (error) {
next(error);
}
}

async function updateOrderStatus(req, res, next) {
try {
const { s, note } = req.body;
const validStatuses = [0, 1, 2, 3, 4, 5, 6];

if (s === undefined || !validStatuses.includes(Number(s))) {
return res
.status(400)
.json({ error: "Invalid status. Must be a number 0-6." });
}

const numericStatus = Number(s);
const historyEntry = {
orderId: req.params.id,
actionType: "status_change",
newValue: numericStatus,
performedBy: req.user.username,
metadata: {
status_text: statusNames[numericStatus],
note: note || "",
},
};

const query = {
id: req.params.id,
};
if (req.user.role === "driver") {
query.driver = { username: req.user.username };
}

const order = await prisma.order.findFirst({
where: query,
});
if (!order) return res.status(404).json({ error: "Order not found" });

const [updatedOrder] = await prisma.$transaction([
prisma.order.update({
where: { id: req.params.id },
data: {
status: statusNumberToEnum[numericStatus],
statusUpdatedAt: new Date(),
expressNote: note || undefined,
},
include: {
merchant: { select: { username: true } },
driver: { select: { username: true } },
},
}),
prisma.orderHistory.create({ data: historyEntry }),
]);

res.json({
message: "Order status updated successfully",
order: orderFromPrisma(updatedOrder),
});
} catch (error) {
next(error);
}
}

async function deleteOrder(req, res, next) {
try {
const order = await prisma.order.findUnique({
where: { id: req.params.id },
include: {
merchant: { select: { username: true } },
driver: { select: { username: true } },
},
});
if (!order) return res.status(404).json({ error: "Order not found" });

await prisma.$transaction([
prisma.orderHistory.deleteMany({ where: { orderId: req.params.id } }),
prisma.order.delete({ where: { id: req.params.id } }),
]);

res.json({
message: "Order deleted successfully",
order: orderFromPrisma(order),
});
} catch (error) {
next(error);
}
}

async function getOrderHistory(req, res, next) {
try {
const history = await prisma.orderHistory.findMany({
where: { orderId: req.params.id },
orderBy: { createdAt: "asc" },
});
res.json(history.map(orderHistoryFromPrisma));
} catch (error) {
next(error);
}
}

async function getCustomerByPhone(req, res, next) {
try {
const escapedPhone = req.params.phone.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const order = await prisma.order.findFirst({
where: {
customerPhone: {
contains: req.params.phone,
mode: "insensitive",
},
},
orderBy: { createdAt: "desc" },
select: {
customerFirstName: true,
customerLastName: true,
customerPhone: true,
district: true,
city: true,
},
});

if (!order) return res.status(404).json({ error: "Customer not found" });
res.json({
f: order.customerFirstName,
l: order.customerLastName,
p: order.customerPhone,
loc: { d: order.district, cty: order.city },
});
} catch (error) {
next(error);
}
}

async function trackOrder(req, res, next) {
try {
const order = await prisma.order.findUnique({
where: { id: req.params.id },
include: {
merchant: { select: { username: true } },
driver: { select: { username: true } },
},
});
if (!order) return res.status(404).json({ error: "Order not found" });

const history = await prisma.orderHistory.findMany({
where: { orderId: order.id },
orderBy: { createdAt: "asc" },
});

const mappedOrder = orderFromPrisma(order, history.map(orderHistoryFromPrisma));
mappedOrder.driver = mappedOrder.driver || "Not assigned";

res.json(mappedOrder);
} catch (error) {
next(error);
}
}

export {
getOrders,
getOrderById,
getOrdersByMerchant,
getOrdersByCurrentMerchant,
getOrdersByDriver,
createOrder,
updateOrder,
updateOrderStatus,
deleteOrder,
getOrderHistory,
getCustomerByPhone,
trackOrder,
};

async function createOrderSSR(req, res, next) {
try {
let orderData = req.body.orderJson
? JSON.parse(req.body.orderJson)
: req.body;

if (orderData.merchant && !orderData.m) {
orderData = {
id: orderData.id,
m: orderData.merchant,
c: {
f: orderData.customer?.firstName,
l: orderData.customer?.lastName,
p: orderData.customer?.phone,
loc: {
d: orderData.customer?.location?.district,
cty: orderData.customer?.location?.city,
},
},
pr: {
t: orderData.pricing?.totalPrice,
d: orderData.pricing?.deliveryCharge,
},
s: 0,
e: orderData.e === true,
eN: orderData.eN || "",
cb: (req.user && req.user.username) || "admin",
};
}

const createInfo = await buildOrderCreateData(orderData);
if (createInfo.error) {
return res.redirect(
`/orders?error=${encodeURIComponent(createInfo.error)}`,
);
}

const historyEntry = {
orderId: createInfo.data.id,
actionType: "creation",
newValue: orderData,
performedBy: createInfo.data.createdBy,
metadata: { message: "Order created via SSR" },
};

await prisma.$transaction([
prisma.order.create({ data: createInfo.data }),
prisma.orderHistory.create({ data: historyEntry }),
]);

return res.redirect("/orders?success=1");
} catch (error) {
console.error("createOrderSSR error:", error);
return res.redirect(
`/orders?error=${encodeURIComponent("Failed to create order")}`,
);
}
}

export { createOrderSSR };

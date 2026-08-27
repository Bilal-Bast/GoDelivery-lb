import prisma from "../config/prisma.js";
import { statusNumberToEnum } from "../utils/orderStatus.js";
import { formatUserDisplayName } from "../utils/userDisplay.js";
import {
	getPrepaidMerchantBalances,
	getMerchantPayments,
	getDriverOutstanding,
} from "../controllers/finance.controller.js";

function mapUser(user) {
	if (!user) return null;
	return {
		id: user.id,
		username: user.username,
		email: user.email,
		role: user.role ? String(user.role).toLowerCase() : user.role,
		firstName: user.firstName,
		lastName: user.lastName,
		phone: user.phone,
		accountType: user.accountType
			? String(user.accountType).toLowerCase()
			: user.accountType,
		paymentDay: user.paymentDay,
		orderIdPrefix: user.orderIdPrefix || "",
		deliveryFee: user.deliveryFee,
		deliveryCharges: user.deliveryCharges?.reduce((acc, charge) => {
			acc[charge.region] = charge.price;
			return acc;
		}, {}),
		resetPasswordToken: user.resetPasswordToken,
		resetPasswordExpires: user.resetPasswordExpires,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
	};
}

function mapDriver(user) {
	return {
		id: user.username,
		username: user.username,
		name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username,
		firstName: user.firstName,
		lastName: user.lastName,
		phone: user.phone,
		deliveryFee: user.deliveryFee ?? 0,
	};
}

function mapMerchant(user) {
	return {
		id: user.username,
		username: user.username,
		firstName: user.firstName,
		lastName: user.lastName,
		phone: user.phone,
		accountType: user.accountType
			? String(user.accountType).toLowerCase()
			: null,
		orderIdPrefix: user.orderIdPrefix || "",
	};
}

function mapMerchantPaymentSession(payment) {
	return {
		id: payment.id,
		number: payment.number,
		amount: payment.amount,
		isAdvance: payment.isAdvance,
		notes: payment.notes,
		orderCount: payment.orders.length,
		orderIds: payment.orders.map((po) => po.orderId),
		adminName: formatUserDisplayName(payment.admin),
		createdAt: payment.createdAt,
	};
}

function mapDriverCollectionSession(collection) {
	return {
		id: collection.id,
		number: collection.number,
		amount: collection.amount,
		deliveryFee: collection.deliveryFee,
		orderCount: collection.orders.length,
		orderIds: collection.orders.map((co) => co.orderId),
		adminName: formatUserDisplayName(collection.admin),
		createdAt: collection.createdAt,
	};
}

function mapLocation(district) {
	return {
		id: district.id,
		district: { en: district.nameEn, ar: district.nameAr },
		cities: district.cities.map((city) => ({ en: city.nameEn, ar: city.nameAr })),
		createdAt: district.createdAt,
		updatedAt: district.updatedAt,
	};
}

function mapOrder(order) {
	return {
		id: order.id,
		m: order.merchant?.username || null,
		driver: order.driver?.username || null,
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
		s: statusNumberToEnum.indexOf(order.status),
		cancelledBy: order.cancelledBy,
		cancelledFromStatus: order.cancelledFromStatus,
		collectedBack: order.collectedBack,
		statusUpdatedAt: order.statusUpdatedAt,
		e: order.isExpress ?? false,
		eN: order.expressNote || "",
		createdAt: order.createdAt,
		updatedAt: order.updatedAt,
	};
}

function mapOrderHistory(entry) {
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

function mapCollection(collection) {
	return {
		_id: collection.id,
		number: collection.number,
		driverUsername: collection.driver.username,
		driverName: `${collection.driver.firstName || ""} ${collection.driver.lastName || ""}`.trim() || collection.driver.username,
		amount: collection.amount,
		orderIds: collection.orders.map((item) => item.order.id),
		createdAt: collection.createdAt,
	};
}

function mapPayment(payment) {
	return {
		_id: payment.id,
		number: payment.number,
		merchantUsername: payment.merchant.username,
		merchantName: `${payment.merchant.firstName || ""} ${payment.merchant.lastName || ""}`.trim() || payment.merchant.username,
		amount: payment.amount,
		orderIds: payment.orders.map((item) => item.order.id),
		createdAt: payment.createdAt,
	};
}

async function fetchOrders(filter = {}) {
	const where = {};
	if (filter.driver) {
		where.driver = { username: filter.driver };
	}
	if (filter.m) {
		where.merchant = { username: filter.m };
	}
	if (filter.status !== undefined) {
		where.status = filter.status;
	}

	const orders = await prisma.order.findMany({
		where,
		orderBy: { createdAt: "desc" },
		include: {
			merchant: { select: { username: true } },
			driver: { select: { username: true } },
		},
	});

	return orders.map(mapOrder);
}

async function fetchMerchants({ excludePrepaid = false } = {}) {
	const where = { role: "MERCHANT" };
	// The Pay page settles collected orders, which only applies to postpaid
	// merchants — prepaid ones are paid in advance from the Finance page, so
	// listing them here would let an admin pay them a second time.
	if (excludePrepaid) {
		where.OR = [{ accountType: { not: "PREPAID" } }, { accountType: null }];
	}
	const merchants = await prisma.user.findMany({
		where,
		select: {
			id: true,
			username: true,
			firstName: true,
			lastName: true,
			phone: true,
			accountType: true,
			orderIdPrefix: true,
		},
	});
	return merchants.map(mapMerchant);
}

async function fetchDrivers() {
	const drivers = await prisma.user.findMany({
		where: { role: "DRIVER" },
		select: {
			username: true,
			firstName: true,
			lastName: true,
			phone: true,
			deliveryFee: true,
		},
	});
	return drivers.map(mapDriver);
}

async function fetchLocations() {
	const districts = await prisma.district.findMany({
		include: { cities: true },
		orderBy: { nameEn: "asc" },
	});
	return districts.map(mapLocation);
}

export async function getAdminPageData() {
	const [orders, merchants] = await Promise.all([
		fetchOrders(),
		fetchMerchants(),
	]);
	return { orders, merchants };
}

export async function getOrdersPageData() {
	const [orders, merchants, drivers, locations] = await Promise.all([
		fetchOrders(),
		fetchMerchants(),
		fetchDrivers(),
		fetchLocations(),
	]);
	return { orders, merchants, drivers, locations };
}

export async function getUsersPageData() {
	const users = await prisma.user.findMany({
		select: {
			id: true,
			username: true,
			email: true,
			role: true,
			firstName: true,
			lastName: true,
			phone: true,
			accountType: true,
			paymentDay: true,
			orderIdPrefix: true,
			deliveryFee: true,
			deliveryCharges: true,
			resetPasswordToken: true,
			resetPasswordExpires: true,
			createdAt: true,
			updatedAt: true,
		},
	});
	return { users: users.map(mapUser) };
}

export async function getSettingsPageData() {
	const [locations, merchants] = await Promise.all([
		fetchLocations(),
		fetchMerchants(),
	]);
	return { locations, merchants };
}

export async function getCollectPageData(driverUsername) {
	const driversPromise = fetchDrivers();
	const collectionsPromise = prisma.driverCollection.findMany({
		orderBy: { createdAt: "desc" },
		include: {
			driver: { select: { username: true, firstName: true, lastName: true } },
			orders: { include: { order: { select: { id: true } } } },
		},
	});

	let ordersPromise = Promise.resolve([]);
	if (driverUsername) {
		ordersPromise = fetchOrders({ driver: driverUsername });
	}

	const [drivers, collections, orders] = await Promise.all([
		driversPromise,
		collectionsPromise,
		ordersPromise,
	]);

	return {
		drivers,
		collections: collections.map(mapCollection),
		orders,
	};
}

export async function getPayPageData(merchantUsername) {
	const merchantsPromise = fetchMerchants({ excludePrepaid: true });
	const paymentsPromise = prisma.merchantPayment.findMany({
		orderBy: { createdAt: "desc" },
		include: {
			merchant: { select: { username: true, firstName: true, lastName: true } },
			orders: { include: { order: { select: { id: true } } } },
		},
	});

	let ordersPromise = Promise.resolve([]);
	if (merchantUsername) {
		ordersPromise = fetchOrders({ m: merchantUsername, status: "COLLECTED" });
	}

	const [merchants, payments, orders] = await Promise.all([
		merchantsPromise,
		paymentsPromise,
		ordersPromise,
	]);

	return {
		merchants,
		payments: payments.map(mapPayment),
		orders,
	};
}

export async function getDriverPageData(username) {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

	const [allOrders, user] = await Promise.all([
		fetchOrders({ driver: username }),
		prisma.user.findUnique({
			where: { username },
			select: {
				id: true,
				username: true,
				firstName: true,
				lastName: true,
				phone: true,
				email: true,
				role: true,
				accountType: true,
				paymentDay: true,
				createdAt: true,
				updatedAt: true,
			},
		}),
	]);

	const activeOrders = allOrders.filter(
		(o) =>
			o.s === 2 ||
			([3, 4].includes(o.s) && new Date(o.statusUpdatedAt) >= oneDayAgo),
	);

	const stats = {
		totalDeliveries: allOrders.filter((o) => o.s === 3).length,
		todaysDeliveries: allOrders.filter(
			(o) => o.s === 3 && new Date(o.createdAt) >= today,
		).length,
		activeOrders: allOrders.filter((o) => o.s === 2).length,
	};

	// Balance: cash the driver still owes the admin (net of their delivery
	// fee) — there's no reverse direction, drivers keep their fee at
	// collection time rather than being paid separately.
	const [outstandingDrivers, collectionsRaw] = await Promise.all([
		user ? getDriverOutstanding() : Promise.resolve([]),
		user
			? prisma.driverCollection.findMany({
					where: { driverId: user.id },
					orderBy: { createdAt: "desc" },
					include: {
						orders: { select: { orderId: true } },
						admin: { select: { username: true, firstName: true, lastName: true } },
					},
				})
			: Promise.resolve([]),
	]);
	const outstanding = outstandingDrivers.find((d) => d.driverUsername === username);
	const balance = { outstanding: outstanding?.outstanding ?? 0 };
	const collections = collectionsRaw.map(mapDriverCollectionSession);

	return { orders: activeOrders, stats, profile: mapUser(user), balance, collections };
}

export async function getMerchantPageData(username) {
	const [orders, locations, user] = await Promise.all([
		fetchOrders({ m: username }),
		fetchLocations(),
		prisma.user.findUnique({
			where: { username },
			select: {
				id: true,
				username: true,
				firstName: true,
				lastName: true,
				phone: true,
				email: true,
				role: true,
				accountType: true,
				paymentDay: true,
				orderIdPrefix: true,
				deliveryCharges: true,
				createdAt: true,
				updatedAt: true,
			},
		}),
	]);

	// Balance: positive = admin still owes the merchant, negative = the
	// merchant owes the admin back (e.g. a cancelled order that was already
	// paid for, or a customer-cancellation delivery-charge deduction).
	let balance = { amount: 0, accountType: user?.accountType ? String(user.accountType).toLowerCase() : null };
	if (user?.accountType === "PREPAID") {
		const [prepaid] = await getPrepaidMerchantBalances(username);
		balance.amount = prepaid?.balance ?? 0;
	} else if (user) {
		const postpaid = await getMerchantPayments();
		const mine = postpaid.find((p) => p.merchantUsername === username);
		balance.amount = mine?.amount ?? 0;
	}

	const paymentsRaw = user
		? await prisma.merchantPayment.findMany({
				where: { merchantId: user.id },
				orderBy: { createdAt: "desc" },
				include: {
					orders: { select: { orderId: true } },
					admin: { select: { username: true, firstName: true, lastName: true } },
				},
			})
		: [];
	const payments = paymentsRaw.map(mapMerchantPaymentSession);

	return { orders, locations, profile: mapUser(user), balance, payments };
}

export async function getTrackPageData(orderId) {
	if (!orderId) return { order: null };

	const order = await prisma.order.findUnique({
		where: { id: orderId },
		include: {
			merchant: { select: { username: true } },
			driver: { select: { username: true } },
		},
	});
	if (!order) return { order: null };

	const history = await prisma.orderHistory.findMany({
		where: { orderId: order.id },
		orderBy: { createdAt: "asc" },
	});

	return { order: { ...mapOrder(order), history: history.map(mapOrderHistory) } };
}

import prisma from "../config/prisma.js";
import { statusNumberToEnum } from "../utils/orderStatus.js";

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
		accountType: user.accountType,
		cashPercentage: user.cashPercentage,
		paymentDay: user.paymentDay,
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

async function fetchMerchants() {
	const merchants = await prisma.user.findMany({
		where: { role: "MERCHANT" },
		select: {
			id: true,
			username: true,
			firstName: true,
			lastName: true,
			phone: true,
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
			cashPercentage: true,
			paymentDay: true,
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
	const merchantsPromise = fetchMerchants();
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

	return { orders: activeOrders, stats, profile: mapUser(user) };
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
				deliveryCharges: true,
				createdAt: true,
				updatedAt: true,
			},
		}),
	]);

	return { orders, locations, profile: mapUser(user) };
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

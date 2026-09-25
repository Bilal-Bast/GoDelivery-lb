import { Prisma } from "@prisma/client";

class SettlementValidationError extends Error {
	constructor(message, statusCode = 400) {
		super(message);
		this.name = "SettlementValidationError";
		this.statusCode = statusCode;
	}
}

function calculatePrepaidBalance({ legacyBalance = 0, ordersValue = 0, paid = 0 }) {
	const entitled = legacyBalance + ordersValue;
	return { entitled, paid, balance: entitled - paid };
}

function normalizeOrderIds(value) {
	const values = typeof value === "string" ? value.split(",") : value;
	if (!Array.isArray(values)) {
		throw new SettlementValidationError("orderIds must be a non-empty array");
	}
	const ids = values.map((id) => String(id).trim()).filter(Boolean);
	if (ids.length === 0) {
		throw new SettlementValidationError("Select at least one order");
	}
	return [...new Set(ids)];
}

function validateCollectionOrders({ orders, requestedIds, driverId }) {
	const byId = new Map(orders.map((order) => [order.id, order]));
	const missing = requestedIds.filter((id) => !byId.has(id));
	if (missing.length > 0) {
		throw new SettlementValidationError(
			`Orders not found: ${missing.join(", ")}`,
			404,
		);
	}

	let grossAmount = 0;
	let feeEarningCount = 0;
	for (const id of requestedIds) {
		const order = byId.get(id);
		if (order.driverId !== driverId) {
			throw new SettlementValidationError(
				`Order ${id} is not assigned to the selected driver`,
			);
		}
		if (
			order.collectedBack ||
			order.status === "COLLECTED" ||
			order.status === "Paid" ||
			(order.collectionOrders?.length ?? 0) > 0
		) {
			throw new SettlementValidationError(`Order ${id} is already collected`);
		}

		if (order.status === "DELIVERED") {
			grossAmount += order.total ?? 0;
			feeEarningCount += 1;
			continue;
		}

		if (order.status === "Canceled" && order.cancelledBy === "customer") {
			grossAmount += order.deliveryCharge ?? 0;
			feeEarningCount += 1;
			continue;
		}

		if (order.status === "Canceled" && order.cancelledBy === "merchant") {
			continue;
		}

		throw new SettlementValidationError(
			`Order ${id} is not eligible for collection`,
		);
	}

	return { grossAmount, feeEarningCount };
}

function validatePaymentOrders({ orders, requestedIds, merchantId }) {
	const byId = new Map(orders.map((order) => [order.id, order]));
	const missing = requestedIds.filter((id) => !byId.has(id));
	if (missing.length > 0) {
		throw new SettlementValidationError(
			`Orders not found: ${missing.join(", ")}`,
			404,
		);
	}

	let amount = 0;
	for (const id of requestedIds) {
		const order = byId.get(id);
		if (order.merchantId !== merchantId) {
			throw new SettlementValidationError(
				`Order ${id} does not belong to the selected merchant`,
			);
		}
		if (order.status === "Paid" || (order.paymentOrders?.length ?? 0) > 0) {
			throw new SettlementValidationError(`Order ${id} is already paid`);
		}
		if (order.status !== "COLLECTED" || order.cancelledBy != null) {
			throw new SettlementValidationError(
				`Order ${id} is not eligible for merchant payment`,
			);
		}
		amount += (order.total ?? 0) - (order.deliveryCharge ?? 0);
	}

	return { amount };
}

function assertReturnNotPreviouslyLinked(existingReturn) {
	if (existingReturn) {
		throw new SettlementValidationError(
			"One or more orders have already been returned",
			409,
		);
	}
}

function validateReturnOrders({ orders, requestedIds }) {
	if (orders.length === requestedIds.length) return;
	const eligible = new Set(orders.map((order) => order.id));
	const rejected = requestedIds.filter((id) => !eligible.has(id));
	throw new SettlementValidationError(
		`Not returnable for this merchant: ${rejected.join(", ")}`,
		409,
	);
}

function returnCloseOutIds({ orders, isPrepaid }) {
	if (isPrepaid) return [];
	return orders.filter((order) => order.cancelledBy).map((order) => order.id);
}

async function previewCollectionSettlement({ prisma, driver, orderIds }) {
	const requestedIds = normalizeOrderIds(orderIds);
	const orders = await prisma.order.findMany({
		where: { id: { in: requestedIds } },
		include: { collectionOrders: { select: { id: true } } },
	});
	const { grossAmount, feeEarningCount } = validateCollectionOrders({
		orders,
		requestedIds,
		driverId: driver.id,
	});
	const deliveryFeeTotal = (driver.deliveryFee ?? 0) * feeEarningCount;
	return {
		orderIds: requestedIds,
		sourceOrders: orders,
		orders: requestedIds.map((id) => {
			const order = orders.find((entry) => entry.id === id);
			const earnsFee =
				order.status === "DELIVERED" || order.cancelledBy === "customer";
			const collectionValue =
				order.status === "DELIVERED"
					? order.total ?? 0
					: order.cancelledBy === "customer"
						? order.deliveryCharge ?? 0
						: 0;
			return {
				id: order.id,
				status: order.status,
				cancelledBy: order.cancelledBy,
				total: order.total ?? 0,
				deliveryCharge: order.deliveryCharge ?? 0,
				collectionValue,
				driverFee: earnsFee ? driver.deliveryFee ?? 0 : 0,
			};
		}),
		grossAmount,
		deliveryFeeTotal,
		netAmount: grossAmount - deliveryFeeTotal,
	};
}

async function previewPaymentSettlement({ prisma, merchant, orderIds }) {
	if (merchant.accountType === "PREPAID") {
		throw new SettlementValidationError(
			"This merchant is prepaid — use the prepaid advance workflow instead",
		);
	}
	const requestedIds = normalizeOrderIds(orderIds);
	const orders = await prisma.order.findMany({
		where: { id: { in: requestedIds } },
		include: { paymentOrders: { select: { id: true } } },
	});
	const { amount } = validatePaymentOrders({
		orders,
		requestedIds,
		merchantId: merchant.id,
	});
	const grossAmount = orders.reduce((sum, order) => sum + (order.total ?? 0), 0);
	const deliveryCharges = orders.reduce(
		(sum, order) => sum + (order.deliveryCharge ?? 0),
		0,
	);
	return {
		orderIds: requestedIds,
		sourceOrders: orders,
		orders: requestedIds.map((id) => {
			const order = orders.find((entry) => entry.id === id);
			return {
				id: order.id,
				total: order.total ?? 0,
				deliveryCharge: order.deliveryCharge ?? 0,
				payable: (order.total ?? 0) - (order.deliveryCharge ?? 0),
			};
		}),
		grossAmount,
		deliveryCharges,
		amount,
	};
}

async function runSerializableWithRetry(prisma, operation, maxAttempts = 3) {
	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		try {
			return await prisma.$transaction(operation, {
				isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
			});
		} catch (error) {
			const retryable = error?.code === "P2034" || error?.code === "P2002";
			if (!retryable || attempt === maxAttempts) throw error;
		}
	}
	throw new Error("Settlement transaction retry limit reached");
}

async function createCollectionSettlement({
	prisma,
	driver,
	admin,
	orderIds,
	notes = "",
	paymentMethod = "CASH",
}) {
	const requestedIds = normalizeOrderIds(orderIds);
	return runSerializableWithRetry(prisma, async (tx) => {
		const preview = await previewCollectionSettlement({
			prisma: tx,
			driver,
			orderIds: requestedIds,
		});
		const { grossAmount, deliveryFeeTotal, netAmount } = preview;
		const orders = preview.sourceOrders;
		const last = await tx.driverCollection.findFirst({
			orderBy: { number: "desc" },
			select: { number: true },
		});
		const number = (last?.number ?? 0) + 1;
		const statusUpdatedAt = new Date();

		const collection = await tx.driverCollection.create({
			data: {
				number,
				driverId: driver.id,
				adminId: admin.id,
				amount: grossAmount,
				deliveryFee: deliveryFeeTotal,
				orders: {
					create: requestedIds.map((orderId) => ({ orderId })),
				},
			},
			include: {
				driver: true,
				admin: true,
				orders: { include: { order: { include: { merchant: true } } } },
			},
		});

		await tx.order.updateMany({
			where: { id: { in: requestedIds } },
			data: { status: "COLLECTED", collectedBack: true, statusUpdatedAt },
		});
		await tx.orderHistory.createMany({
			data: orders.map((order) => ({
				orderId: order.id,
				actionType: "status_change",
				oldValue: {
					status: order.status,
					statusUpdatedAt: order.statusUpdatedAt,
					collectedBack: order.collectedBack,
				},
				newValue: 6,
				performedBy: admin.username,
				metadata: {
					status_text: "Collected",
					collectionNumber: number,
					driverUsername: driver.username,
					note: notes,
				},
			})),
		});
		const transaction = await tx.financeTransaction.create({
			data: {
				type: "DRIVER_COLLECTION",
				amount: netAmount,
				paymentMethod,
				status: "DELIVERED",
				driverId: driver.id,
				adminId: admin.id,
				description: `Collection #${number} from driver ${driver.username}`,
				notes,
				date: new Date(),
			},
			include: {
				driver: { select: { username: true } },
				merchant: { select: { username: true } },
				admin: { select: { username: true } },
			},
		});
		await tx.financeAudit.create({
			data: {
				userId: admin.id,
				action: "Driver Collection",
				description: `Collected ${netAmount} from driver ${driver.username} (${requestedIds.length} orders)`,
				ip: "",
			},
		});

		return {
			collection,
			transaction,
			orderIds: requestedIds,
			grossAmount,
			deliveryFeeTotal,
			netAmount,
		};
	});
}

async function createPaymentSettlement({
	prisma,
	merchant,
	admin,
	orderIds,
	notes = "",
	paymentMethod = "CASH",
}) {
	if (merchant.accountType === "PREPAID") {
		throw new SettlementValidationError(
			"This merchant is prepaid — pay them from the Finance page instead",
		);
	}
	const requestedIds = normalizeOrderIds(orderIds);
	return runSerializableWithRetry(prisma, async (tx) => {
		const preview = await previewPaymentSettlement({
			prisma: tx,
			merchant,
			orderIds: requestedIds,
		});
		const { amount } = preview;
		const orders = preview.sourceOrders;
		const last = await tx.merchantPayment.findFirst({
			orderBy: { number: "desc" },
			select: { number: true },
		});
		const number = (last?.number ?? 0) + 1;
		const statusUpdatedAt = new Date();

		const payment = await tx.merchantPayment.create({
			data: {
				number,
				merchantId: merchant.id,
				adminId: admin.id,
				amount,
				notes,
				orders: { create: requestedIds.map((orderId) => ({ orderId })) },
			},
			include: {
				merchant: true,
				admin: true,
				orders: { include: { order: { include: { merchant: true } } } },
			},
		});
		await tx.order.updateMany({
			where: { id: { in: requestedIds } },
			data: { status: "Paid", statusUpdatedAt },
		});
		await tx.orderHistory.createMany({
			data: orders.map((order) => ({
				orderId: order.id,
				actionType: "status_change",
				oldValue: { status: order.status, statusUpdatedAt: order.statusUpdatedAt },
				newValue: 5,
				performedBy: admin.username,
				metadata: {
					status_text: "Paid",
					paymentNumber: number,
					merchantUsername: merchant.username,
					note: notes,
				},
			})),
		});

		let transaction = null;
		if (amount !== 0) {
			transaction = await tx.financeTransaction.create({
				data: {
					type: amount >= 0 ? "MERCHANT_PAYMENT" : "CASH_IN",
					amount: Math.abs(amount),
					paymentMethod,
					status: "DELIVERED",
					merchantId: merchant.id,
					adminId: admin.id,
					description: `Payment #${number} to merchant ${merchant.username}`,
					notes,
					date: new Date(),
				},
				include: {
					driver: { select: { username: true } },
					merchant: { select: { username: true } },
					admin: { select: { username: true } },
				},
			});
		}
		await tx.financeAudit.create({
			data: {
				userId: admin.id,
				action: "Merchant Payment",
				description: `Paid merchant ${merchant.username} for ${requestedIds.length} orders`,
				ip: "",
			},
		});

		return { payment, transaction, orderIds: requestedIds, amount };
	});
}

function assertSettlementCanBeDeleted(kind, linkedOrderCount) {
	if (linkedOrderCount > 0) {
		throw new SettlementValidationError(
			`Cannot delete ${kind} with linked orders because a safe automatic reversal is not defined`,
			409,
		);
	}
}

export {
	SettlementValidationError,
	assertReturnNotPreviouslyLinked,
	assertSettlementCanBeDeleted,
	calculatePrepaidBalance,
	createCollectionSettlement,
	createPaymentSettlement,
	normalizeOrderIds,
	previewCollectionSettlement,
	previewPaymentSettlement,
	runSerializableWithRetry,
	returnCloseOutIds,
	validateCollectionOrders,
	validatePaymentOrders,
	validateReturnOrders,
};

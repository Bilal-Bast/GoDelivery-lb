import { runSerializableWithRetry } from "./settlement.service.js";

class OrderDeletionError extends Error {
	constructor(message, statusCode = 409) {
		super(message);
		this.name = "OrderDeletionError";
		this.statusCode = statusCode;
	}
}

function collectionDirection(order, linkId) {
	const links = [...(order.collectionOrders || [])].sort((left, right) => {
		const timeDifference = new Date(left.createdAt) - new Date(right.createdAt);
		return timeDifference || left.id.localeCompare(right.id);
	});
	const linkIndex = links.findIndex((link) => link.id === linkId);
	if (linkIndex === -1) {
		throw new OrderDeletionError("Could not reconcile this order's collection history safely");
	}
	return linkIndex % 2 === 0 ? 1 : -1;
}

function collectionValue(order) {
	if (order.cancelledBy === "customer") return Number(order.deliveryCharge || 0);
	if (order.cancelledBy === "merchant") return 0;
	return Number(order.total || 0);
}

function normalizeAmount(value) {
	return Math.abs(value) < 1e-9 ? 0 : value;
}

function auditTimeWindow(createdAt) {
	const center = new Date(createdAt).getTime();
	return {
		gte: new Date(center - 5000),
		lte: new Date(center + 5000),
	};
}

async function findSingleByDescription(delegate, description, label) {
	const records = await delegate.findMany({
		where: { description },
		select: { id: true },
	});
	if (records.length > 1) {
		throw new OrderDeletionError(`Could not safely reconcile the ${label} transaction`);
	}
	return records[0] || null;
}

async function findSingleSettlementAudit(tx, { userId, action, description, createdAt, label }) {
	const records = await tx.financeAudit.findMany({
		where: {
			userId,
			action,
			description,
			createdAt: auditTimeWindow(createdAt),
		},
		select: { id: true },
	});
	if (records.length > 1) {
		throw new OrderDeletionError(`Could not safely reconcile the ${label} audit record`);
	}
	return records[0] || null;
}

async function deleteOrUpdateCollectionAudit(tx, collection, originalDescription, nextDescription, hasOrders) {
	const audit = await findSingleSettlementAudit(tx, {
		userId: collection.adminId,
		action: "Driver Collection",
		description: originalDescription,
		createdAt: collection.createdAt,
		label: "driver collection",
	});
	if (!audit) return;
	if (hasOrders) {
		await tx.financeAudit.update({ where: { id: audit.id }, data: { description: nextDescription } });
	} else {
		await tx.financeAudit.delete({ where: { id: audit.id } });
	}
}

async function deleteOrUpdatePaymentAudit(tx, payment, originalDescription, nextDescription, hasOrders) {
	const audit = await findSingleSettlementAudit(tx, {
		userId: payment.adminId,
		action: "Merchant Payment",
		description: originalDescription,
		createdAt: payment.createdAt,
		label: "merchant payment",
	});
	if (!audit) return;
	if (hasOrders) {
		await tx.financeAudit.update({ where: { id: audit.id }, data: { description: nextDescription } });
	} else {
		await tx.financeAudit.delete({ where: { id: audit.id } });
	}
}

async function removeFromCollection(tx, order, link) {
	const collection = link.collection;
	const remainingLinks = collection.orders.filter((entry) => entry.orderId !== order.id);
	const direction = collectionDirection(order, link.id);
	const removedGross = direction * collectionValue(order);

	const signedFeeUnits = collection.orders.reduce((sum, entry) => {
		if (entry.order.cancelledBy === "merchant") return sum;
		return sum + collectionDirection(entry.order, entry.id);
	}, 0);
	const feePerOrder = signedFeeUnits !== 0
		? Number(collection.deliveryFee || 0) / signedFeeUnits
		: Number(collection.driver?.deliveryFee || 0);
	const removedFee = order.cancelledBy === "merchant" ? 0 : direction * feePerOrder;
	const nextAmount = Number(collection.amount || 0) - removedGross;
	const nextDeliveryFee = Number(collection.deliveryFee || 0) - removedFee;
	const originalNet = Number(collection.amount || 0) - Number(collection.deliveryFee || 0);
	const nextNet = normalizeAmount(nextAmount - nextDeliveryFee);
	const transactionDescription = `Collection #${collection.number} from driver ${collection.driver.username}`;
	const transaction = await findSingleByDescription(
		tx.financeTransaction,
		transactionDescription,
		"driver collection",
	);
	const originalAuditDescription = `Collected ${originalNet} from driver ${collection.driver.username} (${collection.orders.length} orders)`;
	const remainingAuditDescription = `Collected ${nextNet} from driver ${collection.driver.username} (${remainingLinks.length} orders)`;

	await tx.collectionOrder.delete({ where: { id: link.id } });
	if (remainingLinks.length === 0) {
		if (transaction) await tx.financeTransaction.delete({ where: { id: transaction.id } });
		await deleteOrUpdateCollectionAudit(tx, collection, originalAuditDescription, "", false);
		await tx.driverCollection.delete({ where: { id: collection.id } });
		return;
	}

	await tx.driverCollection.update({
		where: { id: collection.id },
		data: { amount: nextAmount, deliveryFee: nextDeliveryFee },
	});
	if (transaction) {
		if (nextNet === 0) await tx.financeTransaction.delete({ where: { id: transaction.id } });
		else await tx.financeTransaction.update({ where: { id: transaction.id }, data: { amount: nextNet } });
	}
	await deleteOrUpdateCollectionAudit(tx, collection, originalAuditDescription, remainingAuditDescription, true);
}

async function removeFromPayment(tx, order, link) {
	const payment = link.payment;
	const remainingLinks = payment.orders.filter((entry) => entry.orderId !== order.id);
	const nextAmount = remainingLinks.reduce(
		(sum, entry) => sum + Number(entry.order.total || 0) - Number(entry.order.deliveryCharge || 0),
		0,
	);
	const transactionDescription = `Payment #${payment.number} to merchant ${payment.merchant.username}`;
	const transaction = await findSingleByDescription(
		tx.financeTransaction,
		transactionDescription,
		"merchant payment",
	);
	const originalAuditDescription = `Paid merchant ${payment.merchant.username} for ${payment.orders.length} orders`;
	const remainingAuditDescription = `Paid merchant ${payment.merchant.username} for ${remainingLinks.length} orders`;

	await tx.paymentOrder.delete({ where: { id: link.id } });
	if (remainingLinks.length === 0) {
		if (transaction) await tx.financeTransaction.delete({ where: { id: transaction.id } });
		await deleteOrUpdatePaymentAudit(tx, payment, originalAuditDescription, "", false);
		await tx.merchantPayment.delete({ where: { id: payment.id } });
		return;
	}

	await tx.merchantPayment.update({ where: { id: payment.id }, data: { amount: nextAmount } });
	if (transaction) {
		if (nextAmount === 0) {
			await tx.financeTransaction.delete({ where: { id: transaction.id } });
		} else {
			await tx.financeTransaction.update({
				where: { id: transaction.id },
				data: {
					type: nextAmount >= 0 ? "MERCHANT_PAYMENT" : "CASH_IN",
					amount: Math.abs(nextAmount),
				},
			});
		}
	}
	await deleteOrUpdatePaymentAudit(tx, payment, originalAuditDescription, remainingAuditDescription, true);
}

async function removeFromReturn(tx, order, link) {
	const merchantReturn = link.return;
	const remainingLinks = merchantReturn.orders.filter((entry) => entry.orderId !== order.id);
	await tx.returnOrder.delete({ where: { id: link.id } });
	if (remainingLinks.length === 0) {
		await tx.merchantReturn.delete({ where: { id: merchantReturn.id } });
		return;
	}
	const goodsValue = remainingLinks.reduce(
		(sum, entry) => sum + Number(entry.order.total || 0) - Number(entry.order.deliveryCharge || 0),
		0,
	);
	await tx.merchantReturn.update({ where: { id: merchantReturn.id }, data: { goodsValue } });
}

async function deleteOrderInTransaction(tx, orderId) {
	const order = await tx.order.findUnique({
		where: { id: orderId },
		include: {
			merchant: { select: { username: true } },
			driver: { select: { username: true } },
			collectionOrders: {
				orderBy: { createdAt: "asc" },
				include: {
					collection: {
						include: {
							driver: { select: { username: true, deliveryFee: true } },
							orders: {
								include: {
									order: {
										select: {
											id: true,
											total: true,
											deliveryCharge: true,
											cancelledBy: true,
											collectionOrders: { select: { id: true, createdAt: true } },
										},
									},
								},
							},
						},
					},
				},
			},
			paymentOrders: {
				include: {
					payment: {
						include: {
							merchant: { select: { username: true } },
							orders: {
								include: {
									order: { select: { id: true, total: true, deliveryCharge: true } },
								},
							},
						},
					},
				},
			},
			returnOrders: {
				include: {
					return: {
						include: {
							orders: {
								include: {
									order: { select: { id: true, total: true, deliveryCharge: true } },
								},
							},
						},
					},
				},
			},
		},
	});
	if (!order) return null;

	for (const link of order.collectionOrders) await removeFromCollection(tx, order, link);
	for (const link of order.paymentOrders) await removeFromPayment(tx, order, link);
	for (const link of order.returnOrders) await removeFromReturn(tx, order, link);

	await tx.financeTransaction.deleteMany({ where: { relatedOrderId: order.id } });
	await tx.orderHistory.deleteMany({ where: { orderId: order.id } });
	await tx.order.delete({ where: { id: order.id } });
	return {
		...order,
		collectionOrders: [],
		paymentOrders: [],
		returnOrders: [],
		transactions: [],
	};
}

async function deleteOrderWithFinancialRecords({ prisma, orderId }) {
	return runSerializableWithRetry(prisma, (tx) => deleteOrderInTransaction(tx, orderId));
}

export { OrderDeletionError, deleteOrderWithFinancialRecords };

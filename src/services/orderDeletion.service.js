import { runSerializableWithRetry } from "./settlement.service.js";
import {
	CollectionHistoryError,
	removeOrderFromCollectionHistory,
} from "./collection-history.service.js";

class OrderDeletionError extends Error {
	constructor(message, statusCode = 409) {
		super(message);
		this.name = "OrderDeletionError";
		this.statusCode = statusCode;
	}
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

	await removeOrderFromCollectionHistory(tx, order.id);
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
	try {
		return await runSerializableWithRetry(prisma, (tx) => deleteOrderInTransaction(tx, orderId));
	} catch (error) {
		if (error instanceof CollectionHistoryError) {
			throw new OrderDeletionError(error.message, error.statusCode);
		}
		throw error;
	}
}

export { OrderDeletionError, deleteOrderWithFinancialRecords };

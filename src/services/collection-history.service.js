class CollectionHistoryError extends Error {
	constructor(message, statusCode = 409) {
		super(message);
		this.name = "CollectionHistoryError";
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
		throw new CollectionHistoryError("Could not reconcile this order's collection history safely");
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
		throw new CollectionHistoryError(`Could not safely reconcile the ${label} transaction`);
	}
	return records[0] || null;
}

async function findSingleCollectionAudit(tx, collection, description) {
	const records = await tx.financeAudit.findMany({
		where: {
			userId: collection.adminId,
			action: "Driver Collection",
			description,
			createdAt: auditTimeWindow(collection.createdAt),
		},
		select: { id: true },
	});
	if (records.length > 1) {
		throw new CollectionHistoryError("Could not safely reconcile the driver collection audit record");
	}
	return records[0] || null;
}

async function updateCollectionAudit(tx, collection, originalDescription, nextDescription, hasOrders) {
	const audit = await findSingleCollectionAudit(tx, collection, originalDescription);
	if (!audit) return;
	if (hasOrders) {
		await tx.financeAudit.update({ where: { id: audit.id }, data: { description: nextDescription } });
	} else {
		await tx.financeAudit.delete({ where: { id: audit.id } });
	}
}

async function removeCollectionLink(tx, order, link) {
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
		await updateCollectionAudit(tx, collection, originalAuditDescription, "", false);
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
	await updateCollectionAudit(tx, collection, originalAuditDescription, remainingAuditDescription, true);
}

async function removeOrderFromCollectionHistory(tx, orderId) {
	while (true) {
		const order = await tx.order.findUnique({
			where: { id: orderId },
			select: {
				id: true,
				total: true,
				deliveryCharge: true,
				cancelledBy: true,
				collectionOrders: {
					orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
			},
		});
		const link = order?.collectionOrders?.[0];
		if (!link) return;
		await removeCollectionLink(tx, order, link);
	}
}

export { CollectionHistoryError, removeOrderFromCollectionHistory };

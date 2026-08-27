import prisma from "../../config/prisma.js";
import {
	COLORS,
	createReportDoc,
	drawHeader,
	drawInfoCard,
	drawTable,
	drawSummary,
	money,
	sanitizeFilenamePart,
	formatDateForFilename,
} from "../../utils/pdfReport.js";

// Get all collections (paginated)
export const getCollections = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 20;
		const driverFilter = req.query.driver;
 
		const where = {};
		if (driverFilter) {
			where.driver = {
				username: driverFilter,
			};
		}
 
		const [collections, total] = await Promise.all([
			prisma.driverCollection.findMany({
				where,
				include: {
					driver: {
						select: {
							id: true,
							username: true,
							firstName: true,
							lastName: true,
						},
					},
					admin: {
						select: {
							username: true,
							firstName: true,
							lastName: true,
						},
					},
					orders: {
						include: {
							order: {
								select: {
									id: true,
									customerFirstName: true,
									customerLastName: true,
									customerPhone: true,
									total: true,
									status: true,
									merchant: {
										select: {
											username: true,
										},
									},
								},
							},
						},
					},
				},
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * limit,
				take: limit,
			}),
			prisma.driverCollection.count({ where }),
		]);
 
		return res.json({
			data: collections,
			pagination: {
				total,
				page,
				limit,
				pages: Math.ceil(total / limit),
			},
		});
	} catch (error) {
		console.error("Error fetching collections:", error);
		return res.status(500).json({ error: "Failed to fetch collections" });
	}
};
 
// Get single collection
export const getCollectionById = async (req, res) => {
	try {
		const collection = await prisma.driverCollection.findUnique({
			where: { id: req.params.id },
			include: {
				driver: true,
				admin: true,
				orders: {
					include: {
						order: {
							include: {
								merchant: true,
							},
						},
					},
				},
			},
		});
 
		if (!collection) {
			return res.status(404).json({ error: "Collection not found" });
		}
 
		return res.json({ data: collection });
	} catch (error) {
		console.error("Error fetching collection:", error);
		return res.status(500).json({ error: "Failed to fetch collection" });
	}
};
 
// Get collections by driver
export const getCollectionsByDriver = async (req, res) => {
	try {
		const { driverUsername } = req.params;
 
		const driver = await prisma.user.findFirst({
			where: { username: driverUsername, role: "DRIVER" },
		});
 
		if (!driver) {
			return res.status(404).json({ error: "Driver not found" });
		}
 
		const collections = await prisma.driverCollection.findMany({
			where: { driverId: driver.id },
			include: {
				orders: {
					include: {
						order: {
							include: {
								merchant: true,
							},
						},
					},
				},
				admin: true,
			},
			orderBy: { createdAt: "desc" },
		});
 
		return res.json({ data: collections });
	} catch (error) {
		console.error("Error fetching driver collections:", error);
		return res.status(500).json({ error: "Failed to fetch collections" });
	}
};
 
// Create new collection
export const createCollection = async (req, res) => {
	try {
		const { driverUsername, orderIds, notes } = req.body;

		// Validate input
		if (!driverUsername || !orderIds || orderIds.length === 0) {
			return res.status(400).json({ error: "Missing required fields" });
		}

		// Don't let the same order get collected twice.
		const alreadyCollected = await prisma.collectionOrder.findFirst({
			where: { orderId: { in: orderIds } },
		});
		if (alreadyCollected) {
			return res
				.status(400)
				.json({ error: "One or more orders have already been collected" });
		}

		// Find driver
		const driver = await prisma.user.findFirst({
			where: { username: driverUsername, role: "DRIVER" },
		});
 
		if (!driver) {
			return res.status(404).json({ error: "Driver not found" });
		}
 
		// Find current admin user
		const admin = await prisma.user.findFirst({
			where: { id: req.user.id },
		});
 
		if (!admin) {
			return res.status(401).json({ error: "Admin not found" });
		}
 
		// Find orders
		const orders = await prisma.order.findMany({
			where: { id: { in: orderIds } },
			include: {
				merchant: true,
			},
		});
 
		if (orders.length === 0) {
			return res.status(404).json({ error: "No orders found" });
		}

		// Recomputed server-side from the actual order records — never trust a
		// client-supplied total for money that's about to move. Per order: full
		// total for delivered, the delivery charge for customer-cancelled (the
		// driver still owes that back), $0 for merchant-cancelled (nothing to
		// collect). The driver's fee is deducted once, across every order that
		// generated revenue for this step (merchant-cancelled never did).
		const perOrderFee = driver.deliveryFee ?? 0;
		let grossAmount = 0;
		let feeEarningCount = 0;
		for (const o of orders) {
			if (o.status === "DELIVERED") {
				grossAmount += o.total ?? 0;
				feeEarningCount += 1;
			} else if (o.status === "Canceled" && o.cancelledBy === "customer") {
				grossAmount += o.deliveryCharge ?? 0;
				feeEarningCount += 1;
			}
		}
		const deliveryFeeTotal = perOrderFee * feeEarningCount;
		const netAmount = grossAmount - deliveryFeeTotal;

		// Get next collection number
		const lastCollection = await prisma.driverCollection.findFirst({
			orderBy: { number: "desc" },
			select: { number: true },
		});
 
		const nextNumber = (lastCollection?.number || 0) + 1;
 
		// Create driver collection with transaction
		const collection = await prisma.$transaction(async (tx) => {
			// Create collection
			const newCollection = await tx.driverCollection.create({
				data: {
					number: nextNumber,
					driverId: driver.id,
					adminId: admin.id,
					amount: grossAmount,
					deliveryFee: deliveryFeeTotal,
					orders: {
						create: orderIds.map((orderId) => ({
							orderId,
						})),
					},
				},
				include: {
					orders: {
						include: {
							order: {
								include: {
									merchant: true,
								},
							},
						},
					},
					driver: true,
					admin: true,
				},
			});
 
			// Every selected order — delivered or cancelled, either way — is now
			// settled with the driver, so it moves on to COLLECTED, ready for
			// merchant payment. cancelledBy stays put and tells the payment step
			// how to treat it.
			await tx.order.updateMany({
				where: { id: { in: orderIds } },
				data: {
					status: "COLLECTED",
					collectedBack: true,
					statusUpdatedAt: new Date(),
				},
			});

			// Create finance transaction record — net cash the admin actually
			// receives (gross minus the driver's total fee for this session).
			await tx.financeTransaction.create({
				data: {
					type: "DRIVER_COLLECTION",
					amount: netAmount,
					driverId: driver.id,
					adminId: admin.id,
					description: `Collection #${nextNumber} from driver ${driver.username}`,
					notes: notes || "",
					date: new Date(),
					status: "DELIVERED",
				},
			});
 
			return newCollection;
		});
 
		return res.status(201).json({
			message: "Collection created successfully",
			data: collection,
		});
	} catch (error) {
		console.error("Error creating collection:", error);
		return res.status(500).json({ error: "Failed to create collection" });
	}
};
 
// Update collection (add notes, etc)
export const updateCollection = async (req, res) => {
	try {
		const { notes } = req.body;
 
		const updated = await prisma.driverCollection.update({
			where: { id: req.params.id },
			data: {
				...(notes !== undefined && { notes }),
			},
			include: {
				driver: true,
				admin: true,
				orders: {
					include: {
						order: true,
					},
				},
			},
		});
 
		return res.json({
			message: "Collection updated successfully",
			data: updated,
		});
	} catch (error) {
		console.error("Error updating collection:", error);
		if (error.code === "P2025") {
			return res.status(404).json({ error: "Collection not found" });
		}
		return res.status(500).json({ error: "Failed to update collection" });
	}
};
 
// Delete collection
export const deleteCollection = async (req, res) => {
	try {
		const collection = await prisma.driverCollection.findUnique({
			where: { id: req.params.id },
		});
 
		if (!collection) {
			return res.status(404).json({ error: "Collection not found" });
		}
 
		// Delete in transaction to rollback finance transaction if needed
		await prisma.$transaction(async (tx) => {
			// Delete associated finance transaction
			await tx.financeTransaction.deleteMany({
				where: {
					description: {
						contains: `Collection #${collection.number}`,
					},
				},
			});
 
			// Delete collection (cascade will delete CollectionOrders)
			await tx.driverCollection.delete({
				where: { id: req.params.id },
			});
		});
 
		return res.json({ message: "Collection deleted successfully" });
	} catch (error) {
		console.error("Error deleting collection:", error);
		if (error.code === "P2025") {
			return res.status(404).json({ error: "Collection not found" });
		}
		return res.status(500).json({ error: "Failed to delete collection" });
	}
};
 
// Generate PDF for collection
export const generateCollectionPDF = async (req, res) => {
	try {
		const collection = await prisma.driverCollection.findUnique({
			where: { id: req.params.id },
			include: {
				driver: true,
				admin: true,
				orders: {
					include: {
						order: {
							include: {
								merchant: true,
							},
						},
					},
				},
			},
		});

		if (!collection) {
			return res.status(404).json({ error: "Collection not found" });
		}

		const doc = await createReportDoc();

		const filename = `collect(${sanitizeFilenamePart(collection.driver.username)})(${formatDateForFilename(collection.createdAt)}).pdf`;
		res.setHeader("Content-Type", "application/pdf");
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="${filename}"`,
		);
		doc.pipe(res);

		const driverName =
			`${collection.driver.firstName} ${collection.driver.lastName}`.trim() ||
			collection.driver.username;
		const adminName =
			`${collection.admin.firstName} ${collection.admin.lastName}`.trim() ||
			collection.admin.username;

		drawHeader(doc, { title: "Collection Report", number: collection.number });

		const infoItems = [
			{ label: "Driver", value: driverName },
			{
				label: "Date",
				value: new Date(collection.createdAt).toLocaleString(),
			},
			{ label: "Recorded By", value: adminName },
		];
		if (collection.driver.deliveryFee != null) {
			infoItems.push({
				label: "Delivery Fee / Order",
				value: money(collection.driver.deliveryFee),
			});
		}
		drawInfoCard(doc, infoItems);

		drawTable(doc, {
			columns: [
				{ label: "ORDER ID", width: 105 },
				{ label: "CUSTOMER", width: 130 },
				{ label: "MERCHANT", width: 100 },
				{ label: "PHONE", width: 90 },
				{ label: "AMOUNT", width: 70, align: "right" },
			],
			rows: collection.orders.map(({ order }) => ({
				cells: [
					{ text: order.id },
					{
						text: `${order.customerFirstName} ${order.customerLastName || ""}`.trim(),
					},
					{ text: order.merchant?.username || "-" },
					{ text: order.customerPhone || "-" },
					{ text: money(order.total) },
				],
			})),
		});

		// collection.amount is the raw total; the driver's fee is deducted
		// once here to get what the admin actually nets.
		const feeTotal = Number(collection.deliveryFee || 0);
		const netAmount = collection.amount - feeTotal;
		drawSummary(doc, {
			lines: [
				{ label: "Total Orders", value: String(collection.orders.length) },
				{ label: "Total Collected", value: money(collection.amount) },
				{ label: "Driver Delivery Fee", value: `-${money(feeTotal)}` },
			],
			netLabel: "Net Received",
			netValue: money(netAmount),
			netColor: netAmount >= 0 ? COLORS.positive : COLORS.negative,
		});

		doc.end();
	} catch (error) {
		console.error("Error generating PDF:", error);
		return res.status(500).json({ error: "Failed to generate PDF" });
	}
};
 
// Get driver collection stats
export const getCollectionStats = async (req, res) => {
	try {
		const { driverUsername } = req.params;
 
		const driver = await prisma.user.findFirst({
			where: { username: driverUsername, role: "DRIVER" },
		});
 
		if (!driver) {
			return res.status(404).json({ error: "Driver not found" });
		}
 
		// Get stats
		const stats = await prisma.driverCollection.aggregate({
			where: { driverId: driver.id },
			_count: true,
			_sum: { amount: true },
		});
 
		const thisMonth = new Date();
		thisMonth.setDate(1);
 
		const monthStats = await prisma.driverCollection.aggregate({
			where: {
				driverId: driver.id,
				createdAt: { gte: thisMonth },
			},
			_count: true,
			_sum: { amount: true },
		});
 
		return res.json({
			data: {
				total: {
					collections: stats._count,
					amount: stats._sum.amount || 0,
				},
				thisMonth: {
					collections: monthStats._count,
					amount: monthStats._sum.amount || 0,
				},
			},
		});
	} catch (error) {
		console.error("Error fetching collection stats:", error);
		return res.status(500).json({ error: "Failed to fetch stats" });
	}
};
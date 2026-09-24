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
import {
	SettlementValidationError,
	assertSettlementCanBeDeleted,
	createCollectionSettlement,
} from "../../services/settlement.service.js";
import {
	paginationMeta,
	parseBoundedPagination,
} from "../../utils/pagination.js";

const selfCollectionInclude = {
	admin: {
		select: {
			id: true,
			username: true,
			firstName: true,
			lastName: true,
		},
	},
	orders: {
		select: {
			order: {
				select: {
					id: true,
					total: true,
					deliveryCharge: true,
					status: true,
					createdAt: true,
				},
			},
		},
	},
};

function mapSelfCollection(collection) {
	return {
		id: collection.id,
		number: collection.number,
		amount: collection.amount,
		deliveryFee: collection.deliveryFee,
		createdAt: collection.createdAt,
		admin: collection.admin,
		orders: collection.orders.map(({ order }) => order),
	};
}

export function createGetMyCollections(db = prisma) {
	return async (req, res) => {
		try {
			const { page, limit, skip } = parseBoundedPagination(req.query);
			const where = { driverId: req.user.id };
			const [collections, total] = await Promise.all([
				db.driverCollection.findMany({
					where,
					include: selfCollectionInclude,
					orderBy: [{ createdAt: "desc" }, { id: "desc" }],
					skip,
					take: limit,
				}),
				db.driverCollection.count({ where }),
			]);

			return res.json({
				data: collections.map(mapSelfCollection),
				pagination: paginationMeta({ page, limit, total }),
			});
		} catch (error) {
			console.error("Error fetching authenticated driver collections:", error);
			return res.status(500).json({ error: "Failed to fetch collections" });
		}
	};
}

export const getMyCollections = createGetMyCollections();

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

		const settlementResult = await createCollectionSettlement({
			prisma,
			driver,
			admin,
			orderIds,
			notes,
		});
		return res.status(201).json({
			message: "Collection created successfully",
			data: settlementResult.collection,
		});

	} catch (error) {
		if (error instanceof SettlementValidationError) {
			return res.status(error.statusCode).json({ error: error.message });
		}
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
			include: { orders: { select: { id: true } } },
		});
 
		if (!collection) {
			return res.status(404).json({ error: "Collection not found" });
		}
		assertSettlementCanBeDeleted("collection", collection.orders.length);
 
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
		if (error instanceof SettlementValidationError) {
			return res.status(error.statusCode).json({ error: error.message });
		}
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

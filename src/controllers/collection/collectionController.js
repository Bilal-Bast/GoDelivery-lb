import prisma from "../../config/prisma.js";
 
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
		const { driverUsername, orderIds, totalAmount, notes } = req.body;
 
		// Validate input
		if (!driverUsername || !orderIds || orderIds.length === 0) {
			return res.status(400).json({ error: "Missing required fields" });
		}
 
		if (!totalAmount) {
			return res.status(400).json({ error: "Total amount is required" });
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
					amount: parseFloat(totalAmount),
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
 
			// ✅ Update orders status to COLLECTED and set statusUpdatedAt
			await tx.order.updateMany({
				where: { id: { in: orderIds } },
				data: {
					status: "COLLECTED",
					statusUpdatedAt: new Date(),
				},
			});
 
			// Create finance transaction record
			await tx.financeTransaction.create({
				data: {
					type: "DRIVER_COLLECTION",
					amount: parseFloat(totalAmount),
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
		const PDFDocument = (await import("pdfkit")).default;
 
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
 
		// Create PDF
		const doc = new PDFDocument({
			margin: 50,
			size: "A4",
		});
 
		// Set response headers
		res.setHeader("Content-Type", "application/pdf");
		res.setHeader(
			"Content-Disposition",
			`attachment; filename="collection-${collection.number}.pdf"`,
		);
 
		// Pipe to response
		doc.pipe(res);
 
		// Header
		doc.fontSize(20).font("Helvetica-Bold").text("Collection Report", {
			align: "center",
		});
		doc.moveDown(0.5);
 
		// Collection info
		doc.fontSize(12).font("Helvetica").text(
			`Collection #${collection.number}`,
			{
				align: "left",
			},
		);
 
		const driverName = `${collection.driver.firstName} ${collection.driver.lastName}`.trim() || collection.driver.username;
		const adminName = `${collection.admin.firstName} ${collection.admin.lastName}`.trim() || collection.admin.username;
 
		doc.text(`Driver: ${driverName}`);
		doc.text(
			`Date: ${new Date(collection.createdAt).toLocaleDateString()} ${new Date(
				collection.createdAt,
			).toLocaleTimeString()}`,
		);
		doc.text(`Recorded by: ${adminName}`);
 
		doc.moveDown(1);
 
		// Table headers
		const tableTop = doc.y;
		const col1 = 50;
		const col2 = 150;
		const col3 = 280;
		const col4 = 380;
		const col5 = 480;
 
		doc.fontSize(10).font("Helvetica-Bold");
		doc.text("Order ID", col1, tableTop);
		doc.text("Customer", col2, tableTop);
		doc.text("Merchant", col3, tableTop);
		doc.text("Phone", col4, tableTop);
		doc.text("Amount", col5, tableTop);
 
		// Table body
		let yPosition = tableTop + 20;
		const pageHeight = doc.page.height;
		const bottomMargin = 50;
 
		doc.fontSize(9).font("Helvetica");
 
		collection.orders.forEach((collOrder) => {
			const order = collOrder.order;
 
			// Check if we need a new page
			if (yPosition > pageHeight - bottomMargin) {
				doc.addPage();
				yPosition = 50;
 
				// Repeat headers on new page
				doc.fontSize(10).font("Helvetica-Bold");
				doc.text("Order ID", col1, yPosition);
				doc.text("Customer", col2, yPosition);
				doc.text("Merchant", col3, yPosition);
				doc.text("Phone", col4, yPosition);
				doc.text("Amount", col5, yPosition);
 
				yPosition += 20;
				doc.fontSize(9).font("Helvetica");
			}
 
			const customerName = `${order.customerFirstName} ${order.customerLastName || ""}`.trim();
 
			doc.text(order.id, col1, yPosition, { width: 90 });
			doc.text(customerName, col2, yPosition, { width: 120 });
			doc.text(order.merchant?.username || "-", col3, yPosition, {
				width: 90,
			});
			doc.text(order.customerPhone || "-", col4, yPosition, { width: 80 });
			doc.text(`$${order.total.toFixed(2)}`, col5, yPosition);
 
			yPosition += 15;
		});
 
		// Summary
		doc.moveDown(1);
		doc.fontSize(11).font("Helvetica-Bold");
		doc.text(`Total Orders: ${collection.orders.length}`);
		doc.text(`Total Amount: $${collection.amount.toFixed(2)}`, {
			color: "#10b981",
		});
 
		// Footer
		doc.moveDown(2);
		doc.fontSize(9)
			.font("Helvetica")
			.text(
				`Generated: ${new Date().toLocaleString()} | Collection ID: ${
					collection.id
				}`,
				{
					align: "center",
					color: "#94a3b8",
				},
			);
 
		// Finalize PDF
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
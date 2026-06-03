import DriverCollection from "../models/driverCollection.model.js";
import User from "../models/user.model.js";
import Order from "../models/order.model.js";

async function getCollections(req, res, next) {
	try {
		const collections = await DriverCollection.find().sort({ number: -1 });
		res.json(collections);
	} catch (error) {
		next(error);
	}
}

async function createCollection(req, res, next) {
	try {
		const { driverUsername, amount, orderIds } = req.body;

		if (!driverUsername || !amount || !orderIds || !orderIds.length) {
			return res
				.status(400)
				.json({ error: "Driver, amount, and orderIds are required" });
		}

		const driver = await User.findOne({
			username: driverUsername,
			role: "driver",
		});
		const driverName = driver
			? `${driver.firstName || ""} ${driver.lastName || ""}`.trim() ||
				driverUsername
			: driverUsername;

		const adminUsername = req.user.username;

		const existing = await DriverCollection.findOne({
			orderIds: { $in: orderIds },
		});
		if (existing) {
			return res
				.status(400)
				.json({ error: "Some orders already collected" });
		}

		const last = await DriverCollection.findOne().sort({ number: -1 });
		const nextNumber = last ? last.number + 1 : 1;

		const collection = new DriverCollection({
			number: nextNumber,
			driverUsername,
			driverName,
			adminUsername,
			amount: Number(amount),
			orderIds,
		});

		await collection.save();

		res.status(201).json({
			message: "Collection created successfully",
			collection,
		});
	} catch (error) {
		next(error);
	}
}

export { getCollections, createCollection };

// Server-side collection creation for SSR flow (used by POST /collect)
async function createCollectionSSR(req, res, next) {
	try {
		let { driverUsername, orderIds } = req.body;

		if (!driverUsername || !orderIds) {
			// if driver passed as query param, accept it
			driverUsername = req.body.driver || driverUsername;
		}

		if (!driverUsername) {
			return res.status(400).render("collect", {
				title: "Collect Money | Go Delivery",
				initData: JSON.stringify({ drivers: [], collections: [] }),
				currentUser: req.user,
				selectedDriver: "",
				error: "Driver is required",
			});
		}

		// orderIds may be a single string or array
		if (typeof orderIds === "string") {
			orderIds = orderIds
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
		}

		if (!orderIds || !orderIds.length) {
			// nothing selected
			return res.redirect(
				`/collect?driver=${encodeURIComponent(driverUsername)}`,
			);
		}

		// ensure none of the orders are already collected
		const existing = await DriverCollection.findOne({
			orderIds: { $in: orderIds },
		});
		if (existing) {
			return res.redirect(
				`/collect?driver=${encodeURIComponent(driverUsername)}&error=Some+orders+already+collected`,
			);
		}

		// calculate total amount from orders
		const orders = await Order.find({ id: { $in: orderIds } }).lean();
		const total = orders.reduce((s, o) => s + (o.pr?.t || 0), 0);

		const driver = await User.findOne({
			username: driverUsername,
			role: "driver",
		});
		const driverName = driver
			? `${driver.firstName || ""} ${driver.lastName || ""}`.trim() ||
				driverUsername
			: driverUsername;

		const adminUsername = req.user.username;

		const last = await DriverCollection.findOne().sort({ number: -1 });
		const nextNumber = last ? last.number + 1 : 1;

		const collection = new DriverCollection({
			number: nextNumber,
			driverUsername,
			driverName,
			adminUsername,
			amount: Number(total),
			orderIds,
		});

		await collection.save();

		// update orders status to collected (6)
		await Order.updateMany(
			{ id: { $in: orderIds } },
			{ $set: { s: 6, statusUpdatedAt: new Date() } },
		);

		return res.redirect(
			`/collect?driver=${encodeURIComponent(driverUsername)}&success=1`,
		);
	} catch (error) {
		console.error("createCollectionSSR error:", error);
		return res.status(500).render("collect", {
			title: "Collect Money | Go Delivery",
			initData: JSON.stringify({ drivers: [], collections: [] }),
			currentUser: req.user,
			selectedDriver: "",
			error: "Failed to create collection",
		});
	}
}

export { createCollectionSSR };

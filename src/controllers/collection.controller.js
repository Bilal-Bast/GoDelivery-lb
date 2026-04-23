import DriverCollection from "../models/driverCollection.model.js";
import User from "../models/user.model.js";

async function getCollections(req, res) {
	try {
		const collections = await DriverCollection.find().sort({ number: -1 });
		res.json(collections);
	} catch (error) {
		res.status(500).json({ error: "Failed to fetch collections" });
	}
}

async function createCollection(req, res) {
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
		res.status(500).json({ error: "Failed to create collection" });
	}
}

export { getCollections, createCollection };

import prisma from "../config/prisma.js";
import {
	SettlementValidationError,
	createCollectionSettlement,
} from "../services/settlement.service.js";

// Server-side collection creation for SSR flow (used by POST /collect)
async function createCollectionSSR(req, res) {
	try {
		let { driverUsername, orderIds } = req.body;

		if (!driverUsername) driverUsername = req.body.driver;
		if (!driverUsername) {
			return res.status(400).render("admin/collect", {
				title: "Collect Money | Go Delivery",
				initData: JSON.stringify({ drivers: [], collections: [] }),
				currentUser: req.user,
				selectedDriver: "",
				error: "Driver is required",
				csrfToken: req.csrfToken(),
			});
		}

		if (typeof orderIds === "string") {
			orderIds = orderIds
				.split(",")
				.map((value) => value.trim())
				.filter(Boolean);
		}
		if (!orderIds?.length) {
			return res.redirect(`/collect?driver=${encodeURIComponent(driverUsername)}`);
		}

		const [driver, admin] = await Promise.all([
			prisma.user.findFirst({
				where: { username: driverUsername, role: "DRIVER" },
			}),
			prisma.user.findUnique({ where: { id: req.user.id } }),
		]);
		if (!driver) return res.redirect("/collect?error=Driver+not+found");
		if (!admin) return res.redirect("/collect?error=Admin+not+found");

		await createCollectionSettlement({ prisma, driver, admin, orderIds });
		return res.redirect(
			`/collect?driver=${encodeURIComponent(driverUsername)}&success=1`,
		);
	} catch (error) {
		if (error instanceof SettlementValidationError) {
			return res.redirect(`/collect?error=${encodeURIComponent(error.message)}`);
		}
		console.error("createCollectionSSR error:", error);
		return res.status(500).render("admin/collect", {
			title: "Collect Money | Go Delivery",
			initData: JSON.stringify({ drivers: [], collections: [] }),
			currentUser: req.user,
			selectedDriver: "",
			error: "Failed to create collection",
			csrfToken: req.csrfToken(),
		});
	}
}

export { createCollectionSSR };

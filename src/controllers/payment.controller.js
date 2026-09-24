import prisma from "../config/prisma.js";
import {
	SettlementValidationError,
	createPaymentSettlement,
} from "../services/settlement.service.js";

async function createPaymentSSR(req, res) {
	try {
		let { merchantUsername, orderIds } = req.body;

		if (typeof orderIds === "string") {
			orderIds = orderIds
				.split(",")
				.map((value) => value.trim())
				.filter(Boolean);
		}
		if (!merchantUsername) {
			return res.redirect("/pay?error=Merchant+is+required");
		}
		if (!orderIds?.length) {
			return res.redirect(
				`/pay?merchant=${encodeURIComponent(merchantUsername)}&error=Select+at+least+one+order`,
			);
		}

		const [merchant, admin] = await Promise.all([
			prisma.user.findFirst({
				where: { username: merchantUsername, role: "MERCHANT" },
			}),
			prisma.user.findUnique({ where: { id: req.user.id } }),
		]);
		if (!merchant) return res.redirect("/pay?error=Merchant+not+found");
		if (!admin) return res.redirect("/pay?error=Admin+not+found");

		await createPaymentSettlement({ prisma, merchant, admin, orderIds });
		return res.redirect(
			`/pay?merchant=${encodeURIComponent(merchantUsername)}&success=1`,
		);
	} catch (error) {
		if (error instanceof SettlementValidationError) {
			return res.redirect(`/pay?error=${encodeURIComponent(error.message)}`);
		}
		console.error("createPaymentSSR error:", error);
		return res.redirect("/pay?error=Failed+to+create+payment");
	}
}

export { createPaymentSSR };

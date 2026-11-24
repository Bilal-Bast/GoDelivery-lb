import prisma from "../config/prisma.js";
import { normalizeOrderIdPrefix } from "../controllers/user/serializers.js";

const MAX_ATTEMPTS = 10;

// Generates the next global sequential order ID (merchant prefix + number).
// Skips numbers already taken by manually typed IDs.
export async function generateOrderId(merchantId) {
	const merchant = await prisma.user.findUnique({
		where: { id: merchantId },
		select: { orderIdPrefix: true },
	});
	const prefix = (normalizeOrderIdPrefix(merchant?.orderIdPrefix) || "").toLowerCase();

	for (let i = 0; i < MAX_ATTEMPTS; i++) {
		const [{ n }] = await prisma.$queryRaw`SELECT nextval('order_id_seq')::text AS n`;
		const id = `${prefix}${n}`;
		const taken = await prisma.order.findUnique({ where: { id }, select: { id: true } });
		if (!taken) return id;
	}
	throw new Error("Could not generate a unique order ID");
}

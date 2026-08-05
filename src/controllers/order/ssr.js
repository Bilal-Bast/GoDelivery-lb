import prisma from "../../config/prisma.js";
import { sendWhatsAppMessage } from "../../services/whatsapp.js";
import { buildOrderCreateData } from "./mappers.js";

async function createOrderSSR(req, res, next) {
	try {
		let orderData = req.body.orderJson
			? JSON.parse(req.body.orderJson)
			: req.body;

		if (orderData.merchant && !orderData.m) {
			orderData = {
				id: orderData.id,
				m: orderData.merchant,
				c: {
					f: orderData.customer?.firstName,
					l: orderData.customer?.lastName,
					p: orderData.customer?.phone,
					loc: {
						d: orderData.customer?.location?.district,
						cty: orderData.customer?.location?.city,
					},
				},
				pr: {
					t: orderData.pricing?.totalPrice,
					d: orderData.pricing?.deliveryCharge,
				},
				s: 0,
				e: orderData.e === true,
				eN: orderData.eN || "",
				cb: (req.user && req.user.username) || "admin",
			};
		}

		const createInfo = await buildOrderCreateData(orderData);
		if (createInfo.error) {
			return res.redirect(
				`/orders?error=${encodeURIComponent(createInfo.error)}`,
			);
		}

		const historyEntry = {
			orderId: createInfo.data.id,
			actionType: "creation",
			newValue: orderData,
			performedBy: createInfo.data.createdBy,
			metadata: { message: "Order created via SSR" },
		};

		const [order] = await prisma.$transaction([ // ← Change to destructure the order
			prisma.order.create({ 
				data: createInfo.data,
				include: {
					merchant: { select: { username: true } },
					driver: { select: { username: true } },
				},
			}),
			prisma.orderHistory.create({ data: historyEntry }),
		]);

		// ← ADD WHATSAPP INTEGRATION HERE
		try {
			console.log("📱 Attempting to send WhatsApp message (SSR)...");
			const whatsappResult = await sendWhatsAppMessage({
				phone: order.customerPhone,
				customerName: order.customerFirstName,
				orderId: order.id,
				merchant: order.merchant?.username || "Go Delivery",
				total: order.total,
			});
			console.log("✅ WhatsApp result:", whatsappResult);
		} catch (whatsappError) {
			console.error("❌ WhatsApp notification failed:", whatsappError);
		}

		return res.redirect("/orders?success=1");
	} catch (error) {
		console.error("createOrderSSR error:", error);
		return res.redirect(
			`/orders?error=${encodeURIComponent("Failed to create order")}`,
		);
	}
}

export { createOrderSSR };

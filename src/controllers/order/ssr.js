import prisma from "../../config/prisma.js";
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

		await prisma.$transaction([
			prisma.order.create({ data: createInfo.data }),
			prisma.orderHistory.create({ data: historyEntry }),
		]);

		return res.redirect("/orders?success=1");
	} catch (error) {
		console.error("createOrderSSR error:", error);
		return res.redirect(
			`/orders?error=${encodeURIComponent("Failed to create order")}`,
		);
	}
}

export { createOrderSSR };

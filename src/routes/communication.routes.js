import { Router } from "express";
import prisma from "../config/prisma.js";
import authMiddleware, { authorize } from "../middleware/auth.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { communicationConfig, getCommunicationRuntimeStatus, loadManualWhatsAppPreview } from "../services/communication/communication.service.js";
import { maskPhoneNumber } from "../services/communication/phone-normalization.js";

const router = Router();

router.get("/status", authMiddleware, authorize("admin"), (req, res) => {
	res.set("Cache-Control", "private, no-store");
	res.json(getCommunicationRuntimeStatus(communicationConfig));
});

router.get("/orders/:id/whatsapp-preview", authMiddleware, authorize("admin", "driver"), asyncHandler(async (req, res) => {
	const preview = await loadManualWhatsAppPreview(prisma, req.user, req.params.id, {
		appUrl: communicationConfig.appUrl,
		defaultCountryCode: communicationConfig.defaultCountryCode,
	});
	if (!preview) return res.status(404).json({ error: "Order not found" });
	res.set("Cache-Control", "private, no-store");
	if (!preview.available) {
		return res.json({
			available: false,
			templateId: preview.templateId,
			reason: preview.reason,
			maskedPhone: maskPhoneNumber(preview.phone),
		});
	}
	return res.json({
		available: true,
		channel: preview.channel,
		templateId: preview.templateId,
		phone: preview.phone,
		maskedPhone: maskPhoneNumber(preview.phone),
		text: preview.text,
		trackingUrl: preview.trackingUrl,
	});
}));

export default router;

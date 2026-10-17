import prisma from "../config/prisma.js";
import { updateOrder } from "./order/api.js";
import {
	DispatchPlanningError,
	dispatchPlanning,
} from "../services/dispatch-planning.service.js";

function sendError(res, error) {
	if (error instanceof DispatchPlanningError) {
		return res.status(error.statusCode).json({ error: error.message });
	}
	return res.status(503).json({ error: "Dispatch planning is temporarily unavailable" });
}

function createDispatchHandlers({ db = prisma, planning = dispatchPlanning, update = updateOrder } = {}) {
	async function getBoard(req, res) {
		try {
			if (req.user?.role !== "admin") return res.status(req.user ? 403 : 401).json({ error: "Forbidden" });
			return res.json(await planning.getBoard(req.query));
		} catch (error) {
			return sendError(res, error);
		}
	}

	async function getMySequence(req, res) {
		try {
			if (req.user?.role !== "driver" || !req.user.id) {
				return res.status(req.user ? 403 : 401).json({ error: "Driver access required" });
			}
			return res.json(await planning.getDriverSequence(req.user.id));
		} catch (error) {
			return sendError(res, error);
		}
	}

	async function assignOrder(req, res, next) {
		try {
			if (req.user?.role !== "admin") return res.status(req.user ? 403 : 401).json({ error: "Forbidden" });
			const body = req.body || {};
			if (
				Object.keys(body).some((key) => !["driverUsername", "expectedUpdatedAt"].includes(key)) ||
				typeof body.driverUsername !== "string" ||
				!body.driverUsername.trim() || body.driverUsername.length > 80 ||
				typeof body.expectedUpdatedAt !== "string" ||
				!Number.isFinite(Date.parse(body.expectedUpdatedAt))
			) {
				return res.status(400).json({ error: "Invalid dispatch assignment request" });
			}

			const order = await db.order.findUnique({
				where: { id: req.params.id },
				select: { id: true, status: true, driverId: true, updatedAt: true },
			});
			if (!order) return res.status(404).json({ error: "Order not found" });
			if (!(["WAREHOUSE", "NEW"].includes(order.status)) || order.driverId) {
				return res.status(409).json({ error: "Order is no longer available for dispatch assignment" });
			}
			if (new Date(body.expectedUpdatedAt).getTime() !== new Date(order.updatedAt).getTime()) {
				return res.status(409).json({ error: "Order changed since this recommendation was generated. Refresh the board." });
			}

			// Reuse the established order update transaction, history, and Phase 11
			// post-commit hooks. The internal guard is applied atomically there.
			req.dispatchAssignmentGuard = {
				expectedUpdatedAt: order.updatedAt,
				expectedStatus: order.status,
			};
			req.body = { driver: body.driverUsername.trim() };
			return await update(req, res, next);
		} catch (error) {
			return sendError(res, error);
		}
	}

	return { getBoard, getMySequence, assignOrder };
}

const handlers = createDispatchHandlers();

export { createDispatchHandlers, handlers };

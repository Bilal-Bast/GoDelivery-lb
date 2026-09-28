import { Router } from "express";
import authMiddleware, { authorize } from "../middleware/auth.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { getReport, getOwnStatement, getAdminStatement } from "../controllers/analytics-report.controller.js";

const router = Router();
router.get("/report", authMiddleware, authorize("admin"), asyncHandler(getReport));
router.get("/statements/my", authMiddleware, authorize("merchant", "driver"), asyncHandler(getOwnStatement));
router.get("/statements/:kind/:id", authMiddleware, authorize("admin"), asyncHandler(getAdminStatement));
export default router;

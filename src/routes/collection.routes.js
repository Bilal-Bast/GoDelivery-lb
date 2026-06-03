import { Router } from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import adminOnly from "../middleware/admin.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
	getCollections,
	createCollection,
} from "../controllers/collection.controller.js";

const router = Router();

router.get(
	"/collections",
	authMiddleware,
	adminOnly,
	asyncHandler(getCollections),
);
router.post(
	"/collections",
	authMiddleware,
	adminOnly,
	asyncHandler(createCollection),
);

export default router;

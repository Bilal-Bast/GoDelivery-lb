import { Router } from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import adminOnly from "../middleware/admin.middleware.js";
import {
	getCollections,
	createCollection,
} from "../controllers/collection.controller.js";

const router = Router();

router.get("/collections", authMiddleware, adminOnly, getCollections);
router.post("/collections", authMiddleware, adminOnly, createCollection);

export default router;

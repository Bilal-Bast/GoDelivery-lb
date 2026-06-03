import { Router } from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import adminOnly from "../middleware/admin.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
	addAdmin,
	addMerchant,
	addDriver,
	getUsers,
	deleteUser,
	getUser,
	updateUser,
	updateMerchant,
} from "../controllers/user.controller.js";

const router = Router();

router.post("/add-admin", authMiddleware, adminOnly, asyncHandler(addAdmin));
router.post(
	"/add-merchant",
	authMiddleware,
	adminOnly,
	asyncHandler(addMerchant),
);
router.post("/add-driver", authMiddleware, adminOnly, asyncHandler(addDriver));
router.get("/", authMiddleware, adminOnly, asyncHandler(getUsers));
router.put(
	"/merchants/:id",
	authMiddleware,
	adminOnly,
	asyncHandler(updateMerchant),
);
router.delete("/:id", authMiddleware, adminOnly, asyncHandler(deleteUser));
router.get("/:id", authMiddleware, adminOnly, asyncHandler(getUser));
router.put("/:id", authMiddleware, adminOnly, asyncHandler(updateUser));

export default router;

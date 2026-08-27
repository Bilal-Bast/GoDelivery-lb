import { Router } from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import adminOnly from "../middleware/admin.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import validateRequest from "../middleware/validation.middleware.js";
import {
	addAdminValidators,
	addDriverValidators,
	addMerchantValidators,
	updateUserValidators,
} from "../middleware/validators.js";
import {
	addAdmin,
	addMerchant,
	addDriver,
	getUsers,
	deleteUser,
	getUserDeletePreview,
	getUser,
	updateUser,
	updateMerchant,
	updateDriver,
	updatePassword,
} from "../controllers/user/index.js";

const router = Router();

router.post(
	"/add-admin",
	authMiddleware,
	adminOnly,
	addAdminValidators,
	validateRequest,
	asyncHandler(addAdmin),
);
router.post(
	"/add-merchant",
	authMiddleware,
	adminOnly,
	addMerchantValidators,
	validateRequest,
	asyncHandler(addMerchant),
);
router.post(
	"/add-driver",
	authMiddleware,
	adminOnly,
	addDriverValidators,
	validateRequest,
	asyncHandler(addDriver),
);
router.get("/", authMiddleware, adminOnly, asyncHandler(getUsers));
router.put(
	"/merchants/:id",
	authMiddleware,
	adminOnly,
	updateUserValidators,
	validateRequest,
	asyncHandler(updateMerchant),
);
router.put(
	"/drivers/:id",
	authMiddleware,
	adminOnly,
	asyncHandler(updateDriver),
);
router.delete("/:id", authMiddleware, adminOnly, asyncHandler(deleteUser));
router.get(
	"/:id/delete-preview",
	authMiddleware,
	adminOnly,
	asyncHandler(getUserDeletePreview),
);
router.get("/:id", authMiddleware, adminOnly, asyncHandler(getUser));
router.put(
	"/:id",
	authMiddleware,
	adminOnly,
	updateUserValidators,
	validateRequest,
	asyncHandler(updateUser),
);
router.put(
	"/:id/password",
	authMiddleware,
	asyncHandler(updatePassword),
);

export default router;

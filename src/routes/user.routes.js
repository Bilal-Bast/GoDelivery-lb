import { Router } from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import adminOnly from "../middleware/admin.middleware.js";
import {
	addAdmin,
	addMerchant,
	addDriver,
	getMe,
	getUsers,
	getMerchants,
	getMerchantById,
	getMerchantByIdentifier,
	deleteUser,
	getUser,
	updateUser,
	updateMerchant,
} from "../controllers/user.controller.js";

const router = Router();

router.post("/add-admin", authMiddleware, adminOnly, addAdmin);
router.post("/add-merchant", authMiddleware, adminOnly, addMerchant);
router.post("/add-driver", authMiddleware, adminOnly, addDriver);
router.get("/me", authMiddleware, getMe);
router.get("/merchants", authMiddleware, adminOnly, getMerchants);
router.get("/merchants/:id", authMiddleware, adminOnly, getMerchantById);
router.get(
	"/merchant/:identifier",
	authMiddleware,
	adminOnly,
	getMerchantByIdentifier,
);
router.get("/users", authMiddleware, adminOnly, getUsers);
router.delete("/users/:id", authMiddleware, adminOnly, deleteUser);
router.get("/users/:id", authMiddleware, adminOnly, getUser);
router.put("/users/:id", authMiddleware, adminOnly, updateUser);
router.put("/merchants/:id", authMiddleware, adminOnly, updateMerchant);

export default router;

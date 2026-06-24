import { Router } from "express";

import { login, getMe, logout } from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import validateRequest from "../middleware/validation.middleware.js";
import { loginValidators } from "../middleware/validators.js";

const router = Router();

router.post("/login", loginValidators, validateRequest, asyncHandler(login));
router.get("/me", authMiddleware, asyncHandler(getMe));
router.post("/logout", authMiddleware, logout);

export default router;

import { Router } from "express";

import {
	login,
	getMe,
	logout,
	changePassword,
	forgotPassword,
	resetPassword,
} from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import validateRequest from "../middleware/validation.middleware.js";
import {
	loginValidators,
	changePasswordValidators,
	forgotPasswordValidators,
	resetPasswordValidators,
} from "../middleware/validators.js";

const router = Router();

router.post("/login", loginValidators, validateRequest, asyncHandler(login));
router.get("/me", authMiddleware, asyncHandler(getMe));
router.post("/logout", authMiddleware, logout);

router.patch(
	"/change-password",
	authMiddleware,
	changePasswordValidators,
	validateRequest,
	asyncHandler(changePassword),
);
router.post(
	"/forgot-password",
	forgotPasswordValidators,
	validateRequest,
	asyncHandler(forgotPassword),
);
router.post(
	"/reset-password",
	resetPasswordValidators,
	validateRequest,
	asyncHandler(resetPassword),
);

export default router;

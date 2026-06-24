import { Router } from "express";

import authMiddleware, { authorize } from "../middleware/auth.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import validateRequest from "../middleware/validation.middleware.js";
import { addLocationValidators } from "../middleware/validators.js";
import {
	getLocations,
	addLocation,
	deleteLocation,
} from "../controllers/location.controller.js";

const router = Router();

router.get("/", asyncHandler(getLocations));
router.post(
	"/",
	authMiddleware,
	authorize("admin"),
	addLocationValidators,
	validateRequest,
	asyncHandler(addLocation),
);
router.delete(
	"/:id",
	authMiddleware,
	authorize("admin"),
	asyncHandler(deleteLocation),
);

export default router;

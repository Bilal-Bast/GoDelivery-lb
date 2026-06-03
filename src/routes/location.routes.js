import { Router } from "express";

import authMiddleware, { authorize } from "../middleware/auth.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
	getLocations,
	addLocation,
	deleteLocation,
} from "../controllers/location.controller.js";

const router = Router();

router.get("/", asyncHandler(getLocations));
router.post("/", authMiddleware, authorize("admin"), asyncHandler(addLocation));
router.delete(
	"/:id",
	authMiddleware,
	authorize("admin"),
	asyncHandler(deleteLocation),
);

export default router;

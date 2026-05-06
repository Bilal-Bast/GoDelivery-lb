import { Router } from "express";

import authMiddleware, { authorize } from "../middleware/auth.middleware.js";
import {
	getLocations,
	addLocation,
	deleteLocation,
} from "../controllers/location.controller.js";

const router = Router();

router.get("/", getLocations);
router.post("/", authMiddleware, authorize("admin"), addLocation);
router.delete("/:id", authMiddleware, authorize("admin"), deleteLocation);

export default router;

import { Router } from "express";

import {
	getLocations,
	addLocation,
	deleteLocation,
} from "../controllers/location.controller.js";

const router = Router();

router.get("/locations", getLocations);
router.post("/locations", addLocation);
router.delete("/locations/:id", deleteLocation);

export default router;

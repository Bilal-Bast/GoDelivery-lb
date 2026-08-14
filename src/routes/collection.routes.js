import { Router } from "express";
import authMiddleware, { authorize } from "../middleware/auth.middleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import {
	getCollections,
	getCollectionById,
	getCollectionsByDriver,
	createCollection,
	updateCollection,
	deleteCollection,
	generateCollectionPDF,
	getCollectionStats,
} from "../controllers/collection/collectionController.js";
 
const router = Router();
 
// Get all collections (paginated)
router.get(
	"/",
	authMiddleware,
	authorize("admin"),
	asyncHandler(getCollections),
);
 
// Get collections by driver
router.get(
	"/driver/:driverUsername",
	authMiddleware,
	authorize("admin"),
	asyncHandler(getCollectionsByDriver),
);
 
// Get collection stats by driver
router.get(
	"/driver/:driverUsername/stats",
	authMiddleware,
	authorize("admin"),
	asyncHandler(getCollectionStats),
);
 
// Download PDF for collection
router.get(
	"/:id/pdf",
	authMiddleware,
	authorize("admin"),
	asyncHandler(generateCollectionPDF),
);
 
// Get single collection
router.get(
	"/:id",
	authMiddleware,
	authorize("admin"),
	asyncHandler(getCollectionById),
);
 
// Create collection
router.post(
	"/",
	authMiddleware,
	authorize("admin"),
	asyncHandler(createCollection),
);
 
// Update collection
router.put(
	"/:id",
	authMiddleware,
	authorize("admin"),
	asyncHandler(updateCollection),
);
 
// Delete collection
router.delete(
	"/:id",
	authMiddleware,
	authorize("admin"),
	asyncHandler(deleteCollection),
);
 
export default router;
 
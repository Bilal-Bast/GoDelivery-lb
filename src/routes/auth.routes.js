import { Router } from "express";

import { login } from "../controllers/auth.controller.js";
import asyncHandler from "../middleware/asyncHandler.js";

const router = Router();

router.post("/login", asyncHandler(login));

export default router;

// crud routes
import express from "express";
import { getUserProfile } from "../../controllers/auth/authControllers.js";
import authMiddleware from "../../middleware/authMiddleware.js";
import { updateUser } from "../../controllers/auth/authControllers.js";
// upload middleware
import { uploadMultiple } from "../../config/uploadConfig.js";


const router = express.Router();

router.get("/me", authMiddleware, getUserProfile);

router.put("/me/:id", uploadMultiple, updateUser);

export default router;
// crud routes
import express from "express";
import { deleteUser, updateUser , getAllUsers } from "../../controllers/user/userControllers.js";


const router = express.Router();

router.put("/:id", updateUser); // Update user
router.delete("/:id", deleteUser); // Delete user
router.get("/", getAllUsers); // Get all users

export default router;
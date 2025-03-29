// crud routes
import express from "express";
import { deleteUser, updateUser } from "../../controllers/user/userControllers.js";


const router = express.Router();

router.put("/:id", updateUser); // Update user
router.delete("/:id", deleteUser); // Delete user

export default router;
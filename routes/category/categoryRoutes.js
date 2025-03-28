import express from 'express';
import {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory
} from '../../controllers/category/categoryController.js';

const router = express.Router();

router.post('/', createCategory); // Create category
router.get('/', getAllCategories); // Get all categories
router.get('/:id', getCategoryById); // Get category by ID
router.put('/:id', updateCategory); // Update category
router.delete('/:id', deleteCategory); // Delete category

export default router;

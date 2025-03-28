import Category from "../../models/categoryModel.js";

// Create a new category
export const createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: "Category name is required" });
        }

        const newCategory = new Category({ name });
        await newCategory.save();

        res.status(201).json({ message: "Category created", category: newCategory });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get all categories
export const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get a single category by ID
export const getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        res.json(category);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update a category
export const updateCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const category = await Category.findByIdAndUpdate(req.params.id, { name }, { new: true });

        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        res.json({ message: "Category updated", category });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete a category
export const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);

        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        res.json({ message: "Category deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

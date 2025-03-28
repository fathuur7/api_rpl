import mongoose from 'mongoose';

// Category Schema
const categorySchema = new mongoose.Schema({
    name: { 
      type: String, 
      required: true 
    }
  }, { 
    timestamps: true 
  });

// Export the model
const Category = mongoose.model('Category', categorySchema);
export default Category;

// controllers/userController.js
import User from '../../models/userModel.js';

// Update user - only name and profilePhoto
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, profilePhoto } = req.body;

    // Only allow updates to name and profilePhoto
    const updateData = {};
    if (name) updateData.name = name;
    if (profilePhoto) updateData.profilePhoto = profilePhoto;

    // Check if user exists
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user with only the allowed fields
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update user',
      error: error.message 
    });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete the user
    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete user',
      error: error.message 
    });
  }
};


import passport from 'passport';
import crypto from 'crypto';
import User from '../../models/userModel.js';


const authController = {
  // Middleware to check authentication
  isAuthenticated: (req, res, next) => {rm -rf .git
    
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
  },

  // User Registration
  register: async (req, res) => {
    try {
      const { name, email, password, role } = req.body;

      // Check if user already exists
      let existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Create new user
      const newUser = new User({
        name,
        email,
        password,
        role: role || 'client'
      });

      await newUser.save();

      // Optional: Send verification email
      // Implement email verification logic here

      res.status(201).json({ 
        message: 'User registered successfully', 
        user: { 
          id: newUser._id, 
          name: newUser.name, 
          email: newUser.email, 
          role: newUser.role 
        } 
      });
    } catch (error) {
      res.status(500).json({ message: 'Error registering user', error: error.message });
    }
  },

  // Local Login
  localLogin: passport.authenticate('local'),
  
  // Handle Successful Local Login
  handleLocalLogin: (req, res) => {
    res.json({
      message: 'Login successful',
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        profilePhoto: req.user.profilePhoto
      }
    });
  },

  // Google OAuth Login Initiation
  googleLogin: passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  }),

  // Google OAuth Callback
  googleCallback: passport.authenticate('google', { 
    failureRedirect: '/login',
    successRedirect: '/' 
  }),

  // Logout
  logout: (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Error logging out' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  },

  // Get Current User
  getCurrentUser: (req, res) => {
    res.json({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      profilePhoto: req.user.profilePhoto
    });
  },

  // Password Reset Request
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: 'No account with that email found' });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(20).toString('hex');
      
      // Set reset token and expiration
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

      await user.save();

      // TODO: Implement email sending logic with nodemailer
      // const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
      // Send email with reset link

      res.json({ message: 'Password reset link sent' });
    } catch (error) {
      res.status(500).json({ message: 'Error processing password reset', error: error.message });
    }
  },

  // Reset Password
  resetPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }
      
      // Set new password
      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;

      await user.save();
      
      res.json({ message: 'Password reset successful' });
    } catch (error) {
      res.status(500).json({ message: 'Error resetting password', error: error.message });
    }
  }
};

export default authController;
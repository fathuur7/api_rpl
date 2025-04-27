
import passport from 'passport';
import crypto from 'crypto';
import User from '../../models/userModel.js';
import nodemailer from 'nodemailer';
import {sendVerificationEmail} from '../../config/verif.js';



const authController = {
  // Middleware to check authentication
  isAuthenticated: (req, res, next) => {
    
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
  },
  
  // User Registration
  register: async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      
      // Cek apakah email sudah digunakan
      let existingUser = await User.findOne({ email });
      if (existingUser) {
          return res.status(400).json({ message: 'User already exists' });
      }

      // Buat token verifikasi
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Buat user baru
      const newUser = new User({
          name,
          email,
          password,
          role: role || 'client',
          verificationToken,
          isVerified: false
      });
      
      await newUser.save();
      
      // Kirim email verifikasi
      const verificationLink = `http://localhost:3000/auth/makeSure/${verificationToken}`;
      sendVerificationEmail(email, verificationLink);

      res.status(201).json({
          message: 'User registered successfully. Please check your email for verification.',
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
  
  verifyEmail:async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({ verificationToken: token });
        
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }
        
        user.isVerified = true;
        await user.save();
        
        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error verifying email', error: error.message });
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
    failureRedirect: 'http://localhost:3000/login',
    successRedirect: 'http://localhost:3000/home' 
  }),

  logout: (req, res) => {
    if (req.cookies["connect.sid"]) {
      res.clearCookie("connect.sid", { path: "/" }); // Hapus cookie session
    }
  
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging out" });
      }
  
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Error destroying session" });
        }
        res.json({ message: "Logout successful" });
      });
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
      const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
      // Send email with reset link

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      const mailOptions = {
        from: process.env.EMAIL_USERNAME,
        to: email,
        subject: 'Password Reset Request',
        text: `Click the following link to reset your password: ${resetLink}`
      };

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
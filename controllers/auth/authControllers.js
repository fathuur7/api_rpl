import passport from 'passport';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../../models/userModel.js';
import nodemailer from 'nodemailer';
import {sendVerificationEmail} from '../../config/verif.js';

const authController = {
  // Middleware to check JWT authentication
  isAuthenticated: (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }
      
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).json({ message: 'Invalid or expired token' });
        }
        
        req.userId = decoded.id;
        next();
      });
    } catch (error) {
      res.status(401).json({ message: 'Unauthorized' });
    }
  },
  
  // Generate JWT token
  generateToken: (userId) => {
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // Token expires in 7 days
    );
  },
  
  // User Registration
  register: async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      
      // Check if email is already used
      let existingUser = await User.findOne({ email });
      if (existingUser) {
          return res.status(400).json({ message: 'User already exists' });
      }

      // Create verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Create new user
      const newUser = new User({
          name,
          email,
          password,
          role: role || 'client',
          verificationToken,
          isVerified: false
      });
      
      await newUser.save();
      
      // Send verification email
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
  
  verifyEmail: async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({ verificationToken: token });
        
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }
        
        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();
        
        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error verifying email', error: error.message });
    }
  },
  
  // Local Login with JWT
  localLogin: (req, res, next) => {
    passport.authenticate('local', { session: false }, (err, user, info) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ message: info.message || 'Authentication failed' });
      }
      
      if (!user.isVerified) {
        return res.status(401).json({ message: 'Please verify your email before logging in' });
      }
      
      req.user = user;
      next();
    })(req, res, next);
  },
  
  // Handle Local Login with JWT
  handleLocalLogin: (req, res) => {
    const token = authController.generateToken(req.user._id);
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        profilePhoto: req.user.profilePhoto || null
      }
    });
  },
  
  // Google OAuth Login Initiation
  googleLogin: passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  }),
  
  // Google OAuth Callback with JWT
  googleCallback: (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.redirect('http://localhost:3000/login`;');
      }
      
      const token = authController.generateToken(user._id);
      res.redirect(`http://localhost:3000/home?token=${token}`);
    })(req, res, next);
  },

  logout: (req, res) => {
    // For JWT, client-side should remove the token
    res.json({ message: "Logout successful" });
  },
  
  // Get Current User
  getCurrentUser: async (req, res) => {
    try {
      const user = await User.findById(req.userId).select('-password');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePhoto: user.profilePhoto || null
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user data', error: error.message });
    }
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

      // Reset link
      const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

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
      
      await transporter.sendMail(mailOptions);

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
  },
  
  // Refresh token
  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
      }
      
      jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
        if (err) {
          return res.status(401).json({ message: 'Invalid or expired refresh token' });
        }
        
        const user = await User.findById(decoded.id);
        
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
        
        const newToken = authController.generateToken(user._id);
        
        res.json({
          token: newToken
        });
      });
    } catch (error) {
      res.status(500).json({ message: 'Error refreshing token', error: error.message });
    }
  }
};

export default authController;
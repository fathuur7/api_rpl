// Initialize express router
// Import express
import express from 'express';
import authController from '../../controllers/auth/authControllers.js';

const router = express.Router();

// Routes
router.post('/register', authController.register);
router.post('/login', authController.localLogin, authController.handleLocalLogin);
router.get('/google', authController.googleLogin);
router.get('/google/callback', authController.googleCallback);
router.post('/logout', authController.logout);
router.get('/me', authController.isAuthenticated, authController.getCurrentUser);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);

export default router;
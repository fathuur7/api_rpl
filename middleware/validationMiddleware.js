// middleware/validationMiddleware.js
import { body, validationResult } from 'express-validator';

// Validation middleware for rating and feedback
export const validateRating = [
  body('rating'),
  
  body('comment')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment is required and must be between 1 and 1000 characters')
    .escape(), // Sanitize HTML

  // Middleware to handle validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// Validation middleware for portfolio creation/update
export const validatePortfolio = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required and must be between 1 and 200 characters')
    .escape(),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must not exceed 2000 characters')
    .escape(),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters')
    .escape(),

  // Middleware to handle validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
];

// Rate limiting middleware for rating submissions
export const rateLimitRating = (req, res, next) => {
  // Simple in-memory rate limiting (in production, use Redis)
  const userRatings = global.userRatings || {};
  const userId = req.user._id.toString();
  const now = Date.now();
  const rateLimit = 5; // Max 5 ratings per minute
  const timeWindow = 60 * 1000; // 1 minute

  if (!userRatings[userId]) {
    userRatings[userId] = [];
  }

  // Remove old entries
  userRatings[userId] = userRatings[userId].filter(
    timestamp => now - timestamp < timeWindow
  );

  if (userRatings[userId].length >= rateLimit) {
    return res.status(429).json({
      success: false,
      message: 'Too many rating attempts. Please try again later.'
    });
  }

  userRatings[userId].push(now);
  global.userRatings = userRatings;
  next();
};
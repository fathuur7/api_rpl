// middleware/errorHandlers.js

/**
 * Handle 404 errors for routes that don't exist
 */
export const notFoundHandler = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};
  
  /**
   * Global error handler
   */
export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  console.error(`[ERROR] ${err.stack}`);
  
  // Don't expose stack traces in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(statusCode).json({
    message: err.message,
    stack: isProduction ? '🥞' : err.stack,
    // For validation errors from Mongoose
    errors: err.errors || undefined
  });
};
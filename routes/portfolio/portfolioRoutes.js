// routes/portfolioRoutes.js
import express from 'express';
import { 
 // Public endpoints
  getPublicPortfolios,
  getPublicPortfolioDetails,
  getFeaturedPortfolios,
  getPortfolioCategories,
  getPortfolioStats,
  
  // Admin/Auth endpoints
  createPortfolio,
  getAllPortfolios,
  getPortfolioById,
  getMyPortfolios,
  updatePortfolio,
  deletePortfolio,
  
  // Rating endpoints
  addRatingAndFeedback,
  deleteMyRating,
  getPortfolioRatings
} from '../../controllers/portfolio/portfolioController.js';
import { isDesigner } from '../../middleware/authMiddleware.js';
import { validateRating } from '../../middleware/validationMiddleware.js';

const router = express.Router();

router.get('/public', getPublicPortfolios);

// Get portfolio categories for filters
router.get('/categories', getPortfolioCategories);

// Get featured portfolios for homepage
router.get('/featured', getFeaturedPortfolios);

// Get public portfolio details by ID
router.get('/public/:id', getPublicPortfolioDetails);

// Get ratings for a specific portfolio (public)
router.get('/:id/ratings', getPortfolioRatings);

// Get portfolio statistics (public stats)
router.get('/stats/public', getPortfolioStats);

// Admin endpoints
router.post('/', isDesigner, createPortfolio);
router.get('/', getAllPortfolios);
router.get('/my', getMyPortfolios);
router.get('/:id', getPortfolioById);
router.put('/:id', isDesigner, updatePortfolio);
router.delete('/:id', isDesigner, deletePortfolio);

// Rating endpoints
router.post('/:id/ratings', addRatingAndFeedback);
router.delete('/:id/ratings', deleteMyRating);
// Public rating endpoint
router.get('/:id/ratings', getPortfolioRatings);



export default router;
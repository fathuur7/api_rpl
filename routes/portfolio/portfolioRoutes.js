// routes/portfolioRoutes.js
import express from 'express';
import { 
  createPortfolio, 
  getAllPortfolios, 
  getPortfolioById, 
  getDesignerPortfolios,
  getMyPortfolios,
  updatePortfolio,
  deletePortfolio
} from '../../controllers/portfolio/portfolioController.js';
import { isDesigner } from '../../middleware/authMiddleware.js';

const router = express.Router();

// Public routes - accessible to everyone
router.get('/public', getAllPortfolios);
router.get('/public/:id', getPortfolioById);
router.get('/designer/:designerId', getDesignerPortfolios);

// All users can view their own portfolios
router.get('/my', getMyPortfolios);

// Designers can create and manage their portfolios
router.post('/', isDesigner, createPortfolio);
router.patch('/:id', isDesigner, updatePortfolio);
router.delete('/:id', isDesigner, deletePortfolio);

export default router;
// controllers/portfolioController.js
import Portfolio from '../../models/portofilioModel.js';
import Deliverable from '../../models/delivareModel.js';
import User from '../../models/userModel.js';
import logger from '../../utils/logger.js';

// Create a portfolio entry manually (already implemented in deliverableController for automatic creation)
export const createPortfolio = async (req, res) => {
  try {
    const { user, deliverable, title } = req.body;

    const foundUser = await User.findById(user);
    if (!foundUser || foundUser.role !== 'designer') {
      return res.status(400).json({ message: 'User must be a valid designer.' });
    }

    const foundDeliverable = await Deliverable.findById(deliverable);
    if (!foundDeliverable) {
      return res.status(404).json({ message: 'Deliverable not found.' });
    }

    // Check if portfolio already exists for this deliverable
    const existingPortfolio = await Portfolio.findOne({ deliverable });
    if (existingPortfolio) {
      return res.status(400).json({ message: 'Portfolio already exists for this deliverable.' });
    }

    const portfolio = await Portfolio.create({ user, deliverable, title });
    res.status(201).json({
      success: true,
      data: portfolio
    });
  } catch (err) {
    logger.error(`Error creating portfolio: ${err.message}`);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// Get all portfolios (paginated)
export const getAllPortfolios = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const portfoliosCount = await Portfolio.countDocuments();
    const portfolios = await Portfolio.find()
      .populate('user', 'name email profilePicture')
      .populate({
        path: 'deliverable',
        select: 'title description fileUrl feedback status submittedAt',
        populate: {
          path: 'orderId',
          select: 'title category'
        }
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: portfolios.length,
      totalPages: Math.ceil(portfoliosCount / limit),
      currentPage: page,
      data: portfolios
    });
  } catch (err) {
    logger.error(`Error fetching portfolios: ${err.message}`);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// Get portfolio by ID (including deliverable details)
export const getPortfolioById = async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id)
      .populate('user', 'name email profilePicture')
      .populate({
        path: 'deliverable',
        select: 'orderId title description fileUrl feedback status submittedAt',
        populate: {
          path: 'orderId',
          select: 'title category description'
        }
      });

    if (!portfolio) {
      return res.status(404).json({ 
        success: false,
        message: 'Portfolio not found.' 
      });
    }

    res.status(200).json({
      success: true,
      data: portfolio
    });
  } catch (err) {
    logger.error(`Error fetching portfolio: ${err.message}`);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// Get portfolios by designer
export const getDesignerPortfolios = async (req, res) => {
  try {
    const { designerId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Check if user exists and is a designer
    const designer = await User.findById(designerId);
    if (!designer || designer.role !== 'designer') {
      return res.status(404).json({ 
        success: false,
        message: 'Designer not found.' 
      });
    }
    
    const portfoliosCount = await Portfolio.countDocuments({ user: designerId });
    const portfolios = await Portfolio.find({ user: designerId })
      .populate('user', 'name email profilePicture')
      .populate({
        path: 'deliverable',
        select: 'title description fileUrl feedback status submittedAt',
        populate: {
          path: 'orderId',
          select: 'title category'
        }
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: portfolios.length,
      totalPages: Math.ceil(portfoliosCount / limit),
      currentPage: page,
      designer: {
        id: designer._id,
        name: designer.name,
        email: designer.email,
        profilePicture: designer.profilePicture
      },
      data: portfolios
    });
  } catch (err) {
    logger.error(`Error fetching designer portfolios: ${err.message}`);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// Get current user's (designer) portfolios
export const getMyPortfolios = async (req, res) => {
  try {
    // Only designers should access this endpoint
    if (req.user.role !== 'designer') {
      return res.status(403).json({ 
        success: false,
        message: 'Only designers can access their portfolios.' 
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const portfoliosCount = await Portfolio.countDocuments({ user: req.user._id });
    const portfolios = await Portfolio.find({ user: req.user._id })
      .populate({
        path: 'deliverable',
        select: 'title description fileUrl feedback status submittedAt',
        populate: {
          path: 'orderId',
          select: 'title category'
        }
      })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: portfolios.length,
      totalPages: Math.ceil(portfoliosCount / limit),
      currentPage: page,
      data: portfolios
    });
  } catch (err) {
    logger.error(`Error fetching my portfolios: ${err.message}`);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// Update portfolio
export const updatePortfolio = async (req, res) => {
  try {
    const { title } = req.body;
    
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) {
      return res.status(404).json({ 
        success: false,
        message: 'Portfolio not found.' 
      });
    }
    
    // Check if user is the owner of this portfolio
    if (portfolio.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'You are not authorized to update this portfolio.' 
      });
    }
    
    portfolio.title = title || portfolio.title;
    await portfolio.save();
    
    res.status(200).json({
      success: true,
      data: portfolio
    });
  } catch (err) {
    logger.error(`Error updating portfolio: ${err.message}`);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// Delete portfolio
export const deletePortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) {
      return res.status(404).json({ 
        success: false,
        message: 'Portfolio not found.' 
      });
    }
    
    // Check if user is the owner of this portfolio or an admin
    if (portfolio.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'You are not authorized to delete this portfolio.' 
      });
    }
    
    await Portfolio.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Portfolio deleted successfully.'
    });
  } catch (err) {
    logger.error(`Error deleting portfolio: ${err.message}`);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};
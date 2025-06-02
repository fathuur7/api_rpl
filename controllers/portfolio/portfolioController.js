// controllers/portfolioController.js (Updated with Rating & Feedback features)
import Portfolio from '../../models/portofilioModel.js';
import Deliverable from '../../models/delivareModel.js';
import User from '../../models/userModel.js';
import logger from '../../utils/logger.js';

export const getPublicPortfolios = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const skip = (page - 1) * limit;
    
    // Query filters
    const category = req.query.category;
    const search = req.query.search;
    const sortBy = req.query.sortBy || 'newest'; // newest, oldest, rating, popular
    
    // Build filter query
    let filterQuery = { isPublic: true };
    
    // Category filter
    if (category && category !== 'all') {
      filterQuery['deliverable.orderId.category'] = new RegExp(category, 'i');
    }
    
    // Search filter
    if (search) {
      filterQuery.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    // Build sort query
    let sortQuery = {};
    switch (sortBy) {
      case 'oldest':
        sortQuery = { createdAt: 1 };
        break;
      case 'rating':
        sortQuery = { averageRating: -1, createdAt: -1 };
        break;
      case 'popular':
        sortQuery = { totalRatings: -1, createdAt: -1 };
        break;
      case 'featured':
        sortQuery = { featured: -1, createdAt: -1 };
        break;
      default: // newest
        sortQuery = { createdAt: -1 };
    }
    
    const portfoliosCount = await Portfolio.countDocuments(filterQuery);
    const portfolios = await Portfolio.find(filterQuery)
      .populate('user', 'name email profilePicture')
      .populate({
        path: 'deliverable',
        select: 'title description fileUrl status submittedAt',
        populate: {
          path: 'orderId',
          select: 'title category'
        }
      })
      .populate('ratings.user', 'name profilePicture')
      .skip(skip)
      .limit(limit)
      .sort(sortQuery);

    // Calculate stats for each portfolio
    const portfoliosWithStats = portfolios.map(portfolio => {
      const ratings = portfolio.ratings || [];
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
        : 0;
      
      // Get thumbnail from deliverable file or generate one
      const thumbnailUrl = portfolio.deliverable?.fileUrl || null;
      
      return {
        _id: portfolio._id,
        title: portfolio.title,
        description: portfolio.description,
        tags: portfolio.tags,
        thumbnailUrl,
        user: {
          _id: portfolio.user._id,
          name: portfolio.user.name,
          profilePicture: portfolio.user.profilePicture
        },
        deliverable: portfolio.deliverable ? {
          title: portfolio.deliverable.title,
          orderId: portfolio.deliverable.orderId
        } : null,
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings: ratings.length,
        featured: portfolio.featured,
        createdAt: portfolio.createdAt
      };
    });
    
    res.status(200).json({
      success: true,
      count: portfolios.length,
      totalPages: Math.ceil(portfoliosCount / limit),
      currentPage: page,
      totalPortfolios: portfoliosCount,
      data: portfoliosWithStats
    });
  } catch (err) {
    logger.error(`Error fetching public portfolios: ${err.message}`);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// Get portfolio categories for filter
export const getPortfolioCategories = async (req, res) => {
  try {
    const categories = await Portfolio.aggregate([
      { $match: { isPublic: true } },
      {
        $lookup: {
          from: 'deliverables',
          localField: 'deliverable',
          foreignField: '_id',
          as: 'deliverable'
        }
      },
      { $unwind: '$deliverable' },
      {
        $lookup: {
          from: 'orders',
          localField: 'deliverable.orderId',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: '$order' },
      {
        $group: {
          _id: '$order.category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: categories.map(cat => ({
        name: cat._id,
        count: cat.count
      }))
    });
  } catch (err) {
    logger.error(`Error fetching categories: ${err.message}`);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// Get portfolio details for public view (with ratings)
export const getPublicPortfolioDetails = async (req, res) => {
  try {
    const portfolioId = req.params.id;
    
    const portfolio = await Portfolio.findOne({ 
      _id: portfolioId, 
      isPublic: true 
    })
      .populate('user', 'name email profilePicture')
      .populate({
        path: 'deliverable',
        select: 'title description fileUrl feedback status submittedAt',
        populate: {
          path: 'orderId',
          select: 'title category description'
        }
      })
      .populate({
        path: 'ratings.user',
        select: 'name profilePicture'
      });

    if (!portfolio) {
      return res.status(404).json({ 
        success: false,
        message: 'Portfolio not found or not public.' 
      });
    }

    // Calculate rating statistics
    const ratings = portfolio.ratings || [];
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
      : 0;

    // Rating distribution
    const ratingDistribution = [1, 2, 3, 4, 5].map(star => ({
      star,
      count: ratings.filter(r => r.rating === star).length,
      percentage: ratings.length > 0 
        ? Math.round((ratings.filter(r => r.rating === star).length / ratings.length) * 100)
        : 0
    }));

    // Sort ratings by newest first
    const sortedRatings = ratings.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Get similar portfolios (same category, excluding current)
    const similarPortfolios = await Portfolio.find({
      _id: { $ne: portfolioId },
      isPublic: true,
      'deliverable.orderId.category': portfolio.deliverable?.orderId?.category
    })
      .populate('user', 'name profilePicture')
      .populate('deliverable', 'title fileUrl')
      .limit(4)
      .sort({ averageRating: -1, createdAt: -1 });

    const portfolioDetails = {
      _id: portfolio._id,
      title: portfolio.title,
      description: portfolio.description,
      tags: portfolio.tags,
      user: portfolio.user,
      deliverable: portfolio.deliverable,
      ratings: sortedRatings,
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings: ratings.length,
      ratingDistribution,
      featured: portfolio.featured,
      createdAt: portfolio.createdAt,
      updatedAt: portfolio.updatedAt
    };

    res.status(200).json({
      success: true,
      data: {
        portfolio: portfolioDetails,
        similarPortfolios: similarPortfolios.map(p => ({
          _id: p._id,
          title: p.title,
          thumbnailUrl: p.deliverable?.fileUrl,
          user: p.user,
          averageRating: p.averageRating || 0,
          totalRatings: p.totalRatings || 0
        }))
      }
    });
  } catch (err) {
    logger.error(`Error fetching portfolio details: ${err.message}`);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// Get featured portfolios for homepage
export const getFeaturedPortfolios = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    
    const featuredPortfolios = await Portfolio.find({ 
      isPublic: true, 
      featured: true 
    })
      .populate('user', 'name profilePicture')
      .populate({
        path: 'deliverable',
        select: 'title fileUrl',
        populate: {
          path: 'orderId',
          select: 'category'
        }
      })
      .limit(limit)
      .sort({ createdAt: -1 });

    const portfoliosWithStats = featuredPortfolios.map(portfolio => {
      const ratings = portfolio.ratings || [];
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
        : 0;
      
      return {
        _id: portfolio._id,
        title: portfolio.title,
        description: portfolio.description,
        thumbnailUrl: portfolio.deliverable?.fileUrl,
        user: {
          name: portfolio.user.name,
          profilePicture: portfolio.user.profilePicture
        },
        category: portfolio.deliverable?.orderId?.category,
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings: ratings.length,
        createdAt: portfolio.createdAt
      };
    });

    res.status(200).json({
      success: true,
      count: featuredPortfolios.length,
      data: portfoliosWithStats
    });
  } catch (err) {
    logger.error(`Error fetching featured portfolios: ${err.message}`);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// Get portfolio statistics (for admin dashboard)
export const getPortfolioStats = async (req, res) => {
  try {
    const totalPortfolios = await Portfolio.countDocuments({ isPublic: true });
    const totalRatings = await Portfolio.aggregate([
      { $match: { isPublic: true } },
      { $project: { ratingsCount: { $size: '$ratings' } } },
      { $group: { _id: null, total: { $sum: '$ratingsCount' } } }
    ]);

    const averageRating = await Portfolio.aggregate([
      { $match: { isPublic: true, 'ratings.0': { $exists: true } } },
      { $addFields: { avgRating: { $avg: '$ratings.rating' } } },
      { $group: { _id: null, overallAvg: { $avg: '$avgRating' } } }
    ]);

    const categoryStats = await Portfolio.aggregate([
      { $match: { isPublic: true } },
      {
        $lookup: {
          from: 'deliverables',
          localField: 'deliverable',
          foreignField: '_id',
          as: 'deliverable'
        }
      },
      { $unwind: '$deliverable' },
      {
        $lookup: {
          from: 'orders',
          localField: 'deliverable.orderId',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: '$order' },
      {
        $group: {
          _id: '$order.category',
          count: { $sum: 1 },
          avgRating: { $avg: { $avg: '$ratings.rating' } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalPortfolios,
        totalRatings: totalRatings[0]?.total || 0,
        averageRating: Math.round((averageRating[0]?.overallAvg || 0) * 10) / 10,
        categoryStats
      }
    });
  } catch (err) {
    logger.error(`Error fetching portfolio stats: ${err.message}`);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// Original controller functions...
// (keeping all the existing functions from previous artifact)

// Create a portfolio entry manually
export const createPortfolio = async (req, res) => {
  try {
    const { user, deliverable, title, description, tags } = req.body;

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

    const portfolio = await Portfolio.create({ 
      user, 
      deliverable, 
      title,
      description,
      tags: tags || [],
      isPublic: true
    });
    
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

// Get all portfolios (admin view)
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
      .populate('ratings.user', 'name email profilePicture')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Calculate average rating for each portfolio
    const portfoliosWithStats = portfolios.map(portfolio => {
      const ratings = portfolio.ratings || [];
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
        : 0;
      
      return {
        ...portfolio.toObject(),
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings: ratings.length
      };
    });
    
    res.status(200).json({
      success: true,
      count: portfolios.length,
      totalPages: Math.ceil(portfoliosCount / limit),
      currentPage: page,
      data: portfoliosWithStats
    });
  } catch (err) {
    logger.error(`Error fetching portfolios: ${err.message}`);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// Get portfolio by ID (including deliverable details and ratings)
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
      })
      .populate('ratings.user', 'name email profilePicture');

    if (!portfolio) {
      return res.status(404).json({ 
        success: false,
        message: 'Portfolio not found.' 
      });
    }

    // Calculate average rating
    const ratings = portfolio.ratings || [];
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
      : 0;

    const portfolioWithStats = {
      ...portfolio.toObject(),
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings: ratings.length
    };

    res.status(200).json({
      success: true,
      data: portfolioWithStats
    });
  } catch (err) {
    logger.error(`Error fetching portfolio: ${err.message}`);
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
      .populate('ratings.user', 'name email profilePicture')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Calculate average rating for each portfolio
    const portfoliosWithStats = portfolios.map(portfolio => {
      const ratings = portfolio.ratings || [];
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
        : 0;
      
      return {
        ...portfolio.toObject(),
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings: ratings.length
      };
    });
    
    res.status(200).json({
      success: true,
      count: portfolios.length,
      totalPages: Math.ceil(portfoliosCount / limit),
      currentPage: page,
      data: portfoliosWithStats
    });
  } catch (err) {
    logger.error(`Error fetching my portfolios: ${err.message}`);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// Add rating and feedback to portfolio
export const addRatingAndFeedback = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const portfolioId = req.params.id;
    const userId = req.user._id;

    // // Validate rating
    // if (!rating || rating < 1 || rating > 5) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Rating must be between 1 and 5.'
    //   });
    // }

    // Validate comment
    // if (!comment || comment.trim().length === 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Comment is required.'
    //   });
    // }

    const portfolio = await Portfolio.findById(portfolioId);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found.'
      });
    }

    // Check if user is the owner of the portfolio
    // if (portfolio.user.toString() === userId.toString()) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'You cannot rate your own portfolio.'
    //   });
    // }

    // Check if user has already rated this portfolio
    const existingRatingIndex = portfolio.ratings.findIndex(
      r => r.user.toString() === userId.toString()
    );

    if (existingRatingIndex !== -1) {
      // Update existing rating
      portfolio.ratings[existingRatingIndex].rating = rating;
      portfolio.ratings[existingRatingIndex].comment = comment;
      portfolio.ratings[existingRatingIndex].updatedAt = new Date();
    } else {
      // Add new rating
      portfolio.ratings.push({
        user: userId,
        rating,
        comment,
        createdAt: new Date()
      });
    }

    await portfolio.save();
    await portfolio.populate('ratings.user', 'name email profilePicture');

    // Calculate new average rating
    const ratings = portfolio.ratings || [];
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
      : 0;

    res.status(200).json({
      success: true,
      message: existingRatingIndex !== -1 ? 'Rating updated successfully.' : 'Rating added successfully.',
      data: {
        portfolio: portfolio,
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings: ratings.length
      }
    });
  } catch (err) {
    logger.error(`Error adding/updating rating: ${err.message}`);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Delete user's rating from portfolio
export const deleteMyRating = async (req, res) => {
  try {
    const portfolioId = req.params.id;
    const userId = req.user._id;

    const portfolio = await Portfolio.findById(portfolioId);
    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found.'
      });
    }

    const ratingIndex = portfolio.ratings.findIndex(
      r => r.user.toString() === userId.toString()
    );

    if (ratingIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'You have not rated this portfolio.'
      });
    }

    portfolio.ratings.splice(ratingIndex, 1);
    await portfolio.save();

    const ratings = portfolio.ratings || [];
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
      : 0;

    res.status(200).json({
      success: true,
      message: 'Rating deleted successfully.',
      data: {
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings: ratings.length
      }
    });
  } catch (err) {
    logger.error(`Error deleting rating: ${err.message}`);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Get ratings for a specific portfolio
export const getPortfolioRatings = async (req, res) => {
  try {
    const portfolioId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const portfolio = await Portfolio.findById(portfolioId)
      .populate('ratings.user', 'name email profilePicture')
      .select('ratings');

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        message: 'Portfolio not found.'
      });
    }

    const sortedRatings = portfolio.ratings.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRatings = sortedRatings.slice(startIndex, endIndex);

    const averageRating = sortedRatings.length > 0 
      ? sortedRatings.reduce((sum, rating) => sum + rating.rating, 0) / sortedRatings.length 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        ratings: paginatedRatings,
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings: sortedRatings.length,
        currentPage: page,
        totalPages: Math.ceil(sortedRatings.length / limit)
      }
    });
  } catch (err) {
    logger.error(`Error fetching portfolio ratings: ${err.message}`);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Update portfolio
export const updatePortfolio = async (req, res) => {
  try {
    const { title, description, tags, isPublic } = req.body;
    
    const portfolio = await Portfolio.findById(req.params.id);
    if (!portfolio) {
      return res.status(404).json({ 
        success: false,
        message: 'Portfolio not found.' 
      });
    }
    
    if (portfolio.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'You are not authorized to update this portfolio.' 
      });
    }
    
    portfolio.title = title || portfolio.title;
    portfolio.description = description || portfolio.description;
    portfolio.tags = tags || portfolio.tags;
    if (typeof isPublic === 'boolean') {
      portfolio.isPublic = isPublic;
    }
    
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
// models/portfolioModel.js (Updated with Rating & Feedback)
import mongoose from 'mongoose';
const { Schema } = mongoose;

// Rating sub-schema
const ratingSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000, // Limit comment length
  }
}, {
  timestamps: true,
});

const portfolioSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Designer
    required: true,
  },
  deliverable: {
    type: Schema.Types.ObjectId,
    ref: 'Deliverable',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  // Array of ratings and feedback from different users
  ratings: [ratingSchema],
  
  // Additional portfolio metadata (optional)
  description: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  isPublic: {
    type: Boolean,
    default: true, // Whether portfolio is publicly visible
  },
  featured: {
    type: Boolean,
    default: false, // For admin to feature certain portfolios
  }
}, {
  timestamps: true,
});

// Index for better query performance
portfolioSchema.index({ user: 1 });
portfolioSchema.index({ deliverable: 1 });
portfolioSchema.index({ 'ratings.user': 1 });
portfolioSchema.index({ createdAt: -1 });
portfolioSchema.index({ featured: -1, createdAt: -1 });

// Virtual for average rating
portfolioSchema.virtual('averageRating').get(function() {
  if (!this.ratings || this.ratings.length === 0) return 0;
  const sum = this.ratings.reduce((acc, rating) => acc + rating.rating, 0);
  return Math.round((sum / this.ratings.length) * 10) / 10;
});

// Virtual for total ratings count
portfolioSchema.virtual('totalRatings').get(function() {
  return this.ratings ? this.ratings.length : 0;
});

// Ensure virtual fields are serialized
portfolioSchema.set('toJSON', { virtuals: true });
portfolioSchema.set('toObject', { virtuals: true });

// Pre-save middleware to ensure no duplicate ratings from same user
portfolioSchema.pre('save', function(next) {
  if (this.isModified('ratings')) {
    const userIds = this.ratings.map(rating => rating.user.toString());
    const uniqueUserIds = [...new Set(userIds)];
    
    if (userIds.length !== uniqueUserIds.length) {
      return next(new Error('A user can only rate a portfolio once.'));
    }
  }
  next();
});

const Portfolio = mongoose.model('Portfolio', portfolioSchema);
export default Portfolio;
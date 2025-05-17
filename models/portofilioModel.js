import mongoose from 'mongoose';
const { Schema } = mongoose;

const portfolioSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Karena designer adalah bagian dari User
    required: true,
  },
  deliverable: {
    type: Schema.Types.ObjectId,
    ref: 'Deliverable', // Sesuai dengan nama model Deliverable
    required: true,
  },
  title: {
    type: String, // Judul portofolio
    required: true,
  },
}, {
  timestamps: true,
});

const Portfolio = mongoose.model('Portfolio', portfolioSchema);
export default Portfolio;

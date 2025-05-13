// models/deliverableModel.js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const deliverableSchema = new Schema({
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  desainer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: String,
  description: String,
  fileUrl: {
    type: String,
    required: true,
  },
  path: {
    type: String
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
  reviewedAt: {
    type: Date,
  },
  feedback: String,
}, {
  timestamps: true,
});

const Deliverable = mongoose.model('Deliverable', deliverableSchema);
export default Deliverable;
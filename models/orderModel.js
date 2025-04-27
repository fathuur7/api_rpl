import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  designer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['in_progress','awaiting_payment' ,'revision', 'completed', 'cancelled'],
    default: 'in_progress'
  },
  revisionCount: {
    type: Number,
    default: 0
  },
  isPaid: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
// models/Payment.js
import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'gopay', 'bank_transfer', 'shopeepay', 'other'],
    required: true,
  },
  transactionStatus: {
    type: String,
    enum: ['pending', 'settlement', 'deny', 'cancel', 'expire', 'failure', 'refund'],
    default: 'pending',
  },
  transactionTime: {
    type: Date,
    default: Date.now,
  },
  midtransResponse: {
    type: Object,
    required: true,
  },
}, {
  timestamps: true,
});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;

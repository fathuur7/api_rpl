import Order from '../models/orderModel.js';
import Payment from '../models/paymentModel.js';
import { snap } from '../config/midtrans.js';
import { sendPaymentNotificationEmails } from '../config/email.js';

export const generateMidtransToken = async (orderId, amount, itemDetails, customerDetails) => {
  // Find the order to verify it exists and get additional details if needed
  const order = await Order.findById(orderId)
    .populate('client', 'email name')
    .populate('service', 'title');
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  // Create transaction parameters for Midtrans
  const parameter = {
    transaction_details: {
      order_id: `ORDER-${orderId}-${Date.now()}`, // Ensure unique order ID
      gross_amount: amount
    },
    credit_card: {
      secure: true
    },
    item_details: itemDetails || [{
      id: order.service._id.toString(),
      price: amount,
      quantity: 1,
      name: order.service.title || 'Design Service'
    }],
    customer_details: customerDetails || {
      first_name: order.client.name?.split(' ')[0] || 'Customer',
      last_name: order.client.name?.split(' ').slice(1).join(' ') || '',
      email: order.client.email
    }
  };
  
  return await snap.createTransaction(parameter);
};

export const createPayment = async (paymentData) => {
  const { orderId, amount, paymentMethod, client, midtransResponse } = paymentData;
  
  // Validate order existence
  const order = await Order.findById(orderId)
    .populate('client', 'email name')
    .populate('designer', 'email name');
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  // Create payment record
  const newPayment = new Payment({
    orderId: order._id,
    client: client || order.client._id,
    amount,
    paymentMethod,
    transactionStatus: midtransResponse?.transaction_status || 'pending',
    midtransResponse: midtransResponse || {}
  });
  
  await newPayment.save();
  
  // Update order payment status if settled
  if (midtransResponse?.transaction_status === 'settlement') {
    order.isPaid = true;
    order.status = 'in_progress'; // Update from awaiting_payment to in_progress
    await order.save();
    
    // Send email notifications
    await sendPaymentNotificationEmails(order, newPayment);
  }
  
  return newPayment;
};

export const processNotification = async (notification) => {
  // Extract order ID from Midtrans order_id (remove prefix if you added one)
  const midtransOrderId = notification.order_id;
  const orderId = midtransOrderId.includes('ORDER-') 
    ? midtransOrderId.split('-')[1] 
    : midtransOrderId;
  
  // Find existing payment or create a new one
  let payment = await Payment.findOne({ 
    'midtransResponse.order_id': midtransOrderId 
  });
  
  if (!payment) {
    // If payment not found, check if order exists
    const order = await Order.findById(orderId)
      .populate('client', 'email name')
      .populate('designer', 'email name');
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Create new payment record
    payment = new Payment({
      orderId: order._id,
      client: order.client._id,
      amount: notification.gross_amount,
      paymentMethod: notification.payment_type,
      transactionStatus: notification.transaction_status,
      midtransResponse: notification
    });
  } else {
    // Update existing payment
    payment.transactionStatus = notification.transaction_status;
    payment.midtransResponse = { ...payment.midtransResponse, ...notification };
  }
  
  await payment.save();
  
  // Process based on transaction status
  if (notification.transaction_status === 'settlement' || 
      (notification.transaction_status === 'capture' && notification.fraud_status === 'accept')) {
    
    const order = await Order.findById(payment.orderId)
      .populate('client', 'email name')
      .populate('designer', 'email name');
    
    if (order) {
      order.isPaid = true;
      order.status = 'in_progress'; // Update from awaiting_payment to in_progress
      await order.save();
      
      // Send payment notification emails
      await sendPaymentNotificationEmails(order, payment, notification);
    }
  }
  
  return payment;
};

export const getPaymentByOrderId = async (orderId) => {
  const payment = await Payment.findOne({ orderId });
  if (!payment) {
    throw new Error('Payment not found for this order');
  }
  return payment;
};

export const getAllPayments = async (filters = {}) => {
  return await Payment.find(filters)
    .populate('orderId', 'service status')
    .sort({ createdAt: -1 });
};
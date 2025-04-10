// routes/payments.js
import express from 'express';
import midtransClient from 'midtrans-client';
import dotenv from 'dotenv';
import Order from '../../models/orderModel.js';
import Payment from '../../models/paymentModel.js';
import nodemailer from 'nodemailer';

dotenv.config();
const router = express.Router();

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Configure Midtrans client
const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// Create Core API instance for verification
const core = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// Generate Midtrans token endpoint
router.post('/generate-token', async (req, res) => {
  try {
    const { orderId, amount, itemDetails, customerDetails } = req.body;
    
    // Validate required fields
    if (!orderId || !amount) {
      return res.status(400).json({ msg: 'Order ID and amount are required' });
    }

    // Find the order to verify it exists and get additional details if needed
    const order = await Order.findById(orderId)
      .populate('client', 'email name')
      .populate('service', 'title');
    
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
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
    
    const transaction = await snap.createTransaction(parameter);
    
    res.json({
      token: transaction.token,
      redirect_url: transaction.redirect_url,
      client_key: process.env.MIDTRANS_CLIENT_KEY // Send client key to frontend
    });
  } catch (err) {
    console.error('Midtrans token generation error:', err.message);
    res.status(500).json({ msg: 'Failed to generate payment token', error: err.message });
  }
});

// Create a new payment manually (if needed)
router.post('/create', async (req, res) => {
  try {
    const { orderId, amount, paymentMethod, client, midtransResponse } = req.body;
    
    // Validate order existence
    const order = await Order.findById(orderId)
      .populate('client', 'email name')
      .populate('designer', 'email name');
    
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
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
      
      // Send email notifications (reuse the notification email code)
      await sendPaymentNotificationEmails(order, newPayment);
    }
    
    res.status(201).json({
      msg: 'Payment record created successfully',
      payment: newPayment
    });
    console.log('Payment record created:', newPayment);
  } catch (err) {
    console.error('Payment creation error:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// Handle Midtrans webhook for payment notifications
router.post('/notification/midtrans', async (req, res) => {
  try {
    const notification = req.body;
    
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
        return res.status(404).json({ msg: 'Order not found' });
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
    
    // Always return 200 to Midtrans
    res.status(200).json({ status: 'OK' });
  } catch (err) {
    console.error('Midtrans notification processing error:', err.message);
    // Always return 200 to Midtrans even if our processing failed
    // This prevents Midtrans from repeatedly sending the same notification
    res.status(200).json({ status: 'ERROR', message: err.message });
  }
});

// Get payment by orderId
router.get('/order/:orderId', async (req, res) => {
  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId });
    
    if (!payment) {
      return res.status(404).json({ msg: 'Payment not found for this order' });
    }
    
    res.json(payment);
  } catch (err) {
    console.error('Get payment error:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// Get all payments (with optional client filter)
router.get('/', async (req, res) => {
  try {
    const { client } = req.query;
    let query = {};
    
    if (client) {
      query.client = client;
    }
    
    const payments = await Payment.find(query)
      .populate('orderId', 'service status')
      .sort({ createdAt: -1 });
    
    res.json(payments);
  } catch (err) {
    console.error('Get payments error:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
});

// Helper function to send payment notification emails
async function sendPaymentNotificationEmails(order, payment, notification = null) {
  if (!process.env.EMAIL_USERNAME || !process.env.EMAIL_PASSWORD) {
    console.log('Email credentials not set, skipping email notifications');
    return;
  }
  
  try {
    const status = notification?.transaction_status || payment.transactionStatus;
    
    const designerMailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: order.designer.email,
      subject: 'Payment Received for Your Service',
      html: `
        <h1>Payment Received</h1>
        <p>Dear ${order.designer.name},</p>
        <p>The client has made a payment for your service.</p>
        <p>Payment details:</p>
        <ul>
          <li>Order ID: ${order._id}</li>
          <li>Amount: $${payment.amount}</li>
          <li>Payment Method: ${payment.paymentMethod}</li>
          <li>Status: ${status}</li>
        </ul>
        <p>You can now start working on this project.</p>
      `
    };
    
    const clientMailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: order.client.email,
      subject: 'Payment Confirmation',
      html: `
        <h1>Payment Confirmed</h1>
        <p>Dear ${order.client.name},</p>
        <p>Your payment for service has been received.</p>
        <p>Payment details:</p>
        <ul>
          <li>Order ID: ${order._id}</li>
          <li>Amount: $${payment.amount}</li>
          <li>Payment Method: ${payment.paymentMethod}</li>
          <li>Status: ${status}</li>
        </ul>
        <p>The designer will now start working on your project.</p>
      `
    };
    
    // Send emails asynchronously
    await transporter.sendMail(designerMailOptions);
    await transporter.sendMail(clientMailOptions);
    console.log('Payment notification emails sent successfully');
  } catch (emailError) {
    console.error('Email sending failed:', emailError);
    // Continue execution even if email fails
  }
}

export default router;
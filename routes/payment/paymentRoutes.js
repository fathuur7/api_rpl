// routes/payments.js
import express from 'express';
import Payment from '../../models/paymentModel.js';
import Order from '../../models/orderModel.js';
import User from '../../models/userModel.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

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

// Create a new payment
router.post('/create', async (req, res) => {
  try {
    const { orderId, amount, paymentMethod, client, midtransResponse } = req.body;
    
    // Validate order existence
    const order = await Order.find({ _id: orderId })
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
      transactionStatus: midtransResponse.transaction_status || 'pending',
      midtransResponse
    });
    
    await newPayment.save();
    
    // Update order payment status
    if (midtransResponse.transaction_status === 'settlement') {
      order.isPaid = true;
      await order.save();
      
      // Send payment notification to designer
      if (process.env.EMAIL_USERNAME && process.env.EMAIL_PASSWORD) {
        try {
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
                <li>Amount: $${amount}</li>
                <li>Payment Method: ${paymentMethod}</li>
                <li>Status: ${midtransResponse.transaction_status}</li>
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
                <li>Amount: $${amount}</li>
                <li>Payment Method: ${paymentMethod}</li>
                <li>Status: ${midtransResponse.transaction_status}</li>
              </ul>
              <p>The designer will now start working on your project.</p>
            `
          };
          
          // Send emails asynchronously
          await transporter.sendMail(designerMailOptions);
          await transporter.sendMail(clientMailOptions);
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          // Continue execution even if email fails
        }
      }
    }
    
    res.status(201).json({
      msg: 'Payment record created successfully',
      payment: newPayment
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Handle Midtrans webhook for payment notifications
router.post('/notification/midtrans', async (req, res) => {
  try {
    const notification = req.body;
    
    // Find the related payment
    const payment = await Payment.findOne({ 'midtransResponse.order_id': notification.order_id });
    
    if (!payment) {
      return res.status(404).json({ msg: 'Payment not found' });
    }
    
    // Update payment status
    payment.transactionStatus = notification.transaction_status;
    payment.midtransResponse = { ...payment.midtransResponse, ...notification };
    await payment.save();
    
    // If payment is successful, update order
    if (notification.transaction_status === 'settlement') {
      const order = await Order.findById(payment.orderId)
        .populate('client', 'email name')
        .populate('designer', 'email name');
      
      if (order) {
        order.isPaid = true;
        await order.save();
        
        // Send payment notification to designer
        if (process.env.EMAIL_USERNAME && process.env.EMAIL_PASSWORD) {
          try {
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
                  <li>Status: ${notification.transaction_status}</li>
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
                  <li>Status: ${notification.transaction_status}</li>
                </ul>
                <p>The designer will now start working on your project.</p>
              `
            };
            
            // Send emails asynchronously
            await transporter.sendMail(designerMailOptions);
            await transporter.sendMail(clientMailOptions);
          } catch (emailError) {
            console.error('Email sending failed:', emailError);
            // Continue execution even if email fails
          }
        }
      }
    }
    
    res.status(200).json({ status: 'OK' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
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
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

export default router;
// Add this to your routes/payments.js file

import midtransClient from 'midtrans-client';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();
// import nodemailer from 'nodemailer';

// Configure Midtrans client
const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// Generate Midtrans token
router.post('/generate-token', async (req, res) => {
  try {
    const { orderId, amount, itemDetails, customerDetails } = req.body;
    
    // Create transaction parameter
    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount
      },
      item_details: itemDetails,
      customer_details: customerDetails
    };
    
    // Create transaction token
    const transaction = await snap.createTransaction(parameter);
    
    res.status(200).json({
      token: transaction.token,
      redirectUrl: transaction.redirect_url
    });
  } catch (err) {
    console.error('Midtrans token generation error:', err.message);
    res.status(500).json({ error: 'Failed to generate payment token' });
  }
});

export default router;
import * as PaymentService from '../../services/payment.js';
import { getMidtransClientKey } from '../../config/midtrans.js';

export const generateToken = async (req, res) => {
  try {
    const { orderId, amount, itemDetails, customerDetails } = req.body;
    
    // Validate required fields
    if (!orderId || !amount) {
      return res.status(400).json({ msg: 'Order ID and amount are required' });
    }

    const transaction = await PaymentService.generateMidtransToken(
      orderId, amount, itemDetails, customerDetails
    );
    
    res.json({
      token: transaction.token,
      redirect_url: transaction.redirect_url,
      client_key: getMidtransClientKey()
    });
  } catch (err) {
    console.error('Midtrans token generation error:', err.message);
    res.status(500).json({ msg: 'Failed to generate payment token', error: err.message });
  }
};

export const createPayment = async (req, res) => {
  try {
    const newPayment = await PaymentService.createPayment(req.body);
    
    res.status(201).json({
      msg: 'Payment record created successfully',
      payment: newPayment
    });
    console.log('Payment record created:', newPayment);
  } catch (err) {
    console.error('Payment creation error:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
};

export const handleNotification = async (req, res) => {
  try {
    await PaymentService.processNotification(req.body);
    // Always return 200 to Midtrans
    res.status(200).json({ status: 'OK' });
  } catch (err) {
    console.error('Midtrans notification processing error:', err.message);
    // Always return 200 to Midtrans even if our processing failed
    res.status(200).json({ status: 'ERROR', message: err.message });
  }
};

export const getPaymentByOrderId = async (req, res) => {
  try {
    const payment = await PaymentService.getPaymentByOrderId(req.params.orderId);
    res.json(payment);
  } catch (err) {
    console.error('Get payment error:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
};

export const getAllPayments = async (req, res) => {
  try {
    const { client } = req.query;
    let query = {};
    
    if (client) {
      query.client = client;
    }
    
    const payments = await PaymentService.getAllPayments(query);
    res.json(payments);
  } catch (err) {
    console.error('Get payments error:', err.message);
    res.status(500).json({ msg: 'Server Error', error: err.message });
  }
};
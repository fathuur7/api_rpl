import express from 'express';
import * as PaymentController from '../../controllers/payment/controllerPayment.js';

const router = express.Router();

// Generate Midtrans token endpoint
router.post('/generate-token', PaymentController.generateToken);

// Create a new payment manually (if needed)
router.post('/create', PaymentController.createPayment);

// Handle Midtrans webhook for payment notifications
router.post('/notification/midtrans', PaymentController.handleNotification);

// Get payment by orderId
router.get('/order/:orderId', PaymentController.getPaymentByOrderId);

// Get all payments (with optional client filter)
router.get('/', PaymentController.getAllPayments);

export default router;
import express from 'express';
import { auth } from '../../middleware/authMiddleware.js';
import { 
  getOrderById, 
  getUserOrders, 
  getPaidOrders, 
  updateOrderStatus 
} from '../../controllers/order/orderController.js'

const router = express.Router();

// Define routes
router.get('/:id', auth, getOrderById);
router.get('/', auth, getUserOrders);
router.get('/paid', auth, getPaidOrders);
router.put('/:id/status', auth, updateOrderStatus);

export default router;
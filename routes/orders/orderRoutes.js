import express from 'express';
import { auth } from '../../middleware/authMiddleware.js'
import Order from '../../models/orderModel.js';

const router = express.Router();
// @route   GET api/orders/:id
// @desc    Get order by ID
// @access  Private (for both clients and designers)
router.get('/:id', auth, async (req, res) => {
  try {
    // Find order by ID and populate related fields
    const order = await Order.findById(req.params.id)
      .populate('service', 'title description budget deadline category')
      .populate('client', 'name email')
      .populate('designer', 'name email portfolio');
    
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    // Check if user is authorized to view this order
    // Only the client or designer assigned to this order can view it
    if (
      order.client._id.toString() !== req.user.id && 
      order.designer._id.toString() !== req.user.id
    ) {
      return res.status(401).json({ msg: 'Not authorized to view this order' });
    }
    
    res.json(order);
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    res.status(500).send('Server Error');
  }
});

// @route   GET api/orders
// @desc    Get all orders for the logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find all orders where the user is either the client or designer
    const orders = await Order.find({
      $or: [
        { client: userId },
        { designer: userId }
      ]
    })
      .populate('service', 'title')
      .populate('client', 'name')
      .populate('designer', 'name')
      .sort({ createdAt: -1 }); // Most recent first
    
    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/orders/:id/status
// @desc    Update order status
// @access  Private (for both clients and designers)
router.put('/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  
  // Validate status
  const validStatuses = ['in_progress', 'revision', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ msg: 'Invalid status value' });
  }
  
  try {
    let order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    // Check if user is authorized to update this order
    if (
      order.client.toString() !== req.user.id && 
      order.designer.toString() !== req.user.id
    ) {
      return res.status(401).json({ msg: 'Not authorized to update this order' });
    }
    
    // Additional logic for status transitions
    if (status === 'revision' && order.status === 'in_progress') {
      // Increment revision count when moving to revision status
      order.revisionCount = order.revisionCount + 1;
    }
    
    // Update order status
    order.status = status;
    await order.save();
    
    res.json(order);
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/orders/:id/payment
// @desc    Update payment status
// @access  Private (client only)
router.put('/:id/payment', auth, async (req, res) => {
  try {
    let order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    // Only client can mark as paid
    if (order.client.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }
    
    // Update payment status
    order.isPaid = true;
    await order.save();
    
    res.json(order);
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Order not found' });
    }
    
    res.status(500).send('Server Error');
  }
});

export default router;
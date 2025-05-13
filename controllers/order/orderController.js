import Order from '../../models/orderModel.js';

// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('service', 'title description budget deadline category')
      .populate('client', 'name email')
      .populate('designer', 'name email portfolio');

    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }

    if (order.client._id.toString() !== req.user.id && order.designer._id.toString() !== req.user.id) {
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
};

// Get all orders for the logged-in user
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.find({
      $or: [{ client: userId }, { designer: userId }]
    })
      .populate('service', 'title deadline')
      .populate('client', 'name')
      .populate('designer', 'name')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Get paid orders
export const getPaidOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.find({
      $or: [{ client: userId }, { designer: userId }],
      isPaid: true
    })
      .populate('service', 'title')
      .populate('client', 'name')
      .populate('designer', 'name')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Update order status
export const updateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['in_progress', 'revision', 'completed', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ msg: 'Invalid status value' });
  }

  try {
    let order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }

    if (order.client.toString() !== req.user.id && order.designer.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized to update this order' });
    }

    if (status === 'revision' && order.status === 'in_progress') {
      order.revisionCount = order.revisionCount + 1;
    }

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
};

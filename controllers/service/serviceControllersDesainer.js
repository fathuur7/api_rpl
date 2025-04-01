// routes/designer-services.js
import express from 'express';
import Service from '../../models/serviceModel.js';

const router = express.Router();

// Helper middleware to check if user is authenticated and is a designer
const isDesigner = (req, res, next) => {
  // Check if authenticated (Passport adds user to req)
  if (!req.isAuthenticated()) {
    return res.status(401).json({ msg: 'You must be logged in' });
  }
  
  // Check if user has designer role
  if (req.user.role !== 'designer') {
    return res.status(403).json({ msg: 'Access denied. Not authorized as designer' });
  }
  
  next();
};

/**
 * @route    GET /api/designer/services
 * @desc     Get all service requests (for designers)
 * @access   Private (designers only)
 */
router.get('/services', isDesigner, async (req, res) => {
  try {
    const services = await Service.find({ status: { $in: ['open', 'assigned'] } })
      .populate('client', 'name email')
      .populate('category', 'name');
    
    res.json(services);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route    GET /api/designer/services/:id
 * @desc     Get service request by ID (for designers)
 * @access   Private (designers only)
 */
router.get('/services/:id', isDesigner, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('client', 'name email')
      .populate('category', 'name');
    
    if (!service) {
      return res.status(404).json({ msg: 'Service request not found' });
    }
    
    res.json(service);
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Service request not found' });
    }
    
    res.status(500).send('Server Error');
  }
});

/**
 * @route    GET /api/designer/services/category/:categoryId
 * @desc     Get service requests by category (for designers)
 * @access   Private (designers only)
 */
router.get('/services/category/:categoryId', isDesigner, async (req, res) => {
  try {
    const services = await Service.find({ 
      category: req.params.categoryId,
      status: { $in: ['open', 'assigned'] }
    })
      .populate('client', 'name email')
      .populate('category', 'name');
    
    res.json(services);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route    PUT /api/designer/services/:id/apply
 * @desc     Designer applies for a service request
 * @access   Private (designers only)
 */
router.put('/services/:id/apply', isDesigner, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ msg: 'Service request not found' });
    }
    
    if (service.status !== 'open') {
      return res.status(400).json({ msg: 'This service request is no longer open for applications' });
    }
    
    // Here you would typically update an applications collection
    // You can access the current user via req.user._id

    req.user.appliedServices.push(service._id);
    await req.user.save();
    
    res.json({ msg: 'Application submitted successfully' });
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Service request not found' });
    }
    
    res.status(500).send('Server Error');
  }
});

export default router;
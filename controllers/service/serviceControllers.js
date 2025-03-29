import express from 'express';
import Service from '../../models/serviceModel.js';
import User from '../../models/userModel.js';


const router = express.Router();

/**
 * @route   GET /api/services
 * @desc    Get all services
 * @access  Public
 */
export const getAllServices = async (req, res) => {
  try {
    const services = await Service.find()
      .populate('client', 'name email')
      .populate('category', 'name');
    
    res.json(services);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
}

/**
 * @route   GET /api/services/:id
 * @desc    Get service by ID
 * @access  Public
 */
export const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('client', 'name email')
      .populate('category', 'name');
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    res.json(service);
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
}

/**
 * @route   POST /api/services
 * @desc    Create a new service
 * @access  Private
 */
export const createService = async (req, res) => {
  try {
    const {
      client,
      category,
      name,
      description,
      price,
      revisionLimit,
      deliveryTime,
      images
    } = req.body;

    // Create new service
    const newService = new Service({
      client,
      category,
      name,
      description,
      price,
      revisionLimit,
      deliveryTime,
      images
    });

    const service = await newService.save();
    res.status(201).json(service);
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages });
    }
    res.status(500).json({ message: 'Server Error' });
  }
}

/**
 * @route   PUT /api/services/:id
 * @desc    Update a service
 * @access  Private
 */
export const updateService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    // Update fields
    const {
      category,
      name,
      description,
      price,
      revisionLimit,
      deliveryTime,
      images,
      status
    } = req.body;

    if (category) service.category = category;
    if (name) service.name = name;
    if (description) service.description = description;
    if (price) service.price = price;
    if (revisionLimit !== undefined) service.revisionLimit = revisionLimit;
    if (deliveryTime) service.deliveryTime = deliveryTime;
    if (images) service.images = images;
    if (status) service.status = status;

    const updatedService = await service.save();
    res.json(updatedService);
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Service not found' });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages });
    }
    res.status(500).json({ message: 'Server Error' });
  }
}

/**
 * @route   DELETE /api/services/:id
 * @desc    Delete a service
 * @access  Private
 */
export const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    await service.remove();
    res.json({ message: 'Service removed' });
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
}

/**
 * @route   GET /api/services/client/:clientId
 * @desc    Get all services for a specific client
 * @access  Private
 */
export const getServicesByClient = async (req, res) => {
  try {
    const services = await Service.find({ client: req.params.clientId })
      .populate('category', 'name');
    
    res.json(services);
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Services not found' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * @route   GET /api/services/category/:categoryId
 * @desc    Get all services for a specific category
 * @access  Public
 */
export const getServicesByCategory = async (req, res) => {
  try {
    const services = await Service.find({ 
      category: req.params.categoryId,
      status: 'approved'
    })
      .populate('client', 'name')
      .populate('category', 'name');
    
    res.json(services);
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Services not found' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};  

/**
 * @route   PATCH /api/services/:id/status
 * @desc    Update service status (admin only)
 * @access  Private/Admin
 */
export const updateServiceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['pending', 'approved', 'declined'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    service.status = status;
    const updatedService = await service.save();
    
    res.json(updatedService);
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};
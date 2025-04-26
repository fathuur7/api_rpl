// controllers/deliverableController.js
import Deliverable from '../../models/delivareModel.js';
import Order from '../../models/orderModel.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create upload directory path (uploads/deliverables)
const uploadsDir = path.join(__dirname, '..', 'uploads', 'deliverables');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Helper function for file uploads to local storage
const uploadToLocal = async (file) => {
  try {
    // Generate a unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.originalname}`;
    const filePath = path.join(uploadsDir, fileName);
    
    // Write the file to the uploads directory
    fs.writeFileSync(filePath, file.buffer);
    
    // Generate the URL (relative path for mongoose)
    const relativePath = `/uploads/deliverables/${fileName}`;
    
    return { fileUrl: relativePath, path: relativePath };
  } catch (error) {
    throw new Error(`Error uploading file: ${error.message}`);
  }
};

// Create a new deliverable
export const createDeliverable = async (req, res) => {
  try {
    const { orderId, title, description } = req.body;
    
    // Validate order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // // Check if the designer is assigned to this order
    // if (order.designer.toString() !== req.user._id.toString()) {
    //   return res.status(403).json({ message: 'You are not authorized to submit deliverables for this order' });
    // }
    
    // Check if there's a file in the request
    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }
    
    // Upload file to local storage
    const { fileUrl, path: filePath } = await uploadToLocal(req.file);
    
    // Create deliverable
    const deliverable = new Deliverable({
      orderId,
    //   desainer: req.user._id, // From the authenticated user
      title,
      description,
      fileUrl,
      path: filePath,
      submittedAt: new Date()
    });
    
    await deliverable.save();
    
    // Update the order status if needed
    if (order.status === 'in_progress') {
      order.status = 'awaiting_payment';
      await order.save();
    }
    
    res.status(201).json({ 
      success: true, 
      data: deliverable 
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all deliverables for an order
export const getOrderDeliverables = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Validate if the order exists
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check if user is either the client or designer for this order
    if (
      order.client.toString() !== req.user._id.toString() && 
      order.designer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'You are not authorized to view deliverables for this order' });
    }
    
    const deliverables = await Deliverable.find({ orderId })
      .sort({ submittedAt: -1 });
    
    res.status(200).json({
      success: true,
      count: deliverables.length,
      data: deliverables
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get a single deliverable
export const getDeliverable = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deliverable = await Deliverable.findById(id);
    
    if (!deliverable) {
      return res.status(404).json({ message: 'Deliverable not found' });
    }
    
    // Get the related order to check permissions
    const order = await Order.findById(deliverable.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Associated order not found' });
    }
    
    // Check if user is either the client or designer for this order
    if (
      order.client.toString() !== req.user._id.toString() && 
      order.designer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'You are not authorized to view this deliverable' });
    }
    
    res.status(200).json({
      success: true,
      data: deliverable
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update deliverable (e.g., with a new file)
export const updateDeliverable = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    
    const deliverable = await Deliverable.findById(id);
    if (!deliverable) {
      return res.status(404).json({ message: 'Deliverable not found' });
    }
    
    // Check if user is the designer who created this deliverable
    if (deliverable.desainer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to update this deliverable' });
    }
    
    // Only allow updates if the deliverable is in PENDING or REJECTED status
    if (deliverable.status === 'APPROVED') {
      return res.status(400).json({ message: 'Cannot update an approved deliverable' });
    }
    
    const updateData = {
      title: title || deliverable.title,
      description: description || deliverable.description,
      submittedAt: new Date() // Update submission time
    };
    
    // If a new file is uploaded, handle it
    if (req.file) {
      // Delete the old file from local storage
      const oldFilePath = path.join(__dirname, '..', deliverable.path);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
      
      // Upload the new file
      const { fileUrl, path: filePath } = await uploadToLocal(req.file);
      updateData.fileUrl = fileUrl;
      updateData.path = filePath;
    }
    
    // Update the deliverable
    const updatedDeliverable = await Deliverable.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: updatedDeliverable
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Review deliverable (approve or reject) - for clients
export const reviewDeliverable = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;
    
    // Validate status
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Status must be either APPROVED or REJECTED' });
    }
    
    const deliverable = await Deliverable.findById(id);
    if (!deliverable) {
      return res.status(404).json({ message: 'Deliverable not found' });
    }
    
    // Get the order to check if user is the client
    const order = await Order.findById(deliverable.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Associated order not found' });
    }
    
    // Only the client can review deliverables
    if (order.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the client can review deliverables' });
    }
    
    // Update deliverable status
    deliverable.status = status;
    deliverable.feedback = feedback;
    deliverable.reviewedAt = new Date();
    
    await deliverable.save();
    
    // If approved, update order status to completed
    if (status === 'APPROVED') {
      order.status = 'completed';
      await order.save();
    } 
    // If rejected, increment revision count and update order status
    else if (status === 'REJECTED') {
      order.revisionCount += 1;
      order.status = 'revision';
      
      // Check if max revisions reached
      if (order.revisionCount >= order.maxRevisions) {
        // Additional logic if needed for max revisions
        // Perhaps notify admin or handle differently
      }
      
      await order.save();
    }
    
    res.status(200).json({
      success: true,
      data: deliverable
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete a deliverable (if it's still pending)
export const deleteDeliverable = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deliverable = await Deliverable.findById(id);
    if (!deliverable) {
      return res.status(404).json({ message: 'Deliverable not found' });
    }
    
    // Only allow the designer who created it to delete it
    if (deliverable.desainer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to delete this deliverable' });
    }
    
    // Only allow deletion if status is PENDING
    if (deliverable.status !== 'PENDING') {
      return res.status(400).json({ message: 'Cannot delete a deliverable that has been reviewed' });
    }
    
    // Delete the file from local storage
    const filePath = path.join(__dirname, '..', deliverable.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete the deliverable from the database
    await Deliverable.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Deliverable deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get file URL for download
export const getFileUrl = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deliverable = await Deliverable.findById(id);
    if (!deliverable) {
      return res.status(404).json({ message: 'Deliverable not found' });
    }
    
    // Get the order to check permissions
    const order = await Order.findById(deliverable.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Associated order not found' });
    }
    
    // Check if user is either the client or designer for this order
    if (
      order.client.toString() !== req.user._id.toString() && 
      order.designer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'You are not authorized to access this file' });
    }
    
    // Return the file URL
    res.status(200).json({
      success: true,
      fileUrl: deliverable.fileUrl
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Download file directly
export const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deliverable = await Deliverable.findById(id);
    if (!deliverable) {
      return res.status(404).json({ message: 'Deliverable not found' });
    }
    
    // Get the order to check permissions
    const order = await Order.findById(deliverable.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Associated order not found' });
    }
    
    // Check if user is either the client or designer for this order
    if (
      order.client.toString() !== req.user._id.toString() && 
      order.designer.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'You are not authorized to access this file' });
    }
    
    // Get the file path from server root
    const filePath = path.join(__dirname, '..', deliverable.path);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }
    
    // Send the file for download
    res.download(filePath);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all deliverables for a designer
export const getDesignerDeliverables = async (req, res) => {
  try {
    const deliverables = await Deliverable.find({ desainer: req.user._id })
      .sort({ submittedAt: -1 })
      .populate('orderId', 'service status');
    
    res.status(200).json({
      success: true,
      count: deliverables.length,
      data: deliverables
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all deliverables for a client
export const getClientDeliverables = async (req, res) => {
  try {
    // First, find all orders for this client
    const orders = await Order.find({ client: req.user._id });
    const orderIds = orders.map(order => order._id);
    
    // Then find all deliverables for these orders
    const deliverables = await Deliverable.find({ orderId: { $in: orderIds } })
      .sort({ submittedAt: -1 })
      .populate('orderId', 'service status')
      .populate('desainer', 'name');
    
    res.status(200).json({
      success: true,
      count: deliverables.length,
      data: deliverables
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
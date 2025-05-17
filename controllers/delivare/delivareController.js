// controllers/deliverableController.js
import Deliverable from '../../models/delivareModel.js';
import Order from '../../models/orderModel.js';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { NotifyDeliverableStatusEmail } from '../../config/email.js';
import logger from '../../utils/logger.js';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  secure: true,
});

// Helper function for file uploads to Cloudinary
const uploadToCloudinary = async (file) => {
  try {
    const { originalname, buffer } = file;
    
    // Convert buffer to base64 string for Cloudinary upload
    const b64 = Buffer.from(buffer).toString('base64');
    const dataURI = `data:${file.mimetype};base64,${b64}`;
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'deliverables',
      resource_type: 'auto',
      public_id: `deliverable-${Date.now()}-${originalname.split('.')[0]}`,
    });
    
    return { 
      fileUrl: result.secure_url, 
      publicId: result.public_id 
    };
  } catch (error) {
    throw new Error(`Failed to upload file to Cloudinary: ${error.message}`);
  }
};

// Helper function to delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    throw new Error(`Failed to delete file from Cloudinary: ${error.message}`);
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
    
    // Check if the designer is assigned to this order
    if (order.designer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to submit deliverables for this order' });
    }
    
    // Check if there's a file in the request
    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }
    
    // Upload file to Cloudinary
    const { fileUrl, publicId } = await uploadToCloudinary(req.file);
    
    // Create deliverable
    const deliverable = new Deliverable({
      orderId,
      desainer: req.user._id,
      title,
      description,
      fileUrl,
      publicId, 
      submittedAt: new Date()
    });
    
    await deliverable.save();
    
    // Update the order status if needed
    if (order.status === 'in_progress') {
      order.status = 'revision'; 
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
      submittedAt: new Date(), // Update submission time,
      status: 'PENDING' // Reset status to PENDING
    };
    
    // If a new file is uploaded, handle it
    if (req.file) {
      // Delete the old file from Cloudinary
      if (deliverable.publicId) {
        await deleteFromCloudinary(deliverable.publicId);
      }
      
      // Upload the new file to Cloudinary
      const { fileUrl, publicId } = await uploadToCloudinary(req.file);
      updateData.fileUrl = fileUrl;
      updateData.publicId = publicId;
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
        order.status = 'completed'; 
        await order.save();
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
    
    // Delete the file from Cloudinary
    if (deliverable.publicId) {
      await deleteFromCloudinary(deliverable.publicId);
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
    
    // Make sure the file URL exists
    if (!deliverable.fileUrl) {
      return res.status(404).json({ message: 'File URL not found for this deliverable' });
    }
    
    // Return the file URL with proper cache control headers
    res.set('Cache-Control', 'private, max-age=300'); // 5 minutes cache
    res.status(200).json({
      success: true,
      fileUrl: deliverable.fileUrl,
      fileName: deliverable.fileName || 'download'
    });
  } catch (error) {
    console.error('Error getting file URL:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve file URL: ' + error.message
    });
  }
};

// Download file endpoint - modified to handle Cloudinary properly
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
    
    // Check if file URL exists
    if (!deliverable.fileUrl) {
      return res.status(404).json({ message: 'File URL not found for this deliverable' });
    }
    
    // Track the download
    deliverable.downloadCount = (deliverable.downloadCount || 0) + 1;
    deliverable.lastDownloadedAt = new Date();
    await deliverable.save();
    
    // Instead of redirecting to Cloudinary directly, proxy the file through our server
    // to avoid CORS issues
    try {
      // Get the file from Cloudinary
      const fetch = await import('node-fetch');
      const response = await fetch.default(deliverable.fileUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from Cloudinary: ${response.status} ${response.statusText}`);
      }
      
      // Get the content type and other headers
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      // Extract filename from the URL or use the one in the database
      const fileName = deliverable.fileName || 
                      decodeURIComponent(deliverable.fileUrl.split('/').pop().split('?')[0]) || 
                      `deliverable-${id}`;
      
      // Set headers for the download
      res.setHeader('Content-Type', contentType);
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      // Pipe the response from Cloudinary to our response
      const fileStream = response.body;
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('Error proxying file from Cloudinary:', error);
      
      // Fall back to returning the URL if proxying fails
      res.status(200).json({
        success: true,
        fileUrl: deliverable.fileUrl,
        fileName: deliverable.fileName || `deliverable-${id}`
      });
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file: ' + error.message
    });
  }
};

// Method for just tracking downloads
export const trackFileDownload = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the deliverable
    const deliverable = await Deliverable.findById(id);
    if (!deliverable) {
      return res.status(404).json({ message: 'Deliverable not found' });
    }
    
    // Update download count
    deliverable.downloadCount = (deliverable.downloadCount || 0) + 1;
    deliverable.lastDownloadedAt = new Date();
    await deliverable.save();
    
    res.status(200).json({
      success: true,
      message: 'Download tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking download:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track download: ' + error.message
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
      .populate('orderId', 'service status revisionCount')
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
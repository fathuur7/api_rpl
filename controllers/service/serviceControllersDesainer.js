import nodemailer from 'nodemailer';
import {sendCancellationEmail} from '../../config/email.js';
import Order from '../../models/orderModel.js';
import User from '../../models/userModel.js';
import dotenv from 'dotenv';
import Service from '../../models/serviceModel.js';


dotenv.config();

// Apply for a service request as a designer 
// router.put('Cancel/:id/', isDesigner, )
export const CancelService = async (req, res) => {
  try {
    const serviceId = req.params.id;
    
    // Find the service by ID
    const service = await Service.findById(serviceId);
    
    if (!service) {
      return res.status(404).json({ msg: 'Service not found' });
    }
    
    // Check if user is authorized to cancel (should be the assigned designer)
    if (service.designer && service.designer.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to cancel this service' });
    }
    
    // Check if service is already cancelled
    if (service.status === 'cancelled') {
      return res.status(400).json({ msg: 'Service is already cancelled' });
    }
    
    const previousStatus = service.status;
    
    // Update service status to cancelled
    service.status = 'cancelled';
    await service.save();
    
    // If service was assigned, send email notification to the client
    if (previousStatus === 'assigned') {
      // Find client information
      const client = await User.findById(service.client);
      
      if (client && client.email) {
        // Send email notification to client
        await sendCancellationEmail({
          clientEmail: client.email,
          clientName: client.name,
          serviceTitle: service.title,
          serviceId: service._id,
          designerName: req.user.name || "Designer" // Include designer's name
        });
      }
    }
    
    res.json({ 
      msg: 'Service successfully cancelled',
      wasAssigned: previousStatus === 'assigned'
    });
    
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};




/**
 * @route    GET /api/designer/services
 * @desc     Get all service requests (for designers)
 * @access   Private (designers only)
 */
export const getAllDesignerServiceRequests = async (req, res) => {
  try {
    const services = await Service.find({ status: { $in: ['open', 'assigned'] } })
      .populate('client', 'name email')
      .populate('category', 'name');
    
    res.json(services);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

/**
 * @route    GET /api/designer/services/:id
 * @desc     Get service request by ID (for designers)
 * @access   Private (designers only)
 */
export const getDesignerServiceRequestById = async (req, res) => {
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
};

/**
 * @route    GET /api/designer/services/category/:categoryId
 * @desc     Get service requests by category (for designers)
 * @access   Private (designers only)
 */
export const getDesignerServiceRequestsByCategory = async (req, res) => {
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
};

/**
 * @route    PUT /api/designer/services/:id/apply
 * @desc     Designer applies for a service request
 * @access   Private (designers only)
 */


export const applyForServiceRequest = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('client', 'email name');
    
    if (!service) {
      return res.status(404).json({ msg: 'Service request not found' });
    }
    
    if (service.status !== 'open') {
      return res.status(400).json({ msg: 'This service request is no longer open for applications' });
    }
    
    // Check if applications array exists before using .some()
    if (service.applications && service.applications.some(app => app.designer.toString() === req.user.id)) {
      return res.status(400).json({ msg: 'You have already applied for this service' });
    }
    
    // If applications array doesn't exist, initialize it
    if (!service.applications) {
      service.applications = [];
    }
    
   // Get designer information
   const designer = await User.findById(req.user.id).select('name email portfolio');
    
   // Update service to assigned status
   service.applications.push({ designer: req.user.id });
   service.status = 'assigned';
   service.assignedTo = req.user.id;
   await service.save();

   // Create order
   const newOrder = new Order({
     service: service._id,
     client: service.client._id,
     designer: req.user.id,
     price: service.budget || 0, // Use service budget or default to 0
     status: 'awaiting_payment', // Changed from 'in_progress' to 'awaiting_payment'
     isPaid: false
   });
   
   await newOrder.save();

    // Send email notification to designer (if email configuration is available)
    if (process.env.EMAIL_USERNAME && process.env.EMAIL_USERNAME) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
          }
        });
        
        const designerMailOptions = {
          from: process.env.EMAIL_USERNAME,
          to: designer.email,
          subject: 'Your application has been accepted',
          html: `
            <h1>Application Accepted</h1>
            <p>Dear ${designer.name},</p>
            <p>Your application for service "${service.title}" has been automatically accepted.</p>
            <p>Order details:</p>
            <ul>
              <li>Order ID: ${newOrder._id}</li>
              <li>Service: ${service.title}</li>
              <li>Price: $${newOrder.price}</li>
              <li>Status: ${newOrder.status}</li>
            </ul>
            <p>Please wait for the client to complete the payment before starting work.</p>
          `
        };
        
        const paymentLink = `${process.env.FRONTEND_URL}/notif`;
        
        const clientMailOptions = {
          from: process.env.EMAIL_USERNAME,
          to: service.client.email,
          subject: 'A designer has been assigned to your service',
          html: `
            <h1>Designer Assigned</h1>
            <p>Dear ${service.client.name},</p>
            <p>A designer has been assigned to your service "${service.title}".</p>
            <p>Designer: ${designer.name}</p>
            <p>Order details:</p>
            <ul>
              <li>Order ID: ${newOrder._id}</li>
              <li>Price: $${newOrder.price}</li>
              <li>Status: ${newOrder.status}</li>
            </ul>
            <p><strong>Next step:</strong> Please complete the payment to start this project.</p>
            <p><a href="${paymentLink}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Make Payment</a></p>
            <p>If the button doesn't work, copy and paste this link: ${paymentLink}</p>
          `
        };

        // Send emails asynchronously
        await transporter.sendMail(designerMailOptions);
        await transporter.sendMail(clientMailOptions);
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Continue execution even if email fails
      }
    }
    
    res.json({ 
      msg: 'Application submitted successfully. Order created.',
      order: newOrder 
    });
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Service request not found' });
    }
    
    res.status(500).send('Server Error');
  }
};

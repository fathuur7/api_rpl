//  * Helper function to send cancellation email to client
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export const sendCancellationEmail = async ({ clientEmail, clientName, serviceTitle, serviceId, designerName }) => {
  try {
    // Create a test account if you don't have actual email credentials
    // For production, use your actual email service credentials
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    // Send mail with defined transport object
    const info = await transporter.sendMail({
      from: '"Service Platform" <notifications@yourplatform.com>',
      to: clientEmail,
      subject: `Service Cancellation: ${serviceTitle}`,
      html: `
        <h2>Service Cancellation Notice</h2>
        <p>Hello ${clientName},</p>
        <p>We regret to inform you that the service <strong>${serviceTitle}</strong> (ID: ${serviceId}) has been cancelled by the designer ${designerName}.</p>
        <p>Please contact the administrator if you have any questions.</p>
        <p>Thank you for your understanding.</p>
        <p>Best regards,<br>The Service Platform Team</p>
        <p>Please chat with us at <a href="https://t.me/YourBoy8w">Telegram</a> for any questions.</p>
      `
    });
    
    console.log('Email sent: %s', info.messageId);
    return info;
    
  } catch (error) {
    console.error('Error sending email:', error);
    // Note: We're not throwing the error here so the API doesn't fail if email fails
  }
};

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});


export const sendPaymentNotificationEmails = async (order, payment, notification = null) => {
  if (!process.env.EMAIL_USERNAME || !process.env.EMAIL_PASSWORD) {
    console.log('Email credentials not set, skipping email notifications');
    return;
  }
  
  try {
    const status = notification?.transaction_status || payment.transactionStatus;
    
    const designerMailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: order.designer.email,
      subject: 'Payment Received for Your Service',
      html: createDesignerEmailContent(order, payment, status)
    };
    
    const clientMailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: order.client.email,
      subject: 'Payment Confirmation',
      html: createClientEmailContent(order, payment, status)
    };
    
    // Send emails asynchronously
    await transporter.sendMail(designerMailOptions);
    await transporter.sendMail(clientMailOptions);
    console.log('Payment notification emails sent successfully');
  } catch (emailError) {
    console.error('Email sending failed:', emailError);
    // Continue execution even if email fails
  }
};

const createDesignerEmailContent = (order, payment, status) => {
  return `
    <h1>Payment Received</h1>
    <p>Dear ${order.designer.name},</p>
    <p>The client has made a payment for your service.</p>
    <p>Payment details:</p>
    <ul>
      <li>Order ID: ${order._id}</li>
      <li>Amount: $${payment.amount}</li>
      <li>Payment Method: ${payment.paymentMethod}</li>
      <li>Status: ${status}</li>
    </ul>
    <p>You can now start working on this project.</p>
  `;
};

const createClientEmailContent = (order, payment, status) => {
  return `
    <h1>Payment Confirmed</h1>
    <p>Dear ${order.client.name},</p>
    <p>Your payment for service has been received.</p>
    <p>Payment details:</p>
    <ul>
      <li>Order ID: ${order._id}</li>
      <li>Amount: $${payment.amount}</li>
      <li>Payment Method: ${payment.paymentMethod}</li>
      <li>Status: ${status}</li>
    </ul>
    <p>The designer will now start working on your project.</p>
  `;
};



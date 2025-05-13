//  * Helper function to send cancellation email to client
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Sends email notifications when a deliverable status changes
 * @param {Object} params - The parameters for the email
 * @param {string} params.status - The status of the deliverable (APPROVED or REJECTED)
 * @param {string} params.orderId - The order ID
 * @param {string} params.deliverableId - The deliverable ID
 * @param {string} params.designerEmail - The designer's email address
 * @param {string} params.clientEmail - The client's email address
 * @param {string} params.clientName - The client's name
 * @param {string} params.feedback - The feedback provided (for rejections)
 * @returns {Promise<boolean>} - Whether the emails were sent successfully
 */
export const NotifyDeliverableStatusEmail = async ({
  status,
  orderId,
  deliverableId,
  designerEmail,
  clientEmail,
  clientName,
  feedback
}) => {
  // Validate required parameters
  if (!status || !deliverableId || !designerEmail) {
    console.error('Missing required parameters for email notification');
    return false;
  }

  // Common email styles
  const emailStyles = `
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #2563eb;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 10px;
    }
    .header {
      background-color: #2563eb;
      color: white;
      padding: 15px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      padding: 20px;
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 0 0 5px 5px;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: #6b7280;
    }
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: white;
      padding: 10px 20px;
      text-decoration: none;
      border-radius: 5px;
      margin-top: 15px;
    }
    blockquote {
      border-left: 3px solid #2563eb;
      padding-left: 15px;
      margin-left: 0;
      color: #4b5563;
      background-color: #f3f4f6;
      padding: 10px 15px;
      border-radius: 0 5px 5px 0;
    }
    .highlight {
      font-weight: bold;
      color: #2563eb;
    }
    .status-approved {
      color: #059669;
      font-weight: bold;
    }
    .status-rejected {
      color: #dc2626;
      font-weight: bold;
    }
  `;

  try {
    // Create a transporter object using SMTP transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // Verify transporter configuration
    await transporter.verify().catch(error => {
      console.error('Email transport verification failed:', error);
      throw new Error('Email configuration error');
    });

    const emailsToSend = [];
    const fromAddress = 'kopisusu8ip@gmail.com'; // Replace with your email address
    const supportEmail = 'kopisusu8ip@gmail.com';
    const dashboardUrl = 'localhost:3000/home'; // Replace with your actual dashboard URL

    // Format date for email
    const formattedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (status === 'REJECTED') {
      // Create rejection email template
      emailsToSend.push({
        to: designerEmail,
        subject: `Action Required: Revision Request for Deliverable #${deliverableId}`,
        html: `
          <html>
          <head>
            <style>${emailStyles}</style>
          </head>
          <body>
            <div class="header">
              <h1>Revision Requested</h1>
            </div>
            <div class="content">
              <p>Dear Designer,</p>
              <p>Your deliverable <span class="highlight">#${deliverableId}</span> associated with order <span class="highlight">#${orderId}</span> has been <span class="status-rejected">rejected</span> by client <span class="highlight">${clientName}</span> on ${formattedDate}.</p>
              
              <h3>Client Feedback:</h3>
              <blockquote>${feedback || 'No specific feedback provided.'}</blockquote>
              
              <p>Please review the feedback carefully and make the necessary revisions to your work. After you've made the changes, please resubmit your deliverable through the platform.</p>
              
              <p><a href="${dashboardUrl}" class="button">Go to Dashboard</a></p>
              
              <p>If you have any questions about the feedback or need clarification, please don't hesitate to contact our support team.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Service Platform. Please do not reply to this email.</p>
              <p>If you need assistance, contact us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
              <p>&copy; ${new Date().getFullYear()} Service Platform. All rights reserved.</p>
            </div>
          </body>
          </html>
        `
      });
    } else if (status === 'APPROVED') {
      // Create approval email for designer
      emailsToSend.push({
        to: designerEmail,
        subject: `Great News! Deliverable #${deliverableId} Approved`,
        html: `
          <html>
          <head>
            <style>${emailStyles}</style>
          </head>
          <body>
            <div class="header">
              <h1>Deliverable Approved</h1>
            </div>
            <div class="content">
              <p>Dear Designer,</p>
              <p>Congratulations! Your deliverable <span class="highlight">#${deliverableId}</span> associated with order <span class="highlight">#${orderId}</span> has been <span class="status-approved">approved</span> by client <span class="highlight">${clientName}</span> on ${formattedDate}.</p>
              
              <p>The client was satisfied with your work, and no further revisions are required for this deliverable.</p>
              
              ${feedback ? `<h3>Client Feedback:</h3><blockquote>${feedback}</blockquote>` : ''}
              
              <p><a href="${dashboardUrl}" class="button">View in Dashboard</a></p>
              
              <p>Thank you for your excellent work and for being a valued part of our creative community!</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Service Platform. Please do not reply to this email.</p>
              <p>If you need assistance, contact us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
              <p>&copy; ${new Date().getFullYear()} Service Platform. All rights reserved.</p>
            </div>
          </body>
          </html>
        `
      });

      // Create approval confirmation email for client
      if (clientEmail) {
        emailsToSend.push({
          to: clientEmail,
          subject: `Confirmation: You've Approved Deliverable #${deliverableId}`,
          html: `
            <html>
            <head>
              <style>${emailStyles}</style>
            </head>
            <body>
              <div class="header">
                <h1>Approval Confirmation</h1>
              </div>
              <div class="content">
                <p>Dear ${clientName},</p>
                <p>This is to confirm that you have <span class="status-approved">approved</span> deliverable <span class="highlight">#${deliverableId}</span> associated with your order <span class="highlight">#${orderId}</span> on ${formattedDate}.</p>
                
                ${feedback ? `<h3>Your Feedback:</h3><blockquote>${feedback}</blockquote>` : ''}
                
                <p>The designer has been notified of your approval. You can access and download the final deliverables from your dashboard.</p>
                
                <p><a href="${dashboardUrl}" class="button">View in Dashboard</a></p>
                
                <p>Thank you for using our platform. We hope you're satisfied with the result!</p>
              </div>
              <div class="footer">
                <p>This is an automated message from Service Platform. Please do not reply to this email.</p>
                <p>If you need assistance, contact us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>
                <p>&copy; ${new Date().getFullYear()} Service Platform. All rights reserved.</p>
              </div>
            </body>
            </html>
          `
        });
      }
    }

    // Send all emails
    const results = await Promise.all(
      emailsToSend.map(email => 
        transporter.sendMail({
          from: fromAddress,
          ...email
        })
      )
    );

    console.log(`Successfully sent ${results.length} emails for deliverable ${deliverableId}`);
    return true;
  } catch (error) {
    console.error('Error sending deliverable status email:', error);
    // You might want to implement additional error reporting here (like to a monitoring service)
    return false;
  }
};

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

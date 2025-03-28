import nodemailer from 'nodemailer';

export const sendVerificationEmail = async (email, link) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'kopisusu8ip@gmail.com', // Ganti dengan email Anda
            pass: 'mbku ffkk euka ziox' // Gunakan app password jika pakai Gmail
        }
    });
    
    const mailOptions = {
        from: 'kopisusu8ip@gmail.com',
        to: email,
        subject: 'Verify Your Email',
        html: `<p>Click <a href="${link}">here</a> to verify your email.</p>`
    };
    
    await transporter.sendMail(mailOptions);
};



// Helper function to send password reset email
export const sendPasswordResetEmail = async (email, resetLink) => {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    await transporter.sendMail({
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
      `
    });
  };
  
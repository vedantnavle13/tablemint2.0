const nodemailer = require('nodemailer');
const logger = require('./logger');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send email
 * @param {Object} options - { to, subject, html, text }
 */
const sendEmail = async (options) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Email send failed: ${error.message}`);
    throw error;
  }
};

// Email templates
const emailTemplates = {
  reservationConfirmation: (reservation, restaurant, user) => ({
    subject: `Reservation Confirmed – ${restaurant.name}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff8f0;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #C8793A;">
          <h1 style="color: #C8793A; font-size: 28px; margin: 0;">TableMint</h1>
          <p style="color: #666; font-style: italic;">Your table is reserved</p>
        </div>
        <div style="padding: 30px 0;">
          <h2 style="color: #1a1a1a;">Hi ${user.name},</h2>
          <p style="color: #444; line-height: 1.6;">Your reservation at <strong>${restaurant.name}</strong> has been confirmed!</p>
          <div style="background: #fff; border: 1px solid #e0d5c8; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #C8793A; margin-top: 0;">Reservation Details</h3>
            <p><strong>Restaurant:</strong> ${restaurant.name}</p>
            <p><strong>Date:</strong> ${new Date(reservation.scheduledAt).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p><strong>Time:</strong> ${new Date(reservation.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Guests:</strong> ${reservation.numberOfGuests}</p>
            <p><strong>Booking ID:</strong> #${reservation._id.toString().slice(-8).toUpperCase()}</p>
          </div>
          <p style="color: #444;">Please arrive on time. Contact the restaurant if you need to make changes.</p>
        </div>
        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e0d5c8; color: #999; font-size: 13px;">
          <p>© TableMint – Discover Pune's Finest Tables</p>
        </div>
      </div>
    `,
  }),

  reservationCancellation: (reservation, restaurant, user) => ({
    subject: `Reservation Cancelled – ${restaurant.name}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #C8793A;">TableMint</h1>
        <h2>Hi ${user.name},</h2>
        <p>Your reservation at <strong>${restaurant.name}</strong> on ${new Date(reservation.scheduledAt).toLocaleDateString()} has been cancelled.</p>
        <p>Booking ID: #${reservation._id.toString().slice(-8).toUpperCase()}</p>
        <p>If you have any questions, please contact us.</p>
      </div>
    `,
  }),

  passwordReset: (resetURL, user) => ({
    subject: 'TableMint – Password Reset Request',
    html: `
      <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #C8793A;">TableMint</h1>
        <h2>Hi ${user.name},</h2>
        <p>You requested a password reset. Click the button below to reset your password. This link expires in 10 minutes.</p>
        <a href="${resetURL}" style="display: inline-block; background: #C8793A; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">Reset Password</a>
        <p style="color: #999; font-size: 13px;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  }),
};

module.exports = { sendEmail, emailTemplates };

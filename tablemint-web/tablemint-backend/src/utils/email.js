const nodemailer = require('nodemailer');
const logger = require('./logger');

// ─── Singleton transporter — reuse the SMTP connection across requests ────────
// Creating a new transporter per request causes a full SMTP handshake every
// time, which is extremely slow on Render (Gmail STARTTLS on port 587 can take
// 10-20s). A singleton keeps the connection alive and reuses it.
let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;

  const port   = parseInt(process.env.EMAIL_PORT) || 587;
  // port 465 → direct SSL (secure: true); port 587 → STARTTLS (secure: false)
  const secure = port === 465;

  _transporter = nodemailer.createTransport({
    host:       process.env.EMAIL_HOST || 'smtp.gmail.com',
    port,
    secure,
    requireTLS: !secure,   // force STARTTLS on 587; not needed on 465 (already SSL)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,  // 16-char Gmail App Password, no spaces
    },
    tls: {
      rejectUnauthorized: true,  // fail loudly on bad TLS certs
      minVersion:         'TLSv1.2',
    },
    connectionTimeout: 10000,   // 10s — TCP connect timeout
    greetingTimeout:   5000,    // 5s  — SMTP EHLO greeting timeout
    socketTimeout:     30000,   // 30s — max time for a send operation
    pool:           true,       // reuse SMTP connections
    maxConnections: 3,
  });

  return _transporter;
};

/**
 * Send email — resolves quickly on subsequent calls thanks to connection pool.
 * @param {Object} options - { to, subject, html, text }
 */
const sendEmail = async (options) => {
  const transporter = getTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || `TableMint <${process.env.EMAIL_USER}>`,
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
    // Reset transporter on connection errors so next call gets a fresh one
    // Reset singleton on ANY connection/auth error so the next call gets a
    // fresh transporter rather than reusing a permanently broken one.
    // EAUTH = wrong/expired App Password or Gmail session revoked
    const RESET_CODES = ['ECONNECTION', 'ETIMEDOUT', 'EAUTH', 'ESOCKET', 'ECONNRESET'];
    if (RESET_CODES.includes(error.code)) {
      logger.warn(`Email transporter reset due to: ${error.code}`);
      _transporter = null;
    }
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

  otpVerification: (user, otp) => ({
    subject: 'TableMint – Verify Your Email',
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff8f0; border-radius: 16px; overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2C2416, #6B5B45); padding: 36px 40px; text-align: center;">
          <div style="font-size: 32px; margin-bottom: 8px;">🍽️</div>
          <h1 style="color: #fff; font-size: 26px; margin: 0; font-weight: 700; letter-spacing: -0.5px;">
            Table<span style="color: #D4883A;">Mint</span>
          </h1>
          <p style="color: rgba(255,255,255,0.6); font-size: 13px; margin: 6px 0 0;">Email Verification</p>
        </div>

        <!-- Body -->
        <div style="padding: 40px;">
          <h2 style="color: #2C2416; font-size: 22px; margin: 0 0 12px;">Hi ${user.name}, welcome! 👋</h2>
          <p style="color: #6B5B45; font-size: 15px; line-height: 1.7; margin-bottom: 32px;">
            You're almost there! Use the verification code below to activate your TableMint account.
            This code expires in <strong>10 minutes</strong>.
          </p>

          <!-- OTP Box -->
          <div style="background: #2C2416; border-radius: 14px; padding: 28px; text-align: center; margin-bottom: 32px;">
            <p style="color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 14px;">Your Verification Code</p>
            <div style="letter-spacing: 12px; font-size: 42px; font-weight: 800; color: #D4883A; font-family: 'Courier New', monospace;">${otp}</div>
          </div>

          <p style="color: #A0907A; font-size: 13px; line-height: 1.7; margin-bottom: 8px;">
            ⚠️ Never share this code with anyone. TableMint will never ask for your OTP.
          </p>
          <p style="color: #A0907A; font-size: 13px; line-height: 1.7;">
            If you did not create an account, you can safely ignore this email.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f5ede3; padding: 20px 40px; text-align: center; border-top: 1px solid #E8E0D0;">
          <p style="color: #A0907A; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} TableMint — Discover Pune's Finest Tables</p>
        </div>
      </div>
    `,
  }),

  adminWelcome: (admin, restaurant, password) => ({
    subject: `Welcome to TableMint – Your Admin Credentials for ${restaurant.name}`,
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#2C2416,#6B5B45);padding:36px 40px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">🍽️</div>
          <h1 style="color:#fff;font-size:26px;margin:0;font-weight:700;">Table<span style="color:#D4883A;">Mint</span></h1>
          <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:6px 0 0;">Restaurant Admin Portal</p>
        </div>
        <div style="padding:40px;">
          <h2 style="color:#2C2416;font-size:22px;margin:0 0 12px;">Hi ${admin.name}, welcome aboard! 👋</h2>
          <p style="color:#6B5B45;font-size:15px;line-height:1.7;margin-bottom:24px;">
            You've been added as an <strong>admin</strong> for <strong>${restaurant.name}</strong> on TableMint.
            Use the credentials below to sign in.
          </p>
          <div style="background:#2C2416;border-radius:14px;padding:24px 28px;margin-bottom:28px;">
            <p style="color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 14px;">Your Login Credentials</p>
            <p style="color:#fff;font-size:14px;margin:0 0 8px;"><span style="color:#A0907A;">Email:</span> <strong>${admin.email}</strong></p>
            <p style="color:#fff;font-size:14px;margin:0;"><span style="color:#A0907A;">Password:</span> <strong style="color:#D4883A;font-size:18px;letter-spacing:2px;">${password}</strong></p>
          </div>
          <p style="color:#6B5B45;font-size:14px;line-height:1.7;margin-bottom:8px;">
            Sign in at: <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/login" style="color:#D4883A;font-weight:700;">${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/login</a>
          </p>
          <p style="color:#A0907A;font-size:13px;line-height:1.7;">
            ⚠️ Please change your password after first login using the "Forgot Password" option.
          </p>
        </div>
        <div style="background:#f5ede3;padding:20px 40px;text-align:center;border-top:1px solid #E8E0D0;">
          <p style="color:#A0907A;font-size:12px;margin:0;">© ${new Date().getFullYear()} TableMint — Discover Pune's Finest Tables</p>
        </div>
      </div>
    `,
  }),

  // ─── Reservation status update (called by reservationController) ───────────
  reservationStatusUpdate: (reservation, restaurant, customer, status) => ({
    subject: `Reservation ${status} – ${restaurant.name}`,
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#2C2416,#6B5B45);padding:36px 40px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">🍽️</div>
          <h1 style="color:#fff;font-size:26px;margin:0;font-weight:700;">Table<span style="color:#D4883A;">Mint</span></h1>
          <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:6px 0 0;">Reservation Update</p>
        </div>
        <div style="padding:40px;">
          <h2 style="color:#2C2416;font-size:22px;margin:0 0 12px;">Hi ${customer.name},</h2>
          <p style="color:#6B5B45;font-size:15px;line-height:1.7;margin-bottom:24px;">
            Your reservation at <strong>${restaurant.name}</strong> has been updated to <strong>${status}</strong>.
          </p>
          <div style="background:#2C2416;border-radius:14px;padding:24px 28px;margin-bottom:28px;">
            <p style="color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 14px;">Reservation Details</p>
            <p style="color:#fff;font-size:14px;margin:0 0 8px;"><span style="color:#A0907A;">Date:</span> <strong>${new Date(reservation.scheduledAt).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
            <p style="color:#fff;font-size:14px;margin:0 0 8px;"><span style="color:#A0907A;">Time:</span> <strong>${new Date(reservation.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong></p>
            <p style="color:#fff;font-size:14px;margin:0;"><span style="color:#A0907A;">Booking ID:</span> <strong>#${reservation._id.toString().slice(-8).toUpperCase()}</strong></p>
          </div>
          <p style="color:#A0907A;font-size:13px;line-height:1.7;">If you have any questions, please contact the restaurant directly.</p>
        </div>
        <div style="background:#f5ede3;padding:20px 40px;text-align:center;border-top:1px solid #E8E0D0;">
          <p style="color:#A0907A;font-size:12px;margin:0;">© ${new Date().getFullYear()} TableMint — Discover Pune's Finest Tables</p>
        </div>
      </div>
    `,
  }),

  // ─── Custom notification to customer (called by reservationController) ──────
  customerNotification: (reservation, restaurant, customer, message) => ({
    subject: `Message from ${restaurant.name} – TableMint`,
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#2C2416,#6B5B45);padding:36px 40px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">💬</div>
          <h1 style="color:#fff;font-size:26px;margin:0;font-weight:700;">Table<span style="color:#D4883A;">Mint</span></h1>
          <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:6px 0 0;">Message from Restaurant</p>
        </div>
        <div style="padding:40px;">
          <h2 style="color:#2C2416;font-size:22px;margin:0 0 12px;">Hi ${customer.name},</h2>
          <p style="color:#6B5B45;font-size:15px;line-height:1.7;margin-bottom:24px;">
            You have received a message from <strong>${restaurant.name}</strong> regarding your reservation.
          </p>
          <div style="background:#2C2416;border-radius:14px;padding:24px 28px;margin-bottom:28px;">
            <p style="color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 14px;">Message</p>
            <p style="color:#fff;font-size:15px;line-height:1.7;margin:0;">${message}</p>
          </div>
          <p style="color:#A0907A;font-size:12px;margin:0;">Booking ID: #${reservation._id.toString().slice(-8).toUpperCase()}</p>
        </div>
        <div style="background:#f5ede3;padding:20px 40px;text-align:center;border-top:1px solid #E8E0D0;">
          <p style="color:#A0907A;font-size:12px;margin:0;">© ${new Date().getFullYear()} TableMint — Discover Pune's Finest Tables</p>
        </div>
      </div>
    `,
  }),

  // ─── Restaurant owner: email OTP for verification ────────────────────────
  restaurantVerificationOtp: (restaurant, otp, ownerName) => ({
    subject: `TableMint – Verify Your Restaurant: ${restaurant.name}`,
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#2C2416,#6B5B45);padding:36px 40px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">🏪</div>
          <h1 style="color:#fff;font-size:26px;margin:0;font-weight:700;">Table<span style="color:#D4883A;">Mint</span></h1>
          <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:6px 0 0;">Restaurant Verification</p>
        </div>
        <div style="padding:40px;">
          <h2 style="color:#2C2416;font-size:22px;margin:0 0 12px;">Hi ${ownerName},</h2>
          <p style="color:#6B5B45;font-size:15px;line-height:1.7;margin-bottom:24px;">
            Use the OTP below to verify your restaurant <strong>${restaurant.name}</strong> on TableMint.
            This code expires in <strong>10 minutes</strong>.
          </p>
          <div style="background:#2C2416;border-radius:14px;padding:28px;text-align:center;margin-bottom:32px;">
            <p style="color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 14px;">Verification OTP</p>
            <div style="letter-spacing:12px;font-size:42px;font-weight:800;color:#D4883A;font-family:'Courier New',monospace;">${otp}</div>
          </div>
          <p style="color:#A0907A;font-size:13px;line-height:1.7;">⚠️ Never share this code with anyone.</p>
        </div>
        <div style="background:#f5ede3;padding:20px 40px;text-align:center;border-top:1px solid #E8E0D0;">
          <p style="color:#A0907A;font-size:12px;margin:0;">© ${new Date().getFullYear()} TableMint — Discover Pune's Finest Tables</p>
        </div>
      </div>
    `,
  }),

  // ─── Restaurant owner: regenerated OTP ───────────────────────────────────
  restaurantOtpRegenerated: (restaurant, otp, ownerName) => ({
    subject: `TableMint – New Verification OTP for ${restaurant.name}`,
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#2C2416,#6B5B45);padding:36px 40px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">🔄</div>
          <h1 style="color:#fff;font-size:26px;margin:0;font-weight:700;">Table<span style="color:#D4883A;">Mint</span></h1>
          <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:6px 0 0;">New Verification Code</p>
        </div>
        <div style="padding:40px;">
          <h2 style="color:#2C2416;font-size:22px;margin:0 0 12px;">Hi ${ownerName},</h2>
          <p style="color:#6B5B45;font-size:15px;line-height:1.7;margin-bottom:24px;">
            A new verification OTP has been generated for <strong>${restaurant.name}</strong>.
            This code expires in <strong>10 minutes</strong>. Previous codes are now invalid.
          </p>
          <div style="background:#2C2416;border-radius:14px;padding:28px;text-align:center;margin-bottom:32px;">
            <p style="color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 14px;">New OTP</p>
            <div style="letter-spacing:12px;font-size:42px;font-weight:800;color:#D4883A;font-family:'Courier New',monospace;">${otp}</div>
          </div>
          <p style="color:#A0907A;font-size:13px;line-height:1.7;">⚠️ Never share this code with anyone.</p>
        </div>
        <div style="background:#f5ede3;padding:20px 40px;text-align:center;border-top:1px solid #E8E0D0;">
          <p style="color:#A0907A;font-size:12px;margin:0;">© ${new Date().getFullYear()} TableMint — Discover Pune's Finest Tables</p>
        </div>
      </div>
    `,
  }),

  forgotPassword: (resetURL, user) => ({
    subject: 'TableMint – Reset Your Password',
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#2C2416,#6B5B45);padding:36px 40px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">🔑</div>
          <h1 style="color:#fff;font-size:26px;margin:0;font-weight:700;">Table<span style="color:#D4883A;">Mint</span></h1>
          <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:6px 0 0;">Password Reset Request</p>
        </div>
        <div style="padding:40px;">
          <h2 style="color:#2C2416;font-size:22px;margin:0 0 12px;">Hi ${user.name},</h2>
          <p style="color:#6B5B45;font-size:15px;line-height:1.7;margin-bottom:28px;">
            We received a request to reset your password. Click the button below — this link expires in <strong>15 minutes</strong>.
          </p>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${resetURL}" style="display:inline-block;background:#D4883A;color:#fff;padding:16px 36px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:700;box-shadow:0 4px 16px rgba(212,136,58,0.4);">Reset My Password →</a>
          </div>
          <p style="color:#A0907A;font-size:13px;line-height:1.7;">
            If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </div>
        <div style="background:#f5ede3;padding:20px 40px;text-align:center;border-top:1px solid #E8E0D0;">
          <p style="color:#A0907A;font-size:12px;margin:0;">© ${new Date().getFullYear()} TableMint — Discover Pune's Finest Tables</p>
        </div>
      </div>
    `,
  }),
};

module.exports = { sendEmail, emailTemplates };


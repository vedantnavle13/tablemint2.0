'use strict';
const SibApiV3Sdk = require('sib-api-v3-sdk');
const logger = require('./logger');

// ─── Brevo Transactional Email (sib-api-v3-sdk) ───────────────────────────────
// Uses HTTPS (port 443) — never blocked by Render free tier
// No custom domain required — just verify sender email in Brevo dashboard
// Free tier: 300 emails/day, any recipient worldwide
// ─────────────────────────────────────────────────────────────────────────────
let _apiInstance = null;

const getBrevoClient = () => {
  if (_apiInstance) return _apiInstance;

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    logger.error('BREVO_API_KEY is not set — emails will not be sent.');
    return null;
  }

  // Exact pattern from Brevo official Node.js docs
  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  const keyAuth = defaultClient.authentications['api-key'];
  keyAuth.apiKey = apiKey;

  _apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  return _apiInstance;
};

/**
 * Send a transactional email via Brevo HTTP API.
 * Same call signature as before: { to, subject, html, text }
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const api = getBrevoClient();
  if (!api) {
    logger.warn(`Email skipped (no BREVO_API_KEY): ${subject} → ${to}`);
    return;
  }

  const senderEmail = process.env.EMAIL_USER || 'tablemint2@gmail.com';
  const senderName  = process.env.EMAIL_NAME || 'TableMint';

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.sender      = { email: senderEmail, name: senderName };
  sendSmtpEmail.to          = [{ email: Array.isArray(to) ? to[0] : to }];
  sendSmtpEmail.subject     = subject;
  sendSmtpEmail.htmlContent = html || '<p>(no content)</p>';
  if (text) sendSmtpEmail.textContent = text;

  try {
    const data = await api.sendTransacEmail(sendSmtpEmail);
    // sib-api-v3-sdk resolves to { response, body } — messageId is in body
    const msgId = data?.body?.messageId || data?.messageId || JSON.stringify(data)?.slice(0, 80);
    logger.info(`✅ Email sent via Brevo: messageId=${msgId} → ${to}`);
    return data;
  } catch (error) {
    const msg = error?.response?.body?.message || error.message || 'Unknown Brevo error';
    logger.error(`❌ Brevo email failed: ${msg} → ${to}`);
    throw new Error(`Email delivery failed: ${msg}`);
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// Email Templates
// ─────────────────────────────────────────────────────────────────────────────
const emailTemplates = {

  reservationConfirmation: (reservation, restaurant, user) => ({
    subject: `Reservation Confirmed – ${restaurant.name}`,
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#2C2416,#6B5B45);padding:36px 40px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">🍽️</div>
          <h1 style="color:#fff;font-size:26px;margin:0;font-weight:700;">Table<span style="color:#D4883A;">Mint</span></h1>
          <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:6px 0 0;">Your table is reserved</p>
        </div>
        <div style="padding:40px;">
          <h2 style="color:#2C2416;font-size:22px;margin:0 0 12px;">Hi ${user.name}, 🎉</h2>
          <p style="color:#6B5B45;font-size:15px;line-height:1.7;margin-bottom:24px;">Your reservation at <strong>${restaurant.name}</strong> has been confirmed!</p>
          <div style="background:#2C2416;border-radius:14px;padding:24px 28px;margin-bottom:28px;">
            <p style="color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 14px;">Reservation Details</p>
            <p style="color:#fff;font-size:14px;margin:0 0 8px;"><span style="color:#A0907A;">Restaurant:</span> <strong>${restaurant.name}</strong></p>
            <p style="color:#fff;font-size:14px;margin:0 0 8px;"><span style="color:#A0907A;">Date:</span> <strong>${new Date(reservation.scheduledAt).toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</strong></p>
            <p style="color:#fff;font-size:14px;margin:0 0 8px;"><span style="color:#A0907A;">Time:</span> <strong>${new Date(reservation.scheduledAt).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</strong></p>
            <p style="color:#fff;font-size:14px;margin:0 0 8px;"><span style="color:#A0907A;">Guests:</span> <strong>${reservation.numberOfGuests}</strong></p>
            <p style="color:#fff;font-size:14px;margin:0;"><span style="color:#A0907A;">Booking ID:</span> <strong>#${reservation._id.toString().slice(-8).toUpperCase()}</strong></p>
          </div>
          <p style="color:#A0907A;font-size:13px;">Please arrive on time. Contact the restaurant if you need to make changes.</p>
        </div>
        <div style="background:#f5ede3;padding:20px 40px;text-align:center;border-top:1px solid #E8E0D0;">
          <p style="color:#A0907A;font-size:12px;margin:0;">© ${new Date().getFullYear()} TableMint — Discover Pune's Finest Tables</p>
        </div>
      </div>`,
  }),

  reservationCancellation: (reservation, restaurant, user) => ({
    subject: `Reservation Cancelled – ${restaurant.name}`,
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#2C2416,#6B5B45);padding:36px 40px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">❌</div>
          <h1 style="color:#fff;font-size:26px;margin:0;font-weight:700;">Table<span style="color:#D4883A;">Mint</span></h1>
          <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:6px 0 0;">Reservation Cancelled</p>
        </div>
        <div style="padding:40px;">
          <h2 style="color:#2C2416;margin:0 0 12px;">Hi ${user.name},</h2>
          <p style="color:#6B5B45;font-size:15px;line-height:1.7;">Your reservation at <strong>${restaurant.name}</strong> on ${new Date(reservation.scheduledAt).toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })} has been <strong>cancelled</strong>.</p>
          <p style="color:#A0907A;font-size:13px;margin-top:16px;">Booking ID: #${reservation._id.toString().slice(-8).toUpperCase()}</p>
        </div>
        <div style="background:#f5ede3;padding:20px 40px;text-align:center;border-top:1px solid #E8E0D0;">
          <p style="color:#A0907A;font-size:12px;margin:0;">© ${new Date().getFullYear()} TableMint — Discover Pune's Finest Tables</p>
        </div>
      </div>`,
  }),

  otpVerification: (user, otp) => ({
    subject: 'TableMint – Verify Your Email',
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#2C2416,#6B5B45);padding:36px 40px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">🍽️</div>
          <h1 style="color:#fff;font-size:26px;margin:0;font-weight:700;">Table<span style="color:#D4883A;">Mint</span></h1>
          <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:6px 0 0;">Email Verification</p>
        </div>
        <div style="padding:40px;">
          <h2 style="color:#2C2416;font-size:22px;margin:0 0 12px;">Hi ${user.name}, welcome! 👋</h2>
          <p style="color:#6B5B45;font-size:15px;line-height:1.7;margin-bottom:32px;">
            You're almost there! Use the code below to verify your TableMint account.
            This code expires in <strong>10 minutes</strong>.
          </p>
          <div style="background:#2C2416;border-radius:14px;padding:28px;text-align:center;margin-bottom:32px;">
            <p style="color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 14px;">Your Verification Code</p>
            <div style="letter-spacing:12px;font-size:42px;font-weight:800;color:#D4883A;font-family:'Courier New',monospace;">${otp}</div>
          </div>
          <p style="color:#A0907A;font-size:13px;line-height:1.7;">⚠️ Never share this code with anyone. TableMint will never ask for your OTP.</p>
        </div>
        <div style="background:#f5ede3;padding:20px 40px;text-align:center;border-top:1px solid #E8E0D0;">
          <p style="color:#A0907A;font-size:12px;margin:0;">© ${new Date().getFullYear()} TableMint — Discover Pune's Finest Tables</p>
        </div>
      </div>`,
  }),

  passwordReset: (resetURL, user) => ({
    subject: 'TableMint – Reset Your Password',
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#2C2416,#6B5B45);padding:36px 40px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">🔑</div>
          <h1 style="color:#fff;font-size:26px;margin:0;font-weight:700;">Table<span style="color:#D4883A;">Mint</span></h1>
          <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:6px 0 0;">Password Reset</p>
        </div>
        <div style="padding:40px;">
          <h2 style="color:#2C2416;font-size:22px;margin:0 0 12px;">Hi ${user.name},</h2>
          <p style="color:#6B5B45;font-size:15px;line-height:1.7;margin-bottom:28px;">
            We received a request to reset your password. Click the button below — this link expires in <strong>15 minutes</strong>.
          </p>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${resetURL}" style="display:inline-block;background:#D4883A;color:#fff;padding:16px 36px;border-radius:12px;text-decoration:none;font-size:16px;font-weight:700;">Reset My Password →</a>
          </div>
          <p style="color:#A0907A;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
        <div style="background:#f5ede3;padding:20px 40px;text-align:center;border-top:1px solid #E8E0D0;">
          <p style="color:#A0907A;font-size:12px;margin:0;">© ${new Date().getFullYear()} TableMint — Discover Pune's Finest Tables</p>
        </div>
      </div>`,
  }),

  forgotPassword: function (...args) { return this.passwordReset(...args); },

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
          <p style="color:#6B5B45;font-size:15px;line-height:1.7;margin-bottom:24px;">You've been added as an <strong>admin</strong> for <strong>${restaurant.name}</strong> on TableMint.</p>
          <div style="background:#2C2416;border-radius:14px;padding:24px 28px;margin-bottom:28px;">
            <p style="color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 14px;">Your Login Credentials</p>
            <p style="color:#fff;font-size:14px;margin:0 0 8px;"><span style="color:#A0907A;">Email:</span> <strong>${admin.email}</strong></p>
            <p style="color:#fff;font-size:14px;margin:0;"><span style="color:#A0907A;">Password:</span> <strong style="color:#D4883A;font-size:18px;letter-spacing:2px;">${password}</strong></p>
          </div>
          <p style="color:#6B5B45;font-size:14px;">Sign in at: <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/login" style="color:#D4883A;font-weight:700;">${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/login</a></p>
          <p style="color:#A0907A;font-size:13px;margin-top:12px;">⚠️ Please change your password after first login.</p>
        </div>
        <div style="background:#f5ede3;padding:20px 40px;text-align:center;border-top:1px solid #E8E0D0;">
          <p style="color:#A0907A;font-size:12px;margin:0;">© ${new Date().getFullYear()} TableMint — Discover Pune's Finest Tables</p>
        </div>
      </div>`,
  }),

  reservationStatusUpdate: (reservation, restaurant, customer, prevStatus, newStatus) => ({
    subject: `Reservation Update – ${restaurant.name}`,
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff8f0;border-radius:16px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#2C2416,#6B5B45);padding:36px 40px;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">📋</div>
          <h1 style="color:#fff;font-size:26px;margin:0;font-weight:700;">Table<span style="color:#D4883A;">Mint</span></h1>
          <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:6px 0 0;">Reservation Update</p>
        </div>
        <div style="padding:40px;">
          <h2 style="color:#2C2416;font-size:22px;margin:0 0 12px;">Hi ${customer.name},</h2>
          <p style="color:#6B5B45;font-size:15px;line-height:1.7;margin-bottom:24px;">
            Your reservation at <strong>${restaurant.name}</strong> status changed:
            <strong>${prevStatus}</strong> → <strong style="color:#D4883A;">${newStatus}</strong>.
          </p>
          <div style="background:#2C2416;border-radius:14px;padding:24px 28px;margin-bottom:28px;">
            <p style="color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 14px;">Details</p>
            <p style="color:#fff;font-size:14px;margin:0 0 8px;"><span style="color:#A0907A;">Date:</span> <strong>${new Date(reservation.scheduledAt).toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</strong></p>
            <p style="color:#fff;font-size:14px;margin:0;"><span style="color:#A0907A;">Booking ID:</span> <strong>#${reservation._id.toString().slice(-8).toUpperCase()}</strong></p>
          </div>
        </div>
        <div style="background:#f5ede3;padding:20px 40px;text-align:center;border-top:1px solid #E8E0D0;">
          <p style="color:#A0907A;font-size:12px;margin:0;">© ${new Date().getFullYear()} TableMint — Discover Pune's Finest Tables</p>
        </div>
      </div>`,
  }),

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
          <p style="color:#6B5B45;font-size:15px;line-height:1.7;margin-bottom:24px;">Message from <strong>${restaurant.name}</strong>:</p>
          <div style="background:#2C2416;border-radius:14px;padding:24px 28px;margin-bottom:28px;">
            <p style="color:#fff;font-size:15px;line-height:1.7;margin:0;">${message}</p>
          </div>
          <p style="color:#A0907A;font-size:12px;">Booking ID: #${reservation._id.toString().slice(-8).toUpperCase()}</p>
        </div>
        <div style="background:#f5ede3;padding:20px 40px;text-align:center;border-top:1px solid #E8E0D0;">
          <p style="color:#A0907A;font-size:12px;margin:0;">© ${new Date().getFullYear()} TableMint — Discover Pune's Finest Tables</p>
        </div>
      </div>`,
  }),

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
          <p style="color:#6B5B45;font-size:15px;line-height:1.7;margin-bottom:24px;">Use the OTP below to verify <strong>${restaurant.name}</strong>. Expires in <strong>7 days</strong>.</p>
          <div style="background:#2C2416;border-radius:14px;padding:28px;text-align:center;margin-bottom:32px;">
            <p style="color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 14px;">Verification OTP</p>
            <div style="letter-spacing:12px;font-size:42px;font-weight:800;color:#D4883A;font-family:'Courier New',monospace;">${otp}</div>
          </div>
          <p style="color:#A0907A;font-size:13px;">⚠️ Never share this code with anyone.</p>
        </div>
        <div style="background:#f5ede3;padding:20px 40px;text-align:center;border-top:1px solid #E8E0D0;">
          <p style="color:#A0907A;font-size:12px;margin:0;">© ${new Date().getFullYear()} TableMint — Discover Pune's Finest Tables</p>
        </div>
      </div>`,
  }),

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
          <p style="color:#6B5B45;font-size:15px;line-height:1.7;margin-bottom:24px;">New OTP for <strong>${restaurant.name}</strong>. Previous code is now invalid. Expires in <strong>7 days</strong>.</p>
          <div style="background:#2C2416;border-radius:14px;padding:28px;text-align:center;margin-bottom:32px;">
            <p style="color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;letter-spacing:2px;margin:0 0 14px;">New OTP</p>
            <div style="letter-spacing:12px;font-size:42px;font-weight:800;color:#D4883A;font-family:'Courier New',monospace;">${otp}</div>
          </div>
          <p style="color:#A0907A;font-size:13px;">⚠️ Never share this code.</p>
        </div>
        <div style="background:#f5ede3;padding:20px 40px;text-align:center;border-top:1px solid #E8E0D0;">
          <p style="color:#A0907A;font-size:12px;margin:0;">© ${new Date().getFullYear()} TableMint — Discover Pune's Finest Tables</p>
        </div>
      </div>`,
  }),
};

module.exports = { sendEmail, emailTemplates };

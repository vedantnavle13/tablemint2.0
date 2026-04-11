const express = require('express');
const http = require('http');              // ← new
const { Server } = require('socket.io');  // ← new
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
require('dotenv').config();

// ─── Pre-register models so MongoDB collections & indexes are created on
//     first connection — especially important for models not referenced by
//     any route (e.g. Interaction, which is populated via Interaction.log()).
require('./src/models/Interaction');

const app = express();
const httpServer = http.createServer(app); // ← wrap Express in http server

// ─── Socket.io setup ─────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  },
});
// Register io singleton so controllers can emit events without prop-drilling
require('./src/socket/io-instance').setIO(io);
// Attach socket logic (JWT auth + room events)
require('./src/socket/socket')(io);

// ─── Express middleware (unchanged from your original) ────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { status: 'error', message: 'Too many requests. Please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { status: 'error', message: 'Too many login attempts. Please try again in 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());

if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.status(200).json({ status: 'ok', message: 'TableMint Backend is running 🍽️' }));
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api', (req, res) => res.status(200).json({ status: 'ok', message: 'TableMint API' }));
app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/restaurants', require('./src/routes/restaurantRoutes'));
app.use('/api/reservations', require('./src/routes/reservationRoutes'));
app.use('/api/reviews', require('./src/routes/reviewRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));
app.use('/api/captain', require('./src/routes/captainRoutes'));
app.use('/api/superadmin', require('./src/routes/superAdminRoutes'));
app.use('/api/groups', require('./src/routes/groupRoutes')); // ← new

const AppError = require('./src/utils/AppError');
app.all('*', (req, res, next) => next(new AppError(`Route ${req.originalUrl} not found.`, 404)));
app.use(require('./src/middleware/errorHandler'));

// ─── Start server (listen on httpServer, not app) ─────────────────────────────
setInterval(() => {
  fetch('https://tablemint-backend.onrender.com/health')
    .catch(() => { });
}, 14 * 60 * 1000);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {   // ← httpServer, not app.listen
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
      console.log(`🍽️  API base: http://localhost:${PORT}/api`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

module.exports = app;

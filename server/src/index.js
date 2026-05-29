const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const helmet = require('helmet');

// ─── Env config validation ──────────────────────────────────
let envConfigInvalid = false;

const expectedEnvPath = path.resolve(__dirname, '..', '.env');
const hasEssentialConfig = process.env.DATABASE_URL || process.env.DB_NAME;

if (!fs.existsSync(expectedEnvPath) && !hasEssentialConfig) {
  envConfigInvalid = true;
  console.error('');
  console.error('  ╔══════════════════════════════════════════════════════════════╗');
  console.error('  ║                   [31m[1m[4m[7m MISSING .ENV FILE [0m[31m[1m                      ║');
  console.error('  ╠══════════════════════════════════════════════════════════════╣');
  console.error('  ║                                                              ║');
  console.error(`  ║  [33mThe .env file is missing from the application.[0m              ║`);
  console.error('  ║                                                              ║');
  console.error('  ║  [37mPlease create one with the necessary configuration variables.[0m ║');
  console.error('  ║                                                              ║');
  console.error(`  ║  [90mExpected location: ${expectedEnvPath}[0m`);
  console.error('  ║                                                              ║');
  console.error('  ║  [90mTip: Copy [36m.env.example[90m to [36m.env[90m and adjust the values.[0m      ║');
  console.error('  ║                                                              ║');
  console.error('  ╚══════════════════════════════════════════════════════════════╝');
  console.error('');
}

require('dotenv').config();

// Post-check: after dotenv.loads, verify essential vars are actually set
if (!envConfigInvalid) {
  const dbConfigOk = process.env.DATABASE_URL || process.env.DB_NAME;
  const jwtOk = process.env.JWT_SECRET;

  if (!dbConfigOk || !jwtOk) {
    envConfigInvalid = true;
    console.error('');
    console.error('  ╔══════════════════════════════════════════════════════════════╗');
    console.error('  ║            [31m[1m[4m[7m INCOMPLETE ENV CONFIGURATION [0m[31m[1m             ║');
    console.error('  ╠══════════════════════════════════════════════════════════════╣');
    console.error('  ║                                                              ║');
    console.error('  ║  [33mEssential environment variables are missing.[0m               ║');
    console.error('  ║                                                              ║');
    console.error(`  ║  [37mRequired: DB_NAME (or DATABASE_URL) and JWT_SECRET[0m            ║`);
    console.error('  ║                                                              ║');
    console.error(`  ║  [90mExpected location: ${expectedEnvPath}[0m`);
    console.error('  ║  [90mTip: Copy [36m.env.example[90m to [36m.env[90m and adjust the values.[0m      ║');
    console.error('  ║                                                              ║');
    console.error('  ╚══════════════════════════════════════════════════════════════╝');
    console.error('');
  }
}
// ──────────────────────────────────────────────────────────

const db = require('./config/database');
const logger = require('./utils/logger');
const { startFollowUpReminders } = require('./cron/reminders');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const licenseGuard = require('./middleware/licenseGuard');
const licenseModule = require('./license/licenseModule');
const { initTransporter } = require('./utils/email');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy — required for correct IP resolution behind reverse proxies (Vite dev proxy, Nginx, Render)
app.set('trust proxy', 1);

// ─── Env config guard — blocks all API calls if config is missing ───
app.use((req, res, next) => {
  if (envConfigInvalid) {
    logger.warn('Rejecting request due to missing env configuration', { path: req.path });
    return res.status(503).json({
      status: 'error',
      code: 'ENV_MISSING',
      message: 'The .env file is missing. Please create it and set the required environment variables.',
    });
  }
  next();
});
// ─────────────────────────────────────────────────────────────────────

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'];

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  },
});

// Make io available to routes
app.set('io', io);

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  // Client joins their personal room for targeted notifications
  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    logger.info(`User ${userId} joined room user_${userId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// Export io for use in other modules
module.exports.io = io;

// CORS middleware - handle all origins and preflight
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request from origin', { origin });
      callback(null, true); // Allow all origins in production for now
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// Handle preflight requests explicitly
app.options('*', cors());

app.use(express.json({
  limit: '10kb',
  verify: (req, res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Serve call recordings
app.use('/api/recordings', express.static(path.join(__dirname, '..', 'uploads', 'recordings')));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    // Log user info if authenticated
    if (req.user) {
      logData.userId = req.user.id;
      logData.userRole = req.user.role;
    }

    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
});

// License guard — must be before all API routes; exempts /internal/license/unlock
app.use(licenseGuard);

// Apply rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({
      status: 'ok',
      timestamp: result.rows[0].now,
      database: 'connected',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (err) {
    logger.error('Health check failed', { error: err.message });
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/calls', require('./routes/telephonyCalls'));  // Unified calls route (all call endpoints)
app.use('/api/branches', require('./routes/branches'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/masters', require('./routes/masters'));

// License unlock endpoint (IP-whitelisted, rate-limited)
app.use('/internal/license/unlock', require('./routes/licenseUnlock'));

// Settings (maintenance mode, etc.)
app.use('/api/settings', require('./routes/settings'));

// License management (status + update expiry)
app.use('/api/license', require('./routes/licenseManage'));
app.use('/internal/license', require('./routes/licenseManage'));

// Serve static frontend files in production
if (isProduction) {
  const frontendPath = path.join(__dirname, '..', '..', 'dist');
  app.use(express.static(frontendPath));

  // SPA fallback - serve index.html for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// 404 handler (only for API routes)
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    logger.warn(`API route not found: ${req.method} ${req.url}`);
    return res.status(404).json({
      status: 'error',
      message: `Route ${req.method} ${req.url} not found`,
      code: 'NOT_FOUND',
    });
  }
  // For non-API routes in production, serve index.html (SPA)
  if (isProduction) {
    const frontendPath = path.join(__dirname, '..', '..', 'dist');
    return res.sendFile(path.join(frontendPath, 'index.html'));
  }
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.url} not found`,
    code: 'NOT_FOUND',
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  // Log the error
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  });

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Send response
  res.status(statusCode).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message,
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed');

    // Close database pool
    db.pool.end().then(() => {
      logger.info('Database pool closed');
      process.exit(0);
    }).catch((err) => {
      logger.error('Error closing database pool', { error: err.message });
      process.exit(1);
    });
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Listen for shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason: reason?.message || reason });
  gracefulShutdown('unhandledRejection');
});

server.listen(PORT, () => {
  logger.info(`MediLead CMS server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://localhost:${PORT}/api/health`);
  logger.info('Socket.IO ready');

  // Init email transporter for password reset etc.
  initTransporter();

  // Start license watcher (jittered ~60 min interval)
  licenseModule.startWatcher();

  // Start background jobs
  startFollowUpReminders(io);
});

module.exports = app;

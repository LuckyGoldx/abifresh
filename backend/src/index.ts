import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';
import WebSocket from 'ws';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import salesRoutes from './routes/sales.routes';
import inventoryRoutes from './routes/inventory.routes';
import adminRoutes from './routes/admin.routes';
import staffRoutes from './routes/staff.routes';
import receiptsRoutes from './routes/receipts.routes';
import notificationsRoutes from './routes/notifications.routes';
import testRoutes from './routes/test.routes';
import backupRoutes from './routes/backup.routes';
import { supabaseAdmin } from './config/supabase';
import { initializeStorageBuckets } from './config/storage-init';

// Security middleware
import { securityHeaders } from './config/security';
import { generalLimiter, authLimiter, paymentLimiter, uploadLimiter, passwordChangeLimiter } from './middleware/rateLimit';
import { csrfProtection } from './middleware/csrf';
import logger, { logRequest } from './config/logger';
import { logStreamService } from './services/log-stream.service';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001').split(',');

// ============ SECURITY MIDDLEWARE ============

// Helmet security headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(securityHeaders);

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  useTempFiles: false,
  abortOnLimit: true,
}));

// CORS Configuration
app.use(
  cors({
    origin: corsOrigins.map((origin) => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// CSRF origin validation (for state-changing requests)
app.use(csrfProtection);

// Global rate limiter
app.use(generalLimiter);

// Structured request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logRequest(req.method, req.path, res.statusCode, Date.now() - start, {
      ip: req.ip,
      auth: !!req.headers.authorization,
    });
  });
  next();
});

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Test Supabase connection
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1);
    
    const supabaseStatus = error ? 'DISCONNECTED' : 'CONNECTED';
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'ABIFRESH & KIDDIES VENTURES API',
      database: {
        supabase: supabaseStatus,
        url: process.env.SUPABASE_URL?.replace(/https?:\/\//, ''),
      },
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      service: 'ABIFRESH & KIDDIES VENTURES API',
      database: {
        supabase: 'ERROR',
      },
    });
  }
});

// API Routes (with per-route rate limiting)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/change-password', passwordChangeLimiter);
app.use('/api/admin/payments', paymentLimiter);
app.use('/api/sales/payments', paymentLimiter);
app.use('/api/receipts', uploadLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/receipts', receiptsRoutes);
app.use('/api/test', testRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api', notificationsRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  logger.warn(`404 Not Found: ${req.method} ${req.path}`, { ip: req.ip });
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path, method: req.method });

  // Handle file upload errors
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }

  if (err.message && err.message.includes('Only')) {
    return res.status(400).json({ error: err.message });
  }

  // Never expose internal details in production
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { message: err.message }),
  });
});

// Start server with error handling
const server = app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`, { env: process.env.NODE_ENV || 'development' });
  logger.info(`Health check: http://localhost:${PORT}/health`);

  // Initialize storage buckets
  await initializeStorageBuckets();
});

// ============ WEBSOCKET SETUP ============
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const path = url.pathname;

  // Only allow log streaming WebSocket connections
  if (path !== '/ws/logs') {
    ws.close(1008, 'Unknown endpoint');
    return;
  }

  // Extract and verify JWT token from URL query params or headers
  const token = url.searchParams.get('token') || req.headers['sec-websocket-protocol'];
  
  if (!token) {
    ws.close(1008, 'Unauthorized: No token provided');
    return;
  }

  try {
    // Verify token
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const jwtModule = require('jsonwebtoken');
    const decoded = jwtModule.verify(token, secret);

    // Only superadmin can use logs WebSocket
    if (decoded.role !== 'superadmin') {
      ws.close(1008, 'Forbidden: Superadmin access required');
      return;
    }

    // Register the WebSocket connection for log streaming
    const types = (url.searchParams.get('types') || 'app,error,security')
      .split(',')
      .map((t: string) => t.trim())
      .filter((t: string) => ['app', 'error', 'security'].includes(t)) as ('app' | 'error' | 'security')[];

    logStreamService.registerWSConnection(ws, types);
    
    logger.info('WebSocket client connected for logs streaming', { user: decoded.email, types });
  } catch (error: any) {
    logger.error('WebSocket authentication failed', { error: error.message });
    ws.close(1008, `Unauthorized: ${error.message}`);
  }
});

// Handle server errors
server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use!`);
    process.exit(1);
  } else {
    logger.error('Server error', { error: err.message });
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server gracefully...');
  
  // Close WebSocket connections
  wss.clients.forEach((client) => {
    client.close(1000, 'Server shutting down');
  });
  
  // Cleanup log streaming
  logStreamService.cleanup();

  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;

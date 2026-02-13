import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';

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
import { supabaseAdmin } from './config/supabase';
import { initializeStorageBuckets } from './config/storage-init';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001').split(',');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  useTempFiles: true,
  tempFileDir: '/tmp/',
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.path} | Auth: ${req.headers.authorization ? 'YES' : 'NO'}`);
  next();
});

// CORS Configuration
app.use(
  cors({
    origin: corsOrigins.map((origin) => origin.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/receipts', receiptsRoutes);
app.use('/api/test', testRoutes);
app.use('/api', notificationsRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  console.error(`❌ 404 Not Found: ${req.method} ${req.path}`);
  console.error(`   Available routes:`);
  console.error(`   /api/auth - Authentication`);
  console.error(`   /api/inventory - Inventory management`);
  console.error(`   /api/sales - Sales operations`);
  console.error(`   /api/admin - Admin dashboard`);
  console.error(`   /api/staff - Staff management`);
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: any, req: Request, res: Response) => {
  console.error('❌ Global Error Handler:', err);
  
  // Handle multer errors
  if (err.name === 'MulterError') {
    console.error('MulterError:', err.message);
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }
  
  // Handle file upload validation errors
  if (err.message && err.message.includes('Only')) {
    console.error('File filter error:', err.message);
    return res.status(400).json({ error: err.message });
  }
  
  // Generic error
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server with error handling
const server = app.listen(PORT, async () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  
  // Initialize storage buckets
  await initializeStorageBuckets();
});

// Handle server errors
server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ ERROR: Port ${PORT} is already in use!`);
    console.error(`Try killing the process: lsof -i :${PORT} | grep LISTEN | awk '{print $2}' | xargs kill -9`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;

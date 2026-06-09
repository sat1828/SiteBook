import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import env from './config/env.js';
import connectDB from './config/db.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { startCronJobs } from './jobs/cron.js';

import authRoutes from './routes/auth.js';
import siteRoutes from './routes/sites.js';
import workerRoutes from './routes/workers.js';
import attendanceRoutes from './routes/attendance.js';
import wageRunRoutes from './routes/wageRun.js';
import materialRoutes from './routes/materials.js';
import complianceRoutes from './routes/compliance.js';
import aiRoutes from './routes/ai.js';
import workerPortalRoutes from './routes/workerPortal.js';
import notificationRoutes from './routes/notifications.js';
import webhookRoutes from './routes/webhook.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.set('io', io);

io.use((socket, next) => {
  const { contractorId, siteId, role } = socket.handshake.query;
  socket.contractorId = contractorId;
  socket.siteId = siteId;
  socket.role = role || 'unknown';
  next();
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id} (role: ${socket.role})`);

  if (socket.siteId) {
    socket.join(`site:${socket.siteId}`);
    console.log(`  Joined room site:${socket.siteId}`);
  }

  if (socket.contractorId) {
    socket.join(`contractor:${socket.contractorId}`);
    console.log(`  Joined room contractor:${socket.contractorId}`);
  }

  socket.on('subscribe:site', (siteId) => {
    if (siteId) socket.join(`site:${siteId}`);
  });

  socket.on('unsubscribe:site', (siteId) => {
    if (siteId) socket.leave(`site:${siteId}`);
  });

  socket.on('attendance:sync-request', (data) => {
    io.to(`site:${data.siteId}`).emit('attendance:sync-response', data);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));

app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Global rate limit: 200 requests per 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again later.' },
});
app.use('/api/', globalLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongoState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/sites', siteRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/wage-runs', wageRunRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/worker', workerPortalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/webhook', webhookRoutes);

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  try {
    await connectDB();
    startCronJobs();

    httpServer.listen(env.PORT, () => {
      console.log(`SiteBook server running on port ${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Client URL: ${env.CLIENT_URL}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  io.close();
  httpServer.close(() => {
    console.log('HTTP server closed.');
    mongoose.connection.close(false).then(() => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  });
  setTimeout(() => {
    console.error('Forced shutdown after 10s timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start();

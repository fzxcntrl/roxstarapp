import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { env } from './config/env';
import { logger } from './utils/logger';
import apiRoutes from './routes/api';
import { errorHandler } from './middleware/errorHandler';
import { socketService } from './services/socketService';
import './services/gameEngine'; // Initialize BullMQ Worker

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({ 
  origin: [env.FRONTEND_URL],
  credentials: true 
}));
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Error Handler
app.use(errorHandler);

// Initialize Socket.io
socketService.init(httpServer);

// For Vercel serverless deployment
if (process.env.VERCEL) {
  module.exports = app;
} else {
  // Start server for local development
  httpServer.listen(env.PORT, () => {
    logger.info(`Server is running on port ${env.PORT}`);
  });
}

export default app;

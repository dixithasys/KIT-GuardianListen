import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { extractUser } from './middleware/auth.js';

import authRoutes from './routes/authRoutes.js';
import collegeRoutes from './routes/collegeRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import placementRoutes from './routes/placementRoutes.js';
import voiceChatRoutes from './routes/voiceChatRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// CORS configuration with credentials for HttpOnly cookies
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow local development and standard origins
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global user session extractor
app.use(extractUser);

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/college', collegeRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/placements', placementRoutes);
app.use('/api/chat', voiceChatRoutes);
app.use('/api/voice', voiceChatRoutes);
app.use('/api', voiceChatRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    product: 'KIT Guardian',
    version: '1.0.0',
    mode: process.env.COLLEGE_PARTICIPANT_KEY ? 'live_college_api' : 'autonomous_high_fidelity_engine',
  });
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.message);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred. Please try again.',
      field: err.field || null,
      details: err.details || null,
    },
  });
});

// Start listening
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[KIT Guardian] Backend server running on http://localhost:${PORT}`);
    console.log(`[KIT Guardian] College API Base: ${process.env.COLLEGE_API_BASE_URL || 'https://ht.knowvally.com'}`);
    console.log(`[KIT Guardian] Mode: ${process.env.COLLEGE_PARTICIPANT_KEY ? 'Live College API' : 'Autonomous Engine'}`);
  });
}

export default app;


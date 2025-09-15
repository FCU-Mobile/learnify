import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import http2 from 'http2';
import fs from 'fs';
import path from 'path';
// import { checkInRouter } from './routes/checkIn';
// import { studentCheckInRouter } from './routes/studentCheckIn';
// import { simpleStudentCheckInRouter } from './routes/simpleStudentCheckIn';
// import { testCheckInRouter } from './routes/testCheckIn';
import { autoCheckInRouter } from './routes/autoCheckIn';
import { reviewsRouter } from './routes/reviews';
import leaderboardRouter from './routes/leaderboard';
import fallLeaderboardRouter from './routes/fall-leaderboard';
import adminRouter from './routes/admin';
import lessonsRouter from './routes/lessons';
import submissionsRouter from './routes/submissions';
import projectNotesRouter from './routes/projectNotes';
import quizRouter from './routes/quiz';
import votingRouter from './routes/voting';
import feedbackRouter from './routes/feedback';
import semestersRouter from './routes/semesters';
import teamsRouter from './routes/teams';
import ratingsRouter from './routes/ratings';
import { config } from './config/supabase';

// Load environment variables
dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'x-student-id', 'x-semester-code', 'x-semester']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  // Detect HTTP version
  const httpVersion = req.httpVersion || 'unknown';
  const isHTTP2 = httpVersion.startsWith('2');
  
  console.log(`🔍 Health check - HTTP version: ${httpVersion}, Is HTTP/2: ${isHTTP2}`);
  
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'learnify-backend',
    version: '1.0.0',
    httpVersion: httpVersion,
    isHTTP2: isHTTP2
  });
});

// API routes
// app.use('/api', checkInRouter);
// app.use('/api', studentCheckInRouter);
// app.use('/api', simpleStudentCheckInRouter);
// app.use('/api', testCheckInRouter);
app.use('/api', autoCheckInRouter);
app.use('/api', reviewsRouter);
app.use('/api', leaderboardRouter);
app.use('/api/fall-leaderboard', fallLeaderboardRouter);
app.use('/api/admin', adminRouter);
app.use('/api/lessons', lessonsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/project-notes', projectNotesRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/voting', votingRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/semesters', semestersRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/ratings', ratingsRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Learnify Backend API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health'
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((error: Error, req: Request, res: Response, next: Function) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'Internal server error'
  });
});

const PORT = config.port;

// Start HTTP/1.1 server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Learnify Backend (HTTP) running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔥 Environment: ${config.nodeEnv}`);
});

export default app;
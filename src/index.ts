import express from 'express';
import { initializeDatabase, getDatabaseStatus } from './config/database';
import app from './app';

const PORT = process.env.PORT || 3003;

const startServer = async () => {
  try {
    // Initialize database connection
    await initializeDatabase();

    app.listen(PORT, () => {
      const dbStatus = getDatabaseStatus();
      console.log(`✅ Payments Orders Service running on port ${PORT}`);
      console.log(`📊 Database: ${dbStatus.type === 'postgres' ? 'PostgreSQL connected' : 'In-memory storage'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();


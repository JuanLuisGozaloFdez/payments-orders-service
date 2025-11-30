import { Pool, QueryResult } from 'pg';
import path from 'path';
import fs from 'fs';

/**
 * PostgreSQL Database Configuration
 * Provides connection pooling and query execution
 */

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:postgres@localhost:5432/nft_marketplace_dev';

const USE_MEMORY = process.env.USE_MEMORY === 'true' || !process.env.DATABASE_URL;

let pool: Pool | null = null;

/**
 * Initialize database connection pool
 */
export const initializeDatabase = async (): Promise<void> => {
  if (USE_MEMORY) {
    console.log('⚠️  Using in-memory storage (DATABASE_URL not configured)');
    return;
  }

  try {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    const client = await pool.connect();
    console.log('✅ PostgreSQL database connected');
    client.release();

    // Initialize schema
    await initializeSchema();
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error);
    console.log('⚠️  Falling back to in-memory storage');
  }
};

/**
 * Initialize database schema
 */
const initializeSchema = async (): Promise<void> => {
  if (!pool || USE_MEMORY) return;

  try {
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    const statements = schema.split(';').filter((stmt) => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await pool.query(statement);
      }
    }

    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('⚠️  Schema initialization failed:', error);
  }
};

/**
 * Execute query against PostgreSQL
 */
export const query = async (
  text: string,
  values?: (string | number | boolean | null)[]
): Promise<QueryResult> => {
  if (!pool || USE_MEMORY) {
    throw new Error('Database not initialized. Set DATABASE_URL environment variable.');
  }

  try {
    return await pool.query(text, values);
  } catch (error) {
    console.error('Query execution error:', error);
    throw error;
  }
};

/**
 * Get database connection status
 */
export const getDatabaseStatus = (): { connected: boolean; type: 'postgres' | 'memory' } => {
  if (USE_MEMORY) {
    return { connected: true, type: 'memory' };
  }
  return { connected: pool !== null, type: 'postgres' };
};

/**
 * Close database connection
 */
export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ Database connection closed');
  }
};

/**
 * Export for testing purposes
 */
export const getPool = (): Pool | null => pool;

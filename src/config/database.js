const {Pool} = require('pg');
require('dotenv').config();

const logger = require('../utils/logger');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'medway_cms_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  // Connection pool settings
  max: parseInt(process.env.DB_POOL_MAX) || 20, // Maximum number of clients in the pool
  min: parseInt(process.env.DB_POOL_MIN) || 2, // Minimum number of idle clients
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT) || 5000, // Return error after 5 seconds if connection could not be established
  // Statement timeout - cancel queries taking longer than 30 seconds
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000,
});

pool.on('connect', () => {
  logger.debug('New client connected to PostgreSQL');
});

pool.on('acquire', () => {
  logger.debug('Client acquired from pool');
});

pool.on('remove', () => {
  logger.debug('Client removed from pool');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', {
    error: err.message,
    stack: err.stack,
  });
});

// Query with logging for slow queries
const originalQuery = pool.query.bind(pool);
pool.query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await originalQuery(text, params);
    const duration = Date.now() - start;

    // Log slow queries (over 1000ms)
    if (duration > 1000) {
      logger.warn('Slow query detected', {
        query: text.substring(0, 200), // Truncate long queries
        duration: `${duration}ms`,
        rows: result.rowCount,
      });
    } else if (duration > 500) {
      logger.debug('Query completed', {
        query: text.substring(0, 100),
        duration: `${duration}ms`,
        rows: result.rowCount,
      });
    }

    return result;
  } catch (err) {
    const duration = Date.now() - start;
    logger.error('Query error', {
      query: text.substring(0, 200),
      duration: `${duration}ms`,
      error: err.message,
    });
    throw err;
  }
};

// Helper to get a client from the pool (for transactions)
const getClient = async () => {
  const client = await pool.connect();
  const originalRelease = client.release.bind(client);

  // Monkey-patch release to log
  client.release = () => {
    logger.debug('Client released back to pool');
    return originalRelease();
  };

  return client;
};

// Health check function
const healthCheck = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    return {
      status: 'healthy',
      timestamp: result.rows[0].now,
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      error: err.message,
    };
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient,
  pool,
  healthCheck,
};

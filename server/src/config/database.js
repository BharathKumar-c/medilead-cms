const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const logger = require('../utils/logger');

// SSL configuration for production (Aiven requires SSL)
const getSSLConfig = () => {
  if (process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true') {
    const sslConfig = {
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    };

    // Load CA certificate if provided
    const caCertPath = process.env.DB_SSL_CA_CERT || path.join(__dirname, '..', '..', 'certs', 'ca.pem');
    if (fs.existsSync(caCertPath)) {
      sslConfig.ca = fs.readFileSync(caCertPath, 'utf8');
      logger.info('SSL CA certificate loaded', { path: caCertPath });
    }

    return sslConfig;
  }
  return false;
};

// Support DATABASE_URL (Render provides this) or individual env vars
const createPool = () => {
  if (process.env.DATABASE_URL) {
    logger.info('Connecting to database via DATABASE_URL');
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig(),
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT) || 10000,
      statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000,
    });
  }

  logger.info('Connecting to database via individual env vars');
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'cms_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: getSSLConfig(),
    max: parseInt(process.env.DB_POOL_MAX) || 20,
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECT_TIMEOUT) || 10000,
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000,
  });
};

const pool = createPool();

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
  logger.error('Unexpected error on idle client', { error: err.message, stack: err.stack });
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

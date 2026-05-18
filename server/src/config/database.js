const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const logger = require('../utils/logger');

// Aiven CA certificate (embedded for production reliability)
const AIVEN_CA_CERT = `-----BEGIN CERTIFICATE-----
MIIEUDCCArigAwIBAgIUb6fcAy1qUkNOwp+oa4DXPCq/nSIwDQYJKoZIhvcNAQEM
BQAwQDE+MDwGA1UEAww1YTJmYzQ4MjItYzFiOS00ODc4LWE4MWMtYzk0M2E1Y2Rh
MjE3IEdFTiAxIFByb2plY3QgQ0EwHhcNMjUwODE1MTMwNjM3WhcNMzUwODEzMTMw
NjM3WjBAMT4wPAYDVQQDDDVhMmZjNDgyMi1jMWI5LTQ4NzgtYTgxYy1jOTQzYTVj
ZGEyMTcgR0VOIDEgUHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCC
AYoCggGBAKkIssZYHNdj3VOB+4EWNDVUVboVeR2+ue5cB62osZJzS9zrRg6T0zko
lMa8AN/+m2/vBve8+CGsErLQcK0wN1+p+Jee2WPuyA+my7KlPM/O3TYIurJQ7cjG
atDYXoxLsbWBNzDuv5LJw/LQ/J2Pz3RsUxZ/gO/FoMqNpQZ4hayiZKs1u/h8sVGW
W6U4okXIAeIcXS2laO2LTvckiU7AZC48ZnpDB9NXe2vz/6RBQ3ztF/VXRPNYLbVr
BXtlYd8iJoPJPMhQY+jCyRy5A7nj2Z4RBkd8qLI5DKD3Lf0fWVcNOUpqebx/iAaF
j/YCKBNkPtHspr2OKCM5p50ncWyUaY+pmIoZa7b1VYNYjEsPVQ0+B06Hw9W3t191
zMIIxXNraq9rhdnU9/r5l9zSbf48kizgpqwl9WzbAaUNZlQX44zOzBw9aSF0JMpV
lPaj4z1jjd2AsLbbg51JbLGetitOw0n0mkekK0bJ/ZB+przPjFpNNfY1K25QZXIU
5cwRw1u2rQIDAQABo0IwQDAdBgNVHQ4EFgQU/oTkWWfA6oSlamI4hdbro0Uaa3cw
EgYDVR0TAQH/BAgwBgEB/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQAD
ggGBAEdfwUbtTH6VNkK9NBKRM14kigtwRGUq9I5TBnRi8UTMOW3LlDMiNVMSs65T
uphjv+p76oKk13UlSi+mjt2TXbGL6IU5HksYC1ll/0a73AI+xHHAl4O6Doc9KmbC
thZiiYfY0MtwQWcfs/nAU+ue4zgOodTomCfPZDiZ9/NNCeCvcBLuKi9WF8pVfnIq
28NX+sveYLSqsRWHxszIPVlXSh/rbhZyRjAcad94kt1yJg4TYh3CtkxhTzRLAnYA
pQGo7JiVljDG6I/gReSvE8P0ybk5t3k274JkldT3CQ33RGYqUZWuzkCFb8PhxiuJ
C2QtsFipXWT4Zi8DElGeaOGiO0ctgiWoiZz2nmxgbPGkHXuU/cz15eXlvFAmEX6H
sWarXdDFsoWO0t0MXdYb7IWIQ0B/E9d8gZn4ek9iyFc9CNF2ORYTRmPdkZIG/ZRK
YWbEG9WXQnt/5FdmimeYRjb0f1pFtDh4/VV04RvKbO3gu6ulhonans5tN24qxJWU
8s1fHg==
-----END CERTIFICATE-----`;

// SSL configuration for production (Aiven requires SSL)
const getSSLConfig = () => {
  if (process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true') {
    const sslConfig = {
      rejectUnauthorized: true,
      ca: AIVEN_CA_CERT,
    };

    logger.info('SSL configured with embedded CA certificate');
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

import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// Support for Supabase connection string or individual parameters
// Supabase provides a connection string like:
// postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
let poolConfig;

if (process.env.DATABASE_URL) {
  // Use connection string (Supabase or other cloud providers)
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    // Supabase/cloud-specific settings
    ssl: process.env.DB_SSL !== 'false' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Longer timeout for cloud connections
  };
} else {
  // Use individual parameters (local PostgreSQL or custom setup)
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'argjira_crm',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    // Connection pool settings
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;


// Script to create initial admin user
// Run with: node database/seeds/create_admin.js [username] [password] [email]
// Example: node database/seeds/create_admin.js admin admin123 admin@example.com

import pkg from 'pg';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'argjira_crm',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function createAdmin() {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'admin123';
  const email = process.argv[4] || 'admin@argjira.com';

  try {
    const passwordHash = bcryptjs.hashSync(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO UPDATE
       SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
       RETURNING id, username, email, role`,
      [username, email, passwordHash, 'admin']
    );

    console.log('Admin user created successfully:');
    console.log(result.rows[0]);
    console.log(`\nUsername: ${username}`);
    console.log(`Password: ${password}`);
    console.log('\n⚠️  Please change the password after first login!');
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

createAdmin();


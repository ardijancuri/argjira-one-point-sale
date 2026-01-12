-- Seed initial admin user
-- Default password: admin123 (change after first login!)
-- Password hash for 'admin123' using bcrypt

INSERT INTO users (username, email, password_hash, role, company_id)
VALUES (
  'admin',
  'admin@argjira.com',
  '$2a$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq',
  'admin',
  NULL
) ON CONFLICT (username) DO NOTHING;

-- Note: The password hash above is a placeholder. 
-- In production, you should:
-- 1. Register the first admin user through the registration endpoint
-- 2. Or use a script to generate a proper bcrypt hash
-- Example Node.js code to generate hash:
-- const bcrypt = require('bcryptjs');
-- const hash = bcrypt.hashSync('admin123', 10);
-- console.log(hash);


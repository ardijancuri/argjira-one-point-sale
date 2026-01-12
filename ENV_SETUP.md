# Environment Variables Setup Guide

This document lists all required environment variables for the application.

## Backend Environment Variables

Create a `.env` file in the `backend/` directory with these variables:

```env
# Database Configuration (Get from Supabase)
# For LOCAL development: Use direct connection (port 5432)
# For VERCEL/production: Use transaction pooler (port 6543) - REQUIRED!
DB_HOST=db.xxxxxxxxxxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-password

# JWT Configuration
# Generate a secure key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-random-secret-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=7d

# Environment
NODE_ENV=development

# Frontend URL (for CORS) - Update after deploying frontend
FRONTEND_URL=http://localhost:5173
```

## Frontend Environment Variables

Create a `.env.production` file in the `frontend/` directory:

```env
# API Base URL - Update with your Vercel backend URL
VITE_API_URL=https://your-app-name.vercel.app/api
```

For local development, the frontend uses `http://localhost:3000/api` by default (no .env needed).

## Vercel Environment Variables (Production)

When deploying to Vercel, add these environment variables in the Vercel Dashboard:

### For Backend Deployment:

1. Go to your Vercel project
2. Settings → Environment Variables
3. Add each variable:

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `DB_HOST` | `db.xxxxx.supabase.co` or `aws-0-us-west-1.pooler.supabase.com` | From Supabase **Transaction Pooler** connection string |
| `DB_PORT` | `6543` | **Transaction Pooler port** (NOT 5432 for Vercel!) |
| `DB_NAME` | `postgres` | Supabase default database |
| `DB_USER` | `postgres` | Supabase default user |
| `DB_PASSWORD` | `your-password` | Set when creating Supabase project |
| `JWT_SECRET` | `generated-secret` | Generate with crypto.randomBytes |
| `JWT_EXPIRES_IN` | `7d` | Token expiration |
| `NODE_ENV` | `production` | Environment mode |
| `FRONTEND_URL` | `https://your-app.vercel.app` | Your Vercel app URL |

### For Frontend Deployment:

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `VITE_API_URL` | `https://your-app.vercel.app/api` | Backend API URL |

## How to Get Supabase Credentials

### ⚠️ IMPORTANT: Use Transaction Pooler for Vercel

**For Vercel/Production Deployment:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **Database**
4. Find **Connection string** section
5. **Click on "Transaction pooler" tab** (NOT "Direct connection")
6. Select **Connection string** format
7. Copy the connection string:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:6543/postgres
   ```
   Or it might use pooler host:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   ```
8. Extract the parts:
   - **DB_HOST**: The part between `@` and `:6543` (e.g., `db.abcdefgh.supabase.co` or `aws-0-us-west-1.pooler.supabase.com`)
   - **DB_PORT**: `6543` (Transaction Pooler port) ⚠️ **NOT 5432**
   - **DB_PASSWORD**: Replace `[YOUR-PASSWORD]` with your actual password
   - **DB_USER**: `postgres` (default)
   - **DB_NAME**: `postgres` (default)

**For Local Development:**
- You can use direct connection (port 5432) for local development
- Transaction pooler is only required for serverless/production

**Why Transaction Pooler?**
- Vercel serverless functions create many short-lived connections
- Direct connection has a limit (~100-200 connections)
- Transaction pooler handles thousands of concurrent connections
- **Essential for serverless/cloud functions** - you'll get connection limit errors without it

## Generate JWT Secret

Run this command in your terminal to generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `JWT_SECRET`.

## Security Notes

⚠️ **IMPORTANT**:

1. **Never commit `.env` files to git** - They are in `.gitignore`
2. **Use different secrets for development and production**
3. **Rotate JWT_SECRET periodically** (will log out all users)
4. **Use strong passwords** for database (min 12 characters)
5. **Keep Supabase password secure** - Database is publicly accessible

## Testing Configuration

To test if your environment variables are set correctly:

### Local Development:

```bash
# Backend
cd backend
node -e "require('dotenv').config(); console.log('DB_HOST:', process.env.DB_HOST ? '✓ Set' : '✗ Missing');"

# Frontend
cd frontend
npm run dev
# Check browser console for API URL
```

### Production:

1. Check Vercel deployment logs
2. Test API health endpoint: `https://your-app.vercel.app/health`
3. Should return: `{"status":"ok"}`

## Troubleshooting

### Error: "Cannot connect to database"

- Check `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- Verify Supabase project is active
- Check if IP is whitelisted (Supabase should allow all by default)

### Error: "CORS policy error"

- Check `FRONTEND_URL` matches your actual frontend URL
- No trailing slash in URLs
- Include protocol (`https://`)

### Error: "Invalid token"

- Check `JWT_SECRET` is set and matches between deployments
- Clear browser localStorage and login again
- Generate a new JWT secret if needed

## Environment File Templates

### backend/.env.example
```env
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password

JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### frontend/.env.production
```env
VITE_API_URL=https://your-app.vercel.app/api
```


# Deployment Guide - Argjira CRM

This guide will walk you through deploying your CRM application to production using Supabase (PostgreSQL database) and Vercel (hosting).

**Recommended Approach**: Deploy Frontend and Backend separately for better performance and easier management.

## Prerequisites

- GitHub account
- Supabase account (free tier available)
- Vercel account (free tier available)

## Step 1: Setup Supabase Database

### 1.1 Create Supabase Project

1. Go to [Supabase](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Project Name**: argjira-crm
   - **Database Password**: (choose a strong password and save it)
   - **Region**: Choose the closest to your location
4. Click "Create new project" and wait for it to initialize (~2 minutes)

### 1.2 Get Database Connection Details

**⚠️ IMPORTANT: Use Transaction Pooler for Vercel/Serverless**

For Vercel serverless functions, you **MUST** use the **Transaction Pooler** connection string, not the direct connection. This prevents connection limit errors.

1. In your Supabase dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection string** section
3. You'll see two options:
   - **Direct connection** (port 5432) - ❌ Don't use for Vercel
   - **Transaction pooler** (port 6543) - ✅ **Use this for Vercel**
4. Click on **Transaction pooler** tab
5. Select **Connection string** (not URI)
6. Copy the connection string (it will look like this):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:6543/postgres
   ```
   Or it might use pooler host:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   ```
7. **Note the port**: It should be **6543** (transaction pooler), not 5432 (direct)

**Why Transaction Pooler?**
- Vercel serverless functions create many short-lived connections
- Direct connection has a limit (~100-200 connections)
- Transaction pooler handles thousands of concurrent connections
- Essential for serverless/cloud functions

### 1.3 Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Open the file `database/migrations/001_initial_schema.sql` from your project
4. Copy the **entire contents** and paste into the SQL Editor
5. Click **Run** to execute the schema
6. You should see "Success. No rows returned" message

The schema includes:
- ✅ All tables (users, clients, stock_items, invoices, processing_records, etc.)
- ✅ Default admin user (username: `admin`, password: `admin123`)
- ✅ All indexes and triggers
- ✅ Company settings

## Step 2: Push Code to GitHub

### 2.1 Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Name it `argjira-crm` (or your preferred name)
3. Choose **Private** for security
4. Don't initialize with README (we already have code)

### 2.2 Push Your Code

Open terminal in your project root and run:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - ready for deployment"

# Add remote (replace with your GitHub repo URL)
git remote add origin https://github.com/YOUR-USERNAME/argjira-crm.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 3: Deploy Backend to Vercel

### 3.1 Create Backend Project in Vercel

1. Go to [Vercel](https://vercel.com) and sign in
2. Click **Add New** → **Project**
3. Import your GitHub repository (`argjira-crm`)
4. **Important**: Configure the project settings:
   - **Framework Preset**: Other
   - **Root Directory**: `./backend` ⚠️ **Change this to `backend`**
   - **Build Command**: Leave empty (or `npm install`)
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

### 3.2 Set Backend Environment Variables

Click **Environment Variables** and add these:

| Name | Value | Where to Find |
|------|-------|---------------|
| `DB_HOST` | `db.xxxxxxxxxxxxx.supabase.co` or `aws-0-us-west-1.pooler.supabase.com` | From Supabase **Transaction Pooler** connection string |
| `DB_PORT` | `6543` | **Transaction Pooler port** (NOT 5432) |
| `DB_NAME` | `postgres` | Default Supabase database name |
| `DB_USER` | `postgres` | Default Supabase user |
| `DB_PASSWORD` | `your-supabase-password` | Password you set when creating Supabase project |
| `JWT_SECRET` | `your-random-secret-key-change-this` | Generate a random string (min 32 characters) |
| `JWT_EXPIRES_IN` | `7d` | Token expiration time |
| `NODE_ENV` | `production` | Production environment |
| `FRONTEND_URL` | `https://your-frontend-app.vercel.app` | **Will update after frontend deploy** |

**To generate a secure JWT_SECRET**, run in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3.3 Deploy Backend

1. Click **Deploy**
2. Wait for deployment to complete (~2-3 minutes)
3. You'll get a URL like `https://argjira-crm-backend.vercel.app` or `https://argjira-crm-backend-xxxxx.vercel.app`
4. **Copy this backend URL** - you'll need it for the frontend
5. Test the backend: Visit `https://your-backend-url.vercel.app/health`
   - Should return: `{"status":"ok"}`

### 3.4 Note Backend URL

Your backend API will be available at:
```
https://your-backend-url.vercel.app/api
```

Save this URL - you'll use it in the frontend deployment.

## Step 4: Deploy Frontend to Vercel

### 4.1 Create Frontend Project in Vercel

1. In Vercel dashboard, click **Add New** → **Project** again
2. Import the **same GitHub repository** (`argjira-crm`)
3. **Important**: Configure the project settings:
   - **Framework Preset**: Vite (should auto-detect)
   - **Root Directory**: `./frontend` ⚠️ **Change this to `frontend`**
   - **Build Command**: `npm run build` (auto-filled)
   - **Output Directory**: `dist` (auto-filled)
   - **Install Command**: `npm install`

### 4.2 Set Frontend Environment Variables

Click **Environment Variables** and add:

| Name | Value | Notes |
|------|-------|-------|
| `VITE_API_URL` | `https://your-backend-url.vercel.app/api` | **Use the backend URL from Step 3.3** |

**Important**: Replace `your-backend-url` with your actual backend Vercel URL.

### 4.3 Deploy Frontend

1. Click **Deploy**
2. Wait for deployment to complete (~2-3 minutes)
3. You'll get a URL like `https://argjira-crm-frontend.vercel.app` or `https://argjira-crm-xxxxx.vercel.app`
4. **Copy this frontend URL**

### 4.4 Update Backend CORS Settings

Now that you have the frontend URL, update the backend:

1. Go back to your **Backend project** in Vercel
2. Go to **Settings** → **Environment Variables**
3. Update `FRONTEND_URL` with your frontend URL:
   ```
   FRONTEND_URL=https://your-frontend-url.vercel.app
   ```
4. Go to **Deployments** → Click ⋮ on latest → **Redeploy**

## Step 5: Test Your Deployment

1. Visit your frontend URL: `https://your-frontend-url.vercel.app`
2. You should see the login page
3. Login with default credentials:
   - **Username**: `admin`
   - **Password**: `admin123`
4. Test key features:
   - ✅ Dashboard loads
   - ✅ Can create clients
   - ✅ Can add stock items
   - ✅ Can create invoices
   - ✅ POS system works
   - ✅ PDF generation works

## Step 6: Post-Deployment Security

### 6.1 Change Default Admin Password

1. Login to your app
2. Go to **Settings** (if available) or use SQL in Supabase:
   ```sql
   -- In Supabase SQL Editor
   -- First, generate a new hash locally:
   -- node -e "console.log(require('bcryptjs').hashSync('your-new-password', 10))"
   
   UPDATE users 
   SET password_hash = '$2a$10$YOUR_NEW_HASH_HERE'
   WHERE username = 'admin';
   ```

### 6.2 Setup Custom Domain (Optional)

#### For Frontend:
1. In Vercel Frontend project, go to **Settings** → **Domains**
2. Add your custom domain (e.g., `crm.yourbusiness.com`)
3. Follow DNS configuration instructions

#### For Backend:
1. In Vercel Backend project, go to **Settings** → **Domains**
2. Add subdomain (e.g., `api.yourbusiness.com`)
3. Update `VITE_API_URL` in frontend environment variables
4. Update `FRONTEND_URL` in backend environment variables

### 6.3 Enable Database Backups

In Supabase:
1. Go to **Database** → **Backups**
2. Backups are automatic on paid plans
3. Free tier has point-in-time recovery for 7 days

## Troubleshooting

### Issue: Can't Connect to Database

**Solution**: 
- **Most common issue**: Using direct connection (port 5432) instead of transaction pooler (port 6543)
- Verify you're using **Transaction Pooler** connection string from Supabase
- Check `DB_PORT` is set to `6543` (not 5432)
- Verify all DB_* variables are set correctly in backend Vercel project
- Check Supabase project is active
- Test connection string format

**Connection Limit Errors?**
- You're likely using direct connection (port 5432)
- Switch to transaction pooler (port 6543)
- Update `DB_PORT` environment variable to `6543`

### Issue: CORS Errors

**Solution**: 
1. Make sure `FRONTEND_URL` is set correctly in **backend** environment variables
2. No trailing slash in URLs
3. Include protocol (`https://`)
4. Redeploy backend after updating `FRONTEND_URL`

### Issue: 401 Unauthorized on Login

**Solution**: Check that:
1. Admin user was created in database (Step 1.3)
2. Password hash is correct
3. JWT_SECRET is set in backend environment variables

### Issue: Frontend Can't Reach Backend

**Solution**:
1. Verify `VITE_API_URL` in frontend environment variables matches backend URL
2. Check backend is deployed and accessible: `https://your-backend-url.vercel.app/health`
3. Check browser console for CORS errors
4. Ensure backend `FRONTEND_URL` includes frontend URL

### Issue: PDF Generation Fails

**Solution**: PDFKit should work on Vercel. Check:
1. `pdfkit` is in `backend/package.json` dependencies
2. Serverless function timeout (increase if needed in Vercel settings)

### Issue: Build Fails

**Backend Build Fails**:
- Check Root Directory is set to `./backend`
- Verify `backend/package.json` exists
- Check build logs in Vercel

**Frontend Build Fails**:
- Check Root Directory is set to `./frontend`
- Verify `frontend/package.json` exists
- Check `VITE_API_URL` is set (can be empty for build, but should be set)

## Monitoring & Logs

### View Backend Logs

1. Go to Vercel Dashboard
2. Click on your **Backend project**
3. Go to **Deployments**
4. Click on a deployment
5. Click **Functions** tab to see logs

### View Frontend Logs

1. Go to Vercel Dashboard
2. Click on your **Frontend project**
3. Go to **Deployments**
4. Click on a deployment to see build logs

### View Database Activity

1. Go to Supabase Dashboard
2. Click **Database** → **Logs**
3. View queries and errors

## Environment Variables Reference

### Backend Vercel Project

```env
# Database (from Supabase - USE TRANSACTION POOLER!)
DB_HOST=db.xxxxxxxxxxxxx.supabase.co
DB_PORT=6543
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-password

# Authentication
JWT_SECRET=your-random-secret-key-min-32-chars
JWT_EXPIRES_IN=7d

# Environment
NODE_ENV=production

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-url.vercel.app
```

### Frontend Vercel Project

```env
# Backend API URL
VITE_API_URL=https://your-backend-url.vercel.app/api
```

## Project Structure in Vercel

After deployment, you'll have **two separate projects** in Vercel:

1. **Backend Project** (`argjira-crm-backend`)
   - Root: `./backend`
   - URL: `https://argjira-crm-backend.vercel.app`
   - Handles: All API routes (`/api/*`)

2. **Frontend Project** (`argjira-crm-frontend`)
   - Root: `./frontend`
   - URL: `https://argjira-crm-frontend.vercel.app`
   - Handles: Static React app

## Cost Estimates

### Free Tier Limits

**Supabase Free:**
- ✅ 500 MB database storage
- ✅ 1 GB file storage
- ✅ 2 GB data transfer
- ✅ Unlimited API requests

**Vercel Free (per project):**
- ✅ 100 GB bandwidth
- ✅ 6000 build minutes
- ✅ Unlimited static hosting
- ✅ Serverless functions (10 second timeout)

**Total**: 2 Vercel projects = 2x free tier limits

These limits are sufficient for small-medium businesses with 1-50 users.

## Scaling Up

When you outgrow free tier:

1. **Supabase Pro** ($25/mo):
   - 8 GB database
   - 100 GB bandwidth
   - Better performance

2. **Vercel Pro** ($20/mo per project):
   - 1 TB bandwidth per project
   - Better analytics
   - Team features
   - Note: You have 2 projects, so consider this

## Benefits of Separate Deployment

✅ **Better Performance**: Frontend gets optimized static hosting, backend gets proper serverless handling
✅ **Independent Scaling**: Scale frontend and backend separately
✅ **Clearer Separation**: Easier to manage and debug
✅ **Better CI/CD**: Deploy frontend and backend independently
✅ **Cost Optimization**: Can optimize each service separately

## Next Steps

1. ✅ Setup automatic database backups
2. ✅ Configure custom domains
3. ✅ Change default passwords
4. ✅ Add more users via UI or SQL
5. ✅ Monitor logs and performance
6. ✅ Setup email notifications (future)

## Support

For issues:
- Check Vercel logs (both projects)
- Check Supabase logs
- Review this deployment guide
- Check browser console for frontend errors
- Check backend API health endpoint

---

**Congratulations!** 🎉 Your CRM is now live with separate frontend and backend deployments!

**Your URLs**:
- **Frontend**: https://your-frontend-url.vercel.app
- **Backend API**: https://your-backend-url.vercel.app/api
- **Login**: admin / admin123 (change this!)

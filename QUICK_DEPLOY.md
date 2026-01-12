# 🚀 Quick Deploy Guide (5 Minutes)

This is the fastest way to deploy your CRM to production with **separate frontend and backend deployments** (recommended).

## Step 1: Supabase (2 minutes)

1. Go to [supabase.com](https://supabase.com) → Sign in → New Project
2. Fill in:
   - Name: `argjira-crm`
   - Password: (create strong password - save it!)
   - Region: (closest to you)
3. Click **Create project** → Wait 2 minutes
4. Go to **SQL Editor** → **New Query**
5. Copy ALL content from `database/migrations/001_initial_schema.sql`
6. Paste and click **Run**
7. Go to **Settings** → **Database** → **Transaction pooler** tab → Copy **Connection string**
   - ⚠️ **IMPORTANT**: Use **Transaction pooler** (port 6543), NOT direct connection (port 5432)
   - This is required for Vercel serverless functions

## Step 2: GitHub (1 minute)

```bash
# In your project directory
git init
git add .
git commit -m "Initial commit"
git branch -M main

# Create new repo on GitHub, then:
git remote add origin https://github.com/YOUR-USERNAME/argjira-crm.git
git push -u origin main
```

## Step 3: Deploy Backend to Vercel (1 minute)

1. Go to [vercel.com](https://vercel.com) → Sign in → **Add New** → **Project**
2. Import your GitHub repository
3. **IMPORTANT**: Click **Configure Project**
   - **Root Directory**: Change to `./backend` ⚠️
   - **Framework Preset**: Other
   - Leave other settings as default
4. Click **Environment Variables** → Add these:

```
DB_HOST = db.xxxxx.supabase.co (from Step 1 - Transaction Pooler)
DB_PORT = 6543
DB_NAME = postgres
DB_USER = postgres
DB_PASSWORD = your-supabase-password (from Step 1)
JWT_SECRET = (generate with command below)
JWT_EXPIRES_IN = 7d
NODE_ENV = production
FRONTEND_URL = https://placeholder.vercel.app (update after frontend deploy)
```

**Generate JWT_SECRET**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

5. Click **Deploy** → Wait 2 minutes
6. Copy your **Backend URL**: `https://argjira-crm-backend.vercel.app` (or similar)
7. Test: Visit `https://your-backend-url.vercel.app/health` → Should show `{"status":"ok"}`

## Step 4: Deploy Frontend to Vercel (1 minute)

1. In Vercel, click **Add New** → **Project** again
2. Import the **same GitHub repository**
3. **IMPORTANT**: Click **Configure Project**
   - **Root Directory**: Change to `./frontend` ⚠️
   - **Framework Preset**: Vite (should auto-detect)
   - Build Command: `npm run build` (auto-filled)
   - Output Directory: `dist` (auto-filled)
4. Click **Environment Variables** → Add:

```
VITE_API_URL = https://your-backend-url.vercel.app/api
```

**Replace `your-backend-url` with your actual backend URL from Step 3!**

5. Click **Deploy** → Wait 2 minutes
6. Copy your **Frontend URL**: `https://argjira-crm-frontend.vercel.app` (or similar)

## Step 5: Update Backend CORS (30 seconds)

1. Go back to your **Backend project** in Vercel
2. **Settings** → **Environment Variables**
3. Update `FRONTEND_URL` with your frontend URL from Step 4
4. **Deployments** → Click ⋮ → **Redeploy**

## Step 6: Test (30 seconds)

1. Visit your **Frontend URL**: `https://your-frontend-url.vercel.app`
2. Login: `admin` / `admin123`
3. ✅ You're live!

## ⚠️ Important: Change Default Password

After login:
1. Create a new admin user or
2. Update password via SQL in Supabase:
   ```sql
   -- Generate hash locally first:
   -- node -e "console.log(require('bcryptjs').hashSync('NewPassword123', 10))"
   
   UPDATE users 
   SET password_hash = '$2a$10$YOUR_NEW_HASH'
   WHERE username = 'admin';
   ```

## 🎉 Done!

Your CRM is now:
- ✅ Live on internet
- ✅ Frontend and backend deployed separately
- ✅ Using Supabase database
- ✅ Auto-deploying on git push
- ✅ HTTPS enabled
- ✅ Serverless and scalable

## 📋 Summary of URLs

After deployment, you'll have:

- **Frontend**: `https://argjira-crm-frontend.vercel.app`
- **Backend API**: `https://argjira-crm-backend.vercel.app/api`
- **Health Check**: `https://argjira-crm-backend.vercel.app/health`

## 🔧 Quick Troubleshooting

### Can't login?
- Check backend logs in Vercel
- Verify all environment variables are set
- Make sure database migration ran successfully

### CORS errors?
- Verify `FRONTEND_URL` in backend matches frontend URL exactly
- No trailing slash
- Redeploy backend after updating

### Frontend can't reach backend?
- Check `VITE_API_URL` matches backend URL
- Test backend health endpoint
- Check browser console for errors

### Build fails?
- **Backend**: Check Root Directory is `./backend`
- **Frontend**: Check Root Directory is `./frontend`
- Check build logs in Vercel

## 📝 Environment Variables Checklist

### Backend Project:
- [ ] `DB_HOST`
- [ ] `DB_PORT`
- [ ] `DB_NAME`
- [ ] `DB_USER`
- [ ] `DB_PASSWORD`
- [ ] `JWT_SECRET`
- [ ] `JWT_EXPIRES_IN`
- [ ] `NODE_ENV`
- [ ] `FRONTEND_URL` (update after frontend deploy)

### Frontend Project:
- [ ] `VITE_API_URL` (use backend URL)

## Next Steps

- [ ] Add custom domain (Vercel Settings → Domains)
- [ ] Setup database backups
- [ ] Add more users
- [ ] Customize company settings

---

Need more details? See [DEPLOYMENT.md](DEPLOYMENT.md)

# Supabase Database Setup Guide

This guide shows you how to set up and configure Supabase for your store's database.

---

## Why Supabase?

- ✅ **No local installation** - No need to install PostgreSQL
- ✅ **Automatic backups** - Your data is safe
- ✅ **Free tier available** - Perfect for small to medium stores
- ✅ **Easy access** - Manage database from anywhere
- ✅ **Automatic updates** - Supabase handles maintenance

---

## Step 1: Create Supabase Account

1. Go to https://supabase.com
2. Click **"Start your project"** or **"Sign up"**
3. Sign up with:
   - Email
   - GitHub account, or
   - Google account
4. Verify your email if required

---

## Step 2: Create New Project

1. Once logged in, click **"New Project"**
2. Fill in the form:

   **Project Details:**
   - **Name**: `argjira-crm` (or your store name)
   - **Database Password**: 
     - Create a **strong password** (save this securely!)
     - Must be at least 8 characters
     - Include uppercase, lowercase, numbers, and symbols
     - Example: `MyStore2024!Secure`
   
   **Region:**
   - Choose the region closest to your store location
   - This affects connection speed
   
   **Pricing Plan:**
   - **Free tier** is sufficient for most stores
   - Includes: 500MB database, 2GB bandwidth, 50,000 monthly active users

3. Click **"Create new project"**
4. Wait 2-3 minutes for project to be created

---

## Step 3: Get Connection Details

Once your project is ready:

1. Go to **Settings** → **Database** (left sidebar)
2. Scroll to **Connection string** section
3. You'll see two options:

   **Option A: URI (Recommended)**
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
   - Copy this entire string
   - Replace `[YOUR-PASSWORD]` with your actual password
   - Use this in your `.env` file as `DATABASE_URL`

   **Option B: Individual Parameters**
   - **Host**: `db.xxxxx.supabase.co`
   - **Database name**: `postgres`
   - **Port**: `5432`
   - **User**: `postgres`
   - **Password**: (the one you set during project creation)

---

## Step 4: Run Database Migrations

### Method 1: Using Supabase SQL Editor (Easiest)

1. In Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open each migration file from your project:
   - `database/migrations/001_initial_schema.sql`
   - `database/migrations/002_...`
   - `database/migrations/003_...`
   - ... (all files in order)
4. For each file:
   - Copy the entire SQL content
   - Paste into SQL Editor
   - Click **Run** (or press `Ctrl+Enter`)
   - Wait for success message (green checkmark)
5. Repeat for all migration files

### Method 2: Using Supabase CLI (Advanced)

```powershell
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run all migrations
supabase db push
```

---

## Step 5: Configure Backend Connection

### Which Connection Method to Use?

For your Windows Service setup, you have three options:

| Method | Port | Best For | Your Use Case |
|--------|------|----------|--------------|
| **Direct Connection** | 5432 | Persistent services, VMs | ✅ **RECOMMENDED** |
| **Session Pooler** | 5432 | IPv4-only networks | ✅ Good alternative |
| **Transaction Pooler** | 6543 | Serverless functions | ❌ Not recommended |

**Recommendation**: Use **Direct Connection** (port 5432). If you get connection errors, try **Session Pooler**.

### Option A: Direct Connection (Recommended)

**Best for**: Windows Service that runs continuously

In `backend/.env`:

```env
# Direct connection (port 5432)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
DB_SSL=true
```

**OR using individual parameters:**

```env
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=YOUR_PASSWORD
DB_SSL=true
```

### Option B: Session Pooler (If Direct Connection Fails)

**Use if**: You get connection errors with Direct Connection, or your network doesn't support IPv6

In `backend/.env`:

```env
# Session pooler (port 5432 with ?pgbouncer=true)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres?pgbouncer=true
DB_SSL=true
```

### Option C: Transaction Pooler (Not Recommended for Your Use Case)

**Only use if**: You're running serverless functions (not your case)

```env
# Transaction pooler (port 6543)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:6543/postgres?pgbouncer=true
DB_SSL=true
```

**Important**: 
- Replace `YOUR_PASSWORD` with your actual Supabase database password
- Replace `xxxxx` with your project reference ID
- `DB_SSL=true` is required for Supabase connections
- **Direct Connection** is best for your Windows Service setup

---

## Step 6: Test Connection

1. Start your backend:
   ```powershell
   cd backend
   npm start
   ```

2. You should see:
   ```
   Database connected
   Server running on port 3000
   ```

3. If you see connection errors:
   - Check your password is correct
   - Verify connection string format
   - Check if your IP is allowed (see Step 7)

---

## Step 7: Configure Network Access (Important!)

By default, Supabase blocks connections from unknown IPs for security.

### Option A: Allow All IPs (Development/Testing)

1. Go to **Settings** → **Database**
2. Scroll to **Connection Pooling**
3. Under **Allowed IPs**, click **"Add IP"**
4. Enter: `0.0.0.0/0` (allows all IPs)
5. Click **Save**

**⚠️ Warning**: This is less secure. Use only for development or if your store has a static IP.

### Option B: Allow Specific IP (Recommended for Production)

1. Find your store's public IP:
   - Go to https://whatismyipaddress.com
   - Note your IP address
2. In Supabase: **Settings** → **Database**
3. Under **Allowed IPs**, click **"Add IP"**
4. Enter your IP: `xxx.xxx.xxx.xxx/32`
5. Click **Save**

**Note**: If your store's IP changes, you'll need to update this.

### Option C: Use Session Pooler (If Direct Connection Has Issues)

1. Go to **Settings** → **Database**
2. Find **Connection Pooling** section
3. Use the **Session Pooler** connection string:
   - Port: `5432` (same as direct)
   - Format: `postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres?pgbouncer=true`
4. Update your `.env` with this connection string
5. This is useful if:
   - Your network doesn't support IPv6
   - You're getting connection errors with direct connection
   - You need better connection management

---

## Step 8: Verify Database Setup

1. In Supabase dashboard, go to **Table Editor**
2. You should see all your tables:
   - `users`
   - `stock_items`
   - `sales`
   - `fiscal_print_jobs`
   - etc.
3. If tables are missing, re-run migrations

---

## Daily Operations

### Viewing Data

- **Table Editor**: View and edit data directly in Supabase dashboard
- **SQL Editor**: Run custom queries
- **Database**: See database size, connections, etc.

### Backups

Supabase automatically backs up your database:
- **Free tier**: Daily backups (kept for 7 days)
- **Pro tier**: Point-in-time recovery

### Monitoring

- **Dashboard**: See database usage, API calls, storage
- **Logs**: View query logs and errors
- **Metrics**: Monitor performance

---

## Troubleshooting

### Connection Refused

**Problem**: Can't connect to database

**Solutions**:
1. Check your IP is allowed (Step 7)
2. Verify password is correct
3. Check connection string format
4. Ensure `DB_SSL=true` is set

### SSL Error

**Problem**: SSL connection error

**Solution**: Add to `.env`:
```env
DB_SSL=true
```

### Migration Errors

**Problem**: Migrations fail

**Solutions**:
1. Run migrations one at a time
2. Check for syntax errors in SQL
3. Verify you're running migrations in order
4. Check Supabase logs for detailed errors

### Slow Queries

**Problem**: Database is slow

**Solutions**:
1. Check Supabase dashboard for connection limits
2. Use connection pooling (port 6543)
3. Optimize queries
4. Consider upgrading plan if needed

---

## Security Best Practices

1. **Never commit `.env` file** to version control
2. **Use strong database password** (at least 16 characters)
3. **Restrict IP access** to your store's IP only
4. **Enable Row Level Security (RLS)** in Supabase if needed
5. **Regular backups** - Supabase does this automatically
6. **Monitor access logs** in Supabase dashboard

---

## Cost Considerations

### Free Tier Limits:
- 500MB database storage
- 2GB bandwidth per month
- 50,000 monthly active users
- 2GB file storage

### When to Upgrade:
- Database exceeds 500MB
- High traffic (many orders per day)
- Need more storage
- Need point-in-time recovery

**Most small to medium stores will be fine on the free tier!**

---

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Discord**: https://discord.supabase.com
- **Supabase GitHub**: https://github.com/supabase/supabase

---

## Quick Reference

### Connection Strings

**Direct Connection (Recommended for Windows Service):**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**Session Pooler (Alternative if Direct fails):**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true
```

**Transaction Pooler (For serverless only - not recommended):**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true
```

### How to Get Connection Strings

1. Go to **Settings** → **Database**
2. Scroll to **Connection string** section
3. Select the appropriate tab:
   - **URI** - For Direct Connection
   - **Session mode** - For Session Pooler
   - **Transaction mode** - For Transaction Pooler (not recommended)

**Find Your Project Ref:**
- Go to **Settings** → **General**
- Look for **Reference ID**

---

**Your Supabase project is now ready!** 🎉

Continue with the main deployment guide to complete the setup.

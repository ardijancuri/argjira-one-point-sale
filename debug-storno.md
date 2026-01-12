# Debug Storno Issue - Step by Step

## Problem
Sometimes storno orders print with 0 prices and no agent logs appear.

## Steps to Debug

### 1. Stop ALL running processes
```bash
# Press Ctrl+C in ALL terminals to stop:
# - Backend server (npm run dev)
# - Agent (node agent/index.js)
# - Frontend (npm run dev)
# - Any other Node processes
```

Check for multiple agent processes:
```bash
# Windows PowerShell
Get-Process node
# Kill all node processes if needed
Stop-Process -Name node -Force
```

### 2. Clear pending jobs from database

Run this SQL query in your Supabase database:
```sql
DELETE FROM fiscal_print_jobs WHERE status IN ('pending', 'printing');
```

### 3. Clear browser cache
- Open browser DevTools (F12)
- Right-click on Refresh button
- Select "Empty Cache and Hard Reload"
- OR use Ctrl+Shift+Del to clear cache

### 4. Restart everything in order

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Agent:**
```bash
cd backend
node agent/index.js
```
Wait for: `╔══════════════════════════════════════════════╗`
And dots (.) appearing

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Test storno with logging

1. **Create a NEW sale** (don't use old sales)
   - Add a product with a clear, non-zero price
   - Complete the sale

2. **Create storno for that sale**
   - Watch Agent terminal - you MUST see:
     ```
     [Agent] Processing job #... (storno)...
     [Agent] Printing 1 items (STORNO):
     [Agent]   -> "Product Name" price=150 (cartPrice=150, price=undefined) qty=1
     ```

3. **If you DON'T see logs:**
   - Agent is not running OR
   - Job wasn't created in database OR
   - Wrong database connection

### 6. Verify agent configuration

Check agent startup banner shows:
```
║ Cloud URL: http://localhost:3000
```

NOT any other URL like your Vercel URL.

### 7. Check database connection

Agent and backend must connect to SAME database.
Check in `.env`:
```
DB_HOST=aws-1-eu-central-1.pooler.supabase.com
DB_PORT=5432
```

## If Still Not Working

Add this to agent/index.js line 217 (before console.log):
```javascript
console.log(`\n\n========== JOB STARTED at ${new Date().toISOString()} ==========`);
console.log('Job data:', JSON.stringify(job, null, 2));
```

This will make it IMPOSSIBLE to miss the log.

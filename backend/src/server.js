import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';

// Routes
import authRouter from './routes/auth.js';
import companySettingsRouter from './routes/companySettings.js';
import clientsRouter from './routes/clients.js';
import stockRouter from './routes/stock.js';
import invoicesRouter from './routes/invoices.js';
import processingRouter from './routes/processing.js';
import purchasesRouter from './routes/purchases.js';
import fiscalSalesRouter from './routes/fiscalSales.js';
import fiscalPrintRouter from './routes/fiscalPrint.js';
import cashRouter from './routes/cash.js';
import dashboardRouter from './routes/dashboard.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// CORS configuration
const frontendUrl = process.env.FRONTEND_URL?.trim();
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://192.168.100.4:5173', // Main PC network access
  // Add FRONTEND_URL from environment variable
  ...(frontendUrl ? [frontendUrl] : []),
  // Fallback for production (remove after setting FRONTEND_URL env var)
  'https://argjira-app.vercel.app',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin matches allowed patterns
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return allowed === origin;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    });
    
    // Also allow any device on the 192.168.100.x network
    const isLocalNetwork = origin && origin.match(/^http:\/\/192\.168\.100\.\d+:5173$/);
    
    if (!isAllowed && !isLocalNetwork) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/company-settings', companySettingsRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/stock', stockRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/processing', processingRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/fiscal-sales', fiscalSalesRouter);
app.use('/api/fiscal-print', fiscalPrintRouter);
app.use('/api/cash', cashRouter);
app.use('/api/dashboard', dashboardRouter);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Only start server if not in serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  // Listen on 0.0.0.0 to accept connections from other devices on the network
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Accessible on local network at http://<YOUR_IP>:${PORT}`);
  });
}

// Export for Vercel serverless
export default app;


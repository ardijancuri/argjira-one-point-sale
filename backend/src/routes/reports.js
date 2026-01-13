import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getSalesReport,
  getStockReport,
  getFinancialReport,
  getReportsSummary
} from '../controllers/reportsController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Sales reports
router.get('/sales', getSalesReport);

// Stock reports
router.get('/stock', getStockReport);

// Financial reports
router.get('/financial', getFinancialReport);

// Summary for dashboard
router.get('/summary', getReportsSummary);

export default router;

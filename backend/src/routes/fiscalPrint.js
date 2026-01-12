import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  submitJob,
  getPendingJobs,
  claimNextJob,
  markComplete,
  markFailed,
  getJobStatus,
  getRecentJobs,
  getStats,
  cleanup
} from '../controllers/fiscalPrintController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Submit a new print job
router.post('/jobs', submitJob);

// Get pending jobs (for print server polling)
router.get('/jobs/pending', getPendingJobs);

// Claim next job atomically (for print server)
router.post('/jobs/claim', claimNextJob);

// Get recent jobs history
router.get('/jobs/recent', getRecentJobs);

// Get queue statistics
router.get('/stats', getStats);

// Get job status by ID
router.get('/jobs/status/:id', getJobStatus);

// Mark job as completed
router.put('/jobs/:id/complete', markComplete);

// Mark job as failed
router.put('/jobs/:id/fail', markFailed);

// Clean up old jobs (admin only)
router.delete('/jobs/cleanup', cleanup);

export default router;

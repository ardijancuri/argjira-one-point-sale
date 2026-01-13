import { FiscalPrintJob } from '../models/FiscalPrintJob.js';
import { CompanySettings } from '../models/CompanySettings.js';

// Submit a new print job to the queue
export const submitJob = async (req, res, next) => {
  try {
    const { type, payload, device_id, fiscal_sale_id, priority } = req.body;

    // Validate job type
    const validTypes = ['receipt', 'storno', 'zreport', 'xreport', 'cash'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid job type. Must be one of: ${validTypes.join(', ')}` });
    }

    // Validate payload for receipt/storno types
    if ((type === 'receipt' || type === 'storno') && (!payload?.items || !Array.isArray(payload.items))) {
      return res.status(400).json({ error: 'Receipt and storno jobs require items array in payload' });
    }

    const job = await FiscalPrintJob.create({
      type,
      payload: payload || {},
      device_id,
      user_id: req.user?.id,
      fiscal_sale_id,
      priority
    });

    res.status(201).json({
      success: true,
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        created_at: job.created_at
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get pending jobs (for print server polling)
export const getPendingJobs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const jobs = await FiscalPrintJob.findPending(limit);

    res.json({
      success: true,
      jobs,
      count: jobs.length
    });
  } catch (error) {
    next(error);
  }
};

// Claim the next pending job atomically (for print server)
export const claimNextJob = async (req, res, next) => {
  try {
    // First, reset any stuck jobs
    await FiscalPrintJob.resetStuckJobs();

    // Claim the next job
    const job = await FiscalPrintJob.claimNextJob();

    if (!job) {
      return res.json({
        success: true,
        job: null,
        message: 'No pending jobs'
      });
    }

    // Fetch company settings and include in payload for header printing
    const companySettings = await CompanySettings.get();

    // Parse existing payload and add company settings
    const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : (job.payload || {});
    payload.companySettings = companySettings ? {
      name: companySettings.name,
      address: companySettings.address,
      tvsh_number: companySettings.tvsh_number,
      nipt: companySettings.nipt,
      tax_number: companySettings.tax_number
    } : null;

    res.json({
      success: true,
      job: {
        ...job,
        payload
      }
    });
  } catch (error) {
    next(error);
  }
};

// Mark a job as completed
export const markComplete = async (req, res, next) => {
  try {
    const { id } = req.params;

    const job = await FiscalPrintJob.markComplete(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      success: true,
      job
    });
  } catch (error) {
    next(error);
  }
};

// Mark a job as failed
export const markFailed = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error: errorMessage } = req.body;

    const job = await FiscalPrintJob.markFailed(id, errorMessage || 'Unknown error');

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      success: true,
      job
    });
  } catch (error) {
    next(error);
  }
};

// Get job status by ID
export const getJobStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const job = await FiscalPrintJob.getStatus(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      success: true,
      job
    });
  } catch (error) {
    next(error);
  }
};

// Get recent jobs (for history/dashboard)
export const getRecentJobs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const jobs = await FiscalPrintJob.findRecent(limit);

    res.json({
      success: true,
      jobs
    });
  } catch (error) {
    next(error);
  }
};

// Get queue statistics
export const getStats = async (req, res, next) => {
  try {
    const stats = await FiscalPrintJob.getStats();

    res.json({
      success: true,
      stats: {
        pending: parseInt(stats.pending_count) || 0,
        printing: parseInt(stats.printing_count) || 0,
        completedLastHour: parseInt(stats.completed_last_hour) || 0,
        failedLastHour: parseInt(stats.failed_last_hour) || 0,
        totalToday: parseInt(stats.total_today) || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// Clean up old jobs
export const cleanup = async (req, res, next) => {
  try {
    const daysOld = parseInt(req.query.days) || 7;
    const deletedCount = await FiscalPrintJob.cleanup(daysOld);

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old jobs`
    });
  } catch (error) {
    next(error);
  }
};

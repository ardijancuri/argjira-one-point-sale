import express from 'express';
import * as dashboardController from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/stats', dashboardController.getDashboardStats);
router.get('/chart', dashboardController.getChartData);

export default router;


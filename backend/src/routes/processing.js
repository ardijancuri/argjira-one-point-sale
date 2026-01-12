import express from 'express';
import * as processingController from '../controllers/processingController.js';

const router = express.Router();

router.get('/statistics', processingController.getProcessingStatistics);
router.get('/pdf', processingController.generateProcessingPDF);
router.get('/', processingController.getProcessingRecords);
router.get('/:id', processingController.getProcessingRecord);
router.post('/', processingController.createProcessing);
router.delete('/:id', processingController.deleteProcessing);

export default router;


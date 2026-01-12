import express from 'express';
import * as fiscalSaleController from '../controllers/fiscalSaleController.js';

const router = express.Router();

router.get('/', fiscalSaleController.getFiscalSales);
router.get('/daily-stats', fiscalSaleController.getDailyStats);
router.get('/:id/items', fiscalSaleController.getSaleItems);
router.post('/', fiscalSaleController.createFiscalSale);
router.post('/:id/generate-invoice', fiscalSaleController.generateInvoice);
router.post('/:id/return-stock', fiscalSaleController.returnStockForStorno);

export default router;


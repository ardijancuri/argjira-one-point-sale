import express from 'express';
import * as stockController from '../controllers/stockController.js';

const router = express.Router();

router.get('/', stockController.getStockItems);
router.get('/pos', stockController.getPOSStock);
router.get('/stats', stockController.getStockStats);
router.get('/pdf', stockController.generatePDF);
router.get('/:id', stockController.getStockItem);
router.post('/', stockController.createStockItem);
router.put('/:id', stockController.updateStockItem);
router.delete('/:id', stockController.deleteStockItem);

export default router;


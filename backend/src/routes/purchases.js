import express from 'express';
import * as purchaseController from '../controllers/purchaseController.js';

const router = express.Router();

// Standard supplier purchases
router.get('/', purchaseController.getPurchases);
router.get('/:id', purchaseController.getPurchase);
router.post('/', purchaseController.createPurchase);

// Random client purchases
router.get('/random/all', purchaseController.getRandomPurchases);
router.post('/random', purchaseController.createRandomPurchase);

// Productions
router.get('/productions/all', purchaseController.getProductions);
router.get('/productions/:id', purchaseController.getProduction);
router.post('/productions', purchaseController.createProduction);

export default router;


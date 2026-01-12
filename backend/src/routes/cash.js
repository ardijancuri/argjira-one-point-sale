import express from 'express';
import * as cashController from '../controllers/cashController.js';

const router = express.Router();

router.get('/', cashController.getCash);
router.get('/transactions', cashController.getCashTransactions);
router.post('/add', cashController.addCash);

export default router;


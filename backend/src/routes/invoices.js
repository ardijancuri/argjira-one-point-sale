import express from 'express';
import * as invoiceController from '../controllers/invoiceController.js';
import * as paymentController from '../controllers/paymentController.js';

const router = express.Router();

router.get('/', invoiceController.getInvoices);
router.get('/unpaid', invoiceController.getUnpaidInvoices);
router.get('/statistics', invoiceController.getStatistics);
router.get('/pdf', invoiceController.generateAllPDF);
router.post('/', invoiceController.createInvoice);

// Payment routes (must come before /:id routes)
router.get('/:id/payments', paymentController.getPayments);
router.post('/:id/payments', paymentController.createPayment);
router.post('/:id/payments/full', paymentController.payFull);
router.post('/:id/payments/revert', paymentController.revertFullPayment);
router.delete('/payments/:id', paymentController.deletePayment);

// Invoice routes
router.get('/:id/pdf', invoiceController.generatePDF);
router.get('/:id', invoiceController.getInvoice);
router.put('/:id', invoiceController.updateInvoice);
router.delete('/:id', invoiceController.deleteInvoice);

export default router;


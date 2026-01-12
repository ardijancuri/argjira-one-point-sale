import { Payment } from '../models/Payment.js';
import { Invoice } from '../models/Invoice.js';

export const getPayments = async (req, res, next) => {
  try {
    const invoiceId = req.params.id;
    if (!invoiceId) {
      return res.status(400).json({ error: 'Invoice ID is required' });
    }
    
    const payments = await Payment.findAllByInvoiceId(invoiceId);
    res.json(payments);
  } catch (error) {
    next(error);
  }
};

export const createPayment = async (req, res, next) => {
  try {
    const { invoice_id, amount, date, note } = req.body;
    
    // Validate invoice exists and has balance
    const invoice = await Invoice.findById(invoice_id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    if (parseFloat(amount) > parseFloat(invoice.balance)) {
      return res.status(400).json({ error: 'Shuma nuk mund të jetë më e madhe se mbetja!' });
    }
    
    if (parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Vendosni shumë të vlefshme!' });
    }
    
    const payment = await Payment.create({ invoice_id, amount, date, note });
    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
};

export const payFull = async (req, res, next) => {
  try {
    const invoice_id = req.params.id;
    
    const invoice = await Invoice.findById(invoice_id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const balance = parseFloat(invoice.balance) || 0;
    if (balance <= 0.01) {
      return res.status(400).json({ error: 'Fatura është tashmë e paguar!' });
    }
    
    const payment = await Payment.create({
      invoice_id,
      amount: invoice.balance,
      date: new Date().toISOString().split('T')[0],
      note: 'Pagesë e plotë'
    });
    
    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
};

export const deletePayment = async (req, res, next) => {
  try {
    await Payment.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const revertFullPayment = async (req, res, next) => {
  try {
    const invoice_id = req.params.id;
    
    const invoice = await Invoice.findById(invoice_id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const balance = parseFloat(invoice.balance) || 0;
    if (balance > 0.01) {
      return res.status(400).json({ error: 'Fatura ka ende mbetje të papaguar!' });
    }
    
    // Find the last payment for this invoice
    const lastPayment = await Payment.findLastByInvoiceId(invoice_id);
    if (!lastPayment) {
      return res.status(404).json({ error: 'Nuk u gjet pagesë për këtë faturë!' });
    }
    
    // Delete the payment (this will restore the balance)
    await Payment.delete(lastPayment.id);
    
    res.status(200).json({ message: 'Pagesa u anulua me sukses!' });
  } catch (error) {
    next(error);
  }
};


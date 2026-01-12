import { CashTransaction } from '../models/CashTransaction.js';
import { CompanySettings } from '../models/CompanySettings.js';
import { FiscalPrintJob } from '../models/FiscalPrintJob.js';

export const getCashTransactions = async (req, res, next) => {
  try {
    const transactions = await CashTransaction.findAll();
    res.json(transactions);
  } catch (error) {
    next(error);
  }
};

export const addCash = async (req, res, next) => {
  try {
    const { amount, description, type = 'in' } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'amount is required' });
    }

    const transaction = await CashTransaction.create({
      amount: parseFloat(amount),
      type: type, // 'in' or 'out'
      description
    });

    // Queue Print Job for Agent
    await FiscalPrintJob.create({
      type: 'cash',
      payload: {
        action: type,
        amount: parseFloat(amount)
      },
      priority: 15 // High priority
    });

    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
};

export const getCash = async (req, res, next) => {
  try {
    const cash = await CompanySettings.getCash();
    res.json({ cash });
  } catch (error) {
    next(error);
  }
};


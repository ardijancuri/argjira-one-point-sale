import { CompanySettings } from '../models/CompanySettings.js';
import { FiscalSale } from '../models/FiscalSale.js';
import { FiscalPrintJob } from '../models/FiscalPrintJob.js';
import { printFiscalReceipt, isEnabled as isDirectPrintEnabled } from '../utils/directPrinter.js';

export const getFiscalSales = async (req, res, next) => {
  try {
    const filters = {
      date: req.query.date || null,
      clientType: req.query.clientType || null
    };

    const sales = await FiscalSale.findAll(filters);
    res.json(sales);
  } catch (error) {
    next(error);
  }
};

export const createFiscalSale = async (req, res, next) => {
  try {
    const sale = await FiscalSale.create(req.body);

    // STRATEGY: Cloud vs Local
    // 1. If Direct Print is ENABLED (Local), print immediately.
    // 2. If Direct Print is DISABLED (Cloud), queue job for the Agent.

    if (isDirectPrintEnabled()) {
      // --- LOCAL MODE ---
      if (req.body.items && req.body.items.length > 0) {
        try {
          // Fetch settings for local print too if needed, but primary focus is cloud now
          const settings = await CompanySettings.get();
          await printFiscalReceipt(req.body.items, req.body.paymentMethod || 'cash', settings);
          console.log(`[FiscalSale] Direct print success for #${sale.id}`);
        } catch (printError) {
          console.error(`[FiscalSale] Direct print failed:`, printError.message);
        }
      }
    } else {
      // --- CLOUD MODE ---
      // Create a "pending" job in the database.
      // The Local Agent will pick this up via API polling.
      if (req.body.items && req.body.items.length > 0) {
        // Fetch company settings to send to agent
        const settings = await CompanySettings.get();

        await FiscalPrintJob.create({
          type: 'receipt',
          payload: {
            items: req.body.items,
            paymentMethod: req.body.paymentMethod || 'cash',
            companySettings: settings ? {
              name: settings.name,
              address: settings.address
            } : null
          },
          fiscal_sale_id: sale.id,
          priority: 10
        });
        console.log(`[FiscalSale] Job queued for Agent (Sale #${sale.id})`);
      }
    }

    res.status(201).json(sale);
  } catch (error) {
    next(error);
  }
};

export const getDailyStats = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'date is required' });
    }

    const stats = await FiscalSale.getDailyStats(date);
    res.json(stats);
  } catch (error) {
    next(error);
  }
};

export const generateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fiscalSale = await FiscalSale.generateInvoice(id);
    res.json(fiscalSale);
  } catch (error) {
    next(error);
  }
};

export const getSaleItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const items = await FiscalSale.findItemsBySaleId(id);
    res.json(items);
  } catch (error) {
    next(error);
  }
};

export const returnStockForStorno = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await FiscalSale.returnStockForStorno(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};


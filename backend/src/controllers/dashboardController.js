import { Invoice } from '../models/Invoice.js';
import { CompanySettings } from '../models/CompanySettings.js';
import { StockItem } from '../models/StockItem.js';
import { FiscalSale } from '../models/FiscalSale.js';
import pool from '../utils/db.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    // Get company cash
    const cash = await CompanySettings.getCash();
    
    // Get invoice stats
    const invoices = await Invoice.findAll();
    const totalInvoices = invoices.length;
    const totalRevenue = invoices
      .filter(i => i.type === 'out')
      .reduce((sum, i) => sum + parseFloat(i.total || 0), 0);
    const totalDebt = invoices.reduce((sum, i) => sum + parseFloat(i.balance || 0), 0);
    
    // Get stock stats
    const stockStats = await StockItem.getStockStats();
    const stockGram = parseFloat(stockStats?.stock_gram || 0);
    const stockPiece = parseFloat(stockStats?.stock_piece || 0);
    
    res.json({
      totalInvoices,
      totalRevenue,
      totalDebt,
      stockGram,
      stockPiece,
      cashInHand: cash
    });
  } catch (error) {
    next(error);
  }
};

export const getChartData = async (req, res, next) => {
  try {
    const { period = 'ditor' } = req.query;
    
    const today = new Date();
    let labels = [];
    let salesData = [];
    let purchaseData = [];
    
    if (period === 'ditor') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        // Use local timezone format instead of UTC
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        labels.push(date.toLocaleDateString('sq-AL', { weekday: 'short' }));

        // Get sales for this day
        const sales = await FiscalSale.findAll({ date: dateStr });
        const daySales = sales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0);
        salesData.push(daySales);

        // Get purchases for this day
        const purchases = await pool.query(
          `SELECT COALESCE(SUM(total), 0) as total FROM purchases WHERE date >= $1::date AND date < ($1::date + INTERVAL '1 day')`,
          [dateStr]
        );
        const dayPurchases = parseFloat(purchases.rows[0]?.total || 0);
        purchaseData.push(dayPurchases);
      }
    } else if (period === 'javor') {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        labels.push(`Java ${4 - i}`);
        salesData.push(0); // TODO: Implement weekly aggregation
        purchaseData.push(0);
      }
    } else if (period === 'mujor') {
      // Last 6 months
      const months = ['Qer', 'Kor', 'Gus', 'Sht', 'Tet', 'Nën'];
      months.forEach(m => {
        labels.push(m);
        salesData.push(0); // TODO: Implement monthly aggregation
        purchaseData.push(0);
      });
    } else if (period === 'vjetor') {
      // Last 3 years
      for (let i = 2; i >= 0; i--) {
        const year = today.getFullYear() - i;
        labels.push(year.toString());
        salesData.push(0); // TODO: Implement yearly aggregation
        purchaseData.push(0);
      }
    }
    
    res.json({ labels, salesData, purchaseData });
  } catch (error) {
    next(error);
  }
};


import pool from '../utils/db.js';

// Helper to get date range based on period
const getDateRange = (period, customFrom, customTo) => {
  const today = new Date();
  let fromDate, toDate;

  if (customFrom && customTo) {
    fromDate = new Date(customFrom);
    toDate = new Date(customTo);
    toDate.setHours(23, 59, 59, 999);
  } else {
    toDate = new Date(today);
    toDate.setHours(23, 59, 59, 999);

    switch (period) {
      case 'today':
        fromDate = new Date(today);
        fromDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        fromDate = new Date(today);
        fromDate.setDate(today.getDate() - 7);
        fromDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        fromDate = new Date(today);
        fromDate.setMonth(today.getMonth() - 1);
        fromDate.setHours(0, 0, 0, 0);
        break;
      case 'year':
        fromDate = new Date(today);
        fromDate.setFullYear(today.getFullYear() - 1);
        fromDate.setHours(0, 0, 0, 0);
        break;
      default: // 'all'
        fromDate = new Date('2020-01-01');
    }
  }

  return { fromDate, toDate };
};

// Sales Reports
export const getSalesReport = async (req, res, next) => {
  try {
    const { period = 'month', from, to } = req.query;
    const { fromDate, toDate } = getDateRange(period, from, to);

    // Total sales summary
    const salesSummary = await pool.query(`
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as average_sale,
        COUNT(CASE WHEN storno = true THEN 1 END) as storno_count,
        COALESCE(SUM(CASE WHEN storno = true THEN total ELSE 0 END), 0) as storno_amount
      FROM fiscal_sales
      WHERE date >= $1 AND date <= $2
    `, [fromDate, toDate]);

    // Sales by payment method
    const salesByPayment = await pool.query(`
      SELECT
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total
      FROM fiscal_sales
      WHERE date >= $1 AND date <= $2 AND storno = false
      GROUP BY payment_method
      ORDER BY total DESC
    `, [fromDate, toDate]);

    // Sales by client type
    const salesByClientType = await pool.query(`
      SELECT
        COALESCE(c.type, 'retail') as client_type,
        COUNT(*) as count,
        COALESCE(SUM(fs.total), 0) as total
      FROM fiscal_sales fs
      LEFT JOIN clients c ON fs.client_id = c.id
      WHERE fs.date >= $1 AND fs.date <= $2 AND fs.storno = false
      GROUP BY COALESCE(c.type, 'retail')
      ORDER BY total DESC
    `, [fromDate, toDate]);

    // Top selling products
    const topProducts = await pool.query(`
      SELECT
        si.name as product_name,
        si.category,
        SUM(fsi.quantity) as total_quantity,
        SUM(fsi.quantity * fsi.price) as total_revenue
      FROM fiscal_sale_items fsi
      JOIN fiscal_sales fs ON fsi.fiscal_sale_id = fs.id
      JOIN stock_items si ON fsi.stock_item_id = si.id
      WHERE fs.date >= $1 AND fs.date <= $2 AND fs.storno = false
      GROUP BY si.id, si.name, si.category
      ORDER BY total_revenue DESC
      LIMIT 10
    `, [fromDate, toDate]);

    // Daily sales trend
    const dailySales = await pool.query(`
      SELECT
        DATE(date) as sale_date,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total
      FROM fiscal_sales
      WHERE date >= $1 AND date <= $2 AND storno = false
      GROUP BY DATE(date)
      ORDER BY sale_date
    `, [fromDate, toDate]);

    res.json({
      period: { from: fromDate, to: toDate },
      summary: salesSummary.rows[0],
      byPaymentMethod: salesByPayment.rows,
      byClientType: salesByClientType.rows,
      topProducts: topProducts.rows,
      dailyTrend: dailySales.rows
    });
  } catch (error) {
    next(error);
  }
};

// Stock Reports
export const getStockReport = async (req, res, next) => {
  try {
    // Stock summary by category
    const stockByCategory = await pool.query(`
      SELECT
        category,
        COUNT(*) as item_count,
        SUM(CASE WHEN unit = 'gram' THEN quantity ELSE 0 END) as total_grams,
        SUM(CASE WHEN unit = 'piece' THEN quantity ELSE 0 END) as total_pieces,
        SUM(quantity * price) as total_value
      FROM stock_items
      GROUP BY category
      ORDER BY total_value DESC
    `);

    // Stock summary by unit
    const stockByUnit = await pool.query(`
      SELECT
        unit,
        COUNT(*) as item_count,
        SUM(quantity) as total_quantity,
        SUM(quantity * price) as total_value
      FROM stock_items
      GROUP BY unit
    `);

    // Low stock items (quantity <= 5 for pieces, <= 10 for grams)
    const lowStockItems = await pool.query(`
      SELECT
        id, name, category, quantity, unit, price
      FROM stock_items
      WHERE (unit = 'piece' AND quantity <= 5 AND quantity > 0)
         OR (unit = 'gram' AND quantity <= 10 AND quantity > 0)
      ORDER BY quantity ASC
      LIMIT 20
    `);

    // Out of stock items
    const outOfStockItems = await pool.query(`
      SELECT
        id, name, category, unit, price
      FROM stock_items
      WHERE quantity <= 0
      ORDER BY name
    `);

    // Stock by karat (for gold items)
    const stockByKarat = await pool.query(`
      SELECT
        COALESCE(karat, 'Pa Karat') as karat,
        COUNT(*) as item_count,
        SUM(quantity) as total_quantity,
        SUM(quantity * price) as total_value
      FROM stock_items
      WHERE category IN ('stoli', 'investues', 'blerje')
      GROUP BY karat
      ORDER BY total_value DESC
    `);

    // Total stock value
    const totalValue = await pool.query(`
      SELECT
        SUM(quantity * price) as total_stock_value,
        SUM(CASE WHEN unit = 'gram' THEN quantity ELSE 0 END) as total_grams,
        SUM(CASE WHEN unit = 'piece' THEN quantity ELSE 0 END) as total_pieces,
        COUNT(*) as total_items
      FROM stock_items
      WHERE quantity > 0
    `);

    res.json({
      summary: totalValue.rows[0],
      byCategory: stockByCategory.rows,
      byUnit: stockByUnit.rows,
      byKarat: stockByKarat.rows,
      lowStock: lowStockItems.rows,
      outOfStock: outOfStockItems.rows
    });
  } catch (error) {
    next(error);
  }
};

// Financial Reports
export const getFinancialReport = async (req, res, next) => {
  try {
    const { period = 'month', from, to } = req.query;
    const { fromDate, toDate } = getDateRange(period, from, to);

    // Revenue from sales (outgoing invoices) - using corrected balance formula
    const revenueData = await pool.query(`
      SELECT
        COUNT(*) as invoice_count,
        COALESCE(SUM(subtotal), 0) as total_revenue,
        COALESCE(SUM(
          CASE
            WHEN balance > subtotal AND total > subtotal
              THEN GREATEST(0, subtotal - (total - balance))
            WHEN balance > subtotal
              THEN subtotal
            ELSE balance
          END
        ), 0) as outstanding_balance,
        COALESCE(SUM(subtotal -
          CASE
            WHEN balance > subtotal AND total > subtotal
              THEN GREATEST(0, subtotal - (total - balance))
            WHEN balance > subtotal
              THEN subtotal
            ELSE balance
          END
        ), 0) as collected_amount
      FROM invoices
      WHERE type = 'out' AND date >= $1 AND date <= $2
    `, [fromDate, toDate]);

    // Expenses from purchases (incoming invoices) - using corrected balance formula
    const expenseData = await pool.query(`
      SELECT
        COUNT(*) as invoice_count,
        COALESCE(SUM(subtotal), 0) as total_expenses,
        COALESCE(SUM(
          CASE
            WHEN balance > subtotal AND total > subtotal
              THEN GREATEST(0, subtotal - (total - balance))
            WHEN balance > subtotal
              THEN subtotal
            ELSE balance
          END
        ), 0) as outstanding_balance,
        COALESCE(SUM(subtotal -
          CASE
            WHEN balance > subtotal AND total > subtotal
              THEN GREATEST(0, subtotal - (total - balance))
            WHEN balance > subtotal
              THEN subtotal
            ELSE balance
          END
        ), 0) as paid_amount
      FROM invoices
      WHERE type = 'in' AND date >= $1 AND date <= $2
    `, [fromDate, toDate]);

    // POS Cash Sales
    const posCashSales = await pool.query(`
      SELECT
        COALESCE(SUM(total), 0) as cash_sales
      FROM fiscal_sales
      WHERE date >= $1 AND date <= $2
        AND payment_method = 'cash'
        AND storno = false
    `, [fromDate, toDate]);

    // POS Card Sales
    const posCardSales = await pool.query(`
      SELECT
        COALESCE(SUM(total), 0) as card_sales
      FROM fiscal_sales
      WHERE date >= $1 AND date <= $2
        AND payment_method = 'card'
        AND storno = false
    `, [fromDate, toDate]);

    // Purchase expenses (direct purchases)
    const purchaseExpenses = await pool.query(`
      SELECT
        COUNT(*) as purchase_count,
        COALESCE(SUM(total), 0) as total_purchases
      FROM purchases
      WHERE date >= $1 AND date <= $2
    `, [fromDate, toDate]);

    // Profit calculation (revenue - expenses)
    const revenue = parseFloat(revenueData.rows[0].total_revenue) || 0;
    const posCash = parseFloat(posCashSales.rows[0].cash_sales) || 0;
    const posCard = parseFloat(posCardSales.rows[0].card_sales) || 0;
    const expenses = parseFloat(expenseData.rows[0].total_expenses) || 0;
    const purchases = parseFloat(purchaseExpenses.rows[0].total_purchases) || 0;

    const totalRevenue = revenue + posCash + posCard;
    const totalExpenses = expenses + purchases;
    const grossProfit = totalRevenue - totalExpenses;

    // Monthly breakdown
    const monthlyBreakdown = await pool.query(`
      SELECT
        TO_CHAR(date, 'YYYY-MM') as month,
        SUM(CASE WHEN type = 'out' THEN subtotal ELSE 0 END) as revenue,
        SUM(CASE WHEN type = 'in' THEN subtotal ELSE 0 END) as expenses
      FROM invoices
      WHERE date >= $1 AND date <= $2
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month
    `, [fromDate, toDate]);

    // Outstanding debts by client (using corrected balance formula)
    const outstandingDebts = await pool.query(`
      SELECT
        c.name as client_name,
        c.type as client_type,
        COUNT(i.id) as invoice_count,
        SUM(
          CASE
            WHEN i.balance > i.subtotal AND i.total > i.subtotal
              THEN GREATEST(0, i.subtotal - (i.total - i.balance))
            WHEN i.balance > i.subtotal
              THEN i.subtotal
            ELSE i.balance
          END
        ) as total_debt
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      WHERE i.type = 'out'
        AND (
          CASE
            WHEN i.balance > i.subtotal AND i.total > i.subtotal
              THEN GREATEST(0, i.subtotal - (i.total - i.balance))
            WHEN i.balance > i.subtotal
              THEN i.subtotal
            ELSE i.balance
          END
        ) > 0.01
      GROUP BY c.id, c.name, c.type
      ORDER BY total_debt DESC
      LIMIT 10
    `);

    res.json({
      period: { from: fromDate, to: toDate },
      revenue: {
        invoices: revenueData.rows[0],
        posCash: posCash,
        posCard: posCard,
        total: totalRevenue
      },
      expenses: {
        invoices: expenseData.rows[0],
        purchases: purchaseExpenses.rows[0],
        total: totalExpenses
      },
      profit: {
        gross: grossProfit,
        margin: totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(2) : 0
      },
      monthlyBreakdown: monthlyBreakdown.rows,
      outstandingDebts: outstandingDebts.rows
    });
  } catch (error) {
    next(error);
  }
};

// Combined summary for dashboard
export const getReportsSummary = async (req, res, next) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // This month's sales
    const monthSales = await pool.query(`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total
      FROM fiscal_sales
      WHERE date >= $1 AND storno = false
    `, [startOfMonth]);

    // This year's sales
    const yearSales = await pool.query(`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total
      FROM fiscal_sales
      WHERE date >= $1 AND storno = false
    `, [startOfYear]);

    // Stock value
    const stockValue = await pool.query(`
      SELECT
        SUM(quantity * price) as total_value,
        SUM(CASE WHEN unit = 'gram' THEN quantity ELSE 0 END) as total_grams,
        SUM(CASE WHEN unit = 'piece' THEN quantity ELSE 0 END) as total_pieces
      FROM stock_items
      WHERE quantity > 0
    `);

    // Outstanding debts (using corrected balance formula)
    const debts = await pool.query(`
      SELECT
        COALESCE(SUM(
          CASE WHEN type = 'out' THEN
            CASE
              WHEN balance > subtotal AND total > subtotal
                THEN GREATEST(0, subtotal - (total - balance))
              WHEN balance > subtotal
                THEN subtotal
              ELSE balance
            END
          ELSE 0 END
        ), 0) as receivables,
        COALESCE(SUM(
          CASE WHEN type = 'in' THEN
            CASE
              WHEN balance > subtotal AND total > subtotal
                THEN GREATEST(0, subtotal - (total - balance))
              WHEN balance > subtotal
                THEN subtotal
              ELSE balance
            END
          ELSE 0 END
        ), 0) as payables
      FROM invoices
      WHERE (
        CASE
          WHEN balance > subtotal AND total > subtotal
            THEN GREATEST(0, subtotal - (total - balance))
          WHEN balance > subtotal
            THEN subtotal
          ELSE balance
        END
      ) > 0.01
    `);

    res.json({
      sales: {
        thisMonth: monthSales.rows[0],
        thisYear: yearSales.rows[0]
      },
      stock: stockValue.rows[0],
      debts: debts.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

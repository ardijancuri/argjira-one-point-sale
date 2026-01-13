/**
 * Calculate invoice item totals
 * @param {number} quantity 
 * @param {number} price 
 * @param {number} taxRate 
 * @returns {Object} { subtotal, taxAmount, total }
 */
export function calculateInvoiceItemTotal(quantity, price, taxRate) {
  const subtotal = quantity * price;
  const taxAmount = 0;
  const total = subtotal;
  
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    taxAmount: 0,
    total: parseFloat(total.toFixed(2))
  };
}

/**
 * Calculate invoice totals from items
 * @param {Array} items - Array of invoice items
 * @returns {Object} { subtotal, taxAmount, total }
 */
export function calculateInvoiceTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const taxAmount = 0;
  const total = subtotal;
  
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    taxAmount: 0,
    total: parseFloat(total.toFixed(2))
  };
}

/**
 * Calculate weighted average price for stock
 * @param {number} existingQty 
 * @param {number} existingPrice 
 * @param {number} newQty 
 * @param {number} newPrice 
 * @returns {number} Weighted average price
 */
export function calculateWeightedAveragePrice(existingQty, existingPrice, newQty, newPrice) {
  if (existingQty + newQty === 0) return 0;
  const oldTotal = existingQty * existingPrice;
  const newTotal = newQty * newPrice;
  const averagePrice = (oldTotal + newTotal) / (existingQty + newQty);
  return parseFloat(averagePrice.toFixed(2));
}

/**
 * Calculate processing financial difference
 * @param {number} qty 
 * @param {number} priceIn 
 * @param {number} priceOut 
 * @returns {number} Difference amount
 */
export function calculateProcessingDifference(qty, priceIn, priceOut) {
  const totalIn = qty * priceIn;
  const totalOut = qty * priceOut;
  return parseFloat((totalOut - totalIn).toFixed(2));
}

/**
 * Format currency with 2 decimal places
 * @param {number} value
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value) {
  if (value === undefined || value === null || isNaN(value)) return '0.00 MKD';
  return parseFloat(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' MKD';
}

/**
 * Format number
 * @param {number} value 
 * @returns {string} Formatted number string
 */
export function formatNumber(value) {
  if (value === undefined || value === null || isNaN(value)) return '0.00';
  return parseFloat(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}


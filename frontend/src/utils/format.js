/**
 * Format number with 2 decimal places (for quantities in grams)
 */
export function formatNumber(value) {
  if (value === undefined || value === null || isNaN(value)) return '0.00';
  return parseFloat(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Format currency with 2 decimal places (for MKD prices)
 */
export function formatCurrency(value) {
  if (value === undefined || value === null || isNaN(value)) return '0.00 MKD';
  return parseFloat(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' MKD';
}

/**
 * Format percentage without decimal places
 */
export function formatPercentage(value) {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return Math.round(parseFloat(value)).toString();
}

/**
 * Calculate invoice item total
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
 */
export function calculateInvoiceTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const taxAmount = 0;
  const total = subtotal;
  
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    taxAmount: 0,
    total: parseFloat(total.toFixed(2))
  };
}

/**
 * Calculate processing difference
 */
export function calculateProcessingDifference(qty, priceIn, priceOut) {
  const totalIn = qty * priceIn;
  const totalOut = qty * priceOut;
  return parseFloat((totalOut - totalIn).toFixed(2));
}


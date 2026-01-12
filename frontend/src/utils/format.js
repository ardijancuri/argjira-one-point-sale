/**
 * Format number without decimal places
 */
export function formatNumber(value) {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return Math.round(parseFloat(value)).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

/**
 * Format currency without decimal places
 */
export function formatCurrency(value) {
  return formatNumber(value) + ' MKD';
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


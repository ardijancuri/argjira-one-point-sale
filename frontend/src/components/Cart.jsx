import React from 'react';
import { Trash2, X } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/format';
import Button from './Button';

export default function Cart({ items, onRemove, total, onClear, subtotal, discountAmount, discountPercent }) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center text-text-secondary text-sm">
        Shporta është bosh
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-3">
      <h3 className="text-xs font-bold mb-2 text-text-primary">Shporta</h3>
      <div className="space-y-1 mb-2 max-h-48 sm:max-h-64 overflow-y-auto">
        {items.map((item, index) => (
          <div key={index} className="py-1.5 px-2 border-b border-border last:border-b-0 hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text-primary truncate mb-0.5">{item.name}</div>
                <div className="text-xs text-text-secondary">
                  {formatNumber(item.cartQty)} × {formatCurrency(item.cartPrice)}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="text-xs font-semibold text-text-primary">
                  {formatCurrency(item.cartPrice * item.cartQty)}
                </div>
                <button
                  onClick={() => onRemove(index)}
                  className="text-danger hover:text-danger/80 p-0.5"
                  title="Hiq nga shporta"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t-2 border-primary">
        {discountAmount > 0 && subtotal !== undefined && discountPercent !== undefined ? (
          <>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-text-secondary">Nëntotali:</span>
              <div className="text-xs font-semibold text-text-secondary">{formatCurrency(subtotal)}</div>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-text-secondary">
                Zbritje ({Math.round(discountPercent)}%):
              </span>
              <div className="text-xs font-semibold text-danger">-{formatCurrency(discountAmount)}</div>
            </div>
          </>
        ) : null}
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-text-secondary">Totali:</span>
          <div className="text-sm font-bold text-primary">{formatCurrency(total)}</div>
        </div>
        {onClear && (
          <Button
            variant="secondary"
            className="w-full text-xs py-2"
            onClick={onClear}
            icon={X}
          >
            Pastro
          </Button>
        )}
      </div>
    </div>
  );
}


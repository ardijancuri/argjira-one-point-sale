import React from 'react';

export default function InvoiceStatCard({ title, value, borderColor, textColor }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border-l-4" style={{ borderLeftColor: borderColor }}>
      <div className="text-xs text-text-secondary mb-2">{title}</div>
      <div className="text-2xl font-bold" style={{ color: textColor }}>
        {value}
      </div>
    </div>
  );
}


import React from 'react';

export default function StatCard({ title, value, change, icon: Icon }) {
  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-xs text-text-secondary uppercase font-semibold tracking-wide mb-2 sm:mb-3">
        {title}
      </h3>
      <div className="text-2xl sm:text-3xl font-bold text-text-primary mb-1 sm:mb-2">{value}</div>
      {change && (
        <div className="text-xs sm:text-sm text-success font-medium">{change}</div>
      )}
    </div>
  );
}


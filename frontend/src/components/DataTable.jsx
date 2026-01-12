import React from 'react';

export default function DataTable({ columns, data, actions, emptyMessage = 'Nuk ka të dhëna', onRowClick }) {
  // Ensure data is an array
  const dataArray = Array.isArray(data) ? data : [];
  
  if (!dataArray || dataArray.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-10 text-center">
        <p className="text-text-secondary">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden w-full">
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col, idx) => (
                    <th
                      key={idx}
                      className={`px-3 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide whitespace-nowrap ${
                        col.align === 'right' ? 'text-right' : ''
                      }`}
                    >
                      {col.header}
                    </th>
                  ))}
                  {actions && <th className="px-3 py-3 text-left text-xs font-semibold text-text-secondary uppercase whitespace-nowrap">Veprime</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-border">
                {dataArray.map((row, rowIdx) => (
                  <tr 
                    key={rowIdx} 
                    className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={() => onRowClick && onRowClick(row)}
                  >
                    {columns.map((col, colIdx) => (
                      <td
                        key={colIdx}
                        className={`px-3 py-1.5 text-sm whitespace-nowrap ${
                          col.align === 'right' ? 'text-right' : ''
                        }`}
                      >
                        {col.render ? col.render(row) : row[col.accessor]}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1 sm:gap-2 flex-nowrap items-center">
                          {actions(row)}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}


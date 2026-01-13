import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Chart({ labels, salesData, purchaseData, period, onPeriodChange }) {
  const data = {
    labels,
    datasets: [
      {
        label: 'Shitje',
        data: salesData,
        borderColor: '#4285f4',
        backgroundColor: 'rgba(66, 133, 244, 0.1)',
        tension: 0.4,
        fill: true,
        borderWidth: 2,
      },
      {
        label: 'Blerje',
        data: purchaseData,
        borderColor: '#0f9d58',
        backgroundColor: 'rgba(15, 157, 88, 0.1)',
        tension: 0.4,
        fill: true,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 14,
            weight: 'bold',
          },
          padding: 15,
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        callbacks: {
          label: function (context) {
            return context.dataset.label + ': ' + parseFloat(context.parsed.y).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) + ' MKD';
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return parseFloat(value).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) + ' MKD';
          },
        },
      },
    },
  };

  const periods = [
    { value: 'ditor', label: 'Ditor' },
    { value: 'javor', label: 'Javor' },
    { value: 'mujor', label: 'Mujor' },
    { value: 'vjetor', label: 'Vjetor' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
        <h3 className="text-lg font-bold">Qarkullimi</h3>
        <div className="flex gap-2 flex-wrap">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => onPeriodChange(p.value)}
              className={`px-4 py-2 rounded border transition-all font-semibold text-sm ${
                period === p.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-border hover:bg-primary hover:text-white hover:border-primary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ position: 'relative', height: '400px' }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}


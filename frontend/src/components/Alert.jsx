import React from 'react';
import { useAlert } from '../contexts/AlertContext';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function Alert() {
  const { alert } = useAlert();

  if (!alert) return null;

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
  };

  const colors = {
    success: 'bg-green-50 text-green-700 border-green-500',
    error: 'bg-red-50 text-red-700 border-red-500',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-500',
  };

  const Icon = icons[alert.type] || CheckCircle;

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg border-l-4 shadow-lg flex items-center gap-3 ${colors[alert.type] || colors.success}`}>
      <Icon className="w-4 h-4" />
      <span className="font-medium">{alert.message}</span>
    </div>
  );
}


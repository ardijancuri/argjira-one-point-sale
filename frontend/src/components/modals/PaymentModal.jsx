import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../Modal';
import Input from '../Input';
import Button from '../Button';
import { paymentsAPI } from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { formatCurrency } from '../../utils/format';

export default function PaymentModal({ isOpen, onClose, invoice }) {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    note: '',
  });

  // Calculate invoice balance
  const getCorrectedBalance = (inv) => {
    if (!inv) return 0;
    const subtotal = parseFloat(inv.subtotal) || 0;
    const balance = parseFloat(inv.balance) || 0;
    const oldTotal = parseFloat(inv.total) || 0;
    
    let correctedBalance = balance;
    if (balance > subtotal && oldTotal > subtotal) {
      const paymentsMade = oldTotal - balance;
      correctedBalance = Math.max(0, subtotal - paymentsMade);
    } else if (balance > subtotal) {
      correctedBalance = subtotal;
    }
    return correctedBalance;
  };

  const remainingBalance = invoice ? getCorrectedBalance(invoice) : 0;
  const totalAmount = invoice ? (parseFloat(invoice.subtotal) || parseFloat(invoice.total) || 0) : 0;
  const paidAmount = totalAmount - remainingBalance;

  // Fetch payment history
  const { data: paymentsResponse } = useQuery({
    queryKey: ['payments', invoice?.id],
    queryFn: () => paymentsAPI.getAll(invoice.id),
    enabled: !!invoice?.id && isOpen,
  });

  const payments = Array.isArray(paymentsResponse?.data) ? paymentsResponse.data : [];

  // Reset form when modal opens/closes or invoice changes
  useEffect(() => {
    if (isOpen && invoice) {
      setFormData({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        note: '',
      });
    }
  }, [isOpen, invoice]);

  const paymentMutation = useMutation({
    mutationFn: (data) => paymentsAPI.create(invoice.id, data),
    onSuccess: () => {
      showAlert('Pagesa u regjistrua me sukses!', 'success');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['payments', invoice.id] });
      onClose();
      setFormData({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        note: '',
      });
    },
    onError: (error) => {
      showAlert(error.response?.data?.error || 'Gabim në regjistrimin e pagesës', 'error');
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    
    // Validation
    if (!amount || amount <= 0) {
      showAlert('Vendosni shumë të vlefshme!', 'error');
      return;
    }
    
    if (amount > remainingBalance) {
      showAlert(`Shuma nuk mund të jetë më e madhe se mbetja (${formatCurrency(remainingBalance)})!`, 'error');
      return;
    }

    setLoading(true);
    
    const paymentData = {
      invoice_id: invoice.id,
      amount: amount,
      date: formData.date || new Date().toISOString().split('T')[0],
      note: formData.note || null,
    };

    paymentMutation.mutate(paymentData);
  };

  const paymentAmount = parseFloat(formData.amount) || 0;
  const newBalance = Math.max(0, remainingBalance - paymentAmount);

  if (!invoice) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Regjistro Pagesë"
      size="max-w-2xl"
    >
      {/* Invoice Information */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-gray-600">Nr. Faturë:</span>
          <span className="text-xs font-bold text-gray-900">{invoice.number || 'N/A'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-gray-600">Totali:</span>
          <span className="text-xs font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold text-gray-600">E Paguar:</span>
          <span className="text-xs font-bold text-green-600">{formatCurrency(paidAmount)}</span>
        </div>
        <div className="flex justify-between items-center border-t border-gray-300 pt-1.5 mt-1.5">
          <span className="text-xs font-semibold text-gray-600">Mbetja:</span>
          <span className="text-xs font-bold text-red-600">{formatCurrency(remainingBalance)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-2">
          {/* Amount and Date in one row */}
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Shuma e Pagesës"
              type="number"
              step="0.01"
              min="0.01"
              max={remainingBalance}
              value={formData.amount}
              onChange={(e) => {
                const value = e.target.value;
                // Allow empty string for clearing, or valid number
                if (value === '' || (!isNaN(value) && parseFloat(value) >= 0)) {
                  setFormData({ ...formData, amount: value });
                }
              }}
              placeholder="0.00"
              required
              compact
            />
            <Input
              label="Data e Pagesës"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              compact
            />
          </div>
          
          {paymentAmount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-blue-700">Mbetja pas pagesës:</span>
                <span className="text-xs font-bold text-blue-900">{formatCurrency(newBalance)}</span>
              </div>
            </div>
          )}

          <Input
            label="Shënim (Opsionale)"
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            placeholder="Shënim për pagesën..."
            compact
          />
        </div>

        <div className="flex gap-3 mt-4">
          <Button type="submit" disabled={loading || !formData.amount || parseFloat(formData.amount) <= 0 || parseFloat(formData.amount) > remainingBalance}>
            {loading ? 'Duke regjistruar...' : 'Regjistro Pagesën'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Anulo
          </Button>
        </div>
      </form>

      {/* Payment History Section */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-bold mb-3 text-gray-700">Historiku i Pagesave</h3>
        {payments.length === 0 ? (
          <p className="text-xs text-gray-500">Nuk ka pagesa të regjistruara</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {payments.map((payment) => (
              <div key={payment.id} className="flex justify-between items-start p-2 bg-gray-50 rounded border border-gray-200">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gray-700">
                    {payment.date ? new Date(payment.date).toLocaleDateString('sq-AL') : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {payment.note || 'N/A'}
                  </div>
                </div>
                <div className="text-xs font-bold text-green-600 ml-3">
                  {formatCurrency(payment.amount || 0)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}


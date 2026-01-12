import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TopBar from '../components/Layout/TopBar';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import Chart from '../components/Chart';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { dashboardAPI, invoicesAPI, paymentsAPI } from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import { formatCurrency, formatNumber } from '../utils/format';
import { Plus, DollarSign, FileText, Package, Package2, Wallet, Printer } from 'lucide-react';

export default function Dashboard() {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const [chartPeriod, setChartPeriod] = useState('ditor');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardAPI.getStats()
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['dashboard-chart', chartPeriod],
    queryFn: () => dashboardAPI.getChartData(chartPeriod)
  });

  const { data: unpaidInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['unpaid-invoices'],
    queryFn: () => invoicesAPI.getUnpaid(6)
  });

  const payInvoiceMutation = useMutation({
    mutationFn: (id) => invoicesAPI.payFull(id),
    onSuccess: () => {
      showAlert('Fatura u pagua me sukses!', 'success');
      queryClient.invalidateQueries({ queryKey: ['unpaid-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error) => {
      showAlert(error.response?.data?.error || 'Gabim në pagimin e faturës', 'error');
    },
  });

  const handlePay = (invoiceId) => {
    if (window.confirm('Jeni të sigurt që doni të paguani këtë faturë?')) {
      payInvoiceMutation.mutate(invoiceId);
    }
  };

  const handlePrint = async (invoiceId) => {
    try {
      const invoice = unpaidInvoices?.data?.find((inv) => inv.id === invoiceId);
      const response = await invoicesAPI.generatePDF(invoiceId);
      // response.data is already a Blob when responseType is 'blob'
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice?.number || invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showAlert('Gabim në gjenerimin e PDF', 'error');
    }
  };

  if (statsLoading) {
    return (
      <>
        <TopBar title="Dashboard" />
        <div className="text-center py-12">Duke ngarkuar...</div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="space-y-4 sm:space-y-6 max-w-full">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          <StatCard
            title="Fatura Totale"
            value={stats?.data?.totalInvoices || 0}
            change="Këtë muaj"
            icon={FileText}
          />
          <StatCard
            title="Të Ardhura"
            value={formatCurrency(stats?.data?.totalRevenue || 0)}
            change="Totale"
            icon={DollarSign}
          />
          <StatCard
            title="Borxhet"
            value={formatCurrency(stats?.data?.totalDebt || 0)}
            change="Të papaguara"
            icon={FileText}
          />
          <StatCard
            title="Stoku Gram"
            value={formatNumber(stats?.data?.stockGram || 0) + 'g'}
            change="Në magazinë"
            icon={Package}
          />
          <StatCard
            title="Stoku Copë"
            value={stats?.data?.stockPiece || 0}
            change="Artikuj"
            icon={Package2}
          />
          <StatCard
            title="Cash në Dorë"
            value={formatCurrency(stats?.data?.cashInHand || 0)}
            change="Disponibël"
            icon={Wallet}
          />
        </div>

        {/* Chart */}
        {chartData?.data && (
          <Chart
            labels={chartData.data.labels}
            salesData={chartData.data.salesData}
            purchaseData={chartData.data.purchaseData}
            period={chartPeriod}
            onPeriodChange={setChartPeriod}
          />
        )}

        {/* Unpaid Invoices */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-5 pb-4 border-b border-border">
            <h2 className="text-base sm:text-lg font-bold">Fatura të Papaguara (6 të Fundit)</h2>
            <Button icon={Plus} size="sm" className="w-full sm:w-auto">Faturë e Re</Button>
          </div>
          <DataTable
            columns={[
              { header: 'Nr.', accessor: 'number' },
              { header: 'Klienti', accessor: 'client_name' },
              {
                header: 'Data',
                accessor: 'date',
                render: (row) => row.date ? new Date(row.date).toLocaleDateString('sq-AL') : ''
              },
              {
                header: 'Afati',
                accessor: 'due_date',
                render: (row) => row.due_date ? new Date(row.due_date).toLocaleDateString('sq-AL') : ''
              },
              {
                header: 'Shuma',
                accessor: 'total',
                align: 'right',
                render: (row) => formatCurrency(row.subtotal || row.total), // Use subtotal since tax is 0
              },
              {
                header: 'Mbetja',
                accessor: 'balance',
                align: 'right',
                render: (row) => {
                  // Recalculate balance if it includes tax from old invoices
                  const subtotal = parseFloat(row.subtotal) || 0;
                  const balance = parseFloat(row.balance) || 0;
                  const oldTotal = parseFloat(row.total) || 0;
                  
                  // If balance > subtotal, it likely includes tax from old invoices
                  if (balance > subtotal && oldTotal > subtotal) {
                    const paymentsMade = oldTotal - balance;
                    const correctedBalance = Math.max(0, subtotal - paymentsMade);
                    return <span className="font-bold text-danger">{formatCurrency(correctedBalance)}</span>;
                  } else if (balance > subtotal) {
                    return <span className="font-bold text-danger">{formatCurrency(subtotal)}</span>;
                  }
                  return <span className="font-bold text-danger">{formatCurrency(balance)}</span>;
                },
              },
              {
                header: 'Statusi',
                accessor: 'status',
                render: (row) => (
                  <Badge variant="warning">E Papaguar</Badge>
                ),
              },
            ]}
            data={unpaidInvoices?.data || []}
            emptyMessage="Nuk ka fatura të papaguara"
            actions={(row) => (
              <>
                <button
                  onClick={() => handlePay(row.id)}
                  disabled={payInvoiceMutation.isLoading}
                  className="p-1 text-success hover:opacity-70 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Paguaj"
                >
                  <DollarSign className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handlePrint(row.id)}
                  className="p-1 text-primary hover:text-primary-hover transition-colors cursor-pointer"
                  title="Print"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </>
            )}
          />
        </div>
      </div>
    </>
  );
}

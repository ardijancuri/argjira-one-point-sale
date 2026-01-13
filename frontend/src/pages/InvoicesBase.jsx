import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TopBar from '../components/Layout/TopBar';
import DataTable from '../components/DataTable';
import Button from '../components/Button';
import Badge from '../components/Badge';
import InvoiceModal from '../components/modals/InvoiceModal';
import PaymentModal from '../components/modals/PaymentModal';
import { invoicesAPI } from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import { Plus, Printer, Edit, Trash2, DollarSign, RotateCcw, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import InvoiceStatCard from '../components/InvoiceStatCard';

export default function InvoicesBase({ 
  invoiceType, // 'out' for Dalëse, 'in' for Hyrëse
  title,
  clientLabel // 'Klienti' for out, 'Furnizuesi' for in
}) {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'paid', 'unpaid'
  const itemsPerPage = 10;

  const { data: invoicesResponse } = useQuery({
    queryKey: ['invoices', invoiceType],
    queryFn: () => invoicesAPI.getAll({ 
      type: invoiceType,
      excludePosInvoices: invoiceType === 'out' ? true : false
    })
  });

  const { data: statisticsResponse } = useQuery({
    queryKey: ['invoice-statistics', invoiceType],
    queryFn: () => invoicesAPI.getStatistics({ 
      type: invoiceType,
      excludePosInvoices: invoiceType === 'out' ? true : false
    }),
  });

  const invoices = Array.isArray(invoicesResponse?.data) ? invoicesResponse.data : [];

  // Filter invoices based on search term, date range, and status
  const filteredInvoices = invoices.filter((invoice) => {
    // Search term filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      const numberMatch = invoice.number?.toLowerCase().includes(searchLower);
      const clientMatch = invoice.client_name?.toLowerCase().includes(searchLower);
      if (!numberMatch && !clientMatch) {
        return false;
      }
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      const subtotal = parseFloat(invoice.subtotal) || 0;
      const balance = parseFloat(invoice.balance) || 0;
      const oldTotal = parseFloat(invoice.total) || 0;
      
      let correctedBalance = balance;
      if (balance > subtotal && oldTotal > subtotal) {
        const paymentsMade = oldTotal - balance;
        correctedBalance = Math.max(0, subtotal - paymentsMade);
      } else if (balance > subtotal) {
        correctedBalance = subtotal;
      }
      
      if (statusFilter === 'paid' && correctedBalance > 0.01) {
        return false;
      }
      if (statusFilter === 'unpaid' && correctedBalance <= 0.01) {
        return false;
      }
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      if (!invoice.date) return false;
      
      const invoiceDate = new Date(invoice.date);
      if (isNaN(invoiceDate.getTime())) return false;
      invoiceDate.setHours(0, 0, 0, 0);
      
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (invoiceDate < fromDate) {
          return false;
        }
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (invoiceDate > toDate) {
          return false;
        }
      }
    }
    
    return true;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFrom, dateTo, statusFilter]);


  const revertPaymentMutation = useMutation({
    mutationFn: (id) => invoicesAPI.revertPayment(id),
    onSuccess: () => {
      showAlert('Pagesa u anulua me sukses!', 'success');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error) => {
      showAlert(error.response?.data?.error || 'Gabim në anulimin e pagesës', 'error');
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: (id) => invoicesAPI.delete(id),
    onSuccess: () => {
      showAlert('Fatura u fshi me sukses!', 'success');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['pos-stock'] });
    },
    onError: (error) => {
      showAlert(error.response?.data?.error || 'Gabim në fshirjen e faturës', 'error');
    },
  });

  const handlePrint = async (invoiceId) => {
    try {
      const invoice = invoices.find((inv) => inv.id === invoiceId);
      const response = await invoicesAPI.generatePDF(invoiceId);
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

  const handlePrintAllPDF = async () => {
    try {
      const filters = { 
        type: invoiceType,
        excludePosInvoices: invoiceType === 'out' ? true : false
      };
      
      if (statusFilter === 'unpaid') {
        filters.status = 'unpaid';
      } else if (statusFilter === 'paid') {
        filters.status = 'paid';
      }
      
      if (dateFrom) {
        filters.dateFrom = dateFrom;
      }
      if (dateTo) {
        filters.dateTo = dateTo;
      }
      
      const response = await invoicesAPI.generateAllPDF(filters);
      
      if (response.status === 404 || (response.data && typeof response.data === 'object' && !(response.data instanceof Blob) && response.data.error)) {
        showAlert(response.data?.error || 'Nuk u gjetën fatura për këtë filtrim', 'warning');
        return;
      }
      
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.download = `faturat-${invoiceType === 'out' ? 'dalese' : 'hyrese'}-${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      if (error.response?.status === 404) {
        showAlert(error.response?.data?.error || 'Nuk u gjetën fatura për këtë filtrim', 'warning');
      } else {
        showAlert('Gabim në gjenerimin e PDF', 'error');
      }
    }
  };

  const handlePay = (invoiceId) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      setSelectedInvoiceForPayment(invoice);
      setPaymentModalOpen(true);
    }
  };

  const handleRevertPayment = (invoiceId) => {
    if (window.confirm('Jeni të sigurt që doni të anuloni pagesën e kësaj fature? Kjo do të rivendosë mbetjen e faturës.')) {
      revertPaymentMutation.mutate(invoiceId);
    }
  };

  const handleEdit = (invoiceId) => {
    setSelectedInvoiceId(invoiceId);
    setEditModalOpen(true);
  };

  const handleDelete = (invoiceId) => {
    if (window.confirm('Jeni të sigurt që doni të fshini këtë faturë? Kjo veprim nuk mund të zhbëhet.')) {
      deleteInvoiceMutation.mutate(invoiceId);
    }
  };

  const getCorrectedBalance = (row) => {
    const subtotal = parseFloat(row.subtotal) || 0;
    const balance = parseFloat(row.balance) || 0;
    const oldTotal = parseFloat(row.total) || 0;
    
    let correctedBalance = balance;
    if (balance > subtotal && oldTotal > subtotal) {
      const paymentsMade = oldTotal - balance;
      correctedBalance = Math.max(0, subtotal - paymentsMade);
    } else if (balance > subtotal) {
      correctedBalance = subtotal;
    }
    return correctedBalance;
  };

  const clientTypeMap = {
    client: { text: 'Klient', variant: 'primary' },
    supplier: { text: 'Furnizues', variant: 'success' },
    producer: { text: 'Prodhues', variant: 'warning' },
    retail: { text: 'Pakicë', variant: 'primary' },
  };

  return (
    <>
      <TopBar title={title} />
      <div className="space-y-4 sm:space-y-6 max-w-full">
        {/* Statistics Cards */}
        {statisticsResponse?.data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <InvoiceStatCard
              title="FATURA TOTALE"
              value={statisticsResponse.data.totalInvoices || 0}
              borderColor="#9333ea"
              textColor="#1f2937"
            />
            <InvoiceStatCard
              title="GRAM TË SHITURA"
              value={parseFloat(statisticsResponse.data.totalGrams || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              borderColor="#f97316"
              textColor="#f97316"
            />
            <InvoiceStatCard
              title="COPË TË SHITURA"
              value={parseFloat(statisticsResponse.data.totalPieces || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              borderColor="#9333ea"
              textColor="#9333ea"
            />
            <InvoiceStatCard
              title="TOTALI"
              value={formatCurrency(statisticsResponse.data.totalAmount || 0)}
              borderColor="#3b82f6"
              textColor="#3b82f6"
            />
            <InvoiceStatCard
              title="TË PAGUARA"
              value={formatCurrency(statisticsResponse.data.paidAmount || 0)}
              borderColor="#10b981"
              textColor="#10b981"
            />
            <InvoiceStatCard
              title="TË PAPAGUARA"
              value={formatCurrency(statisticsResponse.data.unpaidAmount || 0)}
              borderColor="#ef4444"
              textColor="#ef4444"
            />
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          {/* Header with Title, Date Range, Print Button, and New Invoice Button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-base sm:text-lg font-bold">{title}</h2>
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full sm:w-auto">
              {/* Date Range and Print Button */}
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-2 py-1.5 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                  placeholder="Nga data"
                />
                <span className="text-xs text-text-secondary">-</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-2 py-1.5 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                  placeholder="Deri në datë"
                />
              </div>
              <Button
                variant="success"
                size="sm"
                icon={Printer}
                onClick={handlePrintAllPDF}
              >
                Print Faturat
              </Button>
              <Button icon={Plus} onClick={() => setCreateModalOpen(true)} size="sm" className="w-full sm:w-auto">
                Faturë e Re
              </Button>
            </div>
          </div>

          {/* Search and Status Filter */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-5 sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                placeholder={`Kërko sipas numrit ose ${clientLabel.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary text-xs"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === 'all' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className="!rounded-full !text-xs"
              >
                Të Gjitha
              </Button>
              <Button
                variant={statusFilter === 'paid' ? 'success' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter('paid')}
                className="!rounded-full !text-xs"
              >
                Të Paguara
              </Button>
              <Button
                variant={statusFilter === 'unpaid' ? 'warning' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter('unpaid')}
                className="!rounded-full !text-xs"
              >
                Të Papaguara
              </Button>
            </div>
          </div>

          <DataTable
            columns={[
              { header: 'Nr.', accessor: 'number' },
              { header: clientLabel, accessor: 'client_name' },
              {
                header: 'Lloji i Klientit',
                accessor: 'client_type',
                render: (row) => {
                  const clientType = row.client_type;
                  if (!clientType) return '-';
                  const typeInfo = clientTypeMap[clientType];
                  if (!typeInfo) return clientType;
                  return (
                    <Badge variant={typeInfo.variant}>
                      {typeInfo.text}
                    </Badge>
                  );
                },
              },
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
                header: 'Totali',
                accessor: 'total',
                align: 'right',
                render: (row) => formatCurrency(row.subtotal || row.total),
              },
              {
                header: 'Mbetja',
                accessor: 'balance',
                align: 'right',
                render: (row) => formatCurrency(getCorrectedBalance(row)),
              },
              {
                header: 'Statusi',
                accessor: 'status',
                render: (row) => {
                  const correctedBalance = getCorrectedBalance(row);
                  return (
                    <Badge variant={correctedBalance > 0.01 ? 'warning' : 'success'}>
                      {correctedBalance > 0.01 ? 'E Papaguar' : 'E Paguar'}
                    </Badge>
                  );
                },
              },
            ]}
            data={paginatedInvoices || []}
            emptyMessage="Nuk ka fatura"
            actions={(row) => {
              const correctedBalance = getCorrectedBalance(row);
              const totalAmount = parseFloat(row.subtotal) || parseFloat(row.total) || 0;
              const paidAmount = totalAmount - correctedBalance;
              
              // For 'in' type invoices (Fature Hyrese), block editing if any payment has been made
              const isIncomingInvoice = invoiceType === 'in';
              const hasPayments = paidAmount > 0.01;
              const canEdit = !isIncomingInvoice || !hasPayments;
              
              return (
                <>
                  {correctedBalance > 0.01 && (
                    <button
                      onClick={() => handlePay(row.id)}
                      className="p-1 text-success hover:opacity-70 transition-colors cursor-pointer"
                      title="Paguaj"
                    >
                      <DollarSign className="w-4 h-4" />
                    </button>
                  )}
                  {correctedBalance <= 0.01 && (
                    <button
                      onClick={() => handleRevertPayment(row.id)}
                      disabled={revertPaymentMutation.isLoading}
                      className="p-1 text-warning hover:opacity-70 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Anulo Pagesën"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handlePrint(row.id)}
                    className="p-1 text-success hover:opacity-70 transition-colors cursor-pointer"
                    title="Print"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  {canEdit ? (
                    <button
                      onClick={() => handleEdit(row.id)}
                      className="p-1 text-primary hover:text-primary-hover transition-colors cursor-pointer"
                      title="Edito"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      disabled
                      className="p-1 text-gray-300 cursor-not-allowed"
                      title="Nuk mund të editohet - ka pagesa të regjistruara"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(row.id)}
                    disabled={deleteInvoiceMutation.isLoading}
                    className="p-1 text-danger hover:opacity-70 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Fshi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              );
            }}
          />

          {/* Pagination */}
          {filteredInvoices.length > itemsPerPage && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="text-sm text-text-secondary">
                Shfaq {startIndex + 1}-{Math.min(endIndex, filteredInvoices.length)} nga {filteredInvoices.length} fatura
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={ChevronLeft}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                />
                <span className="text-sm text-text-primary px-2">
                  Faqja {currentPage} nga {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={ChevronRight}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Invoice Modal */}
      <InvoiceModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedInvoiceId(null);
        }}
        invoiceId={selectedInvoiceId}
      />

      {/* Create Invoice Modal */}
      <InvoiceModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        defaultType={invoiceType}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedInvoiceForPayment(null);
        }}
        invoice={selectedInvoiceForPayment}
      />
    </>
  );
}


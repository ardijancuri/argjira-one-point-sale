import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../Modal';
import Button from '../Button';
import { processingAPI, invoicesAPI } from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { useCompanySettings } from '../../contexts/CompanySettingsContext';
import { DollarSign, Printer } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/format';

export default function ProcessingDetailsModal({ isOpen, onClose, recordId }) {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { settings: companySettings } = useCompanySettings();

  const { data: recordResponse, isLoading, error } = useQuery({
    queryKey: ['processing', recordId],
    queryFn: () => processingAPI.getById(recordId),
    enabled: !!recordId && isOpen,
  });

  const payInvoiceMutation = useMutation({
    mutationFn: (id) => invoicesAPI.payFull(id),
    onSuccess: () => {
      showAlert('Fatura u pagua me sukses!', 'success');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['processing'] });
      queryClient.invalidateQueries({ queryKey: ['processing-statistics'] });
    },
    onError: (error) => {
      showAlert(error.response?.data?.error || 'Gabim në pagimin e faturës', 'error');
    },
  });

  const record = recordResponse?.data;

  if (!isOpen) return null;

  const handlePayment = (invoiceId, invoiceType = 'out') => {
    if (!record || !invoiceId) {
      showAlert(`Fatura ${invoiceType === 'in' ? 'hyrëse' : 'dalëse'} nuk u gjet`, 'error');
      return;
    }
    
    const invoiceTypeName = invoiceType === 'in' ? 'hyrëse (Puntoria)' : 'dalëse (Klienti)';
    if (window.confirm(`Jeni të sigurt që doni të paguani faturën ${invoiceTypeName}?`)) {
      payInvoiceMutation.mutate(invoiceId);
    }
  };

  const printAllPhases = (record) => {
    if (!record) {
      showAlert('Rekordi nuk u gjet!', 'error');
      return;
    }

    const company = companySettings || {};
    const formatDate = (dateStr) => {
      if (!dateStr) return 'N/A';
      try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('sq-AL');
      } catch {
        return dateStr;
      }
    };

    // Calculate tax_rate if not available
    const taxRate = record.tax_rate || (record.subtotal_sale && record.tax_amount_sale 
      ? Math.round((record.tax_amount_sale / record.subtotal_sale) * 100) 
      : 0);

    const htmlDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fletë Pranimi - ${record.doc_in || 'Përpunim'}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; font-size: 12px; color: #333; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #d93025; }
          .company-info h1 { margin: 0 0 8px 0; color: #d93025; font-size: 22px; }
          .company-info p { margin: 3px 0; color: #555; font-size: 11px; }
          .doc-info { text-align: right; }
          .doc-info h2 { margin: 0 0 10px 0; color: #d93025; font-size: 18px; text-transform: uppercase; }
          .doc-info p { margin: 4px 0; font-size: 12px; }
          .doc-number { font-size: 16px; font-weight: bold; color: #d93025; background: #fce8e6; padding: 8px 15px; border-radius: 5px; display: inline-block; margin-bottom: 10px; }
          .phase-section { margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #d93025; page-break-inside: avoid; }
          .phase-section h3 { margin: 0 0 15px 0; color: #d93025; font-size: 16px; font-weight: bold; }
          .phase-section h4 { margin: 10px 0 8px 0; color: #666; font-size: 14px; }
          .info-row { display: flex; margin: 6px 0; }
          .info-label { width: 180px; font-weight: bold; color: #666; }
          .info-value { flex: 1; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #d93025; color: white; font-weight: 600; }
          .number { text-align: right; }
          .total-row { font-weight: bold; font-size: 13px; background: #fce8e6; }
          .total-row td { border-top: 2px solid #d93025; }
          .summary-section { margin: 30px 0; padding: 20px; background: #e8f5e9; border-radius: 8px; border-left: 4px solid #10b981; }
          .summary-section h3 { color: #10b981; margin: 0 0 15px 0; }
          .summary-row { display: flex; justify-content: space-between; margin: 8px 0; padding: 8px 0; border-bottom: 1px solid #c8e6c9; }
          .summary-row:last-child { border-bottom: none; font-weight: bold; font-size: 14px; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; }
          .signature { width: 200px; text-align: center; }
          .signature-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 10px; font-size: 11px; color: #666; }
          .watermark { position: fixed; bottom: 20px; right: 20px; font-size: 10px; color: #ccc; }
          .divider { margin: 30px 0; border-top: 2px dashed #ddd; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1>📋 ${company.name || 'Kompania'}</h1>
            <p><strong>NIPT:</strong> ${company.nipt || 'N/A'}</p>
            <p><strong>Adresa:</strong> ${company.address || 'N/A'}</p>
            <p><strong>Tel:</strong> ${company.phone || 'N/A'}</p>
          </div>
          <div class="doc-info">
            <div class="doc-number">${record.doc_in || 'N/A'}</div>
            <h2>PËRPUNIM ARI</h2>
            <p><strong>Data e Krijimit:</strong> ${formatDate(record.date_in || record.date)}</p>
            <p><strong>Ora:</strong> ${new Date().toLocaleTimeString('sq-AL')}</p>
          </div>
        </div>

        <!-- Phase 1: Pranim -->
        <div class="phase-section">
          <h3>📥 FAZA 1: PRANIM ARI TË VJETËR</h3>
          <h4>👤 Informacione Klienti</h4>
          <div class="info-row"><span class="info-label">Emri:</span><span class="info-value"><strong>${record.client_name || 'N/A'}</strong></span></div>
          ${record.client_doc ? `<div class="info-row"><span class="info-label">Nr. Dok. Klientit:</span><span class="info-value">${record.client_doc}</span></div>` : ''}
          <div class="info-row"><span class="info-label">Data e Pranimit:</span><span class="info-value">${formatDate(record.date_in || record.date)}</span></div>
          <div class="info-row"><span class="info-label">Nr. Fletë Pranimi:</span><span class="info-value"><strong>${record.doc_in || 'N/A'}</strong></span></div>
          
          <table>
            <thead>
              <tr>
                <th>Përshkrimi</th>
                <th class="number">Sasia</th>
                <th class="number">Çmimi/g</th>
                <th class="number">Totali</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Ari i Vjetër për Përpunim 585</strong></td>
                <td class="number">${formatNumber(record.quantity || 0)}g</td>
                <td class="number">${formatCurrency(record.price_in || 0)}</td>
                <td class="number"><strong>${formatCurrency(record.total_in || 0)}</strong></td>
              </tr>
              <tr class="total-row">
                <td colspan="3" style="text-align: right;">TOTALI EVIDENCË:</td>
                <td class="number">${formatCurrency(record.total_in || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Phase 2: Dërgim -->
        ${record.date_send ? `
        <div class="phase-section">
          <h3>🚚 FAZA 2: DËRGIM NË PUNTORINË</h3>
          <div class="info-row"><span class="info-label">Puntoria:</span><span class="info-value"><strong>${record.workshop_name || 'N/A'}</strong></span></div>
          <div class="info-row"><span class="info-label">Data e Dërgimit:</span><span class="info-value">${formatDate(record.date_send)}</span></div>
          ${record.doc_send ? `<div class="info-row"><span class="info-label">Nr. Fletë Dërgimi:</span><span class="info-value"><strong>${record.doc_send}</strong></span></div>` : ''}
        </div>
        ` : ''}

        <!-- Phase 3: Kthim -->
        ${record.date_return ? `
        <div class="phase-section">
          <h3>🔄 FAZA 3: KTHIM NGA PUNTORIA</h3>
          <div class="info-row"><span class="info-label">Data e Kthimit:</span><span class="info-value">${formatDate(record.date_return)}</span></div>
          ${record.invoice_workshop ? `<div class="info-row"><span class="info-label">Nr. Faturë Puntoria:</span><span class="info-value">${record.invoice_workshop}</span></div>` : ''}
          ${record.invoice_in ? `<div class="info-row"><span class="info-label">Nr. Faturë Hyrëse:</span><span class="info-value"><strong>${record.invoice_in}</strong></span></div>` : ''}
          
          <table>
            <thead>
              <tr>
                <th>Përshkrimi</th>
                <th class="number">Sasia</th>
                <th class="number">Çmimi/g</th>
                <th class="number">Totali</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Ari i Përpunuar 585</strong></td>
                <td class="number">${formatNumber(record.quantity || 0)}g</td>
                <td class="number">${formatCurrency(record.price_workshop || 0)}</td>
                <td class="number"><strong>${formatCurrency(record.total_workshop || 0)}</strong></td>
              </tr>
              <tr class="total-row">
                <td colspan="3" style="text-align: right;">TOTALI KOSTO:</td>
                <td class="number">${formatCurrency(record.total_workshop || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Phase 4: Shitje -->
        ${record.date_sale ? `
        <div class="phase-section">
          <h3>💰 FAZA 4: SHITJE TE KLIENTI</h3>
          <div class="info-row"><span class="info-label">Data e Shitjes:</span><span class="info-value">${formatDate(record.date_sale)}</span></div>
          ${record.invoice_out ? `<div class="info-row"><span class="info-label">Nr. Faturë Dalëse:</span><span class="info-value"><strong>${record.invoice_out}</strong></span></div>` : ''}
          
          <table>
            <thead>
              <tr>
                <th>Përshkrimi</th>
                <th class="number">Sasia</th>
                <th class="number">Çmimi/g</th>
                <th class="number">TVSH %</th>
                <th class="number">Totali</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Ari i Përpunuar 585</strong></td>
                <td class="number">${formatNumber(record.quantity || 0)}g</td>
                <td class="number">${formatCurrency(record.price_sale || 0)}</td>
                <td class="number">${taxRate}%</td>
                <td class="number"><strong>${formatCurrency(record.total_sale || 0)}</strong></td>
              </tr>
              <tr>
                <td colspan="4" style="text-align: right;">Nën-totali:</td>
                <td class="number">${formatCurrency(record.subtotal_sale || 0)}</td>
              </tr>
              <tr>
                <td colspan="4" style="text-align: right;">TVSH:</td>
                <td class="number">${formatCurrency(record.tax_amount_sale || 0)}</td>
              </tr>
              <tr class="total-row">
                <td colspan="4" style="text-align: right;">TOTALI ME TVSH:</td>
                <td class="number">${formatCurrency(record.total_sale || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        ` : ''}

        <!-- Summary Section -->
        <div class="summary-section">
          <h3>📊 PËRMBLEDHJE</h3>
          <div class="summary-row">
            <span>Sasia e Përpunuar:</span>
            <span><strong>${formatNumber(record.quantity || 0)}g</strong></span>
          </div>
          ${record.total_workshop ? `
          <div class="summary-row">
            <span>Totali Kosto (Puntoria):</span>
            <span><strong>${formatCurrency(record.total_workshop)}</strong></span>
          </div>
          ` : ''}
          ${record.total_sale ? `
          <div class="summary-row">
            <span>Totali Shitje (me TVSH):</span>
            <span><strong>${formatCurrency(record.total_sale)}</strong></span>
          </div>
          ` : ''}
          ${record.profit !== undefined ? `
          <div class="summary-row">
            <span>Fitimi:</span>
            <span><strong style="color: ${(record.profit || 0) >= 0 ? '#10b981' : '#d93025'};">
              ${formatCurrency(record.profit || 0)}
            </strong></span>
          </div>
          ` : ''}
        </div>

        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffc107;">
          <p style="margin: 0; font-size: 11px; color: #856404;"><strong>⚠️ Shënim:</strong> Ky dokument përmban të gjitha detajet e procesit të përpunimit të arit përmes 4 fazave: Pranim, Dërgim, Kthim dhe Shitje.</p>
        </div>

        <div class="footer">
          <div class="signature">
            <div class="signature-line">Dorëzuesi (Klienti)</div>
          </div>
          <div class="signature">
            <div class="signature-line">Pranuesi (Kompania)</div>
          </div>
        </div>

        <div class="watermark">Gjeneruar nga Invoice Pro | ${new Date().toLocaleString('sq-AL')}</div>
      </body>
      </html>
    `;

    try {
      const win = window.open('', '_blank');
      if (!win) {
        showAlert('Popup u bllokua. Lejoni popup-et për këtë faqe dhe provoni përsëri.', 'error');
        return;
      }
      win.document.write(htmlDoc);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    } catch (error) {
      showAlert('Gabim në printimin e dokumentit', 'error');
      console.error('Print error:', error);
    }
  };

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Duke ngarkuar..." size="max-w-4xl">
        <div className="text-center py-8">
          <p className="text-text-secondary text-sm">Duke ngarkuar detajet...</p>
        </div>
      </Modal>
    );
  }

  if (error || !record) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Gabim" size="max-w-4xl">
        <div className="text-center py-8">
          <p className="text-danger text-sm">Gabim në ngarkimin e detajeve</p>
        </div>
      </Modal>
    );
  }

  const date = record.date_in || record.date;
  const formattedDate = date ? new Date(date).toLocaleDateString('sq-AL') : 'N/A';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={record.doc_in || 'Detajet e Përpunimit'} size="max-w-4xl">

      {/* Info Panels Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-100 p-3 rounded-lg">
          <label className="text-xs text-gray-600 uppercase block mb-1">KLIENTI</label>
          <div className="text-xs font-semibold text-gray-900">{record.client_name || 'N/A'}</div>
        </div>
        <div className="bg-gray-100 p-3 rounded-lg">
          <label className="text-xs text-gray-600 uppercase block mb-1">PUNTORI</label>
          <div className="text-xs font-semibold text-gray-900">{record.workshop_name || 'N/A'}</div>
        </div>
        <div className="bg-gray-100 p-3 rounded-lg">
          <label className="text-xs text-gray-600 uppercase block mb-1">DOKUMENTI</label>
          <div className="text-xs font-semibold text-gray-900">{record.doc_in || 'N/A'}</div>
        </div>
        <div className="bg-gray-100 p-3 rounded-lg">
          <label className="text-xs text-gray-600 uppercase block mb-1">DATA</label>
          <div className="text-xs font-semibold text-gray-900">{formattedDate}</div>
        </div>
      </div>

      {/* Cost and Sale Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Workshop Cost Panel */}
        <div className="border-2 border-red-500 rounded-lg p-4">
          <h3 className="text-red-600 font-bold text-xs uppercase mb-3">PUNTORIA (KOSTO)</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center pb-1.5 border-b border-gray-200">
              <span className="text-gray-600 text-xs">Çmimi/g:</span>
              <span className="text-red-600 font-semibold text-xs">{formatCurrency(record.price_workshop || 0)}</span>
            </div>
            <div className="flex justify-between items-center pb-1.5 border-b border-gray-200">
              <span className="text-gray-600 text-xs">Totali:</span>
              <span className="text-red-600 font-semibold text-xs">{formatCurrency(record.total_workshop || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-xs">Borxhi:</span>
              <span className="text-red-600 font-semibold text-xs">{formatCurrency(record.total_workshop || 0)}</span>
            </div>
          </div>
        </div>

        {/* Client Sale Panel */}
        <div className="border-2 border-blue-500 rounded-lg p-4">
          <h3 className="text-blue-600 font-bold text-xs uppercase mb-3">KLIENTI (SHITJE)</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center pb-1.5 border-b border-gray-200">
              <span className="text-gray-600 text-xs">Çmimi/g:</span>
              <span className="text-blue-600 font-semibold text-xs">{formatCurrency(record.price_sale || 0)}</span>
            </div>
            <div className="flex justify-between items-center pb-1.5 border-b border-gray-200">
              <span className="text-gray-600 text-xs">Totali:</span>
              <span className="text-blue-600 font-semibold text-xs">{formatCurrency(record.total_sale || 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-xs">Borxhi:</span>
              <span className="text-blue-600 font-semibold text-xs">{formatCurrency(record.total_sale || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Processed Quantity and Profit Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Processed Quantity Section */}
        <div className="bg-purple-50 border-2 border-purple-200 p-4 rounded-lg text-center">
          <label className="text-xs text-purple-700 uppercase block mb-2">SASIA E PËRPUNUAR</label>
          <div className="text-lg font-bold text-purple-900">
            {formatNumber(record.quantity || 0)}g
          </div>
        </div>

        {/* Profit Section */}
        <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg text-center">
          <label className="text-xs text-green-700 uppercase block mb-2">FITIMI</label>
          <div className="text-lg font-bold text-green-900">
            {formatCurrency(record.profit || 0)}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end pt-3 border-t border-gray-200">
        <Button
          variant="secondary"
          icon={Printer}
          onClick={() => printAllPhases(record)}
          size="sm"
          className="text-xs"
        >
          Print Fletë Pranimi
        </Button>
        {record.invoice_in_id && (
          <Button
            variant="danger"
            icon={DollarSign}
            onClick={() => handlePayment(record.invoice_in_id, 'in')}
            disabled={payInvoiceMutation.isLoading}
            size="sm"
            className="text-xs"
          >
            Paguaj Puntoria
          </Button>
        )}
        {record.invoice_out_id && (
          <Button
            variant="primary"
            icon={DollarSign}
            onClick={() => handlePayment(record.invoice_out_id, 'out')}
            disabled={payInvoiceMutation.isLoading}
            size="sm"
            className="text-xs"
          >
            Paguaj Klienti
          </Button>
        )}
      </div>
    </Modal>
  );
}


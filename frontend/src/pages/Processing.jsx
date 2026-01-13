import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TopBar from '../components/Layout/TopBar';
import DataTable from '../components/DataTable';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import Badge from '../components/Badge';
import InvoiceStatCard from '../components/InvoiceStatCard';
import { processingAPI, clientsAPI, invoicesAPI } from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import { useCompanySettings } from '../contexts/CompanySettingsContext';
import QuickClientModal from '../components/modals/QuickClientModal';
import ProcessingDetailsModal from '../components/modals/ProcessingDetailsModal';
import { Plus, Printer, UserPlus, Trash2, DollarSign } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/format';

export default function Processing() {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { settings: companySettings } = useCompanySettings();
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [quickClientModalOpen, setQuickClientModalOpen] = useState(false);
  const [quickClientType, setQuickClientType] = useState('client');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [formData, setFormData] = useState({
    // Phase 1: Pranim
    client_id: '',
    client_doc: '',
    date_in: new Date().toISOString().split('T')[0],
    quantity: '',
    price_in: '',
    doc_in: '',
    
    // Phase 2: Dërgim
    workshop_id: '',
    date_send: '',
    doc_send: '',
    
    // Phase 3: Kthim
    date_return: '',
    invoice_workshop: '',
    invoice_in: '',
    price_workshop: '',
    
    // Phase 4: Shitje
    date_sale: '',
    price_sale: '',
    invoice_out: '',
    tax_rate: 18,
    
    description: '',
  });

  // Helper function to generate document numbers
  const getNextDocNumber = (prefix) => {
    const year = new Date().getFullYear();
    const prefixYear = `${prefix}-${year}-`;
    const timestamp = Date.now();
    return `${prefixYear}${String(Math.floor(timestamp / 1000) % 10000).padStart(4, '0')}`;
  };

  const getNextInvoiceNumber = (type) => {
    const year = new Date().getFullYear();
    const prefix = type === 'in' ? 'Doc' : 'FD';
    const prefixYear = `${prefix}-${year}-`;
    const timestamp = Date.now();
    return `${prefixYear}${String(Math.floor(timestamp / 1000) % 10000).padStart(4, '0')}`;
  };

  const { data: recordsResponse } = useQuery({
    queryKey: ['processing'],
    queryFn: () => processingAPI.getAll()
  });

  const { data: statisticsResponse } = useQuery({
    queryKey: ['processing-statistics', dateFrom, dateTo],
    queryFn: () => processingAPI.getStatistics({ dateFrom, dateTo })
  });

  const { data: clientsResponse } = useQuery({
    queryKey: ['processing-clients'],
    queryFn: () => clientsAPI.getByType('client')
  });

  const { data: workshopsResponse } = useQuery({
    queryKey: ['processing-workshops'],
    queryFn: () => clientsAPI.getByType('producer')
  });

  const records = Array.isArray(recordsResponse?.data) ? recordsResponse.data : [];
  const clients = Array.isArray(clientsResponse?.data) ? clientsResponse.data : [];
  const workshops = Array.isArray(workshopsResponse?.data) ? workshopsResponse.data : [];

  const createMutation = useMutation({
    mutationFn: (data) => processingAPI.create(data),
    onSuccess: () => {
      showAlert('Procesi i përpunimit 4-fazor u përfundua me sukses! 2 Fatura u krijuan.', 'success');
      setModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['processing'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      showAlert(error.response?.data?.error || 'Gabim në krijimin e procesit', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => processingAPI.delete(id),
    onSuccess: () => {
      showAlert('Përpunimi u fshi me sukses!', 'success');
      queryClient.invalidateQueries({ queryKey: ['processing'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      showAlert(error.response?.data?.error || 'Gabim në fshirjen e përpunimit', 'error');
    },
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

  const handleDelete = (id) => {
    if (window.confirm('Jeni të sigurt që doni të fshini këtë përpunim? Kjo do të fshijë edhe faturat e lidhura.')) {
      deleteMutation.mutate(id);
    }
  };

  const handlePay = (invoiceId, invoiceType = 'out') => {
    if (!invoiceId) {
      showAlert(`Fatura ${invoiceType === 'in' ? 'hyrëse' : 'dalëse'} nuk u gjet`, 'error');
      return;
    }
    const invoiceTypeName = invoiceType === 'in' ? 'hyrëse (Puntoria)' : 'dalëse (Klienti)';
    if (window.confirm(`Jeni të sigurt që doni të paguani faturën ${invoiceTypeName}?`)) {
      payInvoiceMutation.mutate(invoiceId);
    }
  };

  const handlePrintAllPDF = async () => {
    try {
      const filters = {};
      
      if (dateFrom) {
        filters.dateFrom = dateFrom;
      }
      if (dateTo) {
        filters.dateTo = dateTo;
      }
      
      const response = await processingAPI.generatePDF(filters);
      
      if (response.status === 404 || (response.data && typeof response.data === 'object' && !(response.data instanceof Blob) && response.data.error)) {
        showAlert(response.data?.error || 'Nuk u gjetën përpunime për këtë filtrim', 'warning');
        return;
      }
      
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.download = `perpunime-${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      if (error.response?.status === 404) {
        showAlert(error.response?.data?.error || 'Nuk u gjetën përpunime për këtë filtrim', 'warning');
      } else {
        showAlert('Gabim në gjenerimin e PDF', 'error');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      client_doc: '',
      date_in: new Date().toISOString().split('T')[0],
      quantity: '',
      price_in: '',
      doc_in: '',
      workshop_id: '',
      date_send: '',
      doc_send: '',
      date_return: '',
      invoice_workshop: '',
      invoice_in: '',
      price_workshop: '',
      date_sale: '',
      price_sale: '',
      invoice_out: '',
      tax_rate: 18,
      description: '',
    });
    setCurrentPhase(1);
  };

  // Initialize document numbers when modal opens
  useEffect(() => {
    if (modalOpen) {
      setFormData(prev => ({
        ...prev,
        doc_in: prev.doc_in || getNextDocNumber('FletePranimi'),
        doc_send: prev.doc_send || getNextDocNumber('FleteDergese'),
        invoice_in: prev.invoice_in || getNextInvoiceNumber('in'),
        invoice_out: prev.invoice_out || getNextInvoiceNumber('out'),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen]);

  // Calculate Phase 1 total
  const total_in = (formData.quantity && formData.price_in)
    ? (parseFloat(formData.quantity) || 0) * (parseFloat(formData.price_in) || 0)
    : 0;

  // Calculate Phase 3 totals
  const total_workshop = (formData.quantity && formData.price_workshop)
    ? (parseFloat(formData.quantity) || 0) * (parseFloat(formData.price_workshop) || 0)
    : 0;

  // Calculate Phase 4 totals
  const subtotal_sale = (formData.quantity && formData.price_sale)
    ? (parseFloat(formData.quantity) || 0) * (parseFloat(formData.price_sale) || 0)
    : 0;
  const tax_rate = parseFloat(formData.tax_rate) || 0;
  const tax_amount_sale = subtotal_sale * (tax_rate / 100);
  const total_sale = subtotal_sale + tax_amount_sale;
  const profit = subtotal_sale - total_workshop; // Revenue (without tax) - Cost

  // Get client and workshop names
  const selectedClient = clients.find(c => c.id === formData.client_id);
  const selectedWorkshop = workshops.find(w => w.id === formData.workshop_id);

  // Handle quick client creation
  const handleQuickClientCreated = (newClient) => {
    if (quickClientType === 'client') {
      setFormData(prev => ({ ...prev, client_id: newClient.id }));
    } else if (quickClientType === 'producer') {
      setFormData(prev => ({ ...prev, workshop_id: newClient.id }));
    }
    setQuickClientModalOpen(false);
  };

  const openQuickClientModal = (type) => {
    setQuickClientType(type);
    setQuickClientModalOpen(true);
  };

  const handleRowClick = (row) => {
    setSelectedRecordId(row.id);
    setViewModalOpen(true);
  };

  const handlePhase1Next = () => {
    if (!formData.client_id || !formData.quantity || !formData.price_in || !formData.date_in) {
      showAlert('Plotësoni të gjitha fushat e detyrueshme!', 'error');
      return;
    }
    const qty = parseFloat(formData.quantity);
    const price = parseFloat(formData.price_in);
    if (isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
      showAlert('Sasia dhe çmimi duhet të jenë numra pozitivë!', 'error');
      return;
    }
    if (!formData.doc_in) {
      setFormData(prev => ({ ...prev, doc_in: getNextDocNumber('FletePranimi') }));
    }
    // Prepare Phase 2
    if (!formData.doc_send) {
      setFormData(prev => ({ ...prev, doc_send: getNextDocNumber('FleteDergese') }));
    }
    setCurrentPhase(2);
  };

  const handlePhase2Next = () => {
    if (!formData.workshop_id || !formData.date_send) {
      showAlert('Plotësoni të gjitha fushat e detyrueshme!', 'error');
      return;
    }
    if (!formData.doc_send) {
      setFormData(prev => ({ ...prev, doc_send: getNextDocNumber('FleteDergese') }));
    }
    // Prepare Phase 3 - set return date to 7 days after send date
    const sendDate = new Date(formData.date_send);
    const returnDate = new Date(sendDate);
    returnDate.setDate(returnDate.getDate() + 7);
    setFormData(prev => ({
      ...prev,
      date_return: formData.date_return || returnDate.toISOString().split('T')[0],
      invoice_in: prev.invoice_in || getNextInvoiceNumber('in'),
    }));
    setCurrentPhase(3);
  };

  const handlePhase3Next = () => {
    if (!formData.price_workshop || !formData.invoice_workshop || !formData.date_return) {
      showAlert('Plotësoni të gjitha fushat e detyrueshme!', 'error');
      return;
    }
    const price = parseFloat(formData.price_workshop);
    if (isNaN(price) || price <= 0) {
      showAlert('Çmimi i punës dorës duhet të jetë numër pozitiv!', 'error');
      return;
    }
    // Prepare Phase 4
    setFormData(prev => ({
      ...prev,
      date_sale: prev.date_sale || new Date().toISOString().split('T')[0],
      invoice_out: prev.invoice_out || getNextInvoiceNumber('out'),
    }));
    setCurrentPhase(4);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.price_sale || !formData.date_sale) {
      showAlert('Plotësoni të gjitha fushat e detyrueshme!', 'error');
      return;
    }
    const price = parseFloat(formData.price_sale);
    if (isNaN(price) || price <= 0) {
      showAlert('Çmimi i shitjes duhet të jetë numër pozitiv!', 'error');
      return;
    }

    const data = {
      // Phase 1
      client_id: formData.client_id,
      client_doc: formData.client_doc,
      date_in: formData.date_in,
      quantity: formData.quantity,
      price_in: formData.price_in,
      doc_in: formData.doc_in || getNextDocNumber('FletePranimi'),
      
      // Phase 2
      workshop_id: formData.workshop_id,
      date_send: formData.date_send,
      doc_send: formData.doc_send || getNextDocNumber('FleteDergese'),
      
      // Phase 3
      date_return: formData.date_return,
      invoice_workshop: formData.invoice_workshop,
      invoice_in: formData.invoice_in,
      price_workshop: formData.price_workshop,
      
      // Phase 4
      date_sale: formData.date_sale,
      price_sale: formData.price_sale,
      invoice_out: formData.invoice_out,
      tax_rate: formData.tax_rate || 18,
      
      description: formData.description,
    };

    createMutation.mutate(data);
  };

  // Print functions for each phase
  const printPhase1 = () => {
    if (!formData.client_id || !formData.quantity || !formData.price_in || !formData.date_in) {
      showAlert('Plotësoni të gjitha fushat e detyrueshme përpara se të printoni!', 'error');
      return;
    }

    const client = selectedClient;
    const company = companySettings || {};
    const total = total_in;

    const htmlDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fletë Pranimi - ${formData.doc_in}</title>
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
          .section { margin: 25px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #d93025; }
          .section h3 { margin: 0 0 15px 0; color: #d93025; font-size: 14px; }
          .info-row { display: flex; margin: 8px 0; }
          .info-label { width: 150px; font-weight: bold; color: #666; }
          .info-value { flex: 1; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #d93025; color: white; font-weight: 600; }
          .number { text-align: right; }
          .total-row { font-weight: bold; font-size: 14px; background: #fce8e6; }
          .total-row td { border-top: 2px solid #d93025; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; }
          .signature { width: 200px; text-align: center; }
          .signature-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 10px; font-size: 11px; color: #666; }
          .watermark { position: fixed; bottom: 20px; right: 20px; font-size: 10px; color: #ccc; }
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
            <div class="doc-number">${formData.doc_in}</div>
            <h2>FLETË PRANIMI</h2>
            <p><strong>Data:</strong> ${formData.date_in}</p>
            <p><strong>Ora:</strong> ${new Date().toLocaleTimeString('sq-AL')}</p>
          </div>
        </div>
        
        <div class="section">
          <h3>👤 Klienti</h3>
          <div class="info-row"><span class="info-label">Emri:</span><span class="info-value"><strong>${client?.name || 'N/A'}</strong></span></div>
          <div class="info-row"><span class="info-label">ID/NIPT:</span><span class="info-value">${client?.id_number || 'N/A'}</span></div>
          <div class="info-row"><span class="info-label">Tel:</span><span class="info-value">${client?.phone || 'N/A'}</span></div>
          <div class="info-row"><span class="info-label">Adresa:</span><span class="info-value">${client?.address || 'N/A'}</span></div>
          ${formData.client_doc ? `<div class="info-row"><span class="info-label">Nr. Dok. Klientit:</span><span class="info-value">${formData.client_doc}</span></div>` : ''}
        </div>
        
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Përshkrimi</th>
              <th class="number">Sasia</th>
              <th class="number">Çmimi/g</th>
              <th class="number">Totali</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td><strong>Ari i Vjetër për Përpunim 585</strong></td>
              <td class="number">${formatNumber(formData.quantity)}g</td>
              <td class="number">${formatCurrency(formData.price_in)}</td>
              <td class="number">${formatCurrency(total)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="4" style="text-align: right;">TOTALI EVIDENCË:</td>
              <td class="number">${formatCurrency(total)}</td>
            </tr>
          </tbody>
        </table>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffc107;">
          <p style="margin: 0; font-size: 11px; color: #856404;"><strong>⚠️ Shënim:</strong> Ky dokument vërteton pranimin e arit të vjetër për shërbimin e përpunimit. Totali është vetëm për evidencë dhe nuk përfaqëson transaksion financiar.</p>
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

  const printPhase2 = () => {
    if (!formData.workshop_id || !formData.date_send) {
      showAlert('Plotësoni të gjitha fushat e detyrueshme përpara se të printoni!', 'error');
      return;
    }

    const workshop = selectedWorkshop;
    const client = selectedClient;
    const company = companySettings || {};
    const total = total_in;

    const htmlDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fletë Dërgesë - ${formData.doc_send}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; font-size: 12px; color: #333; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #f9ab00; }
          .company-info h1 { margin: 0 0 8px 0; color: #f9ab00; font-size: 22px; }
          .company-info p { margin: 3px 0; color: #555; font-size: 11px; }
          .doc-info { text-align: right; }
          .doc-info h2 { margin: 0 0 10px 0; color: #f9ab00; font-size: 18px; text-transform: uppercase; }
          .doc-info p { margin: 4px 0; font-size: 12px; }
          .doc-number { font-size: 16px; font-weight: bold; color: #f9ab00; background: #fef7e0; padding: 8px 15px; border-radius: 5px; display: inline-block; margin-bottom: 10px; }
          .dual-section { display: flex; gap: 20px; margin: 25px 0; }
          .section { flex: 1; padding: 20px; background: #f8f9fa; border-radius: 8px; }
          .section.from { border-left: 4px solid #d93025; }
          .section.to { border-left: 4px solid #1e8e3e; }
          .section h3 { margin: 0 0 15px 0; font-size: 14px; }
          .section.from h3 { color: #d93025; }
          .section.to h3 { color: #1e8e3e; }
          .info-row { display: flex; margin: 8px 0; }
          .info-label { width: 100px; font-weight: bold; color: #666; font-size: 11px; }
          .info-value { flex: 1; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f9ab00; color: white; font-weight: 600; }
          .number { text-align: right; }
          .total-row { font-weight: bold; font-size: 14px; background: #fef7e0; }
          .total-row td { border-top: 2px solid #f9ab00; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; }
          .signature { width: 200px; text-align: center; }
          .signature-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 10px; font-size: 11px; color: #666; }
          .ref-box { background: #e8f0fe; padding: 12px; border-radius: 6px; margin: 20px 0; border: 1px solid #90caf9; }
          .watermark { position: fixed; bottom: 20px; right: 20px; font-size: 10px; color: #ccc; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1>🚚 ${company.name || 'Kompania'}</h1>
            <p><strong>NIPT:</strong> ${company.nipt || 'N/A'}</p>
            <p><strong>Adresa:</strong> ${company.address || 'N/A'}</p>
            <p><strong>Tel:</strong> ${company.phone || 'N/A'}</p>
          </div>
          <div class="doc-info">
            <div class="doc-number">${formData.doc_send}</div>
            <h2>FLETË DËRGESË</h2>
            <p><strong>Data:</strong> ${formData.date_send}</p>
            <p><strong>Ora:</strong> ${new Date().toLocaleTimeString('sq-AL')}</p>
          </div>
        </div>
        
        <div class="ref-box">
          <p style="margin: 0; font-size: 11px; color: #1565c0;"><strong>📋 Referenca:</strong> Fletë Pranimi Nr. ${formData.doc_in} | Klienti: ${client?.name || 'N/A'}</p>
        </div>
        
        <div class="dual-section">
          <div class="section from">
            <h3>📤 Dërguesi</h3>
            <div class="info-row"><span class="info-label">Kompania:</span><span class="info-value"><strong>${company.name || 'Kompania'}</strong></span></div>
            <div class="info-row"><span class="info-label">NIPT:</span><span class="info-value">${company.nipt || 'N/A'}</span></div>
            <div class="info-row"><span class="info-label">Adresa:</span><span class="info-value">${company.address || 'N/A'}</span></div>
          </div>
          <div class="section to">
            <h3>📥 Marrësi (Puntoria)</h3>
            <div class="info-row"><span class="info-label">Emri:</span><span class="info-value"><strong>${workshop?.name || 'N/A'}</strong></span></div>
            <div class="info-row"><span class="info-label">ID/NIPT:</span><span class="info-value">${workshop?.id_number || 'N/A'}</span></div>
            <div class="info-row"><span class="info-label">Tel:</span><span class="info-value">${workshop?.phone || 'N/A'}</span></div>
            <div class="info-row"><span class="info-label">Adresa:</span><span class="info-value">${workshop?.address || 'N/A'}</span></div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Përshkrimi</th>
              <th class="number">Sasia</th>
              <th class="number">Çmimi/g</th>
              <th class="number">Totali</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td><strong>Ari i Vjetër për Përpunim 585</strong><br><span style="font-size: 10px; color: #666;">Për shërbim përpunimi</span></td>
              <td class="number">${formatNumber(formData.quantity)}g</td>
              <td class="number">${formatCurrency(formData.price_in)}</td>
              <td class="number">${formatCurrency(total)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="4" style="text-align: right;">TOTALI EVIDENCË:</td>
              <td class="number">${formatCurrency(total)}</td>
            </tr>
          </tbody>
        </table>
        
        <div style="background: #e6f4ea; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #a5d6a7;">
          <p style="margin: 0; font-size: 11px; color: #2e7d32;"><strong>📝 Qëllimi:</strong> Material për përpunim. Pas përfundimit të punës, puntoria do të kthejë produktin e përpunuar bashkë me faturën e shërbimit.</p>
        </div>
        
        <div class="footer">
          <div class="signature">
            <div class="signature-line">Dërguesi (Kompania)</div>
          </div>
          <div class="signature">
            <div class="signature-line">Marrësi (Puntoria)</div>
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

  const printPhase3 = () => {
    if (!formData.price_workshop || !formData.invoice_workshop || !formData.date_return) {
      showAlert('Plotësoni të gjitha fushat e detyrueshme përpara se të printoni!', 'error');
      return;
    }

    const workshop = selectedWorkshop;
    const company = companySettings || {};
    const total = total_workshop;

    const htmlDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Faturë Hyrëse - ${formData.invoice_in}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; font-size: 12px; color: #333; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #1e8e3e; }
          .company-info h1 { margin: 0 0 8px 0; color: #1e8e3e; font-size: 22px; }
          .company-info p { margin: 3px 0; color: #555; font-size: 11px; }
          .doc-info { text-align: right; }
          .doc-info h2 { margin: 0 0 10px 0; color: #1e8e3e; font-size: 18px; text-transform: uppercase; }
          .doc-info p { margin: 4px 0; font-size: 12px; }
          .doc-number { font-size: 16px; font-weight: bold; color: #1e8e3e; background: #e6f4ea; padding: 8px 15px; border-radius: 5px; display: inline-block; margin-bottom: 10px; }
          .section { margin: 25px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #1e8e3e; }
          .section h3 { margin: 0 0 15px 0; color: #1e8e3e; font-size: 14px; }
          .info-row { display: flex; margin: 8px 0; }
          .info-label { width: 150px; font-weight: bold; color: #666; }
          .info-value { flex: 1; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #1e8e3e; color: white; font-weight: 600; }
          .number { text-align: right; }
          .total-row { font-weight: bold; font-size: 14px; background: #e6f4ea; }
          .total-row td { border-top: 2px solid #1e8e3e; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; }
          .signature { width: 200px; text-align: center; }
          .signature-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 10px; font-size: 11px; color: #666; }
          .watermark { position: fixed; bottom: 20px; right: 20px; font-size: 10px; color: #ccc; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1>📥 ${company.name || 'Kompania'}</h1>
            <p><strong>NIPT:</strong> ${company.nipt || 'N/A'}</p>
            <p><strong>Adresa:</strong> ${company.address || 'N/A'}</p>
            <p><strong>Tel:</strong> ${company.phone || 'N/A'}</p>
          </div>
          <div class="doc-info">
            <div class="doc-number">${formData.invoice_in}</div>
            <h2>FATURË HYRËSE</h2>
            <p><strong>Data:</strong> ${formData.date_return}</p>
            <p><strong>Ora:</strong> ${new Date().toLocaleTimeString('sq-AL')}</p>
          </div>
        </div>
        
        <div class="section">
          <h3>🏭 Puntoria / Prodhuesi</h3>
          <div class="info-row"><span class="info-label">Emri:</span><span class="info-value"><strong>${workshop?.name || 'N/A'}</strong></span></div>
          <div class="info-row"><span class="info-label">ID/NIPT:</span><span class="info-value">${workshop?.id_number || 'N/A'}</span></div>
          <div class="info-row"><span class="info-label">Tel:</span><span class="info-value">${workshop?.phone || 'N/A'}</span></div>
          <div class="info-row"><span class="info-label">Adresa:</span><span class="info-value">${workshop?.address || 'N/A'}</span></div>
          <div class="info-row"><span class="info-label">Nr. Faturë Puntorie:</span><span class="info-value">${formData.invoice_workshop}</span></div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Përshkrimi</th>
              <th class="number">Sasia</th>
              <th class="number">Çmimi/g</th>
              <th class="number">Totali</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td><strong>Shërbim Përpunimi - Punë Dore</strong><br><span style="font-size: 10px; color: #666;">Përpunim ari 585</span></td>
              <td class="number">${formatNumber(formData.quantity)}g</td>
              <td class="number">${formatCurrency(formData.price_workshop)}</td>
              <td class="number">${formatCurrency(total)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="4" style="text-align: right;">TOTALI:</td>
              <td class="number">${formatCurrency(total)}</td>
            </tr>
          </tbody>
        </table>
        
        <div style="background: #e6f4ea; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #a5d6a7;">
          <p style="margin: 0; font-size: 11px; color: #2e7d32;"><strong>ℹ️ Shënim:</strong> Kjo faturë regjistron shërbimin e përpunimit të arit nga puntoria.</p>
        </div>
        
        <div class="footer">
          <div class="signature">
            <div class="signature-line">Furnizuesi (Puntoria)</div>
          </div>
          <div class="signature">
            <div class="signature-line">Marrësi (Kompania)</div>
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

  const printPhase4 = () => {
    if (!formData.price_sale || !formData.date_sale) {
      showAlert('Plotësoni të gjitha fushat e detyrueshme përpara se të printoni!', 'error');
      return;
    }

    const client = selectedClient;
    const company = companySettings || {};
    const subtotal = subtotal_sale;
    const taxAmount = tax_amount_sale;
    const total = total_sale;

    const htmlDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Faturë Dalëse - ${formData.invoice_out}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; font-size: 12px; color: #333; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #4285f4; }
          .company-info h1 { margin: 0 0 8px 0; color: #4285f4; font-size: 22px; }
          .company-info p { margin: 3px 0; color: #555; font-size: 11px; }
          .doc-info { text-align: right; }
          .doc-info h2 { margin: 0 0 10px 0; color: #4285f4; font-size: 18px; text-transform: uppercase; }
          .doc-info p { margin: 4px 0; font-size: 12px; }
          .doc-number { font-size: 16px; font-weight: bold; color: #4285f4; background: #e8f0fe; padding: 8px 15px; border-radius: 5px; display: inline-block; margin-bottom: 10px; }
          .section { margin: 25px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #4285f4; }
          .section h3 { margin: 0 0 15px 0; color: #4285f4; font-size: 14px; }
          .info-row { display: flex; margin: 8px 0; }
          .info-label { width: 150px; font-weight: bold; color: #666; }
          .info-value { flex: 1; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #4285f4; color: white; font-weight: 600; }
          .number { text-align: right; }
          .total-section { text-align: right; margin-top: 20px; padding: 20px; background: #e8f0fe; border-radius: 8px; }
          .total-section p { margin: 5px 0; }
          .total-section h3 { margin: 10px 0 0 0; font-size: 20px; color: #4285f4; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; }
          .signature { width: 200px; text-align: center; }
          .signature-line { border-top: 1px solid #333; margin-top: 60px; padding-top: 10px; font-size: 11px; color: #666; }
          .watermark { position: fixed; bottom: 20px; right: 20px; font-size: 10px; color: #ccc; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1>💰 ${company.name || 'Kompania'}</h1>
            <p><strong>NIPT:</strong> ${company.nipt || 'N/A'}</p>
            <p><strong>Adresa:</strong> ${company.address || 'N/A'}</p>
            <p><strong>Tel:</strong> ${company.phone || 'N/A'}</p>
          </div>
          <div class="doc-info">
            <div class="doc-number">${formData.invoice_out}</div>
            <h2>FATURË DALËSE</h2>
            <p><strong>Data:</strong> ${formData.date_sale}</p>
            <p><strong>Ora:</strong> ${new Date().toLocaleTimeString('sq-AL')}</p>
          </div>
        </div>
        
        <div class="section">
          <h3>👤 Klienti</h3>
          <div class="info-row"><span class="info-label">Emri:</span><span class="info-value"><strong>${client?.name || 'N/A'}</strong></span></div>
          <div class="info-row"><span class="info-label">ID/NIPT:</span><span class="info-value">${client?.id_number || 'N/A'}</span></div>
          <div class="info-row"><span class="info-label">Tel:</span><span class="info-value">${client?.phone || 'N/A'}</span></div>
          <div class="info-row"><span class="info-label">Adresa:</span><span class="info-value">${client?.address || 'N/A'}</span></div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Përshkrimi</th>
              <th class="number">Sasia</th>
              <th class="number">Çmimi/g</th>
              <th class="number">TVSH</th>
              <th class="number">Totali</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td><strong>Shërbim Përpunimi - Ari 585</strong><br><span style="font-size: 10px; color: #666;">Shërbim përpunimi i arit të vjetër</span></td>
              <td class="number">${formatNumber(formData.quantity)}g</td>
              <td class="number">${formatCurrency(formData.price_sale)}</td>
              <td class="number">${formData.tax_rate}%</td>
              <td class="number">${formatCurrency(total)}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="total-section">
          <p>Nën-totali: ${formatCurrency(subtotal)}</p>
          <p>TVSH (${formData.tax_rate}%): ${formatCurrency(taxAmount)}</p>
          <h3>TOTALI: ${formatCurrency(total)}</h3>
        </div>
        
        <div style="background: #e8f0fe; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #90caf9;">
          <p style="margin: 0; font-size: 11px; color: #1565c0;"><strong>ℹ️ Shënim:</strong> Kjo faturë regjistron shërbimin e përpunimit të arit për klientin.</p>
        </div>
        
        <div class="footer">
          <div class="signature">
            <div class="signature-line">Dërguesi (Kompania)</div>
          </div>
          <div class="signature">
            <div class="signature-line">Marrësi (Klienti)</div>
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

  const statistics = statisticsResponse?.data || {};

  return (
    <>
      <TopBar title="Përpunimi i Arit" />
      <div className="space-y-4 sm:space-y-6 max-w-full">
        {/* Statistics Cards */}
        {statisticsResponse?.data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* PËRPUNIME Tile */}
            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4" style={{ borderLeftColor: '#9333ea' }}>
              <div className="text-xs text-gray-600 mb-2">PËRPUNIME</div>
              <div className="text-lg font-bold text-gray-900">{statistics.totalProcessing || 0}</div>
              <div className="text-sm font-semibold text-purple-600 mt-1">
                {formatNumber(statistics.totalQuantity || 0)}g
              </div>
            </div>

            {/* PUNTORIA Tile */}
            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4" style={{ borderLeftColor: '#ef4444' }}>
              <div className="text-xs text-gray-600 mb-2">PUNTORIA</div>
              <div className="text-sm text-gray-700 mb-1">Total: {formatCurrency(statistics.totalWorkshopCost || 0)}</div>
              <div className="text-sm font-semibold text-red-600">Borxh: {formatCurrency(statistics.totalWorkshopDebt || 0)}</div>
            </div>

            {/* KLIENTI Tile */}
            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4" style={{ borderLeftColor: '#3b82f6' }}>
              <div className="text-xs text-gray-600 mb-2">KLIENTI</div>
              <div className="text-sm text-gray-700 mb-1">Total: {formatCurrency(statistics.totalClientSale || 0)}</div>
              <div className="text-sm font-semibold text-blue-600">Borxh: {formatCurrency(statistics.totalClientDebt || 0)}</div>
            </div>

            {/* FITIMI TOTAL Tile */}
            <div className="bg-white rounded-lg shadow-sm p-4 border-l-4" style={{ borderLeftColor: '#10b981' }}>
              <div className="text-xs text-gray-600 mb-2">FITIMI TOTAL</div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(statistics.totalProfit || 0)}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-5">
            <h2 className="text-base sm:text-lg font-bold">Përpunimi i Arit - 4 Faza</h2>
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
                Print Përpunimet
              </Button>
              <Button icon={Plus} onClick={() => setModalOpen(true)} size="sm" className="w-full sm:w-auto">
                Përpunim i Ri
              </Button>
            </div>
          </div>

          <DataTable
            columns={[
              { header: 'Dokument Pranim', accessor: 'doc_in' },
              { header: 'Klienti', accessor: 'client_name' },
              { header: 'Puntoria', accessor: 'workshop_name' },
              { 
                header: 'Data Pranim', 
                accessor: 'date_in',
                render: (row) => {
                  const date = row.date_in || row.date;
                  if (!date) return '';
                  try {
                    const dateObj = new Date(date);
                    if (isNaN(dateObj.getTime())) return '';
                    return dateObj.toLocaleDateString('sq-AL');
                  } catch (error) {
                    return '';
                  }
                }
              },
              {
                header: 'Sasia',
                accessor: 'quantity',
                align: 'right',
                render: (row) => formatNumber(row.quantity) + 'g',
              },
              {
                header: 'Kosto',
                accessor: 'total_workshop',
                align: 'right',
                render: (row) => formatCurrency(row.total_workshop || 0),
              },
              {
                header: 'Totali (me TVSH)',
                accessor: 'total_sale',
                align: 'right',
                render: (row) => formatCurrency(row.total_sale || 0),
              },
              {
                header: 'Fitimi',
                accessor: 'profit',
                align: 'right',
                render: (row) => (
                  <span className={parseFloat(row.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(row.profit || 0)}
                  </span>
                ),
              },
              {
                header: 'Statusi',
                accessor: 'invoice_status',
                render: (row) => {
                  // Check workshop invoice (invoice_in) payment status
                  const invoiceInBalance = parseFloat(row.invoice_in_balance) || 0;
                  const invoiceInStatus = row.invoice_in_status || 'unpaid';
                  const isPaidIn = invoiceInStatus === 'paid' || invoiceInBalance <= 0.01;
                  
                  // Check client invoice (invoice_out) payment status
                  const invoiceOutBalance = parseFloat(row.invoice_balance) || 0;
                  const invoiceOutStatus = row.invoice_status || 'unpaid';
                  const isPaidOut = invoiceOutStatus === 'paid' || invoiceOutBalance <= 0.01;
                  
                  // Determine combined status
                  let statusText = '';
                  let badgeVariant = 'warning';
                  
                  if (isPaidIn && isPaidOut) {
                    // Both paid
                    statusText = 'E Paguar';
                    badgeVariant = 'success';
                  } else if (isPaidIn && !isPaidOut) {
                    // Only workshop paid
                    statusText = 'Puntoria e Paguar';
                    badgeVariant = 'primary';
                  } else if (!isPaidIn && isPaidOut) {
                    // Only client paid
                    statusText = 'Klienti e Paguar';
                    badgeVariant = 'primary';
                  } else {
                    // Both unpaid
                    statusText = 'E Papaguar';
                    badgeVariant = 'warning';
                  }
                  
                  return (
                    <Badge variant={badgeVariant}>
                      {statusText}
                    </Badge>
                  );
                },
              },
            ]}
            data={records}
            emptyMessage="Nuk ka përpunime"
            onRowClick={handleRowClick}
            actions={(row) => (
              <div className="flex gap-2 items-center">
                {row.invoice_in_id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePay(row.invoice_in_id, 'in');
                    }}
                    disabled={payInvoiceMutation.isLoading}
                    className="p-1 text-red-600 hover:opacity-70 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Paguaj Faturën Hyrëse (Puntoria)"
                  >
                    <DollarSign className="w-4 h-4" />
                  </button>
                )}
                {row.invoice_out_id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePay(row.invoice_out_id, 'out');
                    }}
                    disabled={payInvoiceMutation.isLoading}
                    className="p-1 text-blue-600 hover:opacity-70 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Paguaj Faturën Dalëse (Klienti)"
                  >
                    <DollarSign className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    printAllPhases(row);
                  }}
                  className="p-1 text-primary hover:opacity-70 transition-colors cursor-pointer"
                  title="Print Fletë Pranimi"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(row.id);
                  }}
                  className="p-1 text-danger hover:opacity-70 transition-colors cursor-pointer"
                  title="Fshi"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          />
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title="⚙️ Përpunim Ari - Proces i Plotë"
        size="max-w-5xl"
      >
        <div className="mb-4 sm:mb-6">
          <div className="bg-blue-50 p-3 rounded-lg mb-4 border border-blue-200">
            <p className="text-sm text-blue-800 flex items-center gap-2">
              <span>ℹ️</span> <strong>Procesi:</strong> Pranim → Dërgim në Puntorinë → Kthim nga Puntoria → Shitje te Klienti
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mb-4 border-b-2 border-gray-200 pb-2">
            {[
              { num: 1, label: '1️⃣ Pranim' },
              { num: 2, label: '2️⃣ Dërgim' },
              { num: 3, label: '3️⃣ Kthim' },
              { num: 4, label: '4️⃣ Shitje' },
            ].map((phase) => (
              <button
                key={phase.num}
                type="button"
                onClick={() => setCurrentPhase(phase.num)}
                className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all ${
                  phase.num === currentPhase
                    ? 'bg-blue-600 text-white opacity-100'
                    : phase.num < currentPhase
                    ? 'bg-green-500 text-white opacity-100'
                    : 'bg-gray-200 text-gray-500 opacity-75 hover:opacity-100'
                }`}
              >
                {phase.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Phase 1: Pranim */}
          {currentPhase === 1 && (
            <div className="space-y-4">
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                <h4 className="font-bold text-red-700 mb-3 flex items-center gap-2 text-sm">
                  <span>📥</span> FAZA 1: Pranim Ari të Vjetër
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select
                        label="Klienti"
                        value={formData.client_id}
                        onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                        options={clients.map(c => ({ value: c.id, label: c.name }))}
                        required
                        compact
                        className="text-xs"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => openQuickClientModal('client')}
                      icon={UserPlus}
                      className="px-2 py-[7px] mb-2"
                      title="Shto Klient të Ri"
                    />
                  </div>
                  <Input
                    label="Nr. Fletëdërgesës (nga Klienti)"
                    value={formData.client_doc}
                    onChange={(e) => setFormData({ ...formData, client_doc: e.target.value })}
                    placeholder="FD-12345"
                    compact
                    className="text-xs"
                  />
                  <Input
                    label="Data e Pranimit"
                    type="date"
                    value={formData.date_in}
                    onChange={(e) => setFormData({ ...formData, date_in: e.target.value })}
                    required
                    compact
                    className="text-xs"
                  />
                  <Input
                    label="Nr. Fletë Pranimi (Auto)"
                    value={formData.doc_in}
                    onChange={(e) => setFormData({ ...formData, doc_in: e.target.value })}
                    className="bg-gray-50 font-bold text-red-600 text-xs"
                    readOnly
                    compact
                  />
                  <Input
                    label="Emri i Artikullit"
                    value="Ari i Vjetër për Përpunim 585"
                    readOnly
                    className="bg-white text-xs"
                    compact
                  />
                  <div></div>
                  <Input
                    label="Sasia (gram)"
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0.00"
                    required
                    compact
                    className="text-xs"
                  />
                  <Input
                    label="Çmimi Efektiv/g"
                    type="number"
                    step="0.01"
                    value={formData.price_in}
                    onChange={(e) => setFormData({ ...formData, price_in: e.target.value })}
                    placeholder="0.00"
                    required
                    compact
                    className="text-xs"
                  />
                  <Input
                    label="Totali (Evidencë)"
                    value={formatCurrency(total_in)}
                    readOnly
                    className="bg-gray-50 font-bold text-red-600 text-xs"
                    compact
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" icon={Printer} onClick={printPhase1}>
                  Printo Pranimin
                </Button>
                <Button type="button" onClick={handlePhase1Next}>
                  Vazhdo në Dërgim →
                </Button>
              </div>
            </div>
          )}

          {/* Phase 2: Dërgim */}
          {currentPhase === 2 && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                <h4 className="font-bold text-yellow-700 mb-3 flex items-center gap-2 text-sm">
                  <span>🚚</span> FAZA 2: Dërgim në Puntorinë
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select
                        label="Puntoria / Prodhuesi"
                        value={formData.workshop_id}
                        onChange={(e) => setFormData({ ...formData, workshop_id: e.target.value })}
                        options={workshops.map(w => ({ value: w.id, label: w.name }))}
                        required
                        compact
                        className="text-xs"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => openQuickClientModal('producer')}
                      icon={UserPlus}
                      className="px-2 py-[7px] mb-2"
                      title="Shto Prodhues të Ri"
                    />
                  </div>
                  <Input
                    label="Data e Dërgimit"
                    type="date"
                    value={formData.date_send}
                    onChange={(e) => setFormData({ ...formData, date_send: e.target.value })}
                    required
                    compact
                    className="text-xs"
                  />
                  <Input
                    label="Nr. Fletë Dërgesë (Auto)"
                    value={formData.doc_send}
                    onChange={(e) => setFormData({ ...formData, doc_send: e.target.value })}
                    className="bg-gray-50 font-bold text-yellow-600 text-xs"
                    readOnly
                    compact
                  />
                  <Input
                    label="Emri i Artikullit"
                    value="Ari i Vjetër për Përpunim 585"
                    readOnly
                    className="bg-white text-xs"
                    compact
                  />
                  <Input
                    label="Sasia (gram)"
                    value={formData.quantity ? `${formatNumber(formData.quantity)}g` : ''}
                    readOnly
                    className="bg-gray-50 font-bold text-xs"
                    compact
                  />
                  <Input
                    label="Çmimi Efektiv/g"
                    value={formData.price_in ? formatCurrency(formData.price_in) : ''}
                    readOnly
                    className="bg-gray-50 text-xs"
                    compact
                  />
                  <Input
                    label="Totali (Evidencë)"
                    value={formatCurrency(total_in)}
                    readOnly
                    className="bg-gray-50 font-bold text-yellow-600 text-xs"
                    compact
                  />
                </div>
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setCurrentPhase(1)}>
                  ← Kthehu
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" icon={Printer} onClick={printPhase2}>
                    Printo Dërgesën
                  </Button>
                  <Button type="button" onClick={handlePhase2Next}>
                    Dërgo në Puntorinë →
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Phase 3: Kthim */}
          {currentPhase === 3 && (
            <div className="space-y-4">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                <h4 className="font-bold text-green-700 mb-3 flex items-center gap-2 text-sm">
                  <span>📥</span> FAZA 3: Kthim nga Puntoria
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    label="Puntoria / Prodhuesi"
                    value={selectedWorkshop?.name || ''}
                    readOnly
                    className="bg-gray-50 font-bold text-xs"
                    compact
                  />
                  <Input
                    label="Data e Kthimit"
                    type="date"
                    value={formData.date_return}
                    onChange={(e) => setFormData({ ...formData, date_return: e.target.value })}
                    required
                    compact
                    className="text-xs"
                  />
                  <Input
                    label="Nr. Faturë nga Puntoria"
                    value={formData.invoice_workshop}
                    onChange={(e) => setFormData({ ...formData, invoice_workshop: e.target.value })}
                    placeholder="INV-PUNT-123"
                    required
                    compact
                    className="text-xs"
                  />
                  <Input
                    label="Nr. Faturë Hyrëse (Auto)"
                    value={formData.invoice_in}
                    readOnly
                    className="bg-gray-50 font-bold text-green-600 text-xs"
                    compact
                  />
                  <Input
                    label="Emri i Artikullit"
                    value="Ari i Përpunuar 585"
                    readOnly
                    className="bg-white text-xs"
                    compact
                  />
                  <Input
                    label="Sasia (gram)"
                    value={formData.quantity ? `${formatNumber(formData.quantity)}g` : ''}
                    readOnly
                    className="bg-gray-50 font-bold text-xs"
                    compact
                  />
                  <Input
                    label="Çmimi Efektiv/g (nga Faza 1)"
                    value={formData.price_in ? formatCurrency(formData.price_in) : ''}
                    readOnly
                    className="bg-gray-50 text-xs"
                    compact
                  />
                  <Input
                    label="Totali Evidencë"
                    value={formatCurrency(total_in)}
                    readOnly
                    className="bg-gray-50 text-xs"
                    compact
                  />
                </div>

                {/* Labor Cost Section */}
                <div className="bg-yellow-50 border-2 border-yellow-400 p-3 rounded-lg mt-3">
                  <h4 className="font-bold text-yellow-800 mb-2 flex items-center gap-2 text-xs">
                    <span>💰</span> Kosto Punë Dore (Shërbim Përpunimi)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      label="Çmimi Punë Dore/g"
                      type="number"
                      step="0.01"
                      value={formData.price_workshop}
                      onChange={(e) => setFormData({ ...formData, price_workshop: e.target.value })}
                      placeholder="0.00"
                      required
                      compact
                      className="text-xs"
                    />
                    <Input
                      label="Totali Punë Dore"
                      value={formatCurrency(total_workshop)}
                      readOnly
                      className="bg-gray-50 font-bold text-green-600 text-xs"
                      compact
                    />
                    <div></div>
                  </div>
                  <p className="mt-2 text-xs text-gray-600 flex items-center gap-1">
                    <span>ℹ️</span> Kjo do të regjistrohet si Faturë Hyrëse - Shërbim Përpunimi
                  </p>
                </div>
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setCurrentPhase(2)}>
                  ← Kthehu
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" icon={Printer} onClick={printPhase3}>
                    Printo Kthimin
                  </Button>
                  <Button type="button" onClick={handlePhase3Next}>
                    Vazhdo në Shitje →
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Phase 4: Shitje */}
          {currentPhase === 4 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                <h4 className="font-bold text-blue-700 mb-3 flex items-center gap-2 text-sm">
                  <span>💰</span> FAZA 4: Faturë Shërbimi Përpunimi
                </h4>
                
                <div className="bg-blue-100 border border-blue-300 p-2 rounded-lg mb-3">
                  <p className="text-xs text-blue-800 flex items-center gap-1">
                    <span>ℹ️</span> Kjo faturë do të regjistrohet si <strong>Faturë Dalëse - Shërbim Përpunimi</strong> dhe do të dallohet nga faturat e tjera të shitjes.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    label="Klienti"
                    value={selectedClient?.name || ''}
                    readOnly
                    className="bg-gray-50 font-bold text-xs"
                    compact
                  />
                  <Input
                    label="Data e Faturës"
                    type="date"
                    value={formData.date_sale}
                    onChange={(e) => setFormData({ ...formData, date_sale: e.target.value })}
                    required
                    compact
                    className="text-xs"
                  />
                  <Input
                    label="Nr. Faturë Dalëse (Auto)"
                    value={formData.invoice_out}
                    readOnly
                    className="bg-gray-50 font-bold text-blue-600 text-xs"
                    compact
                  />
                  <Input
                    label="Emri i Artikullit"
                    value="Shërbim Përpunimi - Ari 585"
                    readOnly
                    className="bg-white text-xs"
                    compact
                  />
                  <Input
                    label="Sasia (gram)"
                    value={formData.quantity ? `${formatNumber(formData.quantity)}g` : ''}
                    readOnly
                    className="bg-gray-50 font-bold text-xs"
                    compact
                  />
                  <Input
                    label="Çmimi Shërbim/g"
                    type="number"
                    step="0.01"
                    value={formData.price_sale}
                    onChange={(e) => setFormData({ ...formData, price_sale: e.target.value })}
                    placeholder="0.00"
                    required
                    compact
                    className="text-xs"
                  />
                  <Input
                    label="Nën-totali"
                    value={formatCurrency(subtotal_sale)}
                    readOnly
                    className="bg-gray-50 text-xs"
                    compact
                  />
                  <Select
                    label="TVSH (%)"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) })}
                    options={[
                      { value: 18, label: '18%' },
                      { value: 8, label: '8%' },
                      { value: 0, label: '0%' },
                    ]}
                    compact
                    className="text-xs"
                  />
                  <Input
                    label="Totali (me TVSH)"
                    value={formatCurrency(total_sale)}
                    readOnly
                    className="bg-gray-50 font-bold text-blue-600 text-xs"
                    compact
                  />
                </div>
              </div>

              {/* Profit Analysis */}
              <div className="bg-yellow-50 border-2 border-yellow-400 p-3 rounded-lg">
                <h4 className="font-bold text-yellow-800 mb-2 flex items-center gap-2 text-xs">
                  <span>📊</span> Analiza Fitimit të Shërbimit
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Të Ardhura (pa TVSH)</p>
                    <p className="text-base font-bold text-green-600">
                      {formatCurrency(subtotal_sale)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Kosto (Punë Dore)</p>
                    <p className="text-base font-bold text-red-600">
                      {formatCurrency(total_workshop)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Fitimi Neto</p>
                    <p 
                      className={`text-lg font-bold ${
                        profit > 0 ? 'text-green-600' : profit < 0 ? 'text-red-600' : 'text-yellow-600'
                      }`}
                    >
                      {formatCurrency(profit)}
                    </p>
                  </div>
                </div>
              </div>

              <Input
                label="Përshkrim / Shënime"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                compact
                className="text-xs mb-4"
              />

              <div className="flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setCurrentPhase(3)}>
                  ← Kthehu
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" icon={Printer} onClick={printPhase4}>
                    Printo Faturën
                  </Button>
                  <Button type="submit" disabled={createMutation.isLoading}>
                    {createMutation.isLoading ? 'Duke ruajtur...' : 'Përfundo Procesin'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Quick Client Modal */}
      <QuickClientModal
        isOpen={quickClientModalOpen}
        onClose={() => setQuickClientModalOpen(false)}
        onClientCreated={handleQuickClientCreated}
        defaultType={quickClientType}
      />

      {/* Processing Details Modal */}
      <ProcessingDetailsModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedRecordId(null);
        }}
        recordId={selectedRecordId}
      />
    </>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TopBar from '../components/Layout/TopBar';
import Cart from '../components/Cart';
import Button from '../components/Button';
import Select from '../components/Select';
import Input from '../components/Input';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import QuickClientModal from '../components/modals/QuickClientModal';
import InvoiceModal from '../components/modals/InvoiceModal';
import AddToCartModal from '../components/modals/AddToCartModal';
import Badge from '../components/Badge';
import { stockAPI, fiscalSalesAPI, clientsAPI, invoicesAPI } from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import { useFiscalPrinter } from '../contexts/FiscalPrinterContext';
import { Search, Check, X, UserPlus, FileText, Printer, Edit, Wifi, WifiOff, AlertTriangle, XCircle } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/format';

export default function POS() {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [saleStatus, setSaleStatus] = useState('e paguar');
  const [saleType, setSaleType] = useState('normal');
  const [quickClientModalOpen, setQuickClientModalOpen] = useState(false);
  const [closeFiscalModalOpen, setCloseFiscalModalOpen] = useState(false);
  const [editInvoiceModalOpen, setEditInvoiceModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [addToCartModalOpen, setAddToCartModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientResults, setShowClientResults] = useState(false);
  const clientSearchRef = useRef(null);
  const [stornoModalOpen, setStornoModalOpen] = useState(false);
  const [selectedSaleForStorno, setSelectedSaleForStorno] = useState(null);

  // Fiscal printer
  const {
    isServerConnected,
    isPrinterConnected,
    isLoading: printerLoading,
    connectServer,
    connectPrinter,
    printReceipt,
    printStornoReceipt,
    printZReport,
    updatePrinterHeaders,
    cancelReceipt,
  } = useFiscalPrinter();

  // Always use queue mode - jobs are queued and processed by background service
  const canPrint = true;

  const handleConnectPrinter = async () => {
    // First connect to server
    const serverResult = await connectServer();
    if (!serverResult.success) {
      showAlert(`Gabim në lidhje me server: ${serverResult.error}`, 'error');
      return;
    }

    // Then find and connect to printer
    const printerResult = await connectPrinter();
    if (printerResult.success) {
      showAlert('Printeri u lidh me sukses!', 'success');
    } else {
      showAlert(`Gabim në lidhje me printer: ${printerResult.error}`, 'error');
    }
  };

  const handleUpdateHeaders = async () => {
    const result = await updatePrinterHeaders();
    if (result.success) {
      showAlert('Emri dhe adresa u përditësuan në printer!', 'success');
    } else {
      showAlert(`Mbyll Fiskalizimin ditor fillimisht!`, 'error');
    }
  };

  const handleCancelReceipt = async () => {
    if (!window.confirm('Jeni të sigurt që doni të anuloni fiskalizimin aktiv?')) {
      return;
    }

    const result = await cancelReceipt();
    if (result.success) {
      if (result.wasOpen) {
        showAlert('Fiskalizimi aktiv u anulua me sukses!', 'success');
      } else {
        showAlert('Nuk ka fiskalizim aktiv për të anuluar.', 'info');
      }
    } else {
      showAlert(`Gabim në anulim: ${result.error}`, 'error');
    }
  };

  // Note: Auto-connect is now handled by FiscalPrinterContext on app load

  // Get today's date in YYYY-MM-DD format using local timezone (not UTC)
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const { data: productsResponse } = useQuery({
    queryKey: ['pos-stock'],
    queryFn: () => stockAPI.getPOS()
  });

  const { data: clientsResponse } = useQuery({
    queryKey: ['pos-clients'],
    queryFn: () => clientsAPI.getByType('retail')
  });

  const { data: salesHistoryResponse } = useQuery({
    queryKey: ['pos-sales-history', today],
    queryFn: () => fiscalSalesAPI.getAll({ date: today, clientType: 'retail' })
  });

  const { data: dailyStatsResponse } = useQuery({
    queryKey: ['pos-daily-stats', today],
    queryFn: () => fiscalSalesAPI.getDailyStats(today)
  });

  const products = Array.isArray(productsResponse?.data) ? productsResponse.data : [];
  const clients = Array.isArray(clientsResponse?.data) ? clientsResponse.data : [];
  const salesHistory = Array.isArray(salesHistoryResponse?.data) ? salesHistoryResponse.data : [];
  const dailyStats = dailyStatsResponse?.data || { total_sales: 0, total_amount: 0 };

  const saleMutation = useMutation({
    mutationFn: (data) => fiscalSalesAPI.create(data),
    onSuccess: () => {
      showAlert('Shitja u përfundua me sukses!', 'success');
      setCart([]);
      setSaleStatus('e paguar');
      queryClient.invalidateQueries({ queryKey: ['pos-stock'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['pos-sales-history'] });
      queryClient.invalidateQueries({ queryKey: ['pos-daily-stats'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      showAlert(error.response?.data?.error || 'Gabim në procesimin e shitjes', 'error');
    },
  });


  const handlePrintInvoice = async (invoiceId, invoiceNumber) => {
    try {
      const response = await invoicesAPI.generatePDF(invoiceId);
      // response.data is already a Blob when responseType is 'blob'
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceNumber || invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showAlert('Gabim në gjenerimin e PDF', 'error');
    }
  };

  const handleEditInvoice = (invoiceId) => {
    setSelectedInvoiceId(invoiceId);
    setEditInvoiceModalOpen(true);
  };

  const handleRowClick = (row) => {
    // Only open invoice modal if the sale has an associated invoice
    if (row && row.invoice_id) {
      handleEditInvoice(row.invoice_id);
    }
  };

  const handleStornoFromHistory = (sale) => {
    setSelectedSaleForStorno(sale);
    setStornoModalOpen(true);
  };

  const confirmStornoFromHistory = async () => {
    if (!selectedSaleForStorno) {
      showAlert('Shitja nuk u gjet!', 'error');
      return;
    }

    // Check if sale is already storno'd
    if (selectedSaleForStorno.storno === true) {
      showAlert('Kjo shitje është tashmë storno. Nuk mund të storno\'het dy herë.', 'error');
      setStornoModalOpen(false);
      setSelectedSaleForStorno(null);
      return;
    }

    // Check if we can print (in queue mode, always true)
    if (!canPrint) {
      showAlert('Printeri nuk është i lidhur! Ju lutem lidhni printerin fillimisht.', 'error');
      return;
    }

    try {
      // Fetch sale items
      let saleItems;
      try {
        const saleItemsResponse = await fiscalSalesAPI.getSaleItems(selectedSaleForStorno.id);
        saleItems = saleItemsResponse.data;
      } catch (apiError) {
        const errorMessage = apiError.response?.data?.error || apiError.message || 'Gabim në marrjen e artikujve';
        showAlert(`Gabim në marrjen e të dhënave: ${errorMessage}`, 'error');
        return;
      }

      // Validate that sale items exist
      if (!saleItems || !Array.isArray(saleItems) || saleItems.length === 0) {
        showAlert('Kjo shitje nuk ka artikuj për të printuar storno!', 'error');
        return;
      }

      // Convert sale items to cart format
      const stornoCart = saleItems.map(item => ({
        id: item.stock_item_id,
        name: item.stock_item_name || 'Artikull',
        cartPrice: parseFloat(item.price) || 0,
        cartQty: parseFloat(item.quantity) || 1,
      }));

      // Validate cart items
      if (stornoCart.length === 0) {
        showAlert('Nuk u gjetën artikuj të vlefshëm për storno!', 'error');
        return;
      }

      // Print storno receipt (will be queued in queue mode)
      const printResult = await printStornoReceipt(stornoCart, selectedSaleForStorno.payment_method || 'cash');
      if (!printResult.success) {
        showAlert(`Gabim në printim storno: ${printResult.error}`, 'error');
        return;
      }

      // Show queued message if job was queued
      if (printResult.queued) {
        showAlert('Storno u dërgua në radhë për printim!', 'info');
      }

      // Return items to stock after successful storno printing/queuing
      try {
        await fiscalSalesAPI.returnStockForStorno(selectedSaleForStorno.id);
        queryClient.invalidateQueries({ queryKey: ['pos-stock'] });
        queryClient.invalidateQueries({ queryKey: ['stock'] });
        queryClient.invalidateQueries({ queryKey: ['pos-sales-history'] });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        const successMsg = printResult.queued
          ? 'Storno u dërgua për printim dhe artikujt u kthyen në stok me sukses!'
          : 'Fatura storno u printua dhe artikujt u kthyen në stok me sukses!';
        showAlert(successMsg, 'success');
      } catch (stockError) {
        // If stock return fails, still show success for printing but warn about stock
        console.error('Stock return error:', stockError);
        showAlert('Fatura storno u printua, por ka pasur problem në kthimin e artikujve në stok. Ju lutem kontrolloni manualisht.', 'warning');
      }

      setStornoModalOpen(false);
      setSelectedSaleForStorno(null);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Gabim i panjohur';
      showAlert(`Gabim në procesimin e storno: ${errorMessage}`, 'error');
      console.error('Storno error:', error);
    }
  };

  const handleQuickClientCreated = (client) => {
    setSelectedClientId(client.id);
    setClientSearch(client.name);
    setShowClientResults(false);
  };

  // Filter clients based on search term (name, id_number, phone, email) and limit to 8
  const filteredClients = clientSearch.trim()
    ? clients.filter((client) => {
      const searchTerm = clientSearch.toLowerCase();
      return (
        client.name?.toLowerCase().includes(searchTerm) ||
        client.id_number?.toLowerCase().includes(searchTerm) ||
        client.phone?.toLowerCase().includes(searchTerm) ||
        client.email?.toLowerCase().includes(searchTerm)
      );
    }).slice(0, 8)
    : [];

  // Get selected client name for display
  const selectedClient = clients.find(c => c.id === selectedClientId);
  const displayClientName = selectedClient ? selectedClient.name : '';

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target)) {
        setShowClientResults(false);
      }
    };

    if (showClientResults) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showClientResults]);

  // Handle client selection
  const handleClientSelect = (client) => {
    setSelectedClientId(client.id);
    setClientSearch(client.name);
    setShowClientResults(false);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.karat?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoryMap = {
    stoli: { name: 'Stoli Ari', variant: 'primary' },
    investues: { name: 'Ar Investues', variant: 'success' },
    dijamant: { name: 'Dijamant', variant: 'warning' },
    blerje: { name: 'Blerje Ari', variant: 'danger' },
  };

  const handleAddToCartClick = (product) => {
    setSelectedProduct(product);
    setAddToCartModalOpen(true);
  };

  const handleAddToCart = (item) => {
    setCart([...cart, item]);
    setAddToCartModalOpen(false);
    setSelectedProduct(null);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const processSale = async () => {
    if (cart.length === 0) {
      showAlert('Shporta është bosh!', 'error');
      return;
    }

    // Validate client selection for wholesale and investor sale types
    if ((saleType === 'wholesale' || saleType === 'investor') && !selectedClientId) {
      showAlert('Zgjidhni një klient për këtë lloj shitjeje!', 'error');
      return;
    }

    // Calculate discount BEFORE printing
    const currentSelectedClient = clients.find(c => c.id === selectedClientId);
    const clientDiscountPercent = currentSelectedClient ? parseFloat(currentSelectedClient.discount_percent) || 0 : 0;
    const shouldApplyDiscountNow = saleType === 'wholesale' &&
      currentSelectedClient &&
      currentSelectedClient.type === 'retail' &&
      clientDiscountPercent > 0 &&
      clientDiscountPercent <= 100; // Prevent discount > 100%

    // Create discounted cart for printing and database
    const discountedCart = cart.map(item => {
      let finalPrice = parseFloat(item.cartPrice) || 0;

      // Apply discount if wholesale sale with retail client
      if (shouldApplyDiscountNow && clientDiscountPercent > 0 && clientDiscountPercent <= 100) {
        const discountMultiplier = 1 - (clientDiscountPercent / 100);
        finalPrice = finalPrice * discountMultiplier;
        // Ensure price doesn't go negative
        finalPrice = Math.max(0, finalPrice);
        // Round to 2 decimal places for currency precision
        finalPrice = Math.round(finalPrice * 100) / 100;
      }

      return {
        ...item,
        cartPrice: finalPrice, // Override cartPrice with discounted price
      };
    });

    // Print fiscal receipt with discounted prices
    // In queue mode, printReceipt submits a job to the queue
    // In print server mode, it prints directly
    // REMOVED: Printing is now handled automatically by the backend when the sale is created
    /*
    if (canPrint) {
      const printResult = await printReceipt(discountedCart, paymentMethod);
      if (!printResult.success) {
        showAlert(`Gabim në printim: ${printResult.error}`, 'error');
        return;
      }
      // Show queued message if job was queued
      if (printResult.queued) {
        showAlert('Fatura u dërgua në radhë për printim!', 'info');
      }
    }
    */

    // Create items array for database (using same discounted prices)
    const items = discountedCart.map(item => ({
      stock_item_id: item.id,
      quantity: item.cartQty,
      price: item.cartPrice, // Already discounted
      name: item.name // Added name so backend job has correct item names
    }));

    saleMutation.mutate({
      items,
      payment_method: paymentMethod,
      with_invoice: true,
      client_id: selectedClientId || null,
      status: saleStatus,
      sale_type: saleType,
    });
  };

  // Calculate subtotal (before discount)
  const subtotal = cart.reduce((sum, item) => {
    const price = parseFloat(item.cartPrice) || 0;
    const qty = parseFloat(item.cartQty) || 0;
    return sum + (price * qty);
  }, 0);

  // Calculate discount if conditions are met
  const clientDiscountPercent = selectedClient ? parseFloat(selectedClient.discount_percent) || 0 : 0;
  const shouldApplyDiscount = saleType === 'wholesale' &&
    selectedClient &&
    selectedClient.type === 'retail' &&
    clientDiscountPercent > 0 &&
    clientDiscountPercent <= 100; // Prevent discount > 100%

  const discountPercent = shouldApplyDiscount ? clientDiscountPercent : 0;
  const discountAmount = shouldApplyDiscount ? Math.round((subtotal * (discountPercent / 100)) * 100) / 100 : 0;
  // Ensure total doesn't go negative
  const total = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

  return (
    <>
      <TopBar title="POS / Shitje" />
      <div className="space-y-4 sm:space-y-6 max-w-full">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-bold">Produktet</h3>
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="Kërko produktin..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary text-xs"
                  />
                </div>
              </div>
              <div className="max-h-[400px] sm:max-h-[600px] overflow-y-auto">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-white border-b-2 border-border z-10">
                      <tr>
                        <th className="text-left py-2 px-2 text-xs font-semibold text-text-secondary">Emri</th>
                        <th className="text-left py-2 px-2 text-xs font-semibold text-text-secondary">Kategoria</th>
                        <th className="text-left py-2 px-2 text-xs font-semibold text-text-secondary">Sasia</th>
                        <th className="text-left py-2 px-2 text-xs font-semibold text-text-secondary">Karati</th>
                        <th className="text-left py-2 px-2 text-xs font-semibold text-text-secondary">SN</th>
                        <th className="text-right py-2 px-2 text-xs font-semibold text-text-secondary">Çmimi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr
                          key={product.id}
                          onClick={() => handleAddToCartClick(product)}
                          className="border-b border-border cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 px-2">
                            <div className="text-xs font-medium text-text-primary truncate max-w-[150px]">
                              {product.name}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            {product.category ? (
                              <Badge variant={categoryMap[product.category]?.variant || 'secondary'} className="text-xs">
                                {categoryMap[product.category]?.name || product.category}
                              </Badge>
                            ) : (
                              <span className="text-xs text-text-secondary">-</span>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <div className="text-xs text-text-secondary">
                              {formatNumber(product.quantity)} {product.unit === 'gram' ? 'g' : 'copë'}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="text-xs text-text-secondary">
                              {product.karat || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="text-xs text-text-secondary truncate max-w-[100px]">
                              {product.serial_number || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="text-xs font-semibold text-primary">
                              {formatCurrency(product.price)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Cart
              items={cart}
              onRemove={removeFromCart}
              total={total}
              subtotal={shouldApplyDiscount ? subtotal : undefined}
              discountAmount={shouldApplyDiscount ? discountAmount : undefined}
              discountPercent={shouldApplyDiscount ? discountPercent : undefined}
              onClear={() => {
                setCart([]);
                setSaleStatus('e paguar');
                setSaleType('normal');
                setSelectedClientId('');
                setClientSearch('');
                setShowClientResults(false);
              }}
            />

            <div className="bg-white rounded-lg shadow-sm p-3 space-y-2.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-text-primary">Status</label>
                  <select
                    value={saleStatus}
                    onChange={(e) => setSaleStatus(e.target.value)}
                    className={`w-full px-2.5 py-2 text-xs border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium ${saleStatus === 'e paguar'
                        ? 'bg-success/10 text-success border-success/30'
                        : 'bg-warning/10 text-warning border-warning/30'
                      }`}
                  >
                    <option value="e papaguar">E Papaguar</option>
                    <option value="e paguar">E Paguar</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-xs font-semibold text-text-primary">Metoda e Pagesës</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 text-xs font-semibold text-text-primary">Lloji i Shitjes</label>
                <select
                  value={saleType}
                  onChange={(e) => {
                    setSaleType(e.target.value);
                    if (e.target.value === 'normal') {
                      setSelectedClientId('');
                      setClientSearch('');
                      setShowClientResults(false);
                    }
                  }}
                  className="w-full px-2.5 py-2 text-xs border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                >
                  <option value="normal">Shitje Normale - Vetem fiskal</option>
                  <option value="wholesale">Klient Pakice - Zbritje per stoli</option>
                  <option value="investor">Ar investues - Faturë me kesh</option>
                </select>
              </div>

              {saleType !== 'normal' && (
                <div>
                  <label className="block mb-1 text-xs font-semibold text-text-primary">
                    Klienti
                  </label>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 relative" ref={clientSearchRef}>
                      <div className="relative">
                        <input
                          type="text"
                          value={clientSearch}
                          onChange={(e) => {
                            setClientSearch(e.target.value);
                            setShowClientResults(true);
                            if (!e.target.value) {
                              setSelectedClientId('');
                            }
                          }}
                          onFocus={() => {
                            if (clientSearch.trim()) {
                              setShowClientResults(true);
                            }
                          }}
                          placeholder={selectedClientId ? displayClientName : "Kërko klientin..."}
                          required
                          className="w-full px-2.5 py-2 text-xs border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        />
                        {showClientResults && filteredClients.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded shadow-lg max-h-48 overflow-y-auto">
                            {filteredClients.map((client) => (
                              <div
                                key={client.id}
                                onClick={() => handleClientSelect(client)}
                                className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-border last:border-b-0"
                              >
                                <div className="text-xs flex items-center gap-2">
                                  <span className="font-medium text-text-primary">{client.name}</span>
                                  {client.phone && (
                                    <>
                                      <span className="text-text-secondary">•</span>
                                      <span className="text-text-secondary">{client.phone}</span>
                                    </>
                                  )}
                                  {client.type === 'retail' && client.discount_percent > 0 && (
                                    <>
                                      <span className="text-text-secondary">•</span>
                                      <span className="text-text-secondary">Zbritje: {Math.round(client.discount_percent)}%</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {showClientResults && clientSearch.trim() && filteredClients.length === 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded shadow-lg">
                            <div className="px-3 py-2 text-xs text-text-secondary">
                              Nuk u gjetën klientë për këtë kërkim
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setQuickClientModalOpen(true)}
                      icon={UserPlus}
                      title="Shto Klient të Shpejtë"
                      className="px-2 py-2"
                    >
                      <span className="text-xs">+</span>
                    </Button>
                  </div>
                </div>
              )}

              <Button
                variant="success"
                className="w-full text-xs py-2"
                onClick={processSale}
                disabled={saleMutation.isLoading}
                icon={Check}
              >
                {saleMutation.isLoading ? 'Duke procesuar...' : 'Proceso Shitjen'}
              </Button>
            </div>
          </div>
        </div>

        {/* Sales History */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-5">
            <h2 className="text-base sm:text-lg font-bold">Shitjet e Sotme</h2>
            <Button
              variant="info"
              onClick={() => setCloseFiscalModalOpen(true)}
              icon={FileText}
              size="sm"
              className="w-full sm:w-auto"
            >
              Mbyll Fiskalizimin Ditor
            </Button>
          </div>

          <DataTable
            columns={[
              {
                header: 'Nr.',
                accessor: 'id',
                render: (row) => {
                  const index = salesHistory.findIndex(s => s.id === row.id);
                  return index + 1;
                },
              },
              {
                header: 'Ora',
                accessor: 'time',
                render: (row) => row.time || new Date(row.date).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }),
              },
              {
                header: 'Klienti',
                accessor: 'client_name',
                render: (row) => row.client_name || '-',
              },
              {
                header: 'Tipi Klienti',
                accessor: 'client_type',
                render: (row) => {
                  if (!row.client_type) {
                    return '-';
                  }
                  const clientTypeMap = {
                    'client': { text: 'Klient', variant: 'primary' },
                    'supplier': { text: 'Furnizues', variant: 'success' },
                    'producer': { text: 'Prodhues', variant: 'warning' },
                    'retail': { text: 'Pakicë', variant: 'primary' },
                  };
                  const typeInfo = clientTypeMap[row.client_type] || { text: row.client_type || '-', variant: 'secondary' };
                  return <Badge variant={typeInfo.variant}>{typeInfo.text}</Badge>;
                },
              },
              {
                header: 'Lloji i Shitjes',
                accessor: 'sale_type',
                render: (row) => {
                  const saleTypeMap = {
                    'normal': { text: 'Normale', variant: 'secondary' },
                    'wholesale': { text: 'Pakicë', variant: 'primary' },
                    'investor': { text: 'Investues', variant: 'warning' },
                  };
                  const typeInfo = saleTypeMap[row.sale_type] || { text: row.sale_type || 'Normale', variant: 'secondary' };
                  return <Badge variant={typeInfo.variant}>{typeInfo.text}</Badge>;
                },
              },
              {
                header: 'Artikuj',
                accessor: 'items_count',
                render: (row) => `${row.items_count || 0} artikuj`,
              },
              {
                header: 'Totali',
                accessor: 'total',
                align: 'right',
                render: (row) => formatCurrency(row.total),
              },
              {
                header: 'Metoda',
                accessor: 'payment_method',
                render: (row) => (
                  <Badge variant={row.payment_method === 'cash' ? 'success' : 'primary'}>
                    {row.payment_method === 'cash' ? 'Cash' : 'Card'}
                  </Badge>
                ),
              },
              {
                header: 'Faturë',
                accessor: 'invoice_number',
                render: (row) => {
                  if (row.invoice_number) {
                    return (
                      <Badge variant="success" title={`Fatura: ${row.invoice_number}`}>
                        {row.invoice_number}
                      </Badge>
                    );
                  }
                  return (
                    <Badge variant={row.with_invoice ? 'warning' : 'secondary'}>
                      {row.with_invoice ? 'Pa Faturë' : 'Jo'}
                    </Badge>
                  );
                },
              },
              {
                header: 'Statusi',
                accessor: 'storno',
                render: (row) => {
                  if (row.storno === true) {
                    return (
                      <Badge variant="danger" title={`Storno: ${row.storno_date ? new Date(row.storno_date).toLocaleString('sq-AL') : ''}`}>
                        Storno
                      </Badge>
                    );
                  }
                  return (
                    <Badge variant="success">
                      Aktiv
                    </Badge>
                  );
                },
              },
            ]}
            data={salesHistory}
            emptyMessage="Nuk ka shitje sot"
            actions={(row) => (
              <>
                {row.invoice_id && !row.storno && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditInvoice(row.invoice_id);
                      }}
                      className="p-1 text-primary hover:text-primary-hover transition-colors cursor-pointer"
                      title="Edito"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrintInvoice(row.invoice_id, row.invoice_number);
                      }}
                      className="p-1 text-primary hover:text-primary-hover transition-colors cursor-pointer"
                      title="Print"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </>
                )}
                {/* Storno Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStornoFromHistory(row);
                  }}
                  className={`p-1 transition-colors ${row.storno
                      ? 'text-gray-400 cursor-not-allowed opacity-50'
                      : 'text-danger hover:text-danger/80 cursor-pointer'
                    }`}
                  title={row.storno ? 'Storno' : 'Storno (Kthim)'}
                  disabled={!canPrint || row.storno === true}
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </>
            )}
            onRowClick={handleRowClick}
          />
        </div>
      </div>

      {/* Quick Client Modal */}
      <QuickClientModal
        isOpen={quickClientModalOpen}
        onClose={() => setQuickClientModalOpen(false)}
        onClientCreated={handleQuickClientCreated}
      />

      {/* Edit Invoice Modal */}
      <InvoiceModal
        isOpen={editInvoiceModalOpen}
        onClose={() => {
          setEditInvoiceModalOpen(false);
          setSelectedInvoiceId(null);
        }}
        invoiceId={selectedInvoiceId}
        clientTypeFilter="retail"
      />

      {/* Add to Cart Modal */}
      <AddToCartModal
        isOpen={addToCartModalOpen}
        onClose={() => {
          setAddToCartModalOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onAddToCart={handleAddToCart}
      />

      {/* Close Fiscal Daily Modal */}
      <Modal
        isOpen={closeFiscalModalOpen}
        onClose={() => setCloseFiscalModalOpen(false)}
        title="Mbyll Fiskalizimin Ditor"
        size="max-w-md"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-2">Data</div>
            <div className="text-lg font-bold">{new Date().toLocaleDateString('sq-AL')}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-2">Numri i Shitjeve</div>
            <div className="text-lg font-bold">{dailyStats.total_sales || 0}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-2">Shuma Totale</div>
            <div className="text-lg font-bold text-purple-600">
              {formatCurrency(dailyStats.total_amount || 0)}
            </div>
          </div>
          {!canPrint && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Printeri nuk është i lidhur. Lidhe printerin për të printuar Z-Raportin.</span>
              </div>
            </div>
          )}
          {canPrint && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Z-Raporti do të dërgohet në radhë dhe do të printohet nga Print Server-i.</span>
              </div>
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <Button
              variant="success"
              onClick={async () => {
                if (canPrint) {
                  const result = await printZReport();
                  if (result.success) {
                    if (result.queued) {
                      showAlert('Z-Raporti u dërgua në radhë për printim! Fiskalizimi ditor u mbyll.', 'success');
                    } else {
                      showAlert('Z-Raporti u printua me sukses! Fiskalizimi ditor u mbyll.', 'success');
                    }
                  } else {
                    showAlert(`Gabim në printim: ${result.error}`, 'error');
                    return;
                  }
                } else {
                  showAlert('Fiskalizimi ditor u mbyll me sukses!', 'success');
                }
                setCloseFiscalModalOpen(false);
              }}
              disabled={printerLoading}
            >
              {printerLoading ? 'Duke printuar...' : canPrint ? 'Print Z-Raport & Mbyll' : 'Konfirmo'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setCloseFiscalModalOpen(false)}
            >
              Anulo
            </Button>
          </div>
        </div>
      </Modal>

      {/* Storno Confirmation Modal */}
      <Modal
        isOpen={stornoModalOpen}
        onClose={() => {
          setStornoModalOpen(false);
          setSelectedSaleForStorno(null);
        }}
        title="Konfirmo Storno (Kthim)"
      >
        <div className="space-y-4">
          {selectedSaleForStorno && (
            <>
              <div className="bg-danger/10 border border-danger/30 rounded p-3">
                <p className="text-sm text-danger font-semibold mb-2">
                  ⚠️ Vëmendje: Kjo do të printojë një faturë STORNO (kthim) për shitjen e mëposhtme:
                </p>
                <div className="space-y-1 text-xs">
                  <p><strong>Data:</strong> {new Date(selectedSaleForStorno.date).toLocaleString('sq-AL')}</p>
                  <p><strong>Totali:</strong> {formatCurrency(selectedSaleForStorno.total)}</p>
                  <p><strong>Artikuj:</strong> {selectedSaleForStorno.items_count || 0}</p>
                  <p><strong>Metoda e Pagesës:</strong> {selectedSaleForStorno.payment_method === 'cash' ? 'Cash' : 'Card'}</p>
                  {selectedSaleForStorno.client_name && (
                    <p><strong>Klienti:</strong> {selectedSaleForStorno.client_name}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-text-secondary">
                Të gjithë artikujt nga kjo shitje do të printohen si storno (kthim) në printerin fiskal.
              </p>
            </>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              variant="danger"
              onClick={confirmStornoFromHistory}
              disabled={!canPrint || printerLoading}
            >
              {printerLoading ? 'Duke printuar...' : 'Konfirmo & Dërgo Storno'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setStornoModalOpen(false);
                setSelectedSaleForStorno(null);
              }}
            >
              Anulo
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

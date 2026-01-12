import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../Modal';
import Input from '../Input';
import Select from '../Select';
import Button from '../Button';
import QuickClientModal from './QuickClientModal';
import ManualItemModal from './ManualItemModal';
import { invoicesAPI, clientsAPI, stockAPI } from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { Plus, X, Trash2, Search, UserPlus, Pencil } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/format';

export default function InvoiceModal({ isOpen, onClose, invoiceId = null, defaultType = null, clientTypeFilter = null }) {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientResults, setShowClientResults] = useState(false);
  const clientSearchRef = useRef(null);
  const [quickClientModalOpen, setQuickClientModalOpen] = useState(false);
  const [manualItemModalOpen, setManualItemModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [dueDatePreset, setDueDatePreset] = useState('7'); // '7', '14', '30', or 'custom'
  
  // Determine effective type: defaultType for new invoices, or from form data
  const getInitialType = () => defaultType || 'out';

  // Helper function to calculate due date by adding days to invoice date
  const calculateDueDate = (invoiceDate, days) => {
    if (!invoiceDate) return '';
    const date = new Date(invoiceDate);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Helper function to detect preset when editing an invoice
  const detectDueDatePreset = (invoiceDate, dueDate) => {
    if (!invoiceDate || !dueDate) return '7'; // Default to 7 days
    
    const start = new Date(invoiceDate);
    const end = new Date(dueDate);
    const diffTime = end - start;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 7) return '7';
    if (diffDays === 14) return '14';
    if (diffDays === 30) return '30';
    return 'custom';
  };
  
  // Initialize form data with default due date (7 days from today)
  const getInitialDueDate = () => {
    const today = new Date().toISOString().split('T')[0];
    return calculateDueDate(today, 7);
  };

  const [formData, setFormData] = useState({
    type: getInitialType(),
    client_id: '',
    date: new Date().toISOString().split('T')[0],
    due_date: getInitialDueDate(),
    payment_method: 'bank',
    description: '',
    items: [],
  });

  // Determine if type selector should be shown
  // Show only when creating new invoice AND no defaultType is provided
  // Hide when editing (invoiceId exists) OR when defaultType is provided
  const showTypeSelector = !invoiceId && !defaultType;
  
  // Determine current type for queries
  const currentType = formData.type;

  const { data: clientsResponse, refetch: refetchClients } = useQuery({
    queryKey: ['invoice-clients', currentType, clientTypeFilter],
    queryFn: () => {
      if (clientTypeFilter) {
        // Use explicit filter when provided (e.g., 'retail' for POS)
        return clientsAPI.getByType(clientTypeFilter);
      } else if (currentType === 'out') {
        // Fetch both 'client' and 'retail' types for Fature Dalëse invoices
        // Backend supports comma-separated types
        return clientsAPI.getByType('client,retail');
      } else {
        // Fetch both 'supplier' and 'producer' types for incoming invoices
        // Backend supports comma-separated types
        return clientsAPI.getByType('supplier,producer');
      }
    },
    enabled: isOpen,
  });

  const { data: stockResponse } = useQuery({
    queryKey: ['invoice-stock'],
    queryFn: () => stockAPI.getAll(),
    enabled: isOpen,
  });

  const { data: invoiceResponse } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoicesAPI.getById(invoiceId),
    enabled: !!invoiceId && isOpen,
  });

  const clients = Array.isArray(clientsResponse?.data) ? clientsResponse.data : [];
  const stockItems = Array.isArray(stockResponse?.data) ? stockResponse.data : [];

  // Get available stock quantity for a stock item
  const getAvailableStock = (stockItemId) => {
    const stockItem = stockItems.find(s => s.id === stockItemId);
    return stockItem ? parseFloat(stockItem.quantity) || 0 : 0;
  };

  // Filter stock items based on search term - show all if no search, filtered if search exists
  const filteredStockItems = productSearch.trim()
    ? stockItems.filter((item) => {
        const searchTerm = productSearch.toLowerCase();
        return (
          item.name?.toLowerCase().includes(searchTerm) ||
          item.karat?.toLowerCase().includes(searchTerm) ||
          item.serial_number?.toLowerCase().includes(searchTerm)
        );
      })
    : stockItems; // Show all products when no search term

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
  const selectedClient = clients.find(c => c.id === formData.client_id);
  const displayClientName = selectedClient ? selectedClient.name : '';

  // Handle clicking outside search dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearchResults]);

  // Handle clicking outside client search dropdown
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

  // Refetch clients when type changes
  useEffect(() => {
    if (isOpen) {
      refetchClients();
    }
  }, [currentType, isOpen, refetchClients]);

  // Reset client search state and due date preset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setClientSearch('');
      setShowClientResults(false);
      setQuickClientModalOpen(false);
      setDueDatePreset('7');
    }
  }, [isOpen]);

  // Recalculate due_date when invoice date or preset changes (only for presets, not custom)
  useEffect(() => {
    if (isOpen && formData.date && dueDatePreset !== 'custom') {
      const days = parseInt(dueDatePreset);
      if (!isNaN(days)) {
        const calculatedDueDate = calculateDueDate(formData.date, days);
        // Only update if different to avoid unnecessary re-renders
        setFormData(prev => {
          if (prev.due_date !== calculatedDueDate) {
            return { ...prev, due_date: calculatedDueDate };
          }
          return prev;
        });
      }
    }
  }, [formData.date, dueDatePreset, isOpen]);

  useEffect(() => {
    if (invoiceId && invoiceResponse?.data && isOpen) {
      const invoice = invoiceResponse.data;
      
      // Transform invoice items to match frontend format
      const transformedItems = (invoice.items || []).map((item) => {
        const quantity = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        const subtotal = parseFloat(item.subtotal) || (quantity * price);
        const total = subtotal; // Total = subtotal (no tax)
        
        return {
          stock_item_id: item.stock_item_id || '',
          product_name: item.product_name || '',
          quantity: quantity.toString(),
          serial_number: item.serial_number || '',
          price: price.toString(),
          subtotal,
          taxAmount: 0,
          total,
        };
      });
      
      // Format date to YYYY-MM-DD in local timezone (avoid UTC conversion issues)
      let invoiceDate;
      if (invoice.date) {
        // If it's already in YYYY-MM-DD format, use it directly
        if (typeof invoice.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(invoice.date)) {
          invoiceDate = invoice.date;
        } else {
          // Parse as Date and use local date components to avoid timezone shifts
          const d = new Date(invoice.date);
          // Check if date is valid
          if (!isNaN(d.getTime())) {
            invoiceDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          } else {
            // Fallback to today if parsing fails
            const today = new Date();
            invoiceDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          }
        }
      } else {
        const today = new Date();
        invoiceDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      }
      
      const dueDate = invoice.due_date ? (invoice.due_date.includes('T') ? invoice.due_date.split('T')[0] : invoice.due_date) : '';
      
      setFormData({
        type: invoice.type || 'out',
        number: invoice.number || '', // Keep for editing existing invoices
        supplier_invoice_number: invoice.supplier_invoice_number || '', // Keep for editing existing invoices
        client_id: invoice.client_id || '',
        date: invoiceDate,
        due_date: dueDate,
        payment_method: 'bank', // Always set to 'bank' (fixed payment method)
        description: invoice.description || '',
        items: transformedItems,
      });
      
      // Detect and set due date preset when editing
      if (dueDate) {
        const detectedPreset = detectDueDatePreset(invoiceDate, dueDate);
        setDueDatePreset(detectedPreset);
      } else {
        setDueDatePreset('7');
      }
      
      // Set client search to show client name when editing
      if (invoice.client_id && invoice.client_name) {
        setClientSearch(invoice.client_name);
      } else {
        setClientSearch('');
      }
    } else if (isOpen && !invoiceId) {
      resetForm();
    }
  }, [invoiceId, invoiceResponse, isOpen, defaultType]);

  // Validate client_id when clients are loaded and clientTypeFilter is active
  useEffect(() => {
    if (clientTypeFilter && invoiceId && formData.client_id && clients.length > 0 && isOpen) {
      const clientExists = clients.some(c => c.id === formData.client_id);
      if (!clientExists) {
        // Client from invoice is not in the filtered list, reset to empty
        setFormData(prev => ({ ...prev, client_id: '' }));
        setClientSearch('');
      }
    }
  }, [clients, clientTypeFilter, invoiceId, formData.client_id, isOpen]);

  // Update clientSearch when client_id changes and clients are loaded
  // This syncs the search input with the selected client_id
  useEffect(() => {
    if (!isOpen) return;
    
    if (formData.client_id && clients.length > 0) {
      const client = clients.find(c => c.id === formData.client_id);
      if (client && clientSearch !== client.name) {
        // Update search to show selected client name
        setClientSearch(client.name);
      } else if (!client && clientSearch) {
        // Client not found in list, clear search
        setClientSearch('');
      }
    } else if (!formData.client_id && clientSearch) {
      // No client selected, clear search
      setClientSearch('');
    }
  }, [formData.client_id, clients, isOpen]);

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0];
    const defaultDueDate = calculateDueDate(today, 7);
    setFormData({
      type: defaultType || 'out',
      client_id: '',
      date: today,
      due_date: defaultDueDate,
      payment_method: 'bank',
      description: '',
      items: [],
    });
    setDueDatePreset('7');
    setProductSearch('');
    setShowSearchResults(false);
    setClientSearch('');
    setShowClientResults(false);
  };

  const handleQuickClientCreated = (client) => {
    setFormData({ ...formData, client_id: client.id });
    setClientSearch(client.name);
    setShowClientResults(false);
    queryClient.invalidateQueries({ queryKey: ['invoice-clients'] });
  };

  const handleClientSelect = (client) => {
    setFormData({ ...formData, client_id: client.id });
    setClientSearch(client.name);
    setShowClientResults(false);
  };

  const addItem = (stockItem = null, pendingItemData = null) => {
    // For existing stock items, check if item already exists
    if (stockItem) {
      const existingItemIndex = formData.items.findIndex(
        item => item.stock_item_id === stockItem.id
      );
      
      if (existingItemIndex !== -1) {
        // Item exists, increment quantity by 1
        const existingItem = formData.items[existingItemIndex];
        const currentQuantity = parseFloat(existingItem.quantity) || 0;
        const newQuantity = currentQuantity + 1;
        
        // Check stock limits only for outgoing invoices (Dalëse)
        // Incoming invoices (Hyrëse) add stock, so no limit needed
        if (currentType === 'out') {
          const availableStock = getAvailableStock(stockItem.id);
          if (newQuantity > availableStock) {
            showAlert(`Nuk ka sasi të mjaftueshme në stok. Sasia e disponueshme: ${availableStock}`, 'error');
            return;
          }
        }
        
        // Update the item using updateItem logic (recalculates subtotal and total)
        updateItem(existingItemIndex, 'quantity', newQuantity.toString());
        
        // Clear search after adding item
        setProductSearch('');
        setShowSearchResults(false);
        return; // Exit early, item updated
      }
    }

    // Item doesn't exist, add new item
    const newItem = stockItem
      ? {
          // Existing stock item - always add with quantity 1
          stock_item_id: stockItem.id,
          product_name: stockItem.name,
          quantity: '1',
          serial_number: stockItem.serial_number || '',
          price: stockItem.price?.toString() || '',
          subtotal: 1 * (parseFloat(stockItem.price) || 0),
          taxAmount: 0,
          total: 1 * (parseFloat(stockItem.price) || 0),
        }
      : pendingItemData
      ? {
          // Pending item that needs stock creation
          stock_item_id: '',
          product_name: pendingItemData.name,
          quantity: pendingItemData.quantity?.toString() || '1',
          serial_number: pendingItemData.serial_number || '',
          price: pendingItemData.price?.toString() || '',
          needsStockCreation: true,
          pendingStockData: {
            name: pendingItemData.name,
            serial_number: pendingItemData.serial_number || '',
            quantity: parseFloat(pendingItemData.quantity) || 0,
            karat: pendingItemData.karat || '',
            unit: pendingItemData.unit || 'piece',
            price: parseFloat(pendingItemData.price) || 0,
            category: pendingItemData.category || 'stoli',
          },
          subtotal: (parseFloat(pendingItemData.quantity) || 1) * (parseFloat(pendingItemData.price) || 0),
          taxAmount: 0,
          total: (parseFloat(pendingItemData.quantity) || 1) * (parseFloat(pendingItemData.price) || 0),
        }
      : {
          // Empty item
          stock_item_id: '',
          product_name: '',
          quantity: '',
          serial_number: '',
          price: '',
          subtotal: 0,
          taxAmount: 0,
          total: 0,
        };

    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });

    // Clear search after adding item
    if (stockItem) {
      setProductSearch('');
      setShowSearchResults(false);
    }
  };

  // Add manual item (for Hyrëse invoices)
  const addManualItem = () => {
    setEditingItemIndex(null);
    setEditingItem(null);
    setManualItemModalOpen(true);
  };

  // Handle manual item created from modal
  const handleManualItemCreated = (itemData) => {
    // Add the pending item to the invoice (will create stock item when invoice is created)
    addItem(null, itemData);
    setManualItemModalOpen(false);
  };

  // Edit an existing item in the list
  const editItem = (index) => {
    const item = formData.items[index];
    
    // If item has stock_item_id but no pendingStockData, enrich with stock item data
    let enrichedItem = { ...item };
    if (item.stock_item_id && !item.pendingStockData) {
      const stockItem = stockItems.find(s => s.id === item.stock_item_id);
      if (stockItem) {
        // Create a temporary pendingStockData from stock item for editing
        enrichedItem = {
          ...item,
          pendingStockData: {
            name: item.product_name || stockItem.name,
            serial_number: item.serial_number || stockItem.serial_number || '',
            quantity: parseFloat(item.quantity) || 0,
            karat: stockItem.karat || '',
            unit: stockItem.unit || 'piece',
            price: parseFloat(item.price) || stockItem.price || 0,
            category: stockItem.category || 'stoli',
          },
        };
      }
    }
    
    setEditingItemIndex(index);
    setEditingItem(enrichedItem);
    setManualItemModalOpen(true);
  };

  // Handle item updated from modal
  const handleItemUpdated = async (index, itemData) => {
    const newItems = [...formData.items];
    const existingItem = newItems[index];
    
    // Calculate new totals
    const quantity = parseFloat(itemData.quantity) || 0;
    const price = parseFloat(itemData.price) || 0;
    const subtotal = quantity * price;
    const total = subtotal;
    
    // For incoming invoices, always store extended data (karat, unit, category)
    // This ensures data persists even when editing items from existing invoices
    const isIncomingInvoice = currentType === 'in';
    const shouldStorePendingData = isIncomingInvoice || existingItem.needsStockCreation;
    
    // If item has stock_item_id (linked to existing stock), update the stock item in the database
    if (existingItem.stock_item_id && !existingItem.needsStockCreation) {
      try {
        await stockAPI.update(existingItem.stock_item_id, {
          name: itemData.name,
          serial_number: itemData.serial_number || null,
          karat: itemData.karat || null,
          unit: itemData.unit || 'piece',
          category: itemData.category || 'stoli',
          // Don't update quantity or price here - those are handled by invoice logic
        });
        // Invalidate stock queries to refresh the data
        queryClient.invalidateQueries({ queryKey: ['stock'] });
        showAlert('Artikulli u përditësua me sukses', 'success');
      } catch (error) {
        showAlert(error.response?.data?.error || 'Gabim në përditësimin e artikullit në stok', 'error');
        // Don't return - still update the local state
      }
    }
    
    // Update the item with new data
    newItems[index] = {
      ...existingItem,
      product_name: itemData.name,
      serial_number: itemData.serial_number || '',
      quantity: itemData.quantity,
      price: itemData.price,
      subtotal,
      taxAmount: 0,
      total,
      // For incoming invoices, always update pendingStockData to store karat, unit, category
      ...(shouldStorePendingData && {
        needsStockCreation: existingItem.needsStockCreation || false,
        pendingStockData: {
          name: itemData.name,
          serial_number: itemData.serial_number || '',
          quantity: quantity,
          karat: itemData.karat || '',
          unit: itemData.unit || 'piece',
          price: price,
          category: itemData.category || 'stoli',
        },
      }),
    };
    
    setFormData({ ...formData, items: newItems });
    setManualItemModalOpen(false);
    setEditingItemIndex(null);
    setEditingItem(null);
  };

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Calculate totals if quantity or price changed
    if (field === 'quantity' || field === 'price') {
      const quantity = parseFloat(newItems[index].quantity) || 0;
      
      // Check stock limits only for outgoing invoices (Dalëse)
      // Incoming invoices (Hyrëse) add stock, so no limit needed
      if (field === 'quantity' && newItems[index].stock_item_id && currentType === 'out') {
        const availableStock = getAvailableStock(newItems[index].stock_item_id);
        if (quantity > availableStock) {
          showAlert(`Nuk mund të shtoni më shumë se sasia e disponueshme në stok (${availableStock})`, 'error');
          return; // Don't update
        }
      }
      
      const price = parseFloat(newItems[index].price) || 0;
      const subtotal = quantity * price;
      const total = subtotal; // Total = subtotal (no tax)

      newItems[index] = {
        ...newItems[index],
        subtotal,
        taxAmount: 0,
        total,
      };
    }

    // If stock_item_id changed, update product_name, price, and serial_number
    if (field === 'stock_item_id' && value) {
      const stockItem = stockItems.find((s) => s.id === value);
      if (stockItem) {
        newItems[index].product_name = stockItem.name;
        newItems[index].price = stockItem.price;
        newItems[index].serial_number = stockItem.serial_number || '';
      }
    }

    setFormData({ ...formData, items: newItems });
  };

  const createMutation = useMutation({
    mutationFn: (data) => invoicesAPI.create(data),
    onSuccess: () => {
      showAlert('Fatura u krijua me sukses!', 'success');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      onClose();
      resetForm();
    },
    onError: (error) => {
      showAlert(error.response?.data?.error || 'Gabim në krijimin e faturës', 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => invoicesAPI.update(invoiceId, data),
    onSuccess: () => {
      showAlert('Fatura u përditësua me sukses!', 'success');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoice-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['pos-sales-history'] });
      onClose();
    },
    onError: (error) => {
      showAlert(error.response?.data?.error || 'Gabim në përditësimin e faturës', 'error');
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.client_id) {
      showAlert(`Zgjidhni ${currentType === 'out' ? 'klientin' : 'furnizuesin'}!`, 'error');
      return;
    }

    if (formData.items.length === 0) {
      showAlert('Shtoni të paktën një artikull!', 'error');
      return;
    }

    setLoading(true);

    try {
      // First, create stock items for pending items (items with needsStockCreation: true)
      const itemsWithStockIds = await Promise.all(
        formData.items.map(async (item) => {
          if (item.needsStockCreation && item.pendingStockData) {
            try {
              // Create stock item with quantity 0
              // The backend will add the invoice item quantity (which is the current/edited quantity)
              const stockData = {
                name: item.pendingStockData.name,
                serial_number: item.pendingStockData.serial_number || null,
                quantity: 0, // Will be updated by backend when invoice is created
                karat: item.pendingStockData.karat || null,
                unit: item.pendingStockData.unit || 'piece',
                price: item.pendingStockData.price || 0,
                category: item.pendingStockData.category || 'stoli',
                tax_rate: 0,
              };

              const response = await stockAPI.create(stockData);
              const createdStockItem = response.data;

              // Return item with stock_item_id
              return {
                ...item,
                stock_item_id: createdStockItem.id,
              };
            } catch (error) {
              throw new Error(
                `Gabim në krijimin e artikullit "${item.product_name}": ${error.response?.data?.error || error.message}`
              );
            }
          }
          // Return item as-is if it doesn't need stock creation
          return item;
        })
      );

      // Calculate item totals
      const calculatedItems = itemsWithStockIds.map((item) => {
        const quantity = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        const subtotal = quantity * price;
        const total = subtotal; // Total = subtotal (no tax)

        return {
          stock_item_id: item.stock_item_id || null,
          product_name: item.product_name || '',
          quantity,
          price,
          tax_rate: 0, // Always 0 for backward compatibility
          subtotal,
          taxAmount: 0,
          total,
        };
      });

      const submitData = {
        ...formData,
        items: calculatedItems,
      };

      if (invoiceId) {
        // When editing, include number and supplier_invoice_number if they exist
        await updateMutation.mutateAsync(submitData);
      } else {
        // When creating, don't send number or supplier_invoice_number - backend will generate
        const { number, supplier_invoice_number, ...createData } = submitData;
        await createMutation.mutateAsync(createData);
      }
    } catch (error) {
      // Error handled by mutation or show custom error
      if (error.message && !error.response) {
        showAlert(error.message, 'error');
      }
      // Otherwise, error is handled by mutation
    } finally {
      setLoading(false);
    }
  };

  const subtotal = formData.items.reduce((sum, item) => sum + (parseFloat(item.subtotal) || 0), 0);
  const total = subtotal; // Total = subtotal (no tax)

  // Get modal title based on type and mode
  const getModalTitle = () => {
    if (invoiceId) {
      return 'Edito Faturë';
    }
    if (defaultType === 'out') {
      return 'Faturë e Re Dalëse';
    }
    if (defaultType === 'in') {
      return 'Faturë e Re Hyrëse';
    }
    return 'Faturë e Re';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      size="max-w-6xl"
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Invoice Form Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {showTypeSelector && (
                <Select
                  label="Tipi"
                  value={formData.type}
                  onChange={(e) => {
                    setFormData({ ...formData, type: e.target.value, client_id: '' });
                    setClientSearch('');
                    setShowClientResults(false);
                  }}
                  options={[
                    { value: 'out', label: 'Dalëse' },
                    { value: 'in', label: 'Hyrëse' },
                  ]}
                  required
                  compact
                />
              )}
              <div className="md:col-span-2">
                <label className="block mb-1 font-semibold text-text-primary text-sm">
                  {currentType === 'out' ? 'Klienti' : 'Furnizuesi'}
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
                            setFormData({ ...formData, client_id: '' });
                          }
                        }}
                        onFocus={() => {
                          if (clientSearch.trim()) {
                            setShowClientResults(true);
                          }
                        }}
                        placeholder={currentType === 'out' ? 'Kërko klientin...' : 'Kërko furnizuesin...'}
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
              <Input
                label="Data"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                compact
              />
              <div className="space-y-1">
                <Select
                  label="Afati"
                  value={dueDatePreset}
                  onChange={(e) => {
                    const preset = e.target.value;
                    setDueDatePreset(preset);
                    if (preset !== 'custom' && formData.date) {
                      const days = parseInt(preset);
                      const calculatedDueDate = calculateDueDate(formData.date, days);
                      setFormData({ ...formData, due_date: calculatedDueDate });
                    } else if (preset === 'custom' && !formData.due_date) {
                      // If switching to custom and no due_date exists, set empty
                      setFormData({ ...formData, due_date: '' });
                    }
                  }}
                  options={[
                    { value: '7', label: '7 Dite' },
                    { value: '14', label: '14 Dite' },
                    { value: '30', label: '30 Dite' },
                    { value: 'custom', label: 'Data e Personalizuar' },
                  ]}
                  compact
                />
                {dueDatePreset === 'custom' && (
                  <Input
                    label=""
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    compact
                    className="!mt-0"
                  />
                )}
              </div>
            </div>

            <Input
              label="Përshkrim / Shënime"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              compact
            />

            <div className="p-3 bg-gray-50 rounded space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span>Metoda e Pagesës:</span>
                <span>Bankë</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Totali:</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading || createMutation.isLoading || updateMutation.isLoading}>
                {loading || createMutation.isLoading || updateMutation.isLoading ? 'Duke ruajtur...' : 'Ruaj'}
              </Button>
              <Button type="button" variant="secondary" onClick={onClose}>
                Anulo
              </Button>
            </div>
          </div>

          {/* Right Column - Items Section */}
          <div className="space-y-4">
            {/* Search and Product List - For both Dalëse and Hyrëse */}
            <div className="relative" ref={searchRef}>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <div className="relative">
                    <label className="block mb-1 font-semibold text-text-primary text-sm">
                      Kërko Artikull
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setShowSearchResults(true);
                        }}
                        onFocus={() => setShowSearchResults(true)}
                        placeholder="Shkruani për të kërkuar..."
                        className="w-full px-3 py-1.5 pr-10 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                    </div>
                  </div>
                  {/* Product List - Always visible, filtered by search */}
                  <div className="mt-2 bg-white border border-border rounded shadow-sm max-h-64 overflow-y-auto">
                    {filteredStockItems.length > 0 ? (
                      filteredStockItems.slice(0, 4).map((item) => (
                        <div
                          key={item.id}
                          className="px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-border last:border-b-0 text-xs transition-colors"
                          onClick={() => addItem(item)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="font-medium text-text-primary truncate">
                                {item.name}
                              </span>
                              {item.karat && (
                                <span className="text-text-secondary whitespace-nowrap">
                                  {item.karat}
                                </span>
                              )}
                              {item.serial_number && (
                                <span className="text-text-secondary whitespace-nowrap">
                                  SN: {item.serial_number}
                                </span>
                              )}
                              {item.quantity && (
                                <span className="text-text-secondary whitespace-nowrap">
                                  {formatNumber(item.quantity)} {item.unit === 'gram' ? 'g' : 'copë'}
                                </span>
                              )}
                            </div>
                            <span className="text-text-secondary whitespace-nowrap font-semibold flex-shrink-0">
                              {formatCurrency(item.price)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-xs text-text-secondary">
                        {productSearch.trim() ? 'Nuk u gjetën artikuj për këtë kërkim' : 'Nuk ka artikuj në stok'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="font-bold">Artikujt te Shtuar</h3>
              {/* Show Add Item button for Hyrëse invoices to add manual items */}
              {currentType === 'in' && (
                <Button type="button" size="sm" icon={Plus} onClick={addManualItem}>
                  Shto Artikull Manual
                </Button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {formData.items.length === 0 ? (
                <div className="text-center py-8 text-xs text-text-secondary">
                  {currentType === 'out' 
                    ? 'Nuk ka artikuj. Kërkoni dhe klikoni për të shtuar artikuj.'
                    : 'Nuk ka artikuj. Klikoni "Shto Artikull" për të shtuar.'}
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 bg-white border-b-2 border-border z-10">
                    <tr>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-text-secondary w-48">
                        {currentType === 'out' ? 'Artikulli' : 'Emri'}
                      </th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-text-secondary w-20">Sasia</th>
                      <th className="text-left py-2 px-2 text-xs font-semibold text-text-secondary w-32">Çmimi</th>
                      <th className="text-right py-2 px-2 text-xs font-semibold text-text-secondary w-32">Totali</th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-text-secondary w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-border hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-2 px-2">
                          {currentType === 'in' ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={item.product_name}
                                onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                                placeholder="Emri i artikullit"
                                className="w-full text-xs px-2 py-1 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                              {item.serial_number && (
                                <div className="text-xs text-text-secondary">
                                  SN: {item.serial_number}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-text-primary">
                              {item.product_name || '-'}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                            className="w-full text-xs px-2 py-1 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            step="1"
                            value={item.price ? Math.round(parseFloat(item.price)) : ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Only allow whole numbers
                              if (value === '' || /^\d+$/.test(value)) {
                                updateItem(index, 'price', value);
                              }
                            }}
                            className="w-full text-xs px-2 py-1 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <div className="text-xs font-semibold text-primary">
                            {formatCurrency(item.total || 0)}
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center justify-center gap-1">
                            {/* Edit button - only for incoming invoices */}
                            {currentType === 'in' && (
                              <button
                                type="button"
                                onClick={() => editItem(index)}
                                className="p-1 text-primary hover:bg-primary/10 rounded transition-colors"
                                title="Edito"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="p-1 text-danger hover:bg-danger/10 rounded transition-colors"
                              title="Fshi"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Quick Client Modal */}
      <QuickClientModal
        isOpen={quickClientModalOpen}
        onClose={() => setQuickClientModalOpen(false)}
        onClientCreated={handleQuickClientCreated}
        defaultType={currentType === 'out' ? 'client' : 'supplier'}
      />

      {/* Manual Item Modal - Only for incoming invoices */}
      {currentType === 'in' && (
        <ManualItemModal
          isOpen={manualItemModalOpen}
          onClose={() => {
            setManualItemModalOpen(false);
            setEditingItemIndex(null);
            setEditingItem(null);
          }}
          onItemCreated={handleManualItemCreated}
          onItemUpdated={handleItemUpdated}
          editItem={editingItem}
          editIndex={editingItemIndex}
        />
      )}
    </Modal>
  );
}

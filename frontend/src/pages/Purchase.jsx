import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TopBar from '../components/Layout/TopBar';
import DataTable from '../components/DataTable';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import Badge from '../components/Badge';
import { purchasesAPI, clientsAPI, cashAPI, stockAPI } from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import { Plus } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/format';

export default function Purchase() {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('supplier'); // 'supplier', 'random', 'production'
  const [modalOpen, setModalOpen] = useState(false);
  const [randomModalOpen, setRandomModalOpen] = useState(false);
  const [productionModalOpen, setProductionModalOpen] = useState(false);
  const [productionStep, setProductionStep] = useState(1); // 1: Select gold, 2: Send, 3: Receive
  const [cashModalOpen, setCashModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    supplier_id: '',
    quantity: '',
    price: '',
    payment_method: 'cash',
  });

  const [randomFormData, setRandomFormData] = useState({
    client_name: '',
    client_id_number: '',
    client_phone: '',
    date: new Date().toISOString().split('T')[0],
    quantity: '',
    price: '',
    category: 'blerje',
    karat: '585',
    payment_method: 'cash',
    notes: '',
  });

  const [productionData, setProductionData] = useState({
    source_category: '',
    selected_quantity: '',
    workshop_id: '',
    send_date: new Date().toISOString().split('T')[0],
    return_date: '',
    invoice_workshop: '',
    product_name: '',
    return_quantity: '',
    labor_price: '',
    labor_tax_rate: 0,
  });

  const [cashAmount, setCashAmount] = useState('');
  const [cashDescription, setCashDescription] = useState('');

  const { data: purchasesResponse } = useQuery({
    queryKey: ['purchases'],
    queryFn: () => purchasesAPI.getAll()
  });

  const { data: randomPurchasesResponse } = useQuery({
    queryKey: ['random-purchases'],
    queryFn: () => purchasesAPI.getRandomPurchases()
  });

  const { data: productionsResponse } = useQuery({
    queryKey: ['productions'],
    queryFn: () => purchasesAPI.getProductions()
  });

  const { data: suppliersResponse } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => clientsAPI.getByType('supplier')
  });

  const { data: workshopsResponse } = useQuery({
    queryKey: ['workshops'],
    queryFn: () => clientsAPI.getByType('producer')
  });

  const { data: stockResponse } = useQuery({
    queryKey: ['stock-for-production'],
    queryFn: () => stockAPI.getAll({ category: productionData.source_category }),
    enabled: productionData.source_category !== ''
  });

  const { data: cashData } = useQuery({
    queryKey: ['cash'],
    queryFn: () => cashAPI.get()
  });

  const purchases = Array.isArray(purchasesResponse?.data) ? purchasesResponse.data : [];
  const randomPurchases = Array.isArray(randomPurchasesResponse?.data) ? randomPurchasesResponse.data : [];
  const productions = Array.isArray(productionsResponse?.data) ? productionsResponse.data : [];
  const suppliers = Array.isArray(suppliersResponse?.data) ? suppliersResponse.data : [];
  const workshops = Array.isArray(workshopsResponse?.data) ? workshopsResponse.data : [];
  const stockItems = Array.isArray(stockResponse?.data) ? stockResponse.data : [];

  const purchaseMutation = useMutation({
    mutationFn: (data) => purchasesAPI.create({ ...data, date: new Date().toISOString().split('T')[0] }),
    onSuccess: () => {
      showAlert('Blerja u regjistrua me sukses!', 'success');
      setModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['cash'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
    onError: (error) => {
      showAlert(error.response?.data?.error || 'Gabim në regjistrimin e blerjes', 'error');
    },
  });

  const randomPurchaseMutation = useMutation({
    mutationFn: (data) => purchasesAPI.createRandomPurchase(data),
    onSuccess: () => {
      showAlert('Blerja nga klient random u regjistrua me sukses!', 'success');
      setRandomModalOpen(false);
      resetRandomForm();
      queryClient.invalidateQueries({ queryKey: ['random-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['cash'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error) => {
      showAlert(error.response?.data?.error || 'Gabim në regjistrimin e blerjes', 'error');
    },
  });

  const productionMutation = useMutation({
    mutationFn: (data) => purchasesAPI.createProduction(data),
    onSuccess: () => {
      showAlert('Prodhimi u përfundua me sukses!', 'success');
      setProductionModalOpen(false);
      resetProductionForm();
      queryClient.invalidateQueries({ queryKey: ['productions'] });
      queryClient.invalidateQueries({ queryKey: ['stock'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      showAlert(error.response?.data?.error || 'Gabim në krijimin e prodhimit', 'error');
    },
  });

  const cashMutation = useMutation({
    mutationFn: (data) => cashAPI.add(data),
    onSuccess: () => {
      showAlert('Cash u shtua me sukses!', 'success');
      setCashModalOpen(false);
      setCashAmount('');
      setCashDescription('');
      queryClient.invalidateQueries({ queryKey: ['cash'] });
    },
    onError: (error) => {
      showAlert(error.response?.data?.error || 'Gabim në shtimin e cash', 'error');
    },
  });

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      quantity: '',
      price: '',
      payment_method: 'cash',
    });
  };

  const resetRandomForm = () => {
    setRandomFormData({
      client_name: '',
      client_id_number: '',
      client_phone: '',
      date: new Date().toISOString().split('T')[0],
      quantity: '',
      price: '',
      category: 'blerje',
      karat: '585',
      payment_method: 'cash',
      notes: '',
    });
  };

  const resetProductionForm = () => {
    setProductionData({
      source_category: '',
      selected_quantity: '',
      workshop_id: '',
      send_date: new Date().toISOString().split('T')[0],
      return_date: '',
      invoice_workshop: '',
      product_name: '',
      return_quantity: '',
      labor_price: '',
      labor_tax_rate: 0,
    });
    setProductionStep(1);
  };

  const handlePurchase = (e) => {
    e.preventDefault();
    purchaseMutation.mutate(formData);
  };

  const handleRandomPurchase = (e) => {
    e.preventDefault();
    if (!randomFormData.client_name || !randomFormData.quantity || !randomFormData.price) {
      showAlert('Plotësoni të gjitha fushat e detyrueshme!', 'error');
      return;
    }
    randomPurchaseMutation.mutate(randomFormData);
  };

  const handleProduction = (e) => {
    e.preventDefault();
    if (productionStep === 1) {
      if (!productionData.source_category || !productionData.selected_quantity) {
        showAlert('Zgjedhni kategorinë dhe sasinë!', 'error');
        return;
      }
      setProductionStep(2);
    } else if (productionStep === 2) {
      if (!productionData.workshop_id || !productionData.send_date) {
        showAlert('Plotësoni të gjitha fushat!', 'error');
        return;
      }
      setProductionStep(3);
      if (!productionData.return_date) {
        setProductionData({ ...productionData, return_date: new Date().toISOString().split('T')[0] });
      }
    } else {
      // Step 3: Complete production
      if (!productionData.product_name || !productionData.return_quantity || !productionData.labor_price || !productionData.invoice_workshop) {
        showAlert('Plotësoni të gjitha fushat!', 'error');
        return;
      }

      // Calculate material cost from selected stock
      const availableStock = stockItems.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0);
      const avgPrice = stockItems.length > 0
        ? stockItems.reduce((sum, item) => sum + (parseFloat(item.price || 0) * parseFloat(item.quantity || 0)), 0) / availableStock
        : 0;
      const materialCost = parseFloat(productionData.selected_quantity) * avgPrice;
      const laborSubtotal = parseFloat(productionData.return_quantity) * parseFloat(productionData.labor_price);
      const laborTax = 0;
      const laborCost = laborSubtotal;
      const totalCost = materialCost + laborCost;
      const costPerGram = totalCost / parseFloat(productionData.return_quantity);

      productionMutation.mutate({
        workshop_id: productionData.workshop_id,
        source_category: productionData.source_category,
        product_name: productionData.product_name,
        send_date: productionData.send_date,
        return_date: productionData.return_date,
        invoice_workshop: productionData.invoice_workshop,
        quantity: productionData.return_quantity,
        material_cost: materialCost,
        labor_price: productionData.labor_price,
        labor_tax_rate: 0,
        labor_cost: laborCost,
        total_cost: totalCost,
        cost_per_gram: costPerGram,
      });
    }
  };

  const handleAddCash = (e) => {
    e.preventDefault();
    cashMutation.mutate({ amount: cashAmount, description: cashDescription });
  };

  const total = formData.quantity && formData.price
    ? parseFloat(formData.quantity) * parseFloat(formData.price)
    : 0;

  const randomTotal = randomFormData.quantity && randomFormData.price
    ? parseFloat(randomFormData.quantity) * parseFloat(randomFormData.price)
    : 0;

  const availableStockQty = stockItems.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0);
  const avgStockPrice = stockItems.length > 0 && availableStockQty > 0
    ? stockItems.reduce((sum, item) => sum + (parseFloat(item.price || 0) * parseFloat(item.quantity || 0)), 0) / availableStockQty
    : 0;
  const materialCost = parseFloat(productionData.selected_quantity || 0) * avgStockPrice;
  const laborSubtotal = parseFloat(productionData.return_quantity || 0) * parseFloat(productionData.labor_price || 0);
  const laborTax = 0;
  const laborCost = laborSubtotal;
  const totalCost = materialCost + laborCost;
  const costPerGram = productionData.return_quantity ? totalCost / parseFloat(productionData.return_quantity) : 0;

  return (
    <>
      <TopBar title="Blerje Ari" />
      <div className="space-y-4 sm:space-y-6 max-w-full">
        <div className="bg-blue-50 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <strong className="text-sm sm:text-base">Cash Disponibël:</strong>
            <span className="text-base sm:text-lg font-bold text-primary ml-2">
              {formatCurrency(cashData?.data?.cash || 0)}
            </span>
          </div>
          <Button variant="success" icon={Plus} onClick={() => setCashModalOpen(true)} size="sm" className="w-full sm:w-auto">
            Shto Cash
          </Button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200 overflow-x-auto overflow-y-hidden">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('supplier')}
                className={`px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'supplier'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Blerje nga Furnizuesit
              </button>
              <button
                onClick={() => setActiveTab('random')}
                className={`px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'random'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Blerje nga Klientët Random
              </button>
              <button
                onClick={() => setActiveTab('production')}
                className={`px-4 sm:px-6 py-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === 'production'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Prodhime
              </button>
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {/* Supplier Purchases Tab */}
            {activeTab === 'supplier' && (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-5">
                  <h2 className="text-base sm:text-lg font-bold">Blerje nga Furnizuesit</h2>
                  <Button icon={Plus} onClick={() => setModalOpen(true)} size="sm" className="w-full sm:w-auto">
                    Blerje e Re
                  </Button>
                </div>
                <DataTable
                  columns={[
                    { header: 'Nr.', accessor: 'id', render: (row) => `PUR-${row.id?.slice(-6) || ''}` },
                    { header: 'Furnizuesi', accessor: 'supplier_name' },
                    { 
                      header: 'Data', 
                      accessor: 'date',
                      render: (row) => row.date ? new Date(row.date).toLocaleDateString('sq-AL') : ''
                    },
                    {
                      header: 'Sasia (g)',
                      accessor: 'quantity',
                      align: 'right',
                      render: (row) => formatNumber(row.quantity),
                    },
                    {
                      header: 'Çmimi/g',
                      accessor: 'price',
                      align: 'right',
                      render: (row) => formatCurrency(row.price),
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
                          {row.payment_method === 'cash' ? 'Cash' : 'Bankë'}
                        </Badge>
                      ),
                    },
                  ]}
                  data={purchases}
                  emptyMessage="Nuk ka blerje"
                />
              </>
            )}

            {/* Random Purchases Tab */}
            {activeTab === 'random' && (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-5">
                  <h2 className="text-base sm:text-lg font-bold">Blerje nga Klientët Random</h2>
                  <Button icon={Plus} onClick={() => setRandomModalOpen(true)} size="sm" className="w-full sm:w-auto">
                    Blerje nga Klient Random
                  </Button>
                </div>
                <DataTable
                  columns={[
                    { header: 'Nr.', accessor: 'id', render: (row) => `RND-${row.id?.slice(-6) || ''}` },
                    { header: 'Klienti', accessor: 'client_name' },
                    { header: 'ID/NIPT', accessor: 'client_id_number' },
                    { 
                      header: 'Data', 
                      accessor: 'date',
                      render: (row) => row.date ? new Date(row.date).toLocaleDateString('sq-AL') : ''
                    },
                    {
                      header: 'Sasia (g)',
                      accessor: 'quantity',
                      align: 'right',
                      render: (row) => formatNumber(row.quantity),
                    },
                    {
                      header: 'Çmimi/g',
                      accessor: 'price',
                      align: 'right',
                      render: (row) => formatCurrency(row.price),
                    },
                    {
                      header: 'Totali',
                      accessor: 'total',
                      align: 'right',
                      render: (row) => formatCurrency(row.total),
                    },
                    {
                      header: 'Kategoria',
                      accessor: 'category',
                      render: (row) => <Badge variant="info">{row.category || 'N/A'}</Badge>,
                    },
                    {
                      header: 'Metoda',
                      accessor: 'payment_method',
                      render: (row) => (
                        <Badge variant={row.payment_method === 'cash' ? 'success' : 'primary'}>
                          {row.payment_method === 'cash' ? 'Cash' : 'Bankë'}
                        </Badge>
                      ),
                    },
                  ]}
                  data={randomPurchases}
                  emptyMessage="Nuk ka blerje nga klientët random"
                />
              </>
            )}

            {/* Productions Tab */}
            {activeTab === 'production' && (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-5">
                  <h2 className="text-base sm:text-lg font-bold">Prodhime</h2>
                  <Button icon={Plus} onClick={() => setProductionModalOpen(true)} size="sm" className="w-full sm:w-auto">
                    Prodhim i Ri
                  </Button>
                </div>
                <DataTable
                  columns={[
                    { header: 'Nr.', accessor: 'id', render: (row) => `PROD-${row.id?.slice(-6) || ''}` },
                    { header: 'Produkti', accessor: 'product_name' },
                    { header: 'Puntoria', accessor: 'workshop_name' },
                    { 
                      header: 'Data Kthim', 
                      accessor: 'return_date',
                      render: (row) => row.return_date ? new Date(row.return_date).toLocaleDateString('sq-AL') : ''
                    },
                    {
                      header: 'Sasia (g)',
                      accessor: 'quantity',
                      align: 'right',
                      render: (row) => formatNumber(row.quantity),
                    },
                    {
                      header: 'Kosto/g',
                      accessor: 'cost_per_gram',
                      align: 'right',
                      render: (row) => formatCurrency(row.cost_per_gram),
                    },
                    {
                      header: 'Kosto Totale',
                      accessor: 'total_cost',
                      align: 'right',
                      render: (row) => formatCurrency(row.total_cost),
                    },
                    {
                      header: 'Statusi',
                      accessor: 'status',
                      render: () => <Badge variant="success">Përfunduar</Badge>,
                    },
                  ]}
                  data={productions}
                  emptyMessage="Nuk ka prodhime"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Supplier Purchase Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title="Blerje Ari e Re"
      >
        <form onSubmit={handlePurchase}>
          <Select
            label="Furnizuesi"
            value={formData.supplier_id}
            onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
            options={suppliers.map(s => ({ value: s.id, label: s.name }))}
            required
          />
          <Input
            label="Sasia (gram)"
            type="number"
            step="0.01"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            required
          />
          <Input
            label="Çmimi/gram"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            required
          />
          <Input
            label="Totali"
            type="text"
            value={formatCurrency(total)}
            readOnly
            className="bg-gray-50 font-bold"
          />
          <Select
            label="Metoda e Pagesës"
            value={formData.payment_method}
            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'bank', label: 'Xhirollogari' },
            ]}
          />
          <div className="flex gap-3 mt-6">
            <Button type="submit" disabled={purchaseMutation.isLoading}>
              {purchaseMutation.isLoading ? 'Duke ruajtur...' : 'Ruaj Blerjen'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => { setModalOpen(false); resetForm(); }}>
              Anulo
            </Button>
          </div>
        </form>
      </Modal>

      {/* Random Purchase Modal */}
      <Modal
        isOpen={randomModalOpen}
        onClose={() => { setRandomModalOpen(false); resetRandomForm(); }}
        title="Blerje nga Klient Random"
        size="max-w-2xl"
      >
        <form onSubmit={handleRandomPurchase}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Emri i Klientit"
              value={randomFormData.client_name}
              onChange={(e) => setRandomFormData({ ...randomFormData, client_name: e.target.value })}
              required
            />
            <Input
              label="ID/NIPT"
              value={randomFormData.client_id_number}
              onChange={(e) => setRandomFormData({ ...randomFormData, client_id_number: e.target.value })}
            />
            <Input
              label="Telefoni"
              type="tel"
              value={randomFormData.client_phone}
              onChange={(e) => setRandomFormData({ ...randomFormData, client_phone: e.target.value })}
            />
            <Input
              label="Data"
              type="date"
              value={randomFormData.date}
              onChange={(e) => setRandomFormData({ ...randomFormData, date: e.target.value })}
              required
            />
            <Input
              label="Sasia (gram)"
              type="number"
              step="0.01"
              value={randomFormData.quantity}
              onChange={(e) => setRandomFormData({ ...randomFormData, quantity: e.target.value })}
              required
            />
            <Input
              label="Çmimi/gram"
              type="number"
              step="0.01"
              value={randomFormData.price}
              onChange={(e) => setRandomFormData({ ...randomFormData, price: e.target.value })}
              required
            />
            <Select
              label="Kategoria"
              value={randomFormData.category}
              onChange={(e) => setRandomFormData({ ...randomFormData, category: e.target.value })}
              options={[
                { value: 'blerje', label: 'Blerje' },
                { value: 'perpunim_qarkullim', label: 'Përpunim Qarkullim' },
                { value: 'stoli', label: 'Stoli' },
              ]}
            />
            <Input
              label="Karati"
              value={randomFormData.karat}
              onChange={(e) => setRandomFormData({ ...randomFormData, karat: e.target.value })}
              placeholder="585, 750, etc."
            />
            <Select
              label="Metoda e Pagesës"
              value={randomFormData.payment_method}
              onChange={(e) => setRandomFormData({ ...randomFormData, payment_method: e.target.value })}
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'bank', label: 'Bankë' },
              ]}
              className="md:col-span-2"
            />
            <Input
              label="Shënime"
              value={randomFormData.notes}
              onChange={(e) => setRandomFormData({ ...randomFormData, notes: e.target.value })}
              className="md:col-span-2"
            />
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <strong>Totali: </strong>
            {formatCurrency(randomTotal)}
          </div>
          <div className="flex gap-3 mt-6">
            <Button type="submit" disabled={randomPurchaseMutation.isLoading}>
              {randomPurchaseMutation.isLoading ? 'Duke ruajtur...' : 'Ruaj Blerjen'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => { setRandomModalOpen(false); resetRandomForm(); }}>
              Anulo
            </Button>
          </div>
        </form>
      </Modal>

      {/* Production Modal */}
      <Modal
        isOpen={productionModalOpen}
        onClose={() => { setProductionModalOpen(false); resetProductionForm(); }}
        title="Prodhim i Ri"
        size="max-w-4xl"
      >
        <form onSubmit={handleProduction}>
          {/* Step 1: Select Gold */}
          {productionStep === 1 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                <h4 className="font-bold text-blue-700 mb-3">Hapi 1: Zgjedh Ari të Akumuluar</h4>
                <Select
                  label="Kategoria"
                  value={productionData.source_category}
                  onChange={(e) => setProductionData({ ...productionData, source_category: e.target.value })}
                  options={[
                    { value: 'blerje', label: 'Blerje' },
                    { value: 'perpunim_qarkullim', label: 'Përpunim Qarkullim' },
                  ]}
                  required
                />
                {productionData.source_category && (
                  <div className="mt-4 space-y-2">
                    <div className="text-sm text-gray-600">
                      <strong>Sasia e Disponueshme:</strong> {formatNumber(availableStockQty)}g
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>Çmimi Mesatar:</strong> {formatCurrency(avgStockPrice)}/g
                    </div>
                    <Input
                      label="Sasia për Prodhim (gram)"
                      type="number"
                      step="0.01"
                      value={productionData.selected_quantity}
                      onChange={(e) => setProductionData({ ...productionData, selected_quantity: e.target.value })}
                      max={availableStockQty}
                      required
                    />
                    <div className="p-3 bg-white rounded">
                      <strong>Kosto Materiali: </strong>
                      {formatCurrency(materialCost)}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button type="submit">
                  Vazhdo në Hapi 2 →
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Send to Workshop */}
          {productionStep === 2 && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                <h4 className="font-bold text-yellow-700 mb-3">Hapi 2: Dërgim në Puntorinë</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Puntoria"
                    value={productionData.workshop_id}
                    onChange={(e) => setProductionData({ ...productionData, workshop_id: e.target.value })}
                    options={workshops.map(w => ({ value: w.id, label: w.name }))}
                    required
                  />
                  <Input
                    label="Data e Dërgimit"
                    type="date"
                    value={productionData.send_date}
                    onChange={(e) => setProductionData({ ...productionData, send_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setProductionStep(1)}>
                  ← Kthehu
                </Button>
                <Button type="submit">
                  Vazhdo në Hapi 3 →
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Receive Finished Product */}
          {productionStep === 3 && (
            <div className="space-y-4">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                <h4 className="font-bold text-green-700 mb-3">Hapi 3: Kthim nga Puntoria</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Data e Kthimit"
                    type="date"
                    value={productionData.return_date}
                    onChange={(e) => setProductionData({ ...productionData, return_date: e.target.value })}
                    required
                  />
                  <Input
                    label="Fatura nga Puntoria"
                    value={productionData.invoice_workshop}
                    onChange={(e) => setProductionData({ ...productionData, invoice_workshop: e.target.value })}
                    required
                  />
                  <Input
                    label="Emri i Produktit"
                    value={productionData.product_name}
                    onChange={(e) => setProductionData({ ...productionData, product_name: e.target.value })}
                    required
                  />
                  <Input
                    label="Sasia e Kthyer (gram)"
                    type="number"
                    step="0.01"
                    value={productionData.return_quantity}
                    onChange={(e) => setProductionData({ ...productionData, return_quantity: e.target.value })}
                    required
                  />
                  <Input
                    label="Çmimi Punë Dore/gram"
                    type="number"
                    step="0.01"
                    value={productionData.labor_price}
                    onChange={(e) => setProductionData({ ...productionData, labor_price: e.target.value })}
                    required
                  />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="p-3 bg-white rounded">
                    <strong>Kosto Materiali: </strong>
                    {formatCurrency(materialCost)}
                  </div>
                  <div className="p-3 bg-white rounded">
                    <strong>Kosto Punë Dore: </strong>
                    {formatCurrency(laborCost)}
                  </div>
                  <div className="p-3 bg-white rounded font-bold">
                    <strong>Kosto Totale: </strong>
                    {formatCurrency(totalCost)}
                  </div>
                  <div className="p-3 bg-white rounded font-bold text-green-600">
                    <strong>Kosto/gram: </strong>
                    {formatCurrency(costPerGram)}
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setProductionStep(2)}>
                  ← Kthehu
                </Button>
                <Button type="submit" disabled={productionMutation.isLoading}>
                  {productionMutation.isLoading ? 'Duke ruajtur...' : 'Përfundo Prodhimin'}
                </Button>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Cash Modal */}
      <Modal
        isOpen={cashModalOpen}
        onClose={() => { setCashModalOpen(false); setCashAmount(''); setCashDescription(''); }}
        title="Shto Cash"
      >
        <form onSubmit={handleAddCash}>
          <Input
            label="Shuma"
            type="number"
            step="0.01"
            value={cashAmount}
            onChange={(e) => setCashAmount(e.target.value)}
            required
          />
          <Input
            label="Përshkrim"
            value={cashDescription}
            onChange={(e) => setCashDescription(e.target.value)}
            placeholder="Hyrje nga banka..."
          />
          <div className="flex gap-3 mt-6">
            <Button type="submit" disabled={cashMutation.isLoading}>
              {cashMutation.isLoading ? 'Duke shtuar...' : 'Shto'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => { setCashModalOpen(false); setCashAmount(''); setCashDescription(''); }}>
              Anulo
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

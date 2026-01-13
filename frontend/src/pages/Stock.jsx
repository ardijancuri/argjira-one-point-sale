import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TopBar from '../components/Layout/TopBar';
import DataTable from '../components/DataTable';
import Button from '../components/Button';
import Badge from '../components/Badge';
import StockModal from '../components/modals/StockModal';
import { stockAPI } from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import { Plus, Search, Edit, Trash2, Printer } from 'lucide-react';
import { formatCurrency, formatNumber, formatPercentage } from '../utils/format';

export default function Stock() {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState(null);

  const { data: stockResponse, isLoading } = useQuery({
    queryKey: ['stock', filterCategory, searchTerm],
    queryFn: () => stockAPI.getAll({ category: filterCategory !== 'all' ? filterCategory : null, search: searchTerm })
  });

  // Fetch all stock for statistics (unfiltered)
  const { data: allStockResponse } = useQuery({
    queryKey: ['stock-all'],
    queryFn: () => stockAPI.getAll()
  });

  const stock = Array.isArray(stockResponse?.data) ? stockResponse.data : [];
  const allStock = Array.isArray(allStockResponse?.data) ? allStockResponse.data : [];

  // Calculate statistics
  const calculateStats = () => {
    const totalItems = allStock.length;
    
    // STOLI ARI (category: stoli, unit: gram)
    const stoliAri = allStock.filter(item => item.category === 'stoli' && item.unit === 'gram');
    const stoliAriQuantity = stoliAri.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
    const stoliAriValue = stoliAri.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0);
    
    // ARI I VJETËR (category: blerje, unit: gram)
    const ariVjeter = allStock.filter(item => item.category === 'blerje' && item.unit === 'gram');
    const ariVjeterQuantity = ariVjeter.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
    const ariVjeterValue = ariVjeter.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0);
    
    // AR INVESTUES (category: investues, unit: piece)
    const arInvestues = allStock.filter(item => item.category === 'investues' && item.unit === 'piece');
    const arInvestuesQuantity = arInvestues.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
    const arInvestuesValue = arInvestues.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0);
    
    // DIAMANTA (category: dijamant, unit: piece)
    const diamanta = allStock.filter(item => item.category === 'dijamant' && item.unit === 'piece');
    const diamantaQuantity = diamanta.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
    const diamantaValue = diamanta.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0);
    
    // VLERA TOTALE (all items)
    const totalValue = allStock.reduce((sum, item) => sum + ((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0);
    
    return {
      totalItems,
      stoliAri: { quantity: stoliAriQuantity, value: stoliAriValue },
      ariVjeter: { quantity: ariVjeterQuantity, value: ariVjeterValue },
      arInvestues: { quantity: arInvestuesQuantity, value: arInvestuesValue },
      diamanta: { quantity: diamantaQuantity, value: diamantaValue },
      totalValue
    };
  };

  const stats = calculateStats();

  const deleteMutation = useMutation({
    mutationFn: (id) => stockAPI.delete(id),
    onSuccess: () => {
      showAlert('Artikulli u fshi me sukses!', 'success');
      queryClient.invalidateQueries({ queryKey: ['stock'] });
    },
    onError: () => {
      showAlert('Gabim në fshirjen e artikullit', 'error');
    },
  });

  const handleDelete = (id) => {
    if (window.confirm('Jeni të sigurt që doni të fshini këtë artikull?')) {
      deleteMutation.mutate(id);
    }
  };

  const handlePrintPDF = async () => {
    try {
      // Map current filter to API parameters
      const filters = {};
      if (filterCategory !== 'all') {
        filters.category = filterCategory;
      }
      // Include search term if present
      if (searchTerm.trim()) {
        filters.search = searchTerm.trim();
      }
      
      const response = await stockAPI.generatePDF(filters);
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.download = `stoqet-${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showAlert('Gabim në gjenerimin e PDF', 'error');
    }
  };

  const categoryMap = {
    stoli: { name: 'Stoli Ari', variant: 'primary' },
    investues: { name: 'Ar Investues', variant: 'success' },
    dijamant: { name: 'Dijamant', variant: 'warning' },
    blerje: { name: 'Blerje Ari', variant: 'danger' },
  };

  return (
    <>
      <TopBar title="Stoqet" />
      <div className="space-y-4 sm:space-y-6 max-w-full">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* ARTIKUJ */}
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4" style={{ borderLeftColor: '#6b7280' }}>
            <div className="text-xs text-gray-500 uppercase mb-2">ARTIKUJ</div>
            <div className="text-lg font-bold text-gray-900">{stats.totalItems}</div>
          </div>

          {/* STOLI ARI */}
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4" style={{ borderLeftColor: '#f97316' }}>
            <div className="text-xs text-gray-500 uppercase mb-2">STOLI ARI</div>
            <div className="text-lg font-bold text-gray-900">{formatNumber(stats.stoliAri.quantity)}g</div>
            <div className="text-sm mt-1" style={{ color: '#f97316' }}>{formatCurrency(stats.stoliAri.value)}</div>
          </div>

          {/* ARI I VJETËR */}
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4" style={{ borderLeftColor: '#92400e' }}>
            <div className="text-xs text-gray-500 uppercase mb-2">ARI I VJETËR</div>
            <div className="text-lg font-bold text-gray-900">{formatNumber(stats.ariVjeter.quantity)}g</div>
            <div className="text-sm mt-1" style={{ color: '#92400e' }}>{formatCurrency(stats.ariVjeter.value)}</div>
          </div>

          {/* AR INVESTUES */}
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4" style={{ borderLeftColor: '#f97316' }}>
            <div className="text-xs text-gray-500 uppercase mb-2">AR INVESTUES</div>
            <div className="text-lg font-bold text-gray-900">{formatNumber(stats.arInvestues.quantity)} copë</div>
            <div className="text-sm mt-1" style={{ color: '#f97316' }}>{formatCurrency(stats.arInvestues.value)}</div>
          </div>

          {/* DIAMANTA */}
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4" style={{ borderLeftColor: '#ec4899' }}>
            <div className="text-xs text-gray-500 uppercase mb-2">DIAMANTA</div>
            <div className="text-lg font-bold text-gray-900">{formatNumber(stats.diamanta.quantity)} copë</div>
            <div className="text-sm mt-1" style={{ color: '#ec4899' }}>{formatCurrency(stats.diamanta.value)}</div>
          </div>

          {/* VLERA TOTALE */}
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4" style={{ borderLeftColor: '#10b981' }}>
            <div className="text-xs text-gray-500 uppercase mb-2">VLERA TOTALE</div>
            <div className="text-lg font-bold" style={{ color: '#10b981' }}>{formatCurrency(stats.totalValue)}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-5">
            <h2 className="text-base sm:text-lg font-bold">Stoqet</h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button icon={Printer} variant="success" size="sm" onClick={handlePrintPDF} className="flex-1 sm:flex-none">Print Total</Button>
              <Button icon={Plus} onClick={() => { setSelectedStockId(null); setModalOpen(true); }} size="sm" className="flex-1 sm:flex-none">
                Artikull i Ri
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-5 sm:items-center">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Kërko artikullin..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary text-xs"
            />
          </div>
            <div className="flex gap-2 flex-wrap">
            <Button
              variant={filterCategory === 'all' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilterCategory('all')}
                className="!rounded-full !text-xs"
            >
              Të Gjitha
            </Button>
            <Button
              variant={filterCategory === 'stoli' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilterCategory('stoli')}
                className="!rounded-full !text-xs"
            >
              Stoli Ari
            </Button>
            <Button
              variant={filterCategory === 'investues' ? 'success' : 'secondary'}
              size="sm"
              onClick={() => setFilterCategory('investues')}
                className="!rounded-full !text-xs"
            >
              Ar Investues
            </Button>
            <Button
              variant={filterCategory === 'dijamant' ? 'warning' : 'secondary'}
              size="sm"
              onClick={() => setFilterCategory('dijamant')}
                className="!rounded-full !text-xs"
            >
              Dijamant
            </Button>
            <Button
              variant={filterCategory === 'blerje' ? 'danger' : 'secondary'}
              size="sm"
              onClick={() => setFilterCategory('blerje')}
                className="!rounded-full !text-xs"
            >
              Blerje Ari
            </Button>
            </div>
          </div>

          <DataTable
            columns={[
              { header: 'Emri', accessor: 'name' },
              { header: 'Numër Serik', accessor: 'serial_number' },
              {
                header: 'Sasia',
                accessor: 'quantity',
                align: 'right',
                render: (row) => formatNumber(row.quantity),
              },
              { header: 'Karati', accessor: 'karat' },
              {
                header: 'Njësia',
                accessor: 'unit',
                render: (row) => row.unit === 'gram' ? 'Gram' : 'Copë',
              },
              {
                header: 'Çmimi',
                accessor: 'price',
                align: 'right',
                render: (row) => formatCurrency(row.price),
              },
              {
                header: 'Vlera Totale',
                accessor: 'total_value',
                align: 'right',
                render: (row) => (
                  <strong>{formatCurrency(row.quantity * row.price)}</strong>
                ),
              },
              {
                header: 'Kategoria',
                accessor: 'category',
                render: (row) => {
                  const catInfo = categoryMap[row.category] || { name: row.category, variant: 'secondary' };
                  return <Badge variant={catInfo.variant}>{catInfo.name}</Badge>;
                },
              },
            ]}
            data={stock}
            emptyMessage="Nuk ka stok. Shtoni artikuj të rinj!"
            actions={(row) => (
              <>
                <button
                  onClick={() => { setSelectedStockId(row.id); setModalOpen(true); }}
                  className="p-1 text-primary hover:text-primary-hover transition-colors cursor-pointer"
                  title="Edito"
                >
                  <Edit className="w-4 h-4" />
                </button>
                {(parseFloat(row.quantity) || 0) <= 0 && (
                  <button
                    onClick={() => handleDelete(row.id)}
                    className="p-1 text-danger hover:opacity-70 transition-colors cursor-pointer"
                    title="Fshi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          />
        </div>
      </div>

      <StockModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedStockId(null); }}
        stockId={selectedStockId}
      />
    </>
  );
}

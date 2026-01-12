import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TopBar from '../components/Layout/TopBar';
import DataTable from '../components/DataTable';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Input from '../components/Input';
import ClientModal from '../components/modals/ClientModal';
import { clientsAPI } from '../services/api';
import { useAlert } from '../contexts/AlertContext';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';

export default function Clients() {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);

  const { data: clientsResponse, isLoading } = useQuery({
    queryKey: ['clients', filterType, searchTerm],
    queryFn: () => clientsAPI.getAll({ type: filterType !== 'all' ? filterType : null, search: searchTerm })
  });

  const clients = Array.isArray(clientsResponse?.data) ? clientsResponse.data : [];

  const deleteMutation = useMutation({
    mutationFn: (id) => clientsAPI.delete(id),
    onSuccess: () => {
      showAlert('Klienti u fshi me sukses!', 'success');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: () => {
      showAlert('Gabim në fshirjen e klientit', 'error');
    },
  });

  const handleDelete = (id) => {
    if (window.confirm('Jeni të sigurt që doni të fshini këtë klient?')) {
      deleteMutation.mutate(id);
    }
  };

  const typeMap = {
    client: { text: 'Klient', variant: 'primary' },
    supplier: { text: 'Furnizues', variant: 'success' },
    producer: { text: 'Prodhues', variant: 'warning' },
    retail: { text: 'Pakicë', variant: 'primary' },
  };

  if (isLoading) {
    return (
      <>
        <TopBar title="Klientët" />
        <div className="text-center py-12">Duke ngarkuar...</div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Klientët" />
      <div className="space-y-4 sm:space-y-6 max-w-full">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-5">
            <h2 className="text-base sm:text-lg font-bold">Klientët</h2>
            <Button icon={Plus} onClick={() => { setSelectedClientId(null); setModalOpen(true); }} size="sm" className="w-full sm:w-auto">
              Klient i Ri
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 mb-4 sm:mb-5 sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                placeholder="Kërko klientin..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary text-xs"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterType === 'all' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilterType('all')}
                className="!rounded-full !text-xs"
              >
                Të Gjithë
              </Button>
              <Button
                variant={filterType === 'client' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilterType('client')}
                className="!rounded-full !text-xs"
              >
                Klientë
              </Button>
              <Button
                variant={filterType === 'supplier' ? 'success' : 'secondary'}
                size="sm"
                onClick={() => setFilterType('supplier')}
                className="!rounded-full !text-xs"
              >
                Furnizues
              </Button>
              <Button
                variant={filterType === 'producer' ? 'warning' : 'secondary'}
                size="sm"
                onClick={() => setFilterType('producer')}
                className="!rounded-full !text-xs"
              >
                Prodhues
              </Button>
            </div>
          </div>

          <DataTable
            columns={[
              { header: 'Emri', accessor: 'name' },
              { header: 'ID/NIPT', accessor: 'id_number' },
              { header: 'Telefoni', accessor: 'phone' },
              { header: 'Email', accessor: 'email' },
              { header: 'Adresa', accessor: 'address' },
              {
                header: 'Tipi',
                accessor: 'type',
                render: (row) => {
                  const typeInfo = typeMap[row.type] || { text: 'N/A', variant: 'secondary' };
                  return <Badge variant={typeInfo.variant}>{typeInfo.text}</Badge>;
                },
              },
            ]}
            data={clients}
            emptyMessage="Nuk ka klientë"
            actions={(row) => (
              <>
                <button
                  onClick={() => { setSelectedClientId(row.id); setModalOpen(true); }}
                  className="p-1 text-primary hover:text-primary-hover transition-colors cursor-pointer"
                  title="Edito"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(row.id)}
                  className="p-1 text-danger hover:opacity-70 transition-colors cursor-pointer"
                  title="Fshi"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          />
        </div>
      </div>

      <ClientModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedClientId(null); }}
        clientId={selectedClientId}
      />
    </>
  );
}

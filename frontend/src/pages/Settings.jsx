import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TopBar from '../components/Layout/TopBar';
import Button from '../components/Button';
import Input from '../components/Input';
import { companySettingsAPI } from '../services/api';
import { useCompanySettings } from '../contexts/CompanySettingsContext';
import { useFiscalPrinter } from '../contexts/FiscalPrinterContext';
import { useAlert } from '../contexts/AlertContext';
import { AlertTriangle, Printer } from 'lucide-react';

export default function Settings() {
  const { settings, loading: settingsLoading, updateSettings, refreshSettings } = useCompanySettings();
  const { updatePrinterHeaders, isPrinterConnected, isLoading: printerLoading, connectServer, connectPrinter } = useFiscalPrinter();
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    nipt: '',
    address: '',
    phone: '',
    email: '',
    country: '',
    bank: '',
    iban: '',
    tvsh_number: '',
    tax_number: '',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        name: settings.name || '',
        nipt: settings.nipt || '',
        address: settings.address || '',
        phone: settings.phone || '',
        email: settings.email || '',
        country: settings.country || '',
        bank: settings.bank || '',
        iban: settings.iban || '',
        tvsh_number: settings.tvsh_number || '',
        tax_number: settings.tax_number || '',
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (data) => companySettingsAPI.update(data),
    onSuccess: () => {
      showAlert('Cilësimet u ruajtën me sukses!', 'success');
      refreshSettings();
    },
    onError: () => {
      showAlert('Gabim në ruajtjen e cilësimeve', 'error');
    },
  });

  const handleSave = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleReset = () => {
    const code = prompt('Shkruaj "3001" për të konfirmuar reset:');
    if (code === '3001') {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleUpdateHeaders = async () => {
    try {
      // If not connected, try to connect first
      if (!isPrinterConnected) {
        showAlert('Duke lidhur me printerin fiskal...', 'info');
        
        // Connect to server first
        const serverResult = await connectServer();
        if (!serverResult.success) {
          showAlert('Gabim në lidhjen me serverin ZFPLab. Ju lutem sigurohuni që ZFPLab Server është i hapur dhe po funksionon në portin 4444.', 'error');
          return;
        }
        
        // Then connect to printer with timeout handling
        try {
          const printerResult = await connectPrinter();
          if (!printerResult.success) {
            showAlert(`Gabim në lidhjen me printerin fiskal: ${printerResult.error || 'Printeri nuk u gjet'}. Ju lutem kontrolloni që printeri është i lidhur dhe ZFPLab Server është i hapur.`, 'error');
            return;
          }
        } catch (printerError) {
          showAlert(`Gabim në lidhjen me printerin: ${printerError.message || 'Printeri nuk u gjet ose ZFPLab Server nuk po përgjigjet'}. Ju lutem kontrolloni lidhjen fizike dhe që ZFPLab Server është i hapur.`, 'error');
          return;
        }
      }

      // Now update headers
      const result = await updatePrinterHeaders();
      if (result.success) {
        showAlert('Header-et fiskale u përditësuan me sukses!', 'success');
      } else {
        showAlert(`Gabim: ${result.error}`, 'error');
      }
    } catch (error) {
      showAlert(`Gabim në përditësimin e header-ave: ${error.message}`, 'error');
    }
  };

  return (
    <>
      <TopBar title="Cilësimet" />
      <div className="space-y-4 sm:space-y-6 max-w-full">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-bold mb-4 sm:mb-5">Cilësimet e Kompanisë</h2>
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <Input
                label="Emri i Kompanisë"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <Input
                label="NIPT"
                value={formData.nipt}
                onChange={(e) => setFormData({ ...formData, nipt: e.target.value })}
              />
              <Input
                label="Adresa"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="md:col-span-2"
              />
              <Input
                label="Shteti"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
              <Input
                label="Telefoni"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <Input
                label="Banka"
                value={formData.bank}
                onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
              />
              <Input
                label="Xhirollogaria (IBAN)"
                value={formData.iban}
                onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
              />
              <Input
                label="TVSH Numer"
                value={formData.tvsh_number}
                onChange={(e) => setFormData({ ...formData, tvsh_number: e.target.value })}
              />
              <Input
                label="Numri i Takses"
                value={formData.tax_number}
                onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <Button type="submit" disabled={updateMutation.isLoading || settingsLoading}>
                {updateMutation.isLoading ? 'Duke ruajtur...' : 'Ruaj Ndryshimet'}
              </Button>
              <Button 
                type="button" 
                variant="secondary"
                onClick={handleUpdateHeaders}
                disabled={printerLoading}
                icon={Printer}
              >
                {printerLoading ? 'Duke përditësuar...' : 'Përditëso Header-et Fiskale'}
              </Button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border-l-4 border-danger">
          <h2 className="text-base sm:text-lg font-bold text-danger mb-2 sm:mb-3">Zona e Rrezikshme</h2>
          <p className="text-sm sm:text-base text-text-secondary mb-3 sm:mb-4">
            Veprimet e mëposhtme janë të pakthyeshme. Ju lutem jini të kujdesshëm.
          </p>
          <Button variant="danger" onClick={handleReset} icon={AlertTriangle} size="sm" className="w-full sm:w-auto">
            Reset Database
          </Button>
        </div>
      </div>
    </>
  );
}

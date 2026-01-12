import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import Input from '../Input';
import Select from '../Select';
import Button from '../Button';
import { clientsAPI } from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { useQueryClient } from '@tanstack/react-query';

export default function ClientModal({ isOpen, onClose, clientId = null }) {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    id_number: '',
    phone: '',
    email: '',
    address: '',
    type: 'client',
    card_number: '',
    discount_percent: 0,
  });

  useEffect(() => {
    if (clientId && isOpen) {
      loadClient();
    } else if (isOpen) {
      resetForm();
    }
  }, [clientId, isOpen]);

  const loadClient = async () => {
    try {
      const response = await clientsAPI.getById(clientId);
      setFormData({
        name: response.data.name || '',
        id_number: response.data.id_number || '',
        phone: response.data.phone || '',
        email: response.data.email || '',
        address: response.data.address || '',
        type: response.data.type || 'client',
        card_number: response.data.card_number || '',
        discount_percent: response.data.discount_percent || 0,
      });
    } catch (error) {
      showAlert('Gabim në ngarkimin e klientit', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      id_number: '',
      phone: '',
      email: '',
      address: '',
      type: 'client',
      card_number: '',
      discount_percent: 0,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
      };

      if (clientId) {
        await clientsAPI.update(clientId, data);
        showAlert('Klienti u përditësua me sukses!', 'success');
      } else {
        await clientsAPI.create(data);
        showAlert('Klienti u shtua me sukses!', 'success');
      }

      queryClient.invalidateQueries({ queryKey: ['clients'] });
      onClose();
      resetForm();
    } catch (error) {
      showAlert(error.response?.data?.error || 'Gabim në ruajtjen e klientit', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={clientId ? 'Edito Klientin' : 'Klient i Ri'}
      size="max-w-2xl"
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Emri"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="ID/NIPT"
            value={formData.id_number}
            onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
          />
          <Input
            label="Telefoni"
            type="tel"
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
            label="Adresa"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="md:col-span-2"
          />
          <Select
            label="Tipi"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            options={[
              { value: 'client', label: 'Klient' },
              { value: 'supplier', label: 'Furnizues' },
              { value: 'producer', label: 'Prodhues' },
              { value: 'retail', label: 'Pakicë' },
            ]}
          />
          {formData.type === 'retail' && (
            <>
              <Input
                label="Numri i Kartës"
                value={formData.card_number}
                onChange={(e) => setFormData({ ...formData, card_number: e.target.value })}
              />
              <Input
                label="Zbritje (%)"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.discount_percent}
                onChange={(e) => setFormData({ ...formData, discount_percent: parseFloat(e.target.value) || 0 })}
              />
            </>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <Button type="submit" disabled={loading}>
            {loading ? 'Duke ruajtur...' : 'Ruaj'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Anulo
          </Button>
        </div>
      </form>
    </Modal>
  );
}


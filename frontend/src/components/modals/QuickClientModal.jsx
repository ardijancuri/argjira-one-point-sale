import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import Input from '../Input';
import Select from '../Select';
import Button from '../Button';
import { clientsAPI } from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { useQueryClient } from '@tanstack/react-query';

export default function QuickClientModal({ isOpen, onClose, onClientCreated, defaultType = 'client' }) {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    id_number: '',
    phone: '',
    email: '',
    address: '',
    type: defaultType,
    card_number: '',
    discount_percent: 0,
  });

  // Reset form when modal opens with a new defaultType
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        id_number: '',
        phone: '',
        email: '',
        address: '',
        type: defaultType,
        card_number: '',
        discount_percent: 0,
      });
    }
  }, [isOpen, defaultType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showAlert('Emri është i detyrueshëm!', 'error');
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: formData.name,
        id_number: formData.id_number || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
        type: formData.type,
        card_number: formData.type === 'retail' ? (formData.card_number || null) : null,
        discount_percent: formData.type === 'retail' ? (formData.discount_percent || 0) : 0,
      };

      const response = await clientsAPI.create(data);

      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['pos-clients'] });
      queryClient.invalidateQueries({ queryKey: ['processing-clients'] });
      queryClient.invalidateQueries({ queryKey: ['processing-workshops'] });
      
      showAlert('Klienti u shtua me sukses!', 'success');
      
      if (onClientCreated) {
        onClientCreated(response.data);
      }
      
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
      onClose();
    } catch (error) {
      showAlert(error.response?.data?.error || 'Gabim në krijimin e klientit', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Shto Klient të Shpejtë"
      size="max-w-2xl"
    >
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Emri"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            autoFocus
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


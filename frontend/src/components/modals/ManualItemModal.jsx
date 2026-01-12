import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import Input from '../Input';
import Select from '../Select';
import Button from '../Button';
import { useAlert } from '../../contexts/AlertContext';

export default function ManualItemModal({ isOpen, onClose, onItemCreated, onItemUpdated, editItem, editIndex }) {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const isEditMode = editItem !== null && editIndex !== null;
  
  const [formData, setFormData] = useState({
    name: '',
    serial_number: '',
    quantity: '1',
    karat: '',
    unit: 'piece',
    price: '',
    category: 'stoli',
    tax_rate: '0',
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && editItem) {
        // Populate form with edit item data
        setFormData({
          name: editItem.product_name || editItem.name || '',
          serial_number: editItem.serial_number || editItem.pendingStockData?.serial_number || '',
          quantity: editItem.quantity?.toString() || '1',
          karat: editItem.pendingStockData?.karat || editItem.karat || '',
          unit: editItem.pendingStockData?.unit || editItem.unit || 'piece',
          price: editItem.price?.toString() || '',
          category: editItem.pendingStockData?.category || editItem.category || 'stoli',
          tax_rate: '0',
        });
      } else {
        resetForm();
      }
    }
  }, [isOpen, isEditMode, editItem]);

  const resetForm = () => {
    setFormData({
      name: '',
      serial_number: '',
      quantity: '1',
      karat: '',
      unit: 'piece',
      price: '',
      category: 'stoli',
      tax_rate: '0',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all required fields
    if (!formData.name) {
      showAlert('Vendosni emrin e artikullit!', 'error');
      return;
    }
    if (!formData.serial_number) {
      showAlert('Vendosni numrin serik!', 'error');
      return;
    }
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      showAlert('Vendosni sasinë e artikullit!', 'error');
      return;
    }
    if (!formData.karat) {
      showAlert('Vendosni karatin!', 'error');
      return;
    }
    if (!formData.unit) {
      showAlert('Zgjidhni njësinë!', 'error');
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      showAlert('Vendosni çmimin e artikullit!', 'error');
      return;
    }
    if (!formData.category) {
      showAlert('Zgjidhni kategorinë!', 'error');
      return;
    }

    setLoading(true);

    try {
      // Prepare item data (don't create stock item yet)
      const itemData = {
        name: formData.name,
        serial_number: formData.serial_number || '',
        quantity: formData.quantity,
        karat: formData.karat || '',
        unit: formData.unit || 'piece',
        price: formData.price,
        category: formData.category || 'stoli',
      };

      if (isEditMode) {
        showAlert('Artikulli u përditësua', 'success');
        if (onItemUpdated) {
          onItemUpdated(editIndex, itemData);
        }
      } else {
        showAlert('Artikulli do të shtohet në faturë', 'success');
        if (onItemCreated) {
          onItemCreated(itemData);
        }
      }

      onClose();
      resetForm();
    } catch (error) {
      showAlert(error.response?.data?.error || 'Gabim në shtimin e artikullit', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edito Artikullin" : "Shto Artikull Manual"}
      size="max-w-3xl"
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
            label="Numër Serik"
            value={formData.serial_number}
            onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
            placeholder="SN123456..."
            required
          />
          <Input
            label="Sasia"
            type="number"
            step="0.01"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            required
          />
          <Input
            label="Karati"
            value={formData.karat}
            onChange={(e) => setFormData({ ...formData, karat: e.target.value })}
            placeholder="14k, 18k, 24k..."
            required
          />
          <Select
            label="Njësia"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            options={[
              { value: 'gram', label: 'Gram' },
              { value: 'piece', label: 'Copë' },
            ]}
            required
          />
          <Input
            label="Çmimi"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            required
          />
          <Select
            label="Kategoria"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            options={[
              { value: 'stoli', label: 'Stoli Ari' },
              { value: 'investues', label: 'Ar Investues' },
              { value: 'dijamant', label: 'Dijamant' },
              { value: 'blerje', label: 'Blerje Ari' },
            ]}
            required
          />
        </div>
        <div className="flex gap-3 mt-6">
          <Button type="submit" disabled={loading}>
            {loading 
              ? (isEditMode ? 'Duke ruajtur...' : 'Duke shtuar...') 
              : (isEditMode ? 'Ruaj Ndryshimet' : 'Shto Artikullin')}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Anulo
          </Button>
        </div>
      </form>
    </Modal>
  );
}


import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import Input from '../Input';
import Select from '../Select';
import Button from '../Button';
import { stockAPI } from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatNumber } from '../../utils/format';

export default function StockModal({ isOpen, onClose, stockId = null }) {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    serial_number: '',
    quantity: '',
    karat: '',
    unit: 'piece',
    price: '',
    category: 'stoli',
    tax_rate: '0',
  });

  // Determine if we're creating a new item or editing existing
  const isEditing = !!stockId;

  useEffect(() => {
    if (stockId && isOpen) {
      loadStock();
    } else if (isOpen) {
      resetForm();
    }
  }, [stockId, isOpen]);

  const loadStock = async () => {
    try {
      const response = await stockAPI.getById(stockId);
      const data = response.data;
      setFormData({
        name: data.name || '',
        serial_number: data.serial_number || '',
        quantity: data.quantity || '',
        karat: data.karat || '',
        unit: data.unit || 'piece',
        price: data.price || '',
        category: data.category || 'stoli',
        tax_rate: '0',
      });
    } catch (error) {
      showAlert('Gabim në ngarkimin e artikullit', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      serial_number: '',
      quantity: '',
      karat: '',
      unit: 'piece',
      price: '',
      category: 'stoli',
      tax_rate: '0',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      showAlert('Vendosni emrin e artikullit!', 'error');
      return;
    }

    setLoading(true);

    try {
      if (stockId) {
        // When editing, only update the name (other fields are managed by invoices)
        const data = {
          ...formData,
          quantity: parseFloat(formData.quantity) || 0,
          price: parseFloat(formData.price) || 0,
          tax_rate: 0,
        };
        await stockAPI.update(stockId, data);
        showAlert('Artikulli u përditësua me sukses!', 'success');
      } else {
        // When creating new item, set quantity and price to 0
        // These will be filled by purchase invoices (Fature Hyrese)
        const data = {
          name: formData.name,
          category: formData.category,
          unit: formData.unit,
          quantity: 0,
          price: 0,
          serial_number: null,
          karat: null,
          tax_rate: 0,
        };
        await stockAPI.create(data);
        showAlert('Artikulli u shtua me sukses! Plotësoni sasinë dhe çmimin nga Fatura Hyrëse.', 'success');
      }

      queryClient.invalidateQueries({ queryKey: ['stock'] });
      onClose();
      resetForm();
    } catch (error) {
      showAlert(error.response?.data?.error || 'Gabim në ruajtjen e artikullit', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={stockId ? 'Shiko Artikullin' : 'Artikull i Ri'}
      size={isEditing ? 'max-w-3xl' : 'max-w-md'}
    >
      <form onSubmit={handleSubmit}>
        {/* For new items, show only Name, Category, Unit */}
        {!isEditing ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary mb-4">
              Krijoni modelin e artikullit. Sasia dhe çmimi do të plotësohen automatikisht nga faturat hyrëse.
            </p>
            <Input
              label="Emri"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Emri i artikullit..."
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
            />
            <Select
              label="Njësia"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              options={[
                { value: 'gram', label: 'Gram' },
                { value: 'piece', label: 'Copë' },
              ]}
            />
          </div>
        ) : (
          /* For existing items, show all info as read-only reference */
          <div className="space-y-4">
            <p className="text-sm text-text-secondary mb-4">
              Sasia dhe çmimi menaxhohen nga faturat hyrëse. Vetëm emri mund të ndryshohet.
            </p>
            <Input
              label="Emri"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-text-secondary mb-1">Kategoria</div>
                <div className="text-sm font-medium">
                  {formData.category === 'stoli' ? 'Stoli Ari' : 
                   formData.category === 'investues' ? 'Ar Investues' : 
                   formData.category === 'dijamant' ? 'Dijamant' : 
                   formData.category === 'blerje' ? 'Blerje Ari' : formData.category}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-text-secondary mb-1">Njësia</div>
                <div className="text-sm font-medium">
                  {formData.unit === 'gram' ? 'Gram' : 'Copë'}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-text-secondary mb-1">Sasia</div>
                <div className="text-sm font-medium">
                  {formatNumber(formData.quantity)} {formData.unit === 'gram' ? 'g' : 'copë'}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-text-secondary mb-1">Çmimi</div>
                <div className="text-sm font-medium">{formatCurrency(formData.price)}</div>
              </div>
              {formData.serial_number && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-text-secondary mb-1">Numër Serik</div>
                  <div className="text-sm font-medium">{formData.serial_number}</div>
                </div>
              )}
              {formData.karat && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-text-secondary mb-1">Karati</div>
                  <div className="text-sm font-medium">{formData.karat}</div>
                </div>
              )}
            </div>
          </div>
        )}
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


import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import Input from '../Input';
import Button from '../Button';
import { useAlert } from '../../contexts/AlertContext';

export default function AddToCartModal({ isOpen, onClose, product, onAddToCart }) {
  const { showAlert } = useAlert();
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (product && isOpen) {
      setQuantity('1');
      setPrice(product.price?.toString() || '');
    }
  }, [product, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const cartQty = parseFloat(quantity);
    const cartPrice = parseFloat(price);
    
    if (!quantity || isNaN(cartQty) || cartQty <= 0) {
      showAlert('Vendosni një sasi të vlefshme!', 'error');
      return;
    }
    
    if (!price || isNaN(cartPrice) || cartPrice <= 0) {
      showAlert('Vendosni një çmim të vlefshëm!', 'error');
      return;
    }
    
    if (cartQty > product.quantity) {
      showAlert('Nuk ka mjaftueshëm stok!', 'error');
      return;
    }
    
    onAddToCart({
      ...product,
      cartQty,
      cartPrice,
    });
    
    onClose();
  };

  if (!product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product.name}
      size="max-w-md"
      titleSize="text-base sm:text-lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg text-sm text-text-secondary">
            <div className="mb-1">Stok i disponueshëm:</div>
            <div className="font-semibold text-text-primary">
              {product.quantity} {product.unit === 'gram' ? 'g' : 'copë'}
            </div>
          </div>
          
          <Input
            label="Sasia"
            type="number"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            placeholder="1"
          />
          
          <Input
            label="Çmimi"
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            placeholder="0.00"
          />
        </div>
        
        <div className="flex gap-3 mt-6">
          <Button type="submit">
            Shto në Shportë
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Anulo
          </Button>
        </div>
      </form>
    </Modal>
  );
}


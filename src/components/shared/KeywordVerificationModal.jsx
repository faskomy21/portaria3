import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle } from 'lucide-react';

export default function KeywordVerificationModal({ keyword, isOpen, onClose, onConfirm, loading }) {
  const [checkedItems, setCheckedItems] = useState({});

  if (!keyword) return null;

  const totalItems = keyword.total_items || 1;
  const itemsArray = Array.from({ length: totalItems }, (_, i) => i);
  
  const allChecked = itemsArray.every(i => checkedItems[i]);

  const handleToggle = (itemNumber) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemNumber]: !prev[itemNumber]
    }));
  };

  const handleConfirm = () => {
    onConfirm();
    setCheckedItems({});
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Verificar Encomendas</DialogTitle>
        </DialogHeader>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            Confirme cada encomenda recebida marcando as caixas abaixo.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">
            {totalItems} encomenda{totalItems > 1 ? 's' : ''} esperada{totalItems > 1 ? 's' : ''}:
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3 bg-gray-50">
            {itemsArray.map((itemNumber) => (
              <div key={itemNumber} className="flex items-center gap-3">
                <Checkbox
                  id={`item-${itemNumber}`}
                  checked={checkedItems[itemNumber] || false}
                  onCheckedChange={() => handleToggle(itemNumber)}
                />
                <label htmlFor={`item-${itemNumber}`} className="text-sm font-medium cursor-pointer">
                  Encomenda {itemNumber + 1}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!allChecked || loading}
            className="flex-1"
          >
            {loading ? 'Confirmando...' : 'Confirmar Recebimento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
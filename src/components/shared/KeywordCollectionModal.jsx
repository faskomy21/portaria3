import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Package, CheckCircle2 } from 'lucide-react';

export default function KeywordCollectionModal({ keyword, isOpen, onClose, onCollectOne, onCollectAll, loading }) {
  if (!keyword) return null;

  const totalItems = keyword.total_items || 1;
  const collectedItems = keyword.items_collected || 0;
  const remainingItems = totalItems - collectedItems;
  const isComplete = remainingItems === 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Encomendas Recebidas</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Morador info */}
          <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
            <p className="text-sm text-muted-foreground">Palavra-chave</p>
            <p className="text-2xl font-bold text-primary">{keyword.keyword}</p>
            <p className="text-sm text-muted-foreground mt-3">
              {keyword.resident_name} • {keyword.block_name}, Apt. {keyword.apartment_number}
            </p>
          </div>

          {/* Progress indicator */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progresso:</span>
              <span className="text-lg font-bold">{collectedItems}/{totalItems}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all ${isComplete ? 'bg-green-500' : 'bg-amber-500'}`}
                style={{ width: `${(collectedItems / totalItems) * 100}%` }}
              />
            </div>
          </div>

          {/* Status message */}
          <div className={`rounded-lg p-4 flex items-start gap-3 ${isComplete ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
            <Package className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isComplete ? 'text-green-600' : 'text-amber-600'}`} />
            <div>
              {isComplete ? (
                <>
                  <p className="font-semibold text-green-900">✅ Todas recebidas!</p>
                  <p className="text-sm text-green-800">O morador recebeu todas as {totalItems} encomendas.</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-amber-900">⏳ Faltam encomendas</p>
                  <p className="text-sm text-amber-800">
                    {remainingItems} de {totalItems} encomenda{remainingItems !== 1 ? 's' : ''} ainda para receber.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            {!isComplete && (
              <Button
                onClick={() => onCollectOne(keyword.id)}
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600"
              >
                {loading ? 'Atualizando...' : `Recebeu 1 encomenda (faltam ${remainingItems - 1})`}
              </Button>
            )}

            <Button
              onClick={() => onCollectAll(keyword.id)}
              disabled={isComplete || loading}
              className="w-full"
              variant={isComplete ? 'outline' : 'default'}
            >
              {isComplete ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Concluído
                </>
              ) : (
                'Recebeu todas'
              )}
            </Button>
          </div>

          <Button onClick={onClose} variant="ghost" className="w-full">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
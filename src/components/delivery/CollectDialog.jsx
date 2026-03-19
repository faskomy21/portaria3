import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2 } from 'lucide-react';
import ResidentSearch from '@/components/shared/ResidentSearch';

export default function CollectDialog({ delivery, open, onClose, onConfirm, loading }) {
  const [collectedByResidentId, setCollectedByResidentId] = useState('');
  const [observation, setObservation] = useState('');

  // Reset when opening
  useEffect(() => {
    if (open) {
      setCollectedByResidentId(delivery?.resident_id || '');
      setObservation('');
    }
  }, [open, delivery]);

  // Fetch ALL residents for search autocomplete
  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list('name', 500),
    enabled: open,
  });

  const selectedResident = residents.find(r => r.id === collectedByResidentId);

  function handleConfirm() {
    onConfirm({
      collected_by_resident_id: collectedByResidentId,
      collected_by_name: selectedResident?.name || delivery?.resident_name || '',
      observation: observation.trim(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Confirmar Retirada
          </DialogTitle>
          <DialogDescription>Selecione quem está retirando e adicione uma observação se necessário.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Encomenda de:</p>
            <p className="text-sm font-semibold">{delivery?.resident_name} — Apt {delivery?.apartment_number} {delivery?.block_name}</p>
          </div>

          <div className="space-y-1.5">
            <Label>Quem está retirando?</Label>
            <ResidentSearch
              residents={residents}
              value={collectedByResidentId}
              onChange={(id) => setCollectedByResidentId(id)}
              placeholder="Digite o nome do morador..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Observação <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea
              placeholder="Ex: Pacote amassado, entregue ao vizinho, etc..."
              value={observation}
              onChange={e => setObservation(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleConfirm}
            disabled={loading || !collectedByResidentId}
          >
            {loading ? 'Salvando...' : 'Confirmar Retirada'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
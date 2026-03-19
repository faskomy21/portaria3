import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';

const ENTITIES_TO_RESET = [
  { key: 'deliveries',          entity: 'Delivery',          label: 'Entregas' },
  { key: 'refused_deliveries',  entity: 'RefusedDelivery',   label: 'Recusas/Avarias' },
  { key: 'delivery_keywords',   entity: 'DeliveryKeyword',   label: 'Palavras-chave' },
  { key: 'notification_queue',  entity: 'NotificationQueue', label: 'Notificações' },
];

const CONFIRM_WORD = 'RESETAR';

export default function ResetDataModal({ open, onClose }) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState('');
  const queryClient = useQueryClient();

  const isConfirmed = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  async function handleReset() {
    if (!isConfirmed) return;
    setLoading(true);
    setProgress('Iniciando...');

    for (const { entity, label, key } of ENTITIES_TO_RESET) {
      setProgress(`Apagando ${label}...`);
      const items = await base44.entities[entity].list('-created_date', 9999);
      for (const item of items) {
        await base44.entities[entity].delete(item.id);
      }
      queryClient.invalidateQueries({ queryKey: [key] });
    }

    setLoading(false);
    setDone(true);
    setProgress('');
  }

  function handleClose() {
    setConfirmText('');
    setDone(false);
    setProgress('');
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Resetar Todos os Dados
          </DialogTitle>
          <DialogDescription>
            Esta ação é irreversível. Serão apagados permanentemente:
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="text-center font-semibold">Dados resetados com sucesso!</p>
            <p className="text-sm text-muted-foreground text-center">Todas as entregas, recusas, palavras-chave e notificações foram apagadas.</p>
            <Button onClick={handleClose} className="w-full">Fechar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4 space-y-2">
              {ENTITIES_TO_RESET.map(e => (
                <div key={e.entity} className="flex items-center gap-2 text-sm">
                  <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
                  <span className="text-destructive/80 font-medium">{e.label}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Digite <span className="font-mono font-bold text-destructive">{CONFIRM_WORD}</span> para confirmar:
              </label>
              <Input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={CONFIRM_WORD}
                className={`font-mono ${isConfirmed ? 'border-destructive ring-1 ring-destructive' : ''}`}
                disabled={loading}
              />
            </div>

            {progress && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {progress}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={handleClose} className="flex-1" disabled={loading}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleReset}
                disabled={!isConfirmed || loading}
                className="flex-1 gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {loading ? 'Resetando...' : 'Resetar Tudo'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
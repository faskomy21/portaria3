import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Search, CheckCircle2, ScanLine, MessageSquare, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import StatusBadge from '@/components/shared/StatusBadge';
import CollectDialog from '@/components/delivery/CollectDialog';
import NotificationQueueMonitor from '@/components/delivery/NotificationQueueMonitor';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function Deliveries() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [collectTarget, setCollectTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const queryClient = useQueryClient();

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ['deliveries'],
    queryFn: () => base44.entities.Delivery.list('-created_date', 9999),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Delivery.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['deliveries'] }); toast.success('Status atualizado!'); },
  });

  const finalizeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Delivery.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['deliveries'] }); toast.success('Entrega finalizada!'); },
  });

  const markCollected = (delivery) => {
    setCollectTarget(delivery);
  };

  const handleCollectConfirm = async ({ collected_by_resident_id, collected_by_name, observation }) => {
    const collectedAt = new Date().toISOString();
    
    updateMutation.mutate({
      id: collectTarget.id,
      data: {
        status: 'collected',
        collected_at: collectedAt,
        collected_by_resident_id,
        collected_by_name,
        observation,
      }
    }, {
      onSuccess: async () => {
        try {
          await base44.functions.invoke('queueCollectionNotification', {
            resident_name: collectTarget.resident_name,
            resident_id: collectTarget.resident_id,
            resident_phone: collectTarget.resident_phone || '',
            collected_by_name,
            collected_at: collectedAt,
          });
        } catch (err) {
          console.error('Erro ao enfileirar notificação:', err);
        }
      }
    });
    setCollectTarget(null);
  };

  const handleDeleteConfirm = () => {
    finalizeMutation.mutate({
      id: deleteTarget.id,
      data: { status: 'collected', collected_at: new Date().toISOString() }
    });
    setDeleteTarget(null);
  };

  const isHidden = (d) => {
    return d.status === 'collected' && d.collected_at &&
      (new Date() - new Date(d.collected_at)) / (1000 * 60) >= 2;
  };

  const filtered = deliveries.filter(d => {
    const matchSearch = search === '' || 
      d.tracking_code?.toLowerCase().includes(search.toLowerCase()) ||
      d.resident_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.apartment_number?.toLowerCase().includes(search.toLowerCase());

    if (statusFilter === 'hidden') {
      return matchSearch && isHidden(d);
    }

    // Oculta entregas retiradas há mais de 2 minutos nos demais filtros
    if (isHidden(d)) return false;

    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Entregas" subtitle="Histórico e gerenciamento de entregas" />
      <div className="flex justify-end mb-6">
        <Link to="/NewDelivery">
          <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
            <ScanLine className="h-4 w-4 mr-2" /> Nova Entrega
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por código, morador ou apt..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="notified">Notificado</SelectItem>
            <SelectItem value="collected">Retirado</SelectItem>
            <SelectItem value="hidden">Finalizadas (ocultas)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="Nenhuma entrega encontrada" description="Registre novas entregas escaneando o código do pacote." />
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <Card key={d.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{d.resident_name || 'Morador'}</p>
                      <p className="text-xs text-muted-foreground">{d.block_name} - Apt {d.apartment_number}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{d.tracking_code}</p>
                      {d.carrier && <p className="text-xs text-muted-foreground">Via: {d.carrier}</p>}
                       {d.collected_by_name && d.collected_by_name !== d.resident_name && (
                         <p className="text-xs text-blue-600 mt-0.5">Retirado por: {d.collected_by_name}</p>
                       )}
                       {d.observation && (
                         <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                           <MessageSquare className="h-3 w-3" /> {d.observation}
                         </p>
                       )}
                      </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={d.status} />
                    <span className="text-xs text-muted-foreground">
                      {d.created_date && format(new Date(d.created_date), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </span>
                    {d.status !== 'collected' && (
                      <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => markCollected(d)}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Retirado
                      </Button>
                    )}
                    {d.status === 'collected' && (
                       <Button size="sm" variant="ghost" className="text-amber-600 hover:bg-amber-50" onClick={() => setDeleteTarget(d)} title="Finalizar entrega">
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NotificationQueueMonitor />

      <CollectDialog
        delivery={collectTarget}
        open={!!collectTarget}
        onClose={() => setCollectTarget(null)}
        onConfirm={handleCollectConfirm}
        loading={updateMutation.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Finalizar entrega?</AlertDialogTitle>
             <AlertDialogDescription>
               Esta entrega será movida para finalizadas. {deleteTarget?.resident_name && `(${deleteTarget.resident_name} - Apt ${deleteTarget.apartment_number})`}
             </AlertDialogDescription>
           </AlertDialogHeader>
           <div className="flex justify-end gap-3">
             <AlertDialogCancel>Cancelar</AlertDialogCancel>
             <AlertDialogAction onClick={handleDeleteConfirm} className="bg-primary hover:bg-primary/90">
               Finalizar
             </AlertDialogAction>
           </div>
         </AlertDialogContent>
       </AlertDialog>
    </div>
  );
}
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DoorOpen, Pencil, Trash2, ArrowUpAZ, ArrowDownAZ } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';

export default function Apartments() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ number: '', block_id: '', floor: '' });
  const [sortOrder, setSortOrder] = useState('asc');
  const queryClient = useQueryClient();

  const { data: apartments = [], isLoading } = useQuery({
    queryKey: ['apartments'],
    queryFn: () => base44.entities.Apartment.list('number'),
  });

  const { data: blocks = [] } = useQuery({
    queryKey: ['blocks'],
    queryFn: () => base44.entities.Block.list('name'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Apartment.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['apartments'] }); close(); toast.success('Apartamento criado!'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Apartment.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['apartments'] }); close(); toast.success('Apartamento atualizado!'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Apartment.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['apartments'] }); toast.success('Apartamento removido!'); },
  });

  function close() {
    setDialogOpen(false);
    setEditing(null);
    setForm({ number: '', block_id: '', floor: '' });
  }

  function openEdit(apt) {
    setEditing(apt);
    setForm({ number: apt.number, block_id: apt.block_id, floor: apt.floor || '' });
    setDialogOpen(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const block = blocks.find(b => b.id === form.block_id);
    const data = { ...form, block_name: block?.name || '' };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const sortedApartments = [...apartments].sort((a, b) => {
    const numA = parseInt(a.number) || 0;
    const numB = parseInt(b.number) || 0;
    return sortOrder === 'asc' ? numA - numB : numB - numA;
  });

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Apartamentos" subtitle="Gerencie os apartamentos do condomínio" actionLabel="Novo Apartamento" onAction={() => setDialogOpen(true)} />

      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground">Ordenar:</span>
        <Button
          variant={sortOrder === 'asc' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortOrder('asc')}
          className="gap-1"
        >
          <ArrowUpAZ className="h-4 w-4" /> Crescente
        </Button>
        <Button
          variant={sortOrder === 'desc' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSortOrder('desc')}
          className="gap-1"
        >
          <ArrowDownAZ className="h-4 w-4" /> Decrescente
        </Button>
      </div>

      {sortedApartments.length === 0 ? (
        <EmptyState icon={DoorOpen} title="Nenhum apartamento cadastrado" description="Cadastre os apartamentos vinculados aos blocos." actionLabel="Cadastrar Apartamento" onAction={() => setDialogOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedApartments.map((apt) => (
            <Card key={apt.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-cyan-100 flex items-center justify-center">
                      <DoorOpen className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Apt {apt.number}</h3>
                      <p className="text-sm text-muted-foreground">{apt.block_name || 'Sem bloco'}</p>
                      {apt.floor && <p className="text-xs text-muted-foreground">{apt.floor}º andar</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(apt)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(apt.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) close(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Apartamento' : 'Novo Apartamento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Bloco *</Label>
              <Select value={form.block_id} onValueChange={(v) => setForm({ ...form, block_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o bloco" /></SelectTrigger>
                <SelectContent>
                  {blocks.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Número do Apartamento *</Label>
              <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="Ex: 101" required />
            </div>
            <div>
              <Label>Andar</Label>
              <Input value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="Ex: 1" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={close}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
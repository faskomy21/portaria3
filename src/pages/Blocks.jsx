import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Pencil, Trash2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';

export default function Blocks() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const queryClient = useQueryClient();

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ['blocks'],
    queryFn: () => base44.entities.Block.list('name'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Block.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['blocks'] }); close(); toast.success('Bloco criado!'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Block.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['blocks'] }); close(); toast.success('Bloco atualizado!'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Block.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['blocks'] }); toast.success('Bloco removido!'); },
  });

  function close() {
    setDialogOpen(false);
    setEditing(null);
    setForm({ name: '', description: '' });
  }

  function openEdit(block) {
    setEditing(block);
    setForm({ name: block.name, description: block.description || '' });
    setDialogOpen(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Blocos" subtitle="Gerencie os blocos do condomínio" actionLabel="Novo Bloco" onAction={() => setDialogOpen(true)} />

      {blocks.length === 0 ? (
        <EmptyState icon={Building2} title="Nenhum bloco cadastrado" description="Cadastre os blocos do condomínio para começar." actionLabel="Cadastrar Bloco" onAction={() => setDialogOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {blocks.map((block) => (
            <Card key={block.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{block.name}</h3>
                      {block.description && <p className="text-sm text-muted-foreground mt-0.5">{block.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(block)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(block.id)}>
                      <Trash2 className="h-4 w-4" />
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
            <DialogTitle>{editing ? 'Editar Bloco' : 'Novo Bloco'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome do Bloco *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Bloco A" required />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Observações..." />
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
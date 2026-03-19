import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Pencil, Trash2, Phone, Search } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import AptSearch from '@/components/shared/AptSearch';

export default function Residents() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', apartment_id: '', apartment_number: '', is_primary: false });
  const [formBlock, setFormBlock] = useState('');
  const [search, setSearch] = useState('');
  const [filterBlock, setFilterBlock] = useState('all');
  const [filterApartment, setFilterApartment] = useState('all');
  const [filterFloor, setFilterFloor] = useState('all');
  const queryClient = useQueryClient();

  const { data: residents = [], isLoading } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list('name'),
  });

  const { data: apartments = [] } = useQuery({
    queryKey: ['apartments'],
    queryFn: () => base44.entities.Apartment.list('number', 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Resident.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['residents'] }); closeDialog(); toast.success('Morador cadastrado!'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Resident.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['residents'] }); closeDialog(); toast.success('Morador atualizado!'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Resident.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['residents'] }); toast.success('Morador removido!'); },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setForm({ name: '', phone: '', apartment_id: '', apartment_number: '', is_primary: false });
    setFormBlock('');
  }

  function openEdit(r) {
    setEditing(r);
    setForm({ name: r.name, phone: r.phone, apartment_id: r.apartment_id, apartment_number: r.apartment_number || '', is_primary: r.is_primary || false });
    setFormBlock(r.block_name || '');
    setDialogOpen(true);
  }

  // apartments filtered by selected block in form
  const formApts = apartments.filter(a => {
    if (a.block_name) return a.block_name === formBlock;
    return !!formBlock;
  });

  function handleAptSelect(aptNumber) {
    const apt = apartments.find(a => a.number === aptNumber && (!formBlock || !a.block_name || a.block_name === formBlock));
    setForm({ ...form, apartment_id: apt?.id || '', apartment_number: aptNumber });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const nameParts = form.name.trim().split(/\s+/);
    if (nameParts.length < 2 || nameParts[1].length < 1) {
      toast.error('Informe o nome completo (nome e sobrenome).');
      return;
    }
    const apt = apartments.find(a => a.id === form.apartment_id);
    const aptNumber = apt?.number || form.apartment_number || '';
    const blockName = apt?.block_name || formBlock || '';
    const data = { ...form, apartment_number: aptNumber, block_name: blockName };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  // Derived filter options
  const blocks = [...new Set(apartments.map(a => a.block_name).filter(Boolean))].sort();
  const aptsByBlock = filterBlock === 'all' ? apartments : apartments.filter(a => a.block_name === filterBlock);
  const apartmentNumbers = [...new Set(aptsByBlock.map(a => a.number).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const floors = [...new Set(aptsByBlock.map(a => a.floor).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const filteredResidents = residents.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.phone.includes(search);
    const matchBlock = filterBlock === 'all' || r.block_name === filterBlock;
    const matchApt = filterApartment === 'all' || r.apartment_number === filterApartment;
    const residentApt = apartments.find(a => a.id === r.apartment_id);
    const matchFloor = filterFloor === 'all' || residentApt?.floor === filterFloor;
    return matchSearch && matchBlock && matchApt && matchFloor;
  });

  // Group by apartment for display
  const grouped = filteredResidents.reduce((acc, r) => {
    const key = `${r.block_name}|||${r.apartment_number}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const groupKeys = Object.keys(grouped).sort((a, b) => {
    const [blockA, aptA] = a.split('|||');
    const [blockB, aptB] = b.split('|||');
    if (blockA !== blockB) return blockA.localeCompare(blockB);
    return aptA.localeCompare(aptB, undefined, { numeric: true });
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Moradores"
        subtitle="Gerencie os moradores do condomínio"
        actionLabel="Novo Morador"
        onAction={() => setDialogOpen(true)}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterBlock} onValueChange={v => { setFilterBlock(v); setFilterApartment('all'); setFilterFloor('all'); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Bloco" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os blocos</SelectItem>
            {blocks.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterApartment} onValueChange={setFilterApartment}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Apartamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os apts</SelectItem>
            {apartmentNumbers.map(n => <SelectItem key={n} value={n}>Apt {n}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterFloor} onValueChange={setFilterFloor}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Andar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os andares</SelectItem>
            {floors.map(f => <SelectItem key={f} value={f}>Andar {f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {residents.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum morador cadastrado"
          description="Cadastre os moradores e seus números de WhatsApp para notificações."
          actionLabel="Cadastrar Morador"
          onAction={() => setDialogOpen(true)}
        />
      ) : filteredResidents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          Nenhum morador encontrado com os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-6">
          {groupKeys.map(key => {
            const [blockName, aptNumber] = key.split('|||');
            const group = grouped[key];
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {blockName} — Apt {aptNumber}
                  </span>
                  <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                    {group.length} morador{group.length > 1 ? 'es' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.map(r => (
                    <Card key={r.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-xl bg-rose-100 flex items-center justify-center">
                              <Users className="h-5 w-5 text-rose-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm">{r.name}</h3>
                                {r.is_primary && (
                                  <Badge className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0">Principal</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{r.block_name} - Apt {r.apartment_number}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <p className="text-xs text-muted-foreground">{r.phone}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(r.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Morador' : 'Novo Morador'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome Completo *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome do morador" required />
            </div>
            <div>
              <Label>WhatsApp *</Label>
              <div className="flex items-center border border-input rounded-md overflow-hidden">
                <span className="px-3 py-2 bg-muted text-muted-foreground text-sm font-medium">+55</span>
                <input 
                  type="text"
                  inputMode="numeric"
                  value={form.phone.replace(/^55/, '')}
                  onChange={e => {
                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 11);
                    setForm({ ...form, phone: '55' + cleaned });
                  }}
                  placeholder="11999999999"
                  className="flex h-9 w-full bg-transparent px-3 py-1 text-base border-0 placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  maxLength="11"
                  required 
                />
              </div>
            </div>
            <div>
              <Label>Bloco *</Label>
              <Select value={formBlock} onValueChange={v => { setFormBlock(v); setForm({ ...form, apartment_id: '', apartment_number: '' }); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o bloco" /></SelectTrigger>
                <SelectContent>
                  {blocks.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Apartamento *</Label>
              <AptSearch
                apartments={formApts}
                value={form.apartment_number || apartments.find(a => a.id === form.apartment_id)?.number || ''}
                onChange={handleAptSelect}
                disabled={!formBlock}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_primary} onCheckedChange={v => setForm({ ...form, is_primary: v })} />
              <Label>Morador principal</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
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
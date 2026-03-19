import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import ResidentSearch from '@/components/shared/ResidentSearch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { KeyRound, Plus, Search, Trash2, CheckCircle2, Clock, User, QrCode } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import QRCodeKeyword from '@/components/shared/QRCodeKeyword';
import KeywordNotificationMonitor from '@/components/keywords/KeywordNotificationMonitor';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function Keywords() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [form, setForm] = useState({ resident_id: '', keyword: '', notes: '' });
  const queryClient = useQueryClient();

  const { data: keywords = [], isLoading } = useQuery({
    queryKey: ['keywords'],
    queryFn: () => base44.entities.DeliveryKeyword.list('-informed_at', 500),
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list('name', 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DeliveryKeyword.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      toast.success('Palavra-chave cadastrada!');
      setDialogOpen(false);
      setForm({ resident_id: '', keyword: '', notes: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DeliveryKeyword.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      toast.success('Palavra-chave removida!');
    },
  });

  const markUsedMutation = useMutation({
    mutationFn: (id) => base44.entities.DeliveryKeyword.update(id, { used: true, used_at: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords'] });
      toast.success('Palavra-chave marcada como utilizada!');
    },
  });



  const handleSubmit = () => {
    if (!form.resident_id || !form.keyword.trim()) {
      toast.error('Selecione o morador e informe a palavra-chave.');
      return;
    }
    const resident = residents.find(r => r.id === form.resident_id);
    createMutation.mutate({
      ...form,
      resident_name: resident?.name || '',
      apartment_number: resident?.apartment_number || '',
      block_name: resident?.block_name || '',
      informed_at: new Date().toISOString(),
      used: false,
    });
  };

  const active = keywords.filter(k => !k.used);
  const finished = keywords.filter(k => k.used);

  const filtered = (activeTab === 'active' ? active : finished).filter(k =>
    search === '' ||
    k.keyword?.toLowerCase().includes(search.toLowerCase()) ||
    k.resident_name?.toLowerCase().includes(search.toLowerCase()) ||
    k.apartment_number?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Palavras-chave"
        subtitle="Palavras-chave informadas pelos moradores para retirada de encomendas"
        actionLabel="Nova Palavra-chave"
        onAction={() => setDialogOpen(true)}
      />
      <div className="mb-4">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setQrOpen(true)}>
          <QrCode className="h-4 w-4" />
          QR Code para Moradores
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
            activeTab === 'active'
              ? 'bg-amber-100 text-amber-700 border-amber-200 shadow-sm'
              : 'bg-card border-border text-muted-foreground hover:bg-muted'
          }`}
        >
          <Clock className="h-4 w-4" />
          Ativas
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'active' ? 'bg-white/60' : 'bg-muted'}`}>
            {active.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('finished')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
            activeTab === 'finished'
              ? 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm'
              : 'bg-card border-border text-muted-foreground hover:bg-muted'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          Finalizadas
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'finished' ? 'bg-white/60' : 'bg-muted'}`}>
            {finished.length}
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por palavra-chave, morador ou apt..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{keywords.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{keywords.filter(k => !k.used).length}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm col-span-2 sm:col-span-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{keywords.filter(k => k.used).length}</p>
              <p className="text-xs text-muted-foreground">Utilizadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState icon={KeyRound} title="Nenhuma palavra-chave encontrada" description="Cadastre palavras-chave que os moradores informam para retirada de encomendas." />
      ) : (
        <div className="space-y-3">
          {filtered.map((k) => (
            <Card key={k.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${k.used ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                      <KeyRound className={`h-5 w-5 ${k.used ? 'text-emerald-600' : 'text-amber-600'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-base tracking-wide">{k.keyword}</p>
                        <Badge variant={k.used ? 'secondary' : 'default'} className={k.used ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                          {k.used ? 'Utilizada' : 'Pendente'}
                        </Badge>

                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <User className="h-3 w-3" />
                        <span>{k.resident_name}</span>
                        {k.block_name && <span>• {k.block_name}</span>}
                        {k.apartment_number && <span>- Apt {k.apartment_number}</span>}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>Informada em: {k.informed_at ? format(new Date(k.informed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—'}</span>
                      </div>
                      {k.used && k.used_at && (
                        <p className="text-xs text-emerald-600 mt-0.5">
                          Utilizada em: {format(new Date(k.used_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      )}
                      {k.notes && <p className="text-xs text-muted-foreground italic mt-0.5">"{k.notes}"</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!k.used && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => markUsedMutation.mutate(k.id)}
                        disabled={markUsedMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Utilizada
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => deleteMutation.mutate(k.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}



      <KeywordNotificationMonitor />

      {/* Dialog: QR Code */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-amber-500" />
              QR Code — Cadastro de Palavra-chave
            </DialogTitle>
            <DialogDescription>
              O morador escaneia e preenche o formulário pelo celular.
            </DialogDescription>
          </DialogHeader>
          <QRCodeKeyword />
        </DialogContent>
      </Dialog>

      {/* Dialog: Nova Palavra-chave */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Nova Palavra-chave
            </DialogTitle>
            <DialogDescription>
              Registre a palavra-chave informada pelo morador para retirada de encomenda.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Morador *</Label>
              <ResidentSearch
                residents={residents}
                value={form.resident_id}
                onChange={(id) => setForm(f => ({ ...f, resident_id: id }))}
                placeholder="Digite o nome do morador..."
              />
            </div>
            <div className="space-y-2">
              <Label>Palavra-chave *</Label>
              <Input
                placeholder="Ex: SOLAR, AZUL, GIRASSOL..."
                value={form.keyword}
                onChange={(e) => setForm(f => ({ ...f, keyword: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Alguma observação adicional..."
                value={form.notes}
                onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Salvando...' : 'Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
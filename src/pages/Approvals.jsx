import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getSession } from '@/components/auth/AuthEmployee';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, Clock, User, Phone, Building2, DoorOpen, QrCode, Trash2 } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import QRCodeDisplay from '@/components/shared/QRCodeDisplay';
import ApprovalNotificationMonitor from '@/components/approvals/ApprovalNotificationMonitor';

const MAX_RESIDENTS_DEFAULT = 10;

export default function Approvals() {
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [qrDialog, setQrDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState('pending');
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['residentRequests'],
    queryFn: () => base44.entities.ResidentRequest.list('-created_date'),
  });

  const { data: apartments = [] } = useQuery({
    queryKey: ['apartments'],
    queryFn: () => base44.entities.Apartment.list(),
  });

  const { data: blocks = [] } = useQuery({
    queryKey: ['blocks'],
    queryFn: () => base44.entities.Block.list('name'),
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list(),
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['condo-settings'],
    queryFn: () => base44.entities.CondoSettings.list(),
  });

  const settings = settingsList[0] || {};
  const whatsappEnabled = !!(settings.whatsapp_instance_url && settings.whatsapp_api_key && settings.whatsapp_instance_name);

  // Verificar se é gerente ou admin para aprovar moradores
  const session = getSession();
  const canApprove = ['admin', 'gerente'].includes(session?.role);

  const approveMutation = useMutation({
    mutationFn: async (request) => {
      // 1. Encontrar ou criar o bloco
      let block = blocks.find(b => b.name.toLowerCase() === request.block_name.toLowerCase());
      if (!block) {
        block = await base44.entities.Block.create({ name: request.block_name });
      }

      // 2. Encontrar ou criar o apartamento
      let apartment = apartments.find(
        a => a.block_id === block.id && a.number === request.apartment_number
      );

      if (!apartment) {
        apartment = await base44.entities.Apartment.create({
          number: request.apartment_number,
          block_id: block.id,
          block_name: block.name,
        });
      }

      // 3. Verificar limite de moradores no apartamento
      const aptResidents = residents.filter(r => r.apartment_id === apartment.id);
      if (aptResidents.length >= MAX_RESIDENTS_DEFAULT) {
        throw new Error(`Limite de ${MAX_RESIDENTS_DEFAULT} moradores por apartamento atingido.`);
      }

      // 4. Criar o morador
      const isPrimary = aptResidents.length === 0;
      const newResident = await base44.entities.Resident.create({
        name: request.name,
        phone: request.phone,
        apartment_id: apartment.id,
        apartment_number: apartment.number,
        block_name: block.name,
        is_primary: isPrimary,
      });

      // 5. Atualizar a solicitação
      await base44.entities.ResidentRequest.update(request.id, {
        status: 'approved',
        approved_at: new Date().toISOString(),
        resident_id: newResident.id,
      });
    },
    onSuccess: async (_, request) => {
      queryClient.invalidateQueries({ queryKey: ['residentRequests'] });
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      queryClient.invalidateQueries({ queryKey: ['apartments'] });
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
      
      // Notificar via WhatsApp
      let message = settings.approval_message || 'Bem-vindo ao condomínio! 🏠\n\nSua solicitação foi aprovada. Você já pode acessar o sistema de controle de entregas.';
      message = `${message}\n\nApartamento: *${request.apartment_number}* — Bloco: *${request.block_name}*`;
      const phone = request.phone.replace(/\D/g, '');
      
      if (whatsappEnabled && settings.notify_approval_enabled !== false) {
        // Enfileira com delay de 30 minutos para não sobrecarregar a Evolution
        const scheduledAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        await base44.entities.NotificationQueue.create({ phone, message, scheduled_at: scheduledAt });
        toast.success('Morador aprovado! Notificação WhatsApp agendada para 30 minutos.');
      } else {
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
        toast.success('Morador aprovado e cadastrado com sucesso!');
      }
    },
    onError: (err) => {
      toast.error(err.message || 'Erro ao aprovar solicitação.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ResidentRequest.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residentRequests'] });
      toast.success('Solicitação excluída.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }) => base44.entities.ResidentRequest.update(id, {
      status: 'rejected',
      rejection_reason: reason,
      rejected_at: new Date().toISOString(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residentRequests'] });
      setRejectDialog(null);
      setRejectReason('');
      toast.success('Solicitação rejeitada.');
    },
  });

  const filtered = requests.filter(r => r.status === filterStatus);

  const statusConfig = {
    pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
    approved: { label: 'Aprovado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    rejected: { label: 'Rejeitado', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle },
  };

  const counts = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!canApprove) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center gap-4">
        <User className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-lg font-semibold text-muted-foreground">Acesso restrito a administradores e gerentes</h2>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Aprovações"
        subtitle="Solicitações de cadastro de moradores"
        actionLabel="Ver QR Code"
        actionIcon={QrCode}
        onAction={() => setQrDialog(true)}
      />

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              filterStatus === key
                ? cfg.color + ' shadow-sm'
                : 'bg-card border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <cfg.icon className="h-4 w-4" />
            {cfg.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              filterStatus === key ? 'bg-white/60' : 'bg-muted'
            }`}>
              {counts[key]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={User}
          title={`Nenhuma solicitação ${statusConfig[filterStatus].label.toLowerCase()}`}
          description={filterStatus === 'pending' ? 'Compartilhe o QR Code para que moradores possam se cadastrar.' : ''}
          actionLabel={filterStatus === 'pending' ? 'Ver QR Code' : undefined}
          onAction={filterStatus === 'pending' ? () => setQrDialog(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((req) => {
            const cfg = statusConfig[req.status];
            const Icon = cfg.icon;
            return (
              <Card key={req.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-2xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground leading-tight">{req.name}</p>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border mt-1 ${cfg.color}`}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span>{req.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4 flex-shrink-0" />
                      <span>{req.block_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DoorOpen className="h-4 w-4 flex-shrink-0" />
                      <span>Apto {req.apartment_number}</span>
                    </div>
                  </div>

                  {req.rejection_reason && (
                    <p className="mt-3 text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2">
                      Motivo: {req.rejection_reason}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground mt-3">
                    {new Date(req.created_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>

                  {req.status === 'approved' && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50"
                        size="sm"
                        onClick={() => deleteMutation.mutate(req.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  )}

                  {req.status === 'pending' && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        size="sm"
                        onClick={() => approveMutation.mutate(req)}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50"
                        size="sm"
                        onClick={() => { setRejectDialog(req); setRejectReason(''); }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ApprovalNotificationMonitor />

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(open) => { if (!open) setRejectDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Rejeitar o cadastro de <strong>{rejectDialog?.name}</strong>?
            </p>
            <div className="space-y-1">
              <Label>Motivo da rejeição (opcional)</Label>
              <Input
                placeholder="Ex: Dados inválidos, morador não identificado..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={() => rejectMutation.mutate({ id: rejectDialog.id, reason: rejectReason })}
                disabled={rejectMutation.isPending}
              >
                Confirmar Rejeição
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialog} onOpenChange={setQrDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" /> QR Code de Cadastro
            </DialogTitle>
          </DialogHeader>
          <QRCodeDisplay />
        </DialogContent>
      </Dialog>
    </div>
  );
}
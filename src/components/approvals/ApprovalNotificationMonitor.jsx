import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Clock, CheckCircle2, XCircle, Bell, ChevronDown, ChevronUp, CalendarClock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig = {
  pending: { label: 'Agendado', icon: CalendarClock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  sent:    { label: 'Enviado',  icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  failed:  { label: 'Falhou',  icon: XCircle,        color: 'text-red-500',     bg: 'bg-red-50',     border: 'border-red-200' },
};

function toUTC(str) {
  if (!str) return null;
  return new Date(str.endsWith('Z') ? str : str + 'Z');
}

export default function ApprovalNotificationMonitor() {
  const [expanded, setExpanded] = useState(false);

  const { data: queue = [] } = useQuery({
    queryKey: ['notification-queue-approvals'],
    queryFn: () => base44.entities.NotificationQueue.list('-created_date', 100),
    refetchInterval: 15000,
  });

  // Filtra apenas notificações de aprovação (têm scheduled_at definido — somente aprovações usam esse campo)
  const approvalQueue = queue.filter(n => n.scheduled_at);

  if (approvalQueue.length === 0) return null;

  const pending = approvalQueue.filter(n => n.status === 'pending');
  const failed  = approvalQueue.filter(n => n.status === 'failed');
  const sent    = approvalQueue.filter(n => n.status === 'sent');

  const visible = [...pending, ...failed, ...sent.slice(0, 3)];

  return (
    <div className="mt-6 border border-border rounded-xl p-4 bg-card">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 group"
      >
        <Bell className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Notificações de Aprovação
        </h3>
        <div className="flex gap-2 ml-1">
          {pending.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {pending.length} agendada{pending.length > 1 ? 's' : ''}
            </span>
          )}
          {sent.length > 0 && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
              {sent.length} enviada{sent.length > 1 ? 's' : ''}
            </span>
          )}
          {failed.length > 0 && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
              {failed.length} falhou
            </span>
          )}
        </div>
        <span className="ml-auto text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {expanded && (
        <div className="space-y-2 mt-3 max-h-64 overflow-y-auto pr-1">
          {visible.map((n) => {
            const cfg = statusConfig[n.status] || statusConfig.pending;
            const Icon = cfg.icon;
            const scheduledDate = toUTC(n.scheduled_at);
            const sentDate = toUTC(n.sent_at);

            return (
              <div key={n.id} className={`flex items-start gap-3 p-2.5 rounded-lg border ${cfg.bg} ${cfg.border}`}>
                <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate font-medium">{n.message?.split('\n')[0]}</p>
                  <p className="text-xs text-muted-foreground">
                    {n.phone}
                    {n.status === 'pending' && scheduledDate && (
                      <> · envio {formatDistanceToNow(scheduledDate, { addSuffix: true, locale: ptBR })}</>
                    )}
                    {n.status === 'sent' && sentDate && (
                      <> · enviado em {format(sentDate, "dd/MM HH:mm", { locale: ptBR })}</>
                    )}
                    {n.status === 'failed' && (
                      <> · {n.error?.includes('exists":false') ? 'Sem WhatsApp' : 'Erro no envio'}</>
                    )}
                  </p>
                </div>
                <span className={`text-xs font-medium shrink-0 ${cfg.color}`}>{cfg.label}</span>
              </div>
            );
          })}
          {sent.length > 3 && (
            <p className="text-xs text-center text-muted-foreground py-1">
              + {sent.length - 3} enviadas anteriores ocultadas
            </p>
          )}
        </div>
      )}
    </div>
  );
}
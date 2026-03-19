import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Clock, CheckCircle2, XCircle, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig = {
  pending: { label: 'Na fila', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  sent:    { label: 'Enviado', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  failed:  { label: 'Falhou', icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
};

export default function NotificationQueueMonitor() {
  const [expanded, setExpanded] = useState(false);

  const { data: queue = [] } = useQuery({
    queryKey: ['notification-queue'],
    queryFn: () => base44.entities.NotificationQueue.list('-created_date', 50),
    refetchInterval: 10000,
  });

  if (queue.length === 0) return null;

  const pending = queue.filter(n => n.status === 'pending');
  const failed = queue.filter(n => n.status === 'failed');
  const sent = queue.filter(n => n.status === 'sent');

  // Mostra: todos pendentes + todos com falha + últimos 3 enviados
  const visible = [
    ...pending,
    ...failed,
    ...sent.slice(0, 3),
  ];

  const pendingCount = pending.length;
  const failedCount = failed.length;
  const sentCount = sent.length;

  return (
    <div className="mt-8">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 mb-2 group"
      >
        <Send className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fila de Notificações WhatsApp</h3>
        <div className="flex gap-2 ml-1">
          {pendingCount > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{pendingCount} na fila</span>}
          {sentCount > 0 && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{sentCount} enviado{sentCount > 1 ? 's' : ''}</span>}
          {failedCount > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">{failedCount} falhou</span>}
        </div>
        <span className="ml-auto text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {expanded && (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {visible.map((n) => {
            const cfg = statusConfig[n.status] || statusConfig.pending;
            const Icon = cfg.icon;
            return (
              <div key={n.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${cfg.bg} ${cfg.border}`}>
                <Icon className={`h-3.5 w-3.5 shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">{n.message?.split('\n')[0]}</p>
                  <p className="text-xs text-muted-foreground">
                    {n.phone}
                    {n.status === 'pending' && n.created_date && (
                      <> · {formatDistanceToNow(new Date(n.created_date.endsWith('Z') ? n.created_date : n.created_date + 'Z'), { addSuffix: true, locale: ptBR })}</>
                    )}
                    {n.status === 'sent' && n.sent_at && (
                      <> · {format(new Date(n.sent_at.endsWith('Z') ? n.sent_at : n.sent_at + 'Z'), "dd/MM HH:mm", { locale: ptBR })}</>
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
              + {sent.length - 3} enviados anteriores ocultados
            </p>
          )}
        </div>
      )}
    </div>
  );
}
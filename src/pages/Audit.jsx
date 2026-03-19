import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Package, PackageX, KeyRound, MessageCircle, Search, Download, Filter, Trash2 } from 'lucide-react';
import ResetDataModal from '@/components/shared/ResetDataModal';
import PasswordProtectedResetModal from '@/components/shared/PasswordProtectedResetModal';
import jsPDF from 'jspdf';
import { getSession } from '@/components/auth/AuthEmployee';

const EVENT_TYPES = [
  { value: 'all', label: 'Todos os eventos' },
  { value: 'delivery', label: 'Entregas' },
  { value: 'refused', label: 'Recusas/Avarias' },
  { value: 'keyword', label: 'Palavras-chave' },
  { value: 'notification', label: 'Notificações' },
];

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const now = new Date();

function buildTimeline(deliveries, refused, keywords, notifications) {
  const events = [];

  deliveries.forEach(d => events.push({
    id: d.id, type: 'delivery', date: new Date(d.created_date),
    title: `Entrega registrada`,
    subtitle: `${d.resident_name || '—'} — ${d.block_name || ''} Apt ${d.apartment_number || '?'}`,
    detail: `Cód: ${d.tracking_code}${d.carrier ? ` | ${d.carrier}` : ''}${d.description ? ` | ${d.description}` : ''}`,
    status: d.status,
    extra: d.collected_at ? `Retirada em ${new Date(d.collected_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}` : null,
  }));

  refused.forEach(d => events.push({
    id: d.id, type: 'refused', date: new Date(d.created_date),
    title: `Recusa/Avaria registrada`,
    subtitle: `${d.resident_name || '—'} — ${d.block_name || ''} Apt ${d.apartment_number || '?'}`,
    detail: `Cód: ${d.tracking_code}${d.reason ? ` | Motivo: ${d.reason}` : ''}${d.carrier ? ` | ${d.carrier}` : ''}`,
    status: d.status,
  }));

  keywords.forEach(k => events.push({
    id: k.id, type: 'keyword', date: new Date(k.created_date),
    title: `Palavra-chave registrada`,
    subtitle: `${k.resident_name || '—'} — ${k.block_name || ''} Apt ${k.apartment_number || '?'}`,
    detail: `Palavra: ${k.keyword}${k.notes ? ` | ${k.notes}` : ''}`,
    status: k.used ? 'used' : 'pending',
    extra: k.used && k.used_at ? `Utilizada em ${new Date(k.used_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}` : null,
  }));

  notifications.forEach(n => events.push({
    id: n.id, type: 'notification', date: new Date(n.created_date),
    title: `Notificação WhatsApp`,
    subtitle: `Para: ${n.phone}`,
    detail: n.message?.substring(0, 100) + (n.message?.length > 100 ? '…' : ''),
    status: n.status,
    extra: n.error ? `Erro: ${n.error}` : null,
  }));

  return events.sort((a, b) => b.date - a.date);
}

const TYPE_CONFIG = {
  delivery:     { icon: Package,       color: 'text-primary',     bg: 'bg-primary/10',       label: 'Entrega'       },
  refused:      { icon: PackageX,      color: 'text-rose-600',    bg: 'bg-rose-100',         label: 'Recusa/Avaria' },
  keyword:      { icon: KeyRound,      color: 'text-purple-600',  bg: 'bg-purple-100',       label: 'Palavra-chave' },
  notification: { icon: MessageCircle, color: 'text-emerald-600', bg: 'bg-emerald-100',      label: 'Notificação'   },
};

const STATUS_BADGE = {
  pending:      'bg-amber-100 text-amber-700',
  notified:     'bg-blue-100 text-blue-700',
  collected:    'bg-emerald-100 text-emerald-700',
  sent:         'bg-emerald-100 text-emerald-700',
  failed:       'bg-rose-100 text-rose-700',
  used:         'bg-emerald-100 text-emerald-700',
};

const STATUS_LABEL = {
  pending: 'Pendente', notified: 'Notificado', collected: 'Retirada',
  sent: 'Enviada', failed: 'Falhou', used: 'Utilizada',
};

export default function Audit() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [periodType, setPeriodType] = useState('month');
  const [showReset, setShowReset] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const session = getSession();
  const isAdmin = session?.role === 'admin';
  const canViewAudit = ['admin', 'gerente'].includes(session?.role);
  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  const { data: deliveries = [] } = useQuery({ queryKey: ['deliveries'], queryFn: () => base44.entities.Delivery.list('-created_date', 9999) });
  const { data: refused = [] } = useQuery({ queryKey: ['refused_deliveries'], queryFn: () => base44.entities.RefusedDelivery.list('-created_date', 9999) });
  const { data: keywords = [] } = useQuery({ queryKey: ['delivery_keywords'], queryFn: () => base44.entities.DeliveryKeyword.list('-created_date', 9999) });
  const { data: notifications = [] } = useQuery({ queryKey: ['notification_queue'], queryFn: () => base44.entities.NotificationQueue.list('-created_date', 9999) });

  const timeline = useMemo(() => buildTimeline(deliveries, refused, keywords, notifications), [deliveries, refused, keywords, notifications]);

  const filtered = useMemo(() => {
    return timeline.filter(e => {
      const yearMatch = e.date.getFullYear() === selectedYear;
      const periodMatch = periodType === 'year'
        ? yearMatch
        : periodType === 'month'
          ? yearMatch && e.date.getMonth() === selectedMonth
          : true;
      const typeMatch = typeFilter === 'all' || e.type === typeFilter;
      const searchMatch = !search || [e.title, e.subtitle, e.detail].join(' ').toLowerCase().includes(search.toLowerCase());
      return periodMatch && typeMatch && searchMatch;
    });
  }, [timeline, selectedYear, selectedMonth, periodType, typeFilter, search]);

  function downloadPDF() {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    let y = 20;
    const addLine = (text, bold = false, size = 10, color = [50, 50, 50]) => {
      if (y > 272) { doc.addPage(); y = 20; }
      doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(...color);
      doc.text(text, 14, y); y += size * 0.6 + 3;
    };
    addLine(`Log de Auditoria`, true, 16, [30,30,30]);
    addLine(`Período: ${periodType === 'month' ? `${MONTHS[selectedMonth]}/${selectedYear}` : `${selectedYear}`} | Filtro: ${EVENT_TYPES.find(t=>t.value===typeFilter)?.label}`, false, 9, [120,120,120]);
    addLine(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, false, 9, [120,120,120]);
    y += 6;
    filtered.forEach(e => {
      addLine(`[${e.date.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}] ${TYPE_CONFIG[e.type]?.label} — ${STATUS_LABEL[e.status]||e.status}`, true, 10, [30,30,30]);
      addLine(e.subtitle, false, 9, [80,80,80]);
      addLine(e.detail, false, 9, [100,100,100]);
      if (e.extra) addLine(e.extra, false, 9, [130,130,130]);
      y += 2;
    });
    doc.save(`auditoria-${selectedYear}${periodType==='month'?`-${String(selectedMonth+1).padStart(2,'0')}`:''}.pdf`);
  }

  if (!canViewAudit) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center gap-4">
        <ShieldCheck className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-lg font-semibold text-muted-foreground">Acesso restrito a administradores e gerentes</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Auditoria</h1>
          <p className="text-muted-foreground text-sm">Log completo de todas as ações do sistema</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto flex-wrap">
          {isAdmin && (
            <Button onClick={() => setShowPasswordModal(true)} variant="destructive" size="sm" className="gap-2">
              <Trash2 className="h-4 w-4" /> Resetar Dados
            </Button>
          )}
          <PasswordProtectedResetModal 
            open={showPasswordModal} 
            onPasswordVerified={() => setShowReset(true)}
            onClose={() => setShowPasswordModal(false)}
          />
          <Button onClick={downloadPDF} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Exportar PDF
          </Button>
        </div>
        <ResetDataModal open={showReset} onClose={() => setShowReset(false)} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" /> Filtros
          </div>
          <div className="flex flex-wrap gap-2">
            {['month','year','all'].map(t => (
              <button key={t} onClick={() => setPeriodType(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${periodType===t?'bg-primary text-primary-foreground':'bg-secondary text-secondary-foreground hover:bg-muted'}`}>
                {t==='month'?'Mensal':t==='year'?'Anual':'Todo período'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {periodType === 'month' && (
              <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m,i)=><SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {periodType !== 'all' && (
              <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>{years.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>{EVENT_TYPES.map(t=><SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar morador, código..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
          const count = filtered.filter(e => e.type === type).length;
          const Icon = cfg.icon;
          return (
            <Card key={type}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-xl ${cfg.bg} flex items-center justify-center`}><Icon className={`h-4 w-4 ${cfg.color}`} /></div>
                <div><p className="text-xs text-muted-foreground">{cfg.label}</p><p className="text-xl font-bold">{count}</p></div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {filtered.length} evento{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Nenhum evento encontrado com os filtros aplicados.</p>
          ) : (
            <div className="relative pl-6 space-y-0">
              <div className="absolute left-2.5 top-0 bottom-0 w-px bg-border" />
              {filtered.map((e, i) => {
                const cfg = TYPE_CONFIG[e.type];
                const Icon = cfg.icon;
                return (
                  <div key={e.id + i} className="relative pb-4">
                    <div className={`absolute -left-[15px] top-1.5 h-5 w-5 rounded-full ${cfg.bg} flex items-center justify-center border-2 border-background`}>
                      <Icon className={`h-2.5 w-2.5 ${cfg.color}`} />
                    </div>
                    <div className="ml-4 bg-muted/30 rounded-xl px-4 py-3 hover:bg-muted/50 transition-colors">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {e.date.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                        </span>
                        <Badge variant="outline" className={`text-xs border-0 ${cfg.bg} ${cfg.color}`}>{cfg.label}</Badge>
                        {e.status && STATUS_LABEL[e.status] && (
                          <Badge className={`text-xs ${STATUS_BADGE[e.status] || 'bg-muted text-muted-foreground'}`}>{STATUS_LABEL[e.status]}</Badge>
                        )}
                      </div>
                      <p className="font-semibold text-sm">{e.subtitle}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{e.detail}</p>
                      {e.extra && <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{e.extra}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
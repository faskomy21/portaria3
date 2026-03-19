import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function NotificationsTab({ notifications }) {
  const sent = notifications.filter(n => n.status === 'sent');
  const failed = notifications.filter(n => n.status === 'failed');
  const pending = notifications.filter(n => n.status === 'pending');

  const byDay = useMemo(() => {
    const map = {};
    sent.forEach(n => {
      const day = new Date(n.created_date).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' });
      map[day] = (map[day]||0) + 1;
    });
    return Object.entries(map).map(([name,count])=>({name,count})).slice(-14);
  }, [sent]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Enviadas</p><p className="text-2xl font-bold text-emerald-600">{sent.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center"><XCircle className="h-5 w-5 text-rose-600" /></div>
          <div><p className="text-xs text-muted-foreground">Falhas</p><p className="text-2xl font-bold text-rose-600">{failed.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center"><Clock className="h-5 w-5 text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">Pendentes</p><p className="text-2xl font-bold text-amber-600">{pending.length}</p></div>
        </CardContent></Card>
      </div>

      {byDay.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Enviadas por Dia</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byDay}>
                <XAxis dataKey="name" tick={{fontSize:11}} /><YAxis allowDecimals={false} tick={{fontSize:11}} /><Tooltip />
                <Bar dataKey="count" name="Enviadas" fill="#10b981" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Log de Notificações do Período</CardTitle></CardHeader>
        <CardContent>
          {notifications.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhuma notificação neste período.</p> : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {notifications.map((n,i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 py-2 px-3 rounded-lg bg-muted/30 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-muted-foreground">{n.phone}</p>
                    <p className="text-sm line-clamp-2 text-foreground/80">{n.message}</p>
                    {n.error && <p className="text-xs text-rose-500 mt-0.5">Erro: {n.error}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={
                      n.status==='sent'?'bg-emerald-100 text-emerald-700':
                      n.status==='failed'?'bg-rose-100 text-rose-700':
                      'bg-amber-100 text-amber-700'
                    }>
                      {n.status==='sent'?'Enviada':n.status==='failed'?'Falhou':'Pendente'}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(n.created_date).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
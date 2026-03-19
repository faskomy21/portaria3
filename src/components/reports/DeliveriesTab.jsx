import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, AlertCircle, CheckCircle2, Building2, Users, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16'];

export default function DeliveriesTab({ deliveries, allDeliveries }) {
  const total = deliveries.length;
  const collected = deliveries.filter(d => d.status === 'collected').length;
  const pending = deliveries.filter(d => d.status !== 'collected').length;

  const byBlock = useMemo(() => {
    const map = {};
    deliveries.forEach(d => { const k = d.block_name||'Sem bloco'; map[k]=(map[k]||0)+1; });
    return Object.entries(map).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count);
  }, [deliveries]);

  const byApartment = useMemo(() => {
    const map = {};
    deliveries.forEach(d => { const k=`${d.block_name||'?'} Apt ${d.apartment_number||'?'}`; map[k]=(map[k]||0)+1; });
    return Object.entries(map).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count);
  }, [deliveries]);

  const byResident = useMemo(() => {
    const map = {};
    deliveries.forEach(d => { if(!d.resident_name) return; map[d.resident_name]=(map[d.resident_name]||0)+1; });
    return Object.entries(map).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count);
  }, [deliveries]);

  const pendingByApt = useMemo(() => {
    const map = {};
    allDeliveries.filter(d=>d.status!=='collected').forEach(d => {
      const k=`${d.block_name||'?'} Apt ${d.apartment_number||'?'}`; map[k]=(map[k]||0)+1;
    });
    return Object.entries(map).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count).slice(0,10);
  }, [allDeliveries]);

  const top10 = useMemo(() => {
    const map = {};
    allDeliveries.forEach(d => { if(!d.resident_name) return; map[d.resident_name]=(map[d.resident_name]||0)+1; });
    return Object.entries(map).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count).slice(0,10);
  }, [allDeliveries]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Package className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{total}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Retiradas</p><p className="text-2xl font-bold text-emerald-600">{collected}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center"><AlertCircle className="h-5 w-5 text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">Pendentes</p><p className="text-2xl font-bold text-amber-600">{pending}</p></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-primary" /> Por Bloco</CardTitle></CardHeader>
        <CardContent>
          {byBlock.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhuma entrega neste período.</p> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byBlock}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} /><Tooltip />
                <Bar dataKey="count" name="Entregas" radius={[6,6,0,0]}>
                  {byBlock.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Package className="h-4 w-4 text-primary" /> Por Apartamento</CardTitle></CardHeader>
        <CardContent>
          {byApartment.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhuma entrega neste período.</p> : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {byApartment.map((item,i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/40">
                  <span className="text-sm font-medium">{item.name}</span>
                  <Badge variant="secondary">{item.count} {item.count===1?'entrega':'entregas'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-primary" /> Por Morador</CardTitle></CardHeader>
        <CardContent>
          {byResident.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhuma entrega neste período.</p> : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {byResident.map((item,i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/40">
                  <span className="text-sm font-medium">{item.name}</span>
                  <Badge variant="secondary">{item.count} {item.count===1?'entrega':'entregas'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><AlertCircle className="h-4 w-4 text-amber-500" /> Apts com Mais Pendências (geral)</CardTitle></CardHeader>
        <CardContent>
          {pendingByApt.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhuma pendência.</p> : (
            <div className="space-y-1.5">
              {pendingByApt.map((item,i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-amber-50 border border-amber-100">
                  <span className="text-xs font-bold text-amber-600 w-5 text-center">{i+1}º</span>
                  <span className="text-sm font-medium flex-1">{item.name}</span>
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{item.count} pendente{item.count>1?'s':''}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Trophy className="h-4 w-4 text-yellow-500" /> Top 10 Moradores (geral)</CardTitle></CardHeader>
        <CardContent>
          {top10.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhuma entrega registrada.</p> : (
            <div className="space-y-1.5">
              {top10.map((item,i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/40">
                  <span className={`text-xs font-bold w-5 text-center ${i===0?'text-yellow-500':i===1?'text-slate-400':i===2?'text-amber-600':'text-muted-foreground'}`}>{i+1}º</span>
                  <span className="text-sm font-medium flex-1">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 rounded-full bg-primary/20 w-24 overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width:`${(item.count/top10[0].count)*100}%` }} />
                    </div>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Lista Completa do Período</CardTitle></CardHeader>
        <CardContent>
          {deliveries.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhuma entrega neste período.</p> : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {deliveries.map((d,i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 px-3 rounded-lg bg-muted/30 text-sm">
                  <div>
                    <p className="font-medium">{d.resident_name || '—'} <span className="text-muted-foreground font-normal">— {d.block_name} Apt {d.apartment_number}</span></p>
                    <p className="text-xs text-muted-foreground font-mono">{d.tracking_code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.carrier && <span className="text-xs text-muted-foreground">{d.carrier}</span>}
                    <Badge className={d.status==='collected'?'bg-emerald-100 text-emerald-700':d.status==='notified'?'bg-blue-100 text-blue-700':'bg-amber-100 text-amber-700'}>
                      {d.status==='collected'?'Retirada':d.status==='notified'?'Notificado':'Pendente'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{new Date(d.created_date).toLocaleDateString('pt-BR')}</span>
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
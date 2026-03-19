import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PackageX } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function RefusedTab({ refused }) {
  const byBlock = useMemo(() => {
    const map = {};
    refused.forEach(d => { const k = d.block_name||'Sem bloco'; map[k]=(map[k]||0)+1; });
    return Object.entries(map).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count);
  }, [refused]);

  const byReason = useMemo(() => {
    const map = {};
    refused.forEach(d => { const k = d.reason||'Não informado'; map[k]=(map[k]||0)+1; });
    return Object.entries(map).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count);
  }, [refused]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card><CardContent className="p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center"><PackageX className="h-5 w-5 text-rose-600" /></div>
          <div><p className="text-xs text-muted-foreground">Total Recusadas</p><p className="text-2xl font-bold text-rose-600">{refused.length}</p></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><PackageX className="h-4 w-4 text-rose-500" /> Por Bloco</CardTitle></CardHeader>
        <CardContent>
          {byBlock.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhuma recusa neste período.</p> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byBlock}>
                <XAxis dataKey="name" tick={{fontSize:12}} /><YAxis allowDecimals={false} tick={{fontSize:12}} /><Tooltip />
                <Bar dataKey="count" name="Recusadas" fill="#f43f5e" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><PackageX className="h-4 w-4 text-rose-500" /> Motivos de Recusa</CardTitle></CardHeader>
        <CardContent>
          {byReason.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhuma recusa neste período.</p> : (
            <div className="space-y-1.5">
              {byReason.map((item,i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-rose-50 border border-rose-100">
                  <span className="text-xs font-bold text-rose-500 w-5 text-center">{i+1}º</span>
                  <span className="text-sm font-medium flex-1">{item.name}</span>
                  <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">{item.count} ocorrência{item.count>1?'s':''}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Lista Completa do Período</CardTitle></CardHeader>
        <CardContent>
          {refused.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhuma recusa neste período.</p> : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {refused.map((d,i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 px-3 rounded-lg bg-rose-50/50 text-sm">
                  <div>
                    <p className="font-medium">{d.resident_name || '—'} <span className="text-muted-foreground font-normal">— {d.block_name} Apt {d.apartment_number}</span></p>
                    <p className="text-xs text-muted-foreground font-mono">{d.tracking_code}</p>
                    {d.reason && <p className="text-xs text-rose-600">Motivo: {d.reason}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {d.carrier && <span className="text-xs text-muted-foreground">{d.carrier}</span>}
                    <span className="text-xs text-muted-foreground">{new Date(d.created_date).toLocaleDateString('pt-BR')}</span>
                    {(d.photo_urls?.length > 0 || d.photo_url) && (
                      <Badge variant="outline" className="text-xs">📷 {d.photo_urls?.length || 1} foto(s)</Badge>
                    )}
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
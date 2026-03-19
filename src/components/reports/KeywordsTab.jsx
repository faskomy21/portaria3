import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeyRound, CheckCircle2, Clock } from 'lucide-react';

export default function KeywordsTab({ keywords }) {
  const used = keywords.filter(k => k.used);
  const unused = keywords.filter(k => !k.used);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><KeyRound className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{keywords.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Utilizadas</p><p className="text-2xl font-bold text-emerald-600">{used.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center"><Clock className="h-5 w-5 text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">Não utilizadas</p><p className="text-2xl font-bold text-amber-600">{unused.length}</p></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Lista de Palavras-chave do Período</CardTitle></CardHeader>
        <CardContent>
          {keywords.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhuma palavra-chave neste período.</p> : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {keywords.map((k,i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 px-3 rounded-lg bg-muted/30 text-sm">
                  <div>
                    <p className="font-medium">{k.resident_name || '—'} <span className="text-muted-foreground font-normal">— {k.block_name} Apt {k.apartment_number}</span></p>
                    <p className="font-mono text-primary text-sm font-semibold">{k.keyword}</p>
                    {k.notes && <p className="text-xs text-muted-foreground">Obs: {k.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={k.used ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                      {k.used ? 'Utilizada' : 'Pendente'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{new Date(k.created_date).toLocaleDateString('pt-BR')}</span>
                    {k.total_items > 1 && <Badge variant="outline">{k.items_collected}/{k.total_items} itens</Badge>}
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
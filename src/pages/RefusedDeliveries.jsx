import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PackageX, Search, ScanLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import RefusedNotificationMonitor from '@/components/refused/RefusedNotificationMonitor';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function RefusedDeliveries() {
  const [search, setSearch] = useState('');

  const { data: refused = [], isLoading } = useQuery({
    queryKey: ['refused_deliveries'],
    queryFn: () => base44.entities.RefusedDelivery.list('-created_date', 200),
  });

  const filtered = refused.filter(d => {
    return search === '' ||
      d.tracking_code?.toLowerCase().includes(search.toLowerCase()) ||
      d.resident_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.apartment_number?.toLowerCase().includes(search.toLowerCase());
  });

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Encomendas Recusadas" subtitle="Registro de pacotes recusados ou avariados" />

      <div className="flex justify-end mb-6">
        <Link to="/NewRefusedDelivery">
          <Button className="bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/25">
            <ScanLine className="h-4 w-4 mr-2" /> Registrar Recusa
          </Button>
        </Link>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por código, morador ou apt..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <RefusedNotificationMonitor />

      {filtered.length === 0 ? (
        <EmptyState icon={PackageX} title="Nenhuma encomenda recusada" description="Registre encomendas recusadas ou avariadas com foto para notificar o morador." />
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <Card key={d.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                      <PackageX className="h-5 w-5 text-rose-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{d.resident_name || 'Morador'}</p>
                      <p className="text-xs text-muted-foreground">{d.block_name} - Apt {d.apartment_number}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{d.tracking_code}</p>
                      {d.carrier && <p className="text-xs text-muted-foreground">Via: {d.carrier}</p>}
                      {d.reason && <p className="text-xs text-rose-600 mt-0.5">Motivo: {d.reason}</p>}
                      {d.description && <p className="text-xs text-amber-600 mt-0.5">{d.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {(d.photo_urls?.length > 0 || d.photo_url) && (
                      <div className="flex gap-1">
                        {(d.photo_urls?.length > 0 ? d.photo_urls : [d.photo_url]).map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt={`Foto ${i+1}`} className="h-10 w-10 rounded-lg object-cover border hover:opacity-80 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {d.created_date && format(new Date(d.created_date), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </span>
                    {d.status === 'notified' && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">Notificado</span>
                    )}
                    {d.status === 'pending' && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">Pendente</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Users, Building2, DoorOpen, Clock, CheckCircle2, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusBadge from '@/components/shared/StatusBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function StatCard({ icon: Icon, label, value, color, to }) {
  return (
    <Link to={to}>
      <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <p className="text-3xl font-bold mt-1 text-foreground">{value}</p>
            </div>
            <div className={`h-12 w-12 rounded-2xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Dashboard() {
  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries'],
    queryFn: () => base44.entities.Delivery.list('-created_date', 100),
  });
  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list(),
  });
  const { data: blocks = [] } = useQuery({
    queryKey: ['blocks'],
    queryFn: () => base44.entities.Block.list(),
  });
  const { data: apartments = [] } = useQuery({
    queryKey: ['apartments'],
    queryFn: () => base44.entities.Apartment.list(),
  });

  const pendingCount = deliveries.filter(d => d.status === 'pending').length;
  const notifiedCount = deliveries.filter(d => d.status === 'notified').length;
  const collectedCount = deliveries.filter(d => d.status === 'collected').length;
  const recentDeliveries = deliveries.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Painel de Controle</h1>
        <p className="text-muted-foreground mt-1">Visão geral das entregas do condomínio</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Total Entregas" value={deliveries.length} color="bg-blue-500" to="/Deliveries" />
        <StatCard icon={Clock} label="Pendentes" value={pendingCount} color="bg-amber-500" to="/Deliveries" />
        <StatCard icon={Bell} label="Notificados" value={notifiedCount} color="bg-purple-500" to="/Deliveries" />
        <StatCard icon={CheckCircle2} label="Retirados" value={collectedCount} color="bg-emerald-500" to="/Deliveries" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Building2} label="Blocos" value={blocks.length} color="bg-indigo-500" to="/Blocks" />
        <StatCard icon={DoorOpen} label="Apartamentos" value={apartments.length} color="bg-cyan-500" to="/Apartments" />
        <StatCard icon={Users} label="Moradores" value={residents.length} color="bg-rose-500" to="/Residents" />
      </div>

      {/* Recent */}
      {recentDeliveries.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Entregas Recentes</h2>
              <Link to="/Deliveries" className="text-sm text-primary hover:underline">Ver todas</Link>
            </div>
            <div className="space-y-3">
              {recentDeliveries.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{d.resident_name || 'Morador'}</p>
                      <p className="text-xs text-muted-foreground truncate">{d.block_name} - Apt {d.apartment_number} • {d.tracking_code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={d.status} />
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {d.created_date && format(new Date(d.created_date), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
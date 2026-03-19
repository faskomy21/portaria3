import React from 'react';
import { Badge } from '@/components/ui/badge';

const statusConfig = {
  pending: { label: 'Pendente', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  notified: { label: 'Notificado', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  collected: { label: 'Retirado', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <Badge variant="outline" className={`${config.className} font-medium text-xs`}>
      {config.label}
    </Badge>
  );
}
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function PageHeader({ title, subtitle, actionLabel, onAction, icon: Icon, actionIcon: ActionIcon }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actionLabel && (
        <Button onClick={onAction} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
          {ActionIcon ? <ActionIcon className="h-4 w-4 mr-2" /> : Icon ? <Icon className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
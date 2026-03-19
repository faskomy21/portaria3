import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listTenantsSecure, setTenantStatusSecure } from '@/api/employeeAuth';
import { getSession } from '@/components/auth/AuthEmployee';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, ExternalLink, Layers3, PauseCircle, PlayCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

function formatMode(mode) {
  return mode === 'database' ? 'Database por cliente' : 'Schema por cliente';
}

function formatStatus(status) {
  return status === 'active'
    ? { label: 'Ativo', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
    : { label: 'Inativo', className: 'bg-slate-100 text-slate-700 border-slate-200' };
}

export default function Tenants() {
  const session = getSession();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => listTenantsSecure(),
  });

  const statusMutation = useMutation({
    mutationFn: ({ tenantId, status }) => setTenantStatusSecure({ tenantId, status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success(variables.status === 'active' ? 'Tenant reativado.' : 'Tenant desativado.');
    },
    onError: (error) => {
      toast.error(error?.message || 'Nao foi possivel atualizar o tenant.');
    },
  });

  if (session?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center gap-4">
        <ShieldCheck className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-lg font-semibold text-muted-foreground">Acesso restrito a administradores</h2>
      </div>
    );
  }

  const tenants = data?.tenants || [];
  const canManageAll = data?.canManageAll === true;
  const scope = data?.scope || 'current';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        subtitle="Clientes cadastrados e provisionados no ambiente self-hosted"
      />

      <Card className="border-0 shadow-sm">
        <CardContent className="p-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-foreground">
              {canManageAll ? 'Visao global do ambiente' : 'Visao do tenant atual'}
            </p>
            <p className="text-sm text-muted-foreground">
              {scope === 'all'
                ? 'Este admin pode acompanhar todos os clientes provisionados.'
                : 'Este admin visualiza apenas o tenant associado ao proprio acesso.'}
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            {tenants.length} tenant{tenants.length === 1 ? '' : 's'}
          </Badge>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : tenants.length === 0 ? (
        <EmptyState
          icon={Layers3}
          title="Nenhum tenant provisionado"
          description="Os clientes cadastrados aparecerao aqui."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {tenants.map((tenant) => {
            const status = formatStatus(tenant.status);
            return (
              <Card key={tenant.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-slate-700" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{tenant.companyName}</h3>
                          <Badge className={status.className}>{status.label}</Badge>
                          {tenant.isCurrentTenant && <Badge variant="secondary">Atual</Badge>}
                          {tenant.isDefaultTenant && <Badge variant="secondary">Principal</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">{tenant.slug}</p>
                      </div>
                    </div>
                    <a
                      href={tenant.loginUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex"
                    >
                      <Button variant="outline" size="sm" className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Login
                      </Button>
                    </a>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-muted/50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Responsavel</p>
                      <p className="font-medium text-foreground mt-1">{tenant.adminName}</p>
                      <p className="text-muted-foreground break-all">{tenant.email}</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Provisionamento</p>
                      <p className="font-medium text-foreground mt-1">{formatMode(tenant.provisionMode)}</p>
                      <p className="text-muted-foreground font-mono break-all">{tenant.sqlNamespace}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <div className="text-sm text-muted-foreground">
                      Criado em {new Date(tenant.createdAt).toLocaleString('pt-BR')}
                    </div>
                    {canManageAll && !tenant.isDefaultTenant && (
                      <Button
                        variant={tenant.status === 'active' ? 'outline' : 'default'}
                        size="sm"
                        className="gap-2"
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          statusMutation.mutate({
                            tenantId: tenant.id,
                            status: tenant.status === 'active' ? 'inactive' : 'active',
                          })
                        }
                      >
                        {tenant.status === 'active' ? (
                          <>
                            <PauseCircle className="h-4 w-4" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <PlayCircle className="h-4 w-4" />
                            Reativar
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

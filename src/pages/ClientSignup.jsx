import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Database, Loader2, Mail, Phone, User2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const initialForm = {
  companyName: '',
  adminName: '',
  email: '',
  phone: '',
  city: '',
  units: '',
  desiredSlug: '',
  notes: '',
};

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function formatProvisionMode(mode) {
  if (mode === 'database') return 'database por cliente';
  return 'schema por cliente';
}

export default function ClientSignup() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const suggestedSlug = useMemo(() => slugify(form.desiredSlug || form.companyName), [form.companyName, form.desiredSlug]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.companyName || !form.adminName || !form.email) {
      setError('Preencha pelo menos empresa, responsavel e e-mail.');
      return;
    }

    if (!suggestedSlug) {
      setError('Nao foi possivel gerar um identificador para o cliente. Ajuste o nome ou slug.');
      return;
    }

    try {
      setLoading(true);
      const response = await base44.functions.invoke('provisionTenant', {
        companyName: form.companyName.trim(),
        adminName: form.adminName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        units: form.units ? Number(form.units) : undefined,
        desiredSlug: suggestedSlug,
        notes: form.notes.trim(),
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Nao foi possivel provisionar o tenant.');
      }

      setResult(response);
      setForm(initialForm);
    } catch (submitError) {
      setError(submitError.message || 'Nao foi possivel concluir o cadastro.');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    const tenant = result.tenant;
    const adminCredentials = result.adminCredentials;

    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,_#eff6ff_0%,_#ecfccb_100%)] px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <Button asChild variant="ghost" className="mb-6">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Voltar para a home
            </Link>
          </Button>

          <Card className="border-0 bg-white/90 shadow-2xl shadow-emerald-900/10">
            <CardContent className="p-8 md:p-10">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-950">Cliente provisionado com sucesso</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                O cadastro foi recebido e o tenant inicial ja foi preparado no SQL. Abaixo esta o retorno tecnico
                do ambiente criado para este cliente.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Cliente</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{tenant.companyName}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Slug</p>
                  <p className="mt-2 font-mono text-lg text-slate-950">{tenant.slug}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Modo de isolamento</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{formatProvisionMode(tenant.provisionMode)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Namespace SQL</p>
                  <p className="mt-2 font-mono text-lg text-slate-950">{tenant.sqlNamespace}</p>
                </div>
              </div>

              {adminCredentials && (
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-emerald-700">Login inicial</p>
                    <p className="mt-2 font-mono text-sm text-emerald-950 break-all">{adminCredentials.loginUrl}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-emerald-700">Usuario inicial</p>
                    <p className="mt-2 font-mono text-lg text-emerald-950">{adminCredentials.username}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-emerald-700">Senha temporaria</p>
                    <p className="mt-2 font-mono text-lg text-emerald-950">{adminCredentials.temporaryPassword}</p>
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="rounded-full bg-slate-900 hover:bg-slate-800">
                  <Link to="/CadastroCliente">
                    Cadastrar outro cliente
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <a href={adminCredentials?.loginUrl || '/Access'}>Ir para o portal interno</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(15,23,42,0.07),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <Button asChild variant="ghost" className="mb-6">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Voltar para a home
          </Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-0 bg-slate-950 text-white shadow-2xl shadow-slate-950/20">
            <CardContent className="p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white/10">
                <Database className="h-7 w-7 text-emerald-300" />
              </div>
              <h1 className="mt-6 text-3xl font-black tracking-tight">Cadastre um novo cliente e gere o tenant inicial</h1>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Este formulario cria o cadastro comercial e dispara a function que provisiona o ambiente SQL
                isolado para o cliente. O portal operacional atual continua separado em <span className="font-semibold text-white">/Access</span>.
              </p>

              <div className="mt-8 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white">O que ja sai daqui</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Slug do tenant, namespace SQL e registro inicial do cliente.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white">Assumicao tecnica deste primeiro corte</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Provisionamento em PostgreSQL por schema ou database, definido pelas variaveis do backend.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-white/90 shadow-2xl shadow-slate-900/10">
            <CardHeader className="px-8 pt-8">
              <CardTitle className="text-2xl text-slate-950">Novo cliente</CardTitle>
              <CardDescription>
                Preencha os dados basicos para registrar o cliente e disparar o provisionamento do tenant.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleSubmit} className="grid gap-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Empresa ou condominio *</Label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="companyName"
                        className="pl-9"
                        placeholder="Residencial Jardim Aurora"
                        value={form.companyName}
                        onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminName">Responsavel *</Label>
                    <div className="relative">
                      <User2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="adminName"
                        className="pl-9"
                        placeholder="Ana Paula Martins"
                        value={form.adminName}
                        onChange={(event) => setForm((current) => ({ ...current, adminName: event.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-9"
                        placeholder="contato@cliente.com.br"
                        value={form.email}
                        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">WhatsApp</Label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="phone"
                        className="pl-9"
                        placeholder="11999999999"
                        value={form.phone}
                        onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      placeholder="Sao Paulo"
                      value={form.city}
                      onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="units">Unidades estimadas</Label>
                    <Input
                      id="units"
                      type="number"
                      min="0"
                      placeholder="120"
                      value={form.units}
                      onChange={(event) => setForm((current) => ({ ...current, units: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="desiredSlug">Slug tecnico</Label>
                    <Input
                      id="desiredSlug"
                      placeholder="jardim_aurora"
                      value={form.desiredSlug}
                      onChange={(event) => setForm((current) => ({ ...current, desiredSlug: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                  Namespace sugerido: <span className="font-mono font-semibold">{suggestedSlug || 'aguardando_nome_do_cliente'}</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observacoes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Ex.: deseja onboarding na semana que vem, usa portaria 24h, quer importar moradores depois."
                    value={form.notes}
                    onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <Button type="submit" size="lg" className="h-12 rounded-full bg-slate-900 hover:bg-slate-800" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Provisionando tenant...
                    </>
                  ) : (
                    <>
                      Cadastrar e provisionar
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

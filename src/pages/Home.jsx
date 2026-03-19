import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Building2, Database, Layers3, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const highlights = [
  {
    icon: Building2,
    title: 'Onboarding para varios clientes',
    description: 'Cadastre condominios, empresas ou operacoes separadas em um fluxo unico e publico.',
  },
  {
    icon: Database,
    title: 'Provisionamento por tenant',
    description: 'Cada novo cliente recebe um espaco SQL isolado para manter os dados organizados.',
  },
  {
    icon: ShieldCheck,
    title: 'Base preparada para crescer',
    description: 'A area comercial fica publica, enquanto o portal interno atual continua protegido em outra rota.',
  },
];

const steps = [
  {
    icon: Sparkles,
    title: 'Cliente preenche o cadastro',
    description: 'Nome da empresa, responsavel, contato e volume inicial da operacao.',
  },
  {
    icon: Workflow,
    title: 'A function provisiona o tenant',
    description: 'O backend gera o identificador do cliente e cria o isolamento no PostgreSQL.',
  },
  {
    icon: BadgeCheck,
    title: 'Seu time segue para ativacao',
    description: 'O retorno do cadastro ja informa o namespace criado para iniciar a configuracao do ambiente.',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_48%,_#ecfccb_100%)]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-full border border-white/80 bg-white/75 px-5 py-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 shadow-lg shadow-slate-900/20">
              <Layers3 className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Portaria Facil</p>
              <p className="text-xs text-slate-500">Onboarding multi-tenant para novos clientes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/Access">Portal interno</Link>
            </Button>
            <Button asChild className="rounded-full bg-slate-900 hover:bg-slate-800">
              <Link to="/CadastroCliente">Cadastrar cliente</Link>
            </Button>
          </div>
        </header>

        <main className="flex-1 py-12">
          <section className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-4 py-2 text-sm text-slate-700 shadow-sm">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Capture novos clientes sem misturar os dados da operacao
              </div>

              <div className="space-y-5">
                <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-950 md:text-6xl">
                  Um site de cadastro para novos clientes com provisionamento SQL automatico.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-600">
                  Este primeiro passo abre uma frente comercial publica para captar clientes e inicia a
                  criacao do tenant de cada empresa no backend, sem quebrar o portal operacional que voce ja tem.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 rounded-full bg-slate-900 px-7 hover:bg-slate-800">
                  <Link to="/CadastroCliente">
                    Quero cadastrar um cliente
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-12 rounded-full border-slate-300 bg-white/80 px-7">
                  <Link to="/Access">Acessar portal interno</Link>
                </Button>
              </div>
            </div>

            <Card className="border-white/70 bg-white/80 shadow-2xl shadow-slate-900/10 backdrop-blur">
              <CardContent className="p-7">
                <div className="rounded-3xl bg-slate-950 p-6 text-white">
                  <p className="text-sm uppercase tracking-[0.28em] text-emerald-300">Provisionamento</p>
                  <div className="mt-6 grid gap-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-slate-300">Novo cliente</p>
                      <p className="mt-1 text-xl font-semibold">Residencial Parque das Flores</p>
                    </div>
                    <div className="flex items-center justify-center py-1 text-emerald-300">
                      <Workflow className="h-5 w-5" />
                    </div>
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                      <p className="text-sm text-emerald-200">Tenant criado</p>
                      <p className="mt-1 font-mono text-lg">tenant_residencial_parque_das_flores</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {highlights.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
                          <Icon className="h-5 w-5 text-slate-900" />
                        </div>
                        <h2 className="mt-4 text-base font-semibold text-slate-900">{item.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="mt-14 grid gap-4 lg:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={step.title} className="border-white/70 bg-white/75 shadow-lg shadow-slate-900/5 backdrop-blur">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-semibold text-slate-400">0{index + 1}</span>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-slate-900">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        </main>
      </div>
    </div>
  );
}

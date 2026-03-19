import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, CheckCircle2, Loader2 } from 'lucide-react';
import AptSearch from '@/components/shared/AptSearch';

export default function Register() {
  const [form, setForm] = useState({ name: '', phone: '', block_name: '', apartment_number: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: blocks = [], isLoading: loadingBlocks } = useQuery({
    queryKey: ['blocks-public'],
    queryFn: () => base44.entities.Block.list('name'),
  });

  const { data: apartments = [], isLoading: loadingApts } = useQuery({
    queryKey: ['apartments-public'],
    queryFn: () => base44.entities.Apartment.list('number', 500),
    enabled: true,
  });

  const filteredApts = apartments.filter(a => {
    // Se o apartamento tem bloco associado, filtra pelo bloco selecionado
    if (a.block_name) return a.block_name === form.block_name;
    // Se não tem bloco no apartamento, mostra todos quando há bloco selecionado
    return !!form.block_name;
  });

  function formatPhone(value) {
    const digits = value.replace(/\D/g, '');
    // Se começar com 55, retorna como está; senão, adiciona 55
    if (digits.startsWith('55')) return digits.slice(0, 13);
    return digits.slice(0, 11);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.name || !form.phone || !form.block_name || !form.apartment_number) {
      setError('Preencha todos os campos.');
      return;
    }

    const nameParts = form.name.trim().split(/\s+/);
    if (nameParts.length < 2 || nameParts[1].length < 1) {
      setError('Informe o nome completo (nome e sobrenome).');
      return;
    }

    let phoneToSave = form.phone.replace(/\D/g, '');
    // Garante que tem o prefixo 55
    if (!phoneToSave.startsWith('55')) {
      phoneToSave = '55' + phoneToSave;
    }
    if (phoneToSave.length < 12 || phoneToSave.length > 13) {
      setError('Informe um WhatsApp válido com DDD (ex: 11999999999).');
      return;
    }

    setLoading(true);
    await base44.entities.ResidentRequest.create({
      name: form.name.trim(),
      phone: phoneToSave,
      block_name: form.block_name.trim(),
      apartment_number: form.apartment_number.trim(),
      status: 'pending',
    });
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="p-10 text-center">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Solicitação Enviada!</h2>
            <p className="text-muted-foreground text-sm">
              Seu cadastro foi recebido e está aguardando aprovação da administração do condomínio.
              Você será notificado pelo WhatsApp em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="pb-2 pt-8 px-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Portaria Fácil</h1>
              <p className="text-xs text-muted-foreground">Cadastro de Morador</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Preencha seus dados para solicitar o cadastro no sistema de entregas do condomínio.
          </p>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label htmlFor="name">Nome completo *</Label>
              <Input
                id="name"
                placeholder="Seu nome completo"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone">WhatsApp *</Label>
              <div className="flex items-center border border-input rounded-md overflow-hidden">
                <span className="px-3 py-2 bg-muted text-muted-foreground text-sm font-medium">+55</span>
                <Input
                  id="phone"
                  placeholder="Ex: 11999999999"
                  value={form.phone.replace(/^55/, '')}
                  onChange={(e) => setForm({ ...form, phone: '55' + formatPhone(e.target.value).replace(/^55/, '') })}
                  maxLength={11}
                  inputMode="numeric"
                  className="border-0"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Bloco *</Label>
              {loadingBlocks ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando blocos...
                </div>
              ) : blocks.length > 0 ? (
                <Select
                  value={form.block_name}
                  onValueChange={(val) => setForm({ ...form, block_name: val, apartment_number: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o bloco" />
                  </SelectTrigger>
                  <SelectContent>
                    {blocks.map((block) => (
                      <SelectItem key={block.id} value={block.name}>
                        {block.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Ex: Bloco A, Torre 1"
                  value={form.block_name}
                  onChange={(e) => setForm({ ...form, block_name: e.target.value })}
                />
              )}
            </div>

            <div className="space-y-1">
              <Label>Apartamento *</Label>
              <AptSearch
                apartments={filteredApts}
                value={form.apartment_number}
                onChange={(val) => setForm({ ...form, apartment_number: val })}
                disabled={loadingApts}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enviando...</> : 'Solicitar Cadastro'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
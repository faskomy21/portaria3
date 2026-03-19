import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyRound, CheckCircle2, Loader2 } from 'lucide-react';

export default function KeywordForm() {
  const [form, setForm] = useState({ name: '', ddd: '', phone: '', block: '', apartment: '', packages: '', keyword: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: blocks = [], isLoading: loadingBlocks } = useQuery({
    queryKey: ['blocks-keyword-form'],
    queryFn: () => base44.entities.Block.list('name'),
  });

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const nameParts = form.name.trim().split(/\s+/);
    if (nameParts.length < 2 || nameParts[1].length < 1) return setError('Informe seu nome completo (nome e sobrenome).');
    if (!form.ddd.trim() || !form.phone.trim()) return setError('Informe seu telefone WhatsApp completo.');
    if (!form.block.trim()) return setError('Informe o bloco.');
    if (!form.apartment.trim()) return setError('Informe o número do apartamento.');
    if (!form.packages || isNaN(form.packages) || Number(form.packages) < 1) return setError('Informe o número de encomendas (mínimo 1).');
    if (!form.keyword.trim()) return setError('Informe a palavra-chave.');

    setLoading(true);
    const numPackages = Number(form.packages);
    const cleanPhone = `55${form.ddd.replace(/\D/g, '')}${form.phone.replace(/\D/g, '')}`;
    
    if (numPackages > 1) {
      // Criar tickets dinâmicos de acordo com o número de encomendas
      const tickets = Array.from({ length: numPackages }, () => ({
        resident_id: 'manual',
        resident_name: form.name.trim(),
        resident_phone: cleanPhone,
        block_name: form.block.trim(),
        apartment_number: form.apartment.trim(),
        keyword: form.keyword.trim().toUpperCase(),
        informed_at: new Date().toISOString(),
        used: false,
      }));
      await base44.entities.DeliveryKeyword.bulkCreate(tickets);
    } else {
      // Criar 1 ticket se for apenas 1 encomenda
      await base44.entities.DeliveryKeyword.create({
        resident_id: 'manual',
        resident_name: form.name.trim(),
        resident_phone: cleanPhone,
        block_name: form.block.trim(),
        apartment_number: form.apartment.trim(),
        keyword: form.keyword.trim().toUpperCase(),
        informed_at: new Date().toISOString(),
        used: false,
      });
    }
    
    // Enviar notificação WhatsApp
    try {
      await base44.functions.invoke('sendKeywordNotification', {
        resident_name: form.name.trim(),
        resident_phone: cleanPhone,
        keyword: form.keyword.trim().toUpperCase(),
        apartment_number: form.apartment.trim(),
        block_name: form.block.trim(),
        total_items: numPackages
      });
    } catch (err) {
      console.error('Erro ao enviar notificação:', err);
    }
    
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
            <h2 className="text-2xl font-bold mb-2">Palavra-chave Registrada!</h2>
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
            <div className="h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center">
              <KeyRound className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Portaria Fácil</h1>
              <p className="text-xs text-muted-foreground">Cadastro de Palavra-chave</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Preencha seus dados e escolha uma palavra-chave para retirar suas encomendas na portaria.
          </p>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">

            <div className="space-y-1">
              <Label htmlFor="name">Nome completo *</Label>
              <Input id="name" placeholder="Ex: João Silva" value={form.name} onChange={e => set('name', e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Telefone WhatsApp *</Label>
              <div className="flex gap-2">
                <div className="w-20">
                  <Input 
                    placeholder="55" 
                    value="55" 
                    disabled 
                    className="text-center"
                  />
                </div>
                <Input 
                  placeholder="Ex: 21987654321" 
                  value={`${form.ddd}${form.phone}`}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, '');
                    if (digits.length <= 2) {
                      set('ddd', digits);
                      set('phone', '');
                    } else {
                      set('ddd', digits.slice(0, 2));
                      set('phone', digits.slice(2));
                    }
                  }}
                  inputMode="numeric"
                />
              </div>
              <p className="text-xs text-muted-foreground">Será usado para notificações via WhatsApp</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="block">Bloco *</Label>
                {loadingBlocks ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                  </div>
                ) : (
                  <Select value={form.block} onValueChange={(val) => set('block', val)}>
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
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="apartment">Apartamento *</Label>
                <Input id="apartment" placeholder="Ex: 101" value={form.apartment} onChange={e => set('apartment', e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="packages">Números de encomendas com a mesma palavra-chave *</Label>
              <Input id="packages" type="number" min="1" placeholder="Ex: 2" inputMode="numeric" value={form.packages} onChange={e => set('packages', e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="keyword">Palavra-chave *</Label>
              <Input id="keyword" placeholder="Ex: SOLAR, AZUL, GIRASSOL..." value={form.keyword} onChange={e => set('keyword', e.target.value.toUpperCase())} />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 mt-2" disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enviando...</> : 'Registrar Palavra-chave'}
            </Button>
            </form>
            </CardContent>
            </Card>
            </div>
            );
            }
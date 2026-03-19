import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MessageCircle, CheckCircle2, XCircle, Send, Loader2, AlertCircle, Wifi, WifiOff, Upload, Image as ImageIcon, X as XIcon, Clock } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

export default function WhatsApp() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Olá! Teste de conexão da Portaria Fácil. ✅');
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: settingsList = [], isLoading } = useQuery({
    queryKey: ['condo-settings'],
    queryFn: () => base44.entities.CondoSettings.list(),
  });

  const settings = settingsList[0] || {};
  const enabled = !!settings.whatsapp_instance_url && !!settings.whatsapp_api_key && !!settings.whatsapp_instance_name;
  const [whatsappEnabled, setWhatsappEnabled] = useState(enabled);

  const [form, setForm] = useState({
    whatsapp_instance_url: settings.whatsapp_instance_url || '',
    whatsapp_api_key: settings.whatsapp_api_key || '',
    whatsapp_instance_name: settings.whatsapp_instance_name || '',
    delivery_message: settings.delivery_message || 'Olá! Você recebeu uma encomenda na portaria. 📦\n\nDescrição: {description}\nCódigo: {tracking_code}\n\nFavor retirar na portaria.',
    approval_message: settings.approval_message || 'Bem-vindo ao condomínio! 🏠\n\nSua solicitação foi aprovada. Você já pode acessar o sistema de controle de entregas.',
    refused_message: settings.refused_message || 'Sua encomenda foi recusada ou chegou avariada. ⚠️\n\nCódigo: {tracking_code}\nMotivo: {reason}\n\nEntre em contato com a transportadora.',
    keyword_message: settings.keyword_message || 'Olá {resident_name}! 👋\n\nRecebemos sua palavra-chave de encomenda: *{keyword}*\n\nAguardamos suas encomendas na portaria!',
    collection_message: settings.collection_message || 'Olá {resident_name}! 📦\n\nSua encomenda foi retirada na portaria!\n\n📋 Dados da retirada:\nRetirado por: {collected_by_name}\nData: {collected_date}\nHora: {collected_time}',
    status_image_url: settings.status_image_url || '',
    notify_delivery_enabled: settings.notify_delivery_enabled !== false,
    notify_refused_enabled: settings.notify_refused_enabled !== false,
    notify_collection_enabled: settings.notify_collection_enabled !== false,
    notify_keyword_enabled: settings.notify_keyword_enabled !== false,
    notify_approval_enabled: settings.notify_approval_enabled !== false,
    silence_start_hour: settings.silence_start_hour ?? 23,
    silence_end_hour: settings.silence_end_hour ?? 8,
    delivery_delay_minutes: settings.delivery_delay_minutes ?? 0,
    delivery_priority: settings.delivery_priority ?? 'normal',
    approval_delay_minutes: settings.approval_delay_minutes ?? 0,
    approval_priority: settings.approval_priority ?? 'normal',
    refused_delay_minutes: settings.refused_delay_minutes ?? 0,
    refused_priority: settings.refused_priority ?? 'normal',
    keyword_delay_minutes: settings.keyword_delay_minutes ?? 0,
    keyword_priority: settings.keyword_priority ?? 'normal',
    collection_delay_minutes: settings.collection_delay_minutes ?? 0,
    collection_priority: settings.collection_priority ?? 'normal',
    queue_enabled: settings.queue_enabled !== false,
    queue_interval_minutes: settings.queue_interval_minutes ?? 5,
  });

  // Sync form when settings load
  useEffect(() => {
    if (settingsList.length > 0) {
      const s = settingsList[0];
      setForm({
        whatsapp_instance_url: s.whatsapp_instance_url || '',
        whatsapp_api_key: s.whatsapp_api_key || '',
        whatsapp_instance_name: s.whatsapp_instance_name || '',
        delivery_message: s.delivery_message || 'Olá! Você recebeu uma encomenda na portaria. 📦\n\nDescrição: {description}\nCódigo: {tracking_code}\n\nFavor retirar na portaria.',
        approval_message: s.approval_message || 'Bem-vindo ao condomínio! 🏠\n\nSua solicitação foi aprovada. Você já pode acessar o sistema de controle de entregas.',
        refused_message: s.refused_message || 'Sua encomenda foi recusada ou chegou avariada. ⚠️\n\nCódigo: {tracking_code}\nMotivo: {reason}\n\nEntre em contato com a transportadora.',
        keyword_message: s.keyword_message || 'Olá {resident_name}! 👋\n\nRecebemos sua palavra-chave de encomenda: *{keyword}*\n\nAguardamos suas encomendas na portaria!',
        collection_message: s.collection_message || 'Olá {resident_name}! 📦\n\nSua encomenda foi retirada na portaria!\n\n📋 Dados da retirada:\nRetirado por: {collected_by_name}\nData: {collected_date}\nHora: {collected_time}',
        status_image_url: s.status_image_url || '',
        notify_delivery_enabled: s.notify_delivery_enabled !== false,
        notify_refused_enabled: s.notify_refused_enabled !== false,
        notify_collection_enabled: s.notify_collection_enabled !== false,
        notify_keyword_enabled: s.notify_keyword_enabled !== false,
        notify_approval_enabled: s.notify_approval_enabled !== false,
        silence_start_hour: s.silence_start_hour ?? 23,
        silence_end_hour: s.silence_end_hour ?? 8,
        delivery_delay_minutes: s.delivery_delay_minutes ?? 0,
        delivery_priority: s.delivery_priority ?? 'normal',
        approval_delay_minutes: s.approval_delay_minutes ?? 0,
        approval_priority: s.approval_priority ?? 'normal',
        refused_delay_minutes: s.refused_delay_minutes ?? 0,
        refused_priority: s.refused_priority ?? 'normal',
        keyword_delay_minutes: s.keyword_delay_minutes ?? 0,
        keyword_priority: s.keyword_priority ?? 'normal',
        collection_delay_minutes: s.collection_delay_minutes ?? 0,
        collection_priority: s.collection_priority ?? 'normal',
        queue_enabled: s.queue_enabled !== false,
        queue_interval_minutes: s.queue_interval_minutes ?? 1,
      });
      setPreviewImage(s.status_image_url || null);
      setWhatsappEnabled(!!(s.whatsapp_instance_url && s.whatsapp_api_key && s.whatsapp_instance_name));
    }
  }, [settingsList.length]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings.id) {
        return base44.entities.CondoSettings.update(settings.id, data);
      } else {
        return base44.entities.CondoSettings.create({ condo_name: 'Condomínio', ...data });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['condo-settings'] });
      toast({ title: 'Configurações salvas com sucesso!' });
    },
  });

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setPreviewImage(response.file_url);
      setForm(f => ({ ...f, status_image_url: response.file_url }));
      toast({ title: 'Imagem enviada com sucesso!' });
    } catch (err) {
      toast({ title: `Erro: ${err.message}`, variant: 'destructive' });
    }
    setUploadingImage(false);
  }

  function handleSave() {
    if (whatsappEnabled) {
      if (!form.whatsapp_instance_url || !form.whatsapp_api_key || !form.whatsapp_instance_name) {
        toast({ title: 'Preencha todos os campos da Evolution API.', variant: 'destructive' });
        return;
      }
      saveMutation.mutate(form);
    } else {
      // Desabilitar - limpar campos
      saveMutation.mutate({
        whatsapp_instance_url: '',
        whatsapp_api_key: '',
        whatsapp_instance_name: '',
      });
    }
  }

  async function handleTest() {
    if (!testPhone) {
      toast({ title: 'Informe o número para teste.', variant: 'destructive' });
      return;
    }
    setTesting(true);
    try {
      const response = await base44.functions.invoke('sendWhatsAppMessage', {
        phone: testPhone,
        message: testMessage,
      });
      if (response?.success || response?.data?.success) {
        toast({ title: '✅ Mensagem enviada com sucesso!' });
      } else {
        toast({ title: `Erro: ${response?.error || response?.data?.error || 'Falha ao enviar'}`, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: `Erro: ${err.message}`, variant: 'destructive' });
    }
    setTesting(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">WhatsApp</h1>
        <p className="text-muted-foreground mt-1">Configure a integração com a Evolution API para envio de notificações</p>
      </div>

      {/* Toggle Card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${whatsappEnabled ? 'bg-green-100' : 'bg-muted'}`}>
                <MessageCircle className={`h-6 w-6 ${whatsappEnabled ? 'text-green-600' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="font-semibold text-foreground">Notificações por WhatsApp</p>
                <p className="text-sm text-muted-foreground">
                  {whatsappEnabled ? 'Integração ativa via Evolution API' : 'Integração desativada'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {whatsappEnabled ? (
                <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                  <Wifi className="h-3.5 w-3.5" /> Ativo
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <WifiOff className="h-3.5 w-3.5" /> Inativo
                </span>
              )}
              <Switch
                checked={whatsappEnabled}
                onCheckedChange={setWhatsappEnabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Config Form */}
      {whatsappEnabled && (
        <>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 px-6 pt-6">
              <h2 className="text-base font-semibold">Configuração da Evolution API</h2>
              <p className="text-xs text-muted-foreground">
                Preencha com os dados da sua instância Evolution API v2
              </p>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              <div className="space-y-1">
                <Label>URL da Instância *</Label>
                <Input
                  placeholder="https://sua-evolution-api.com"
                  value={form.whatsapp_instance_url}
                  onChange={e => setForm(f => ({ ...f, whatsapp_instance_url: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">URL base da sua Evolution API (sem barra no final)</p>
              </div>
              <div className="space-y-1">
                <Label>Nome da Instância *</Label>
                <Input
                  placeholder="portaria-facil"
                  value={form.whatsapp_instance_name}
                  onChange={e => setForm(f => ({ ...f, whatsapp_instance_name: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Nome da instância criada na Evolution API</p>
              </div>
              <div className="space-y-1">
                <Label>API Key *</Label>
                <Input
                  type="password"
                  placeholder="sua-apikey-secreta"
                  value={form.whatsapp_api_key}
                  onChange={e => setForm(f => ({ ...f, whatsapp_api_key: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Chave de autenticação da Evolution API (apikey do header)</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700 space-y-1">
                  <p className="font-semibold">Como obter esses dados?</p>
                  <p>1. Instale a Evolution API v2 no seu servidor</p>
                  <p>2. Acesse o Manager e crie uma instância</p>
                  <p>3. Copie a URL, nome da instância e apikey aqui</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 px-6 pt-6">
              <h2 className="text-base font-semibold">Mensagens Padrão</h2>
              <p className="text-xs text-muted-foreground">Personalize as mensagens automáticas enviadas aos moradores</p>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-5">

              {/* Entrega */}
              <div className="border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">📦 Entrega</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{form.notify_delivery_enabled ? 'Ativo' : 'Inativo'}</span>
                    <Switch checked={form.notify_delivery_enabled} onCheckedChange={v => setForm(f => ({ ...f, notify_delivery_enabled: v }))} />
                  </div>
                </div>
                <Textarea
                  placeholder="Mensagem quando uma encomenda chegar..."
                  value={form.delivery_message}
                  onChange={e => setForm(f => ({ ...f, delivery_message: e.target.value }))}
                  className="min-h-[100px]"
                  disabled={!form.notify_delivery_enabled}
                />
                <p className="text-xs text-muted-foreground">Use {'{description}'} e {'{tracking_code}'} como variáveis</p>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="space-y-1">
                    <Label className="text-xs">Delay (minutos)</Label>
                    <Input type="number" min="0" value={form.delivery_delay_minutes} onChange={e => setForm(f => ({ ...f, delivery_delay_minutes: parseInt(e.target.value) || 0 }))} disabled={!form.notify_delivery_enabled} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Prioridade</Label>
                    <select value={form.delivery_priority} onChange={e => setForm(f => ({ ...f, delivery_priority: e.target.value }))} disabled={!form.notify_delivery_enabled} className="w-full h-9 rounded-md border border-input bg-background px-2 py-1 text-xs">
                      <option value="normal">Normal</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Aprovação */}
              <div className="border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">✅ Aprovação de Morador</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{form.notify_approval_enabled ? 'Ativo' : 'Inativo'}</span>
                    <Switch checked={form.notify_approval_enabled} onCheckedChange={v => setForm(f => ({ ...f, notify_approval_enabled: v }))} />
                  </div>
                </div>
                <Textarea
                  placeholder="Mensagem quando morador é aprovado..."
                  value={form.approval_message}
                  onChange={e => setForm(f => ({ ...f, approval_message: e.target.value }))}
                  className="min-h-[100px]"
                  disabled={!form.notify_approval_enabled}
                />
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="space-y-1">
                    <Label className="text-xs">Delay (minutos)</Label>
                    <Input type="number" min="0" value={form.approval_delay_minutes} onChange={e => setForm(f => ({ ...f, approval_delay_minutes: parseInt(e.target.value) || 0 }))} disabled={!form.notify_approval_enabled} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Prioridade</Label>
                    <select value={form.approval_priority} onChange={e => setForm(f => ({ ...f, approval_priority: e.target.value }))} disabled={!form.notify_approval_enabled} className="w-full h-9 rounded-md border border-input bg-background px-2 py-1 text-xs">
                      <option value="normal">Normal</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Recusa */}
              <div className="border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">⚠️ Recusa / Avaria</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{form.notify_refused_enabled ? 'Ativo' : 'Inativo'}</span>
                    <Switch checked={form.notify_refused_enabled} onCheckedChange={v => setForm(f => ({ ...f, notify_refused_enabled: v }))} />
                  </div>
                </div>
                <Textarea
                  placeholder="Mensagem quando encomenda é recusada ou avariada..."
                  value={form.refused_message}
                  onChange={e => setForm(f => ({ ...f, refused_message: e.target.value }))}
                  className="min-h-[100px]"
                  disabled={!form.notify_refused_enabled}
                />
                <p className="text-xs text-muted-foreground">Use {'{tracking_code}'} e {'{reason}'} como variáveis</p>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="space-y-1">
                    <Label className="text-xs">Delay (minutos)</Label>
                    <Input type="number" min="0" value={form.refused_delay_minutes} onChange={e => setForm(f => ({ ...f, refused_delay_minutes: parseInt(e.target.value) || 0 }))} disabled={!form.notify_refused_enabled} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Prioridade</Label>
                    <select value={form.refused_priority} onChange={e => setForm(f => ({ ...f, refused_priority: e.target.value }))} disabled={!form.notify_refused_enabled} className="w-full h-9 rounded-md border border-input bg-background px-2 py-1 text-xs">
                      <option value="normal">Normal</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Palavra-chave */}
              <div className="border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">🔑 Palavra-chave</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{form.notify_keyword_enabled ? 'Ativo' : 'Inativo'}</span>
                    <Switch checked={form.notify_keyword_enabled} onCheckedChange={v => setForm(f => ({ ...f, notify_keyword_enabled: v }))} />
                  </div>
                </div>
                <Textarea
                  placeholder="Mensagem quando morador cadastra uma palavra-chave..."
                  value={form.keyword_message}
                  onChange={e => setForm(f => ({ ...f, keyword_message: e.target.value }))}
                  className="min-h-[100px]"
                  disabled={!form.notify_keyword_enabled}
                />
                <p className="text-xs text-muted-foreground">Use {'{resident_name}'} e {'{keyword}'} como variáveis</p>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="space-y-1">
                    <Label className="text-xs">Delay (minutos)</Label>
                    <Input type="number" min="0" value={form.keyword_delay_minutes} onChange={e => setForm(f => ({ ...f, keyword_delay_minutes: parseInt(e.target.value) || 0 }))} disabled={!form.notify_keyword_enabled} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Prioridade</Label>
                    <select value={form.keyword_priority} onChange={e => setForm(f => ({ ...f, keyword_priority: e.target.value }))} disabled={!form.notify_keyword_enabled} className="w-full h-9 rounded-md border border-input bg-background px-2 py-1 text-xs">
                      <option value="normal">Normal</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Retirada */}
              <div className="border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">📋 Confirmação de Retirada</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{form.notify_collection_enabled ? 'Ativo' : 'Inativo'}</span>
                    <Switch checked={form.notify_collection_enabled} onCheckedChange={v => setForm(f => ({ ...f, notify_collection_enabled: v }))} />
                  </div>
                </div>
                <Textarea
                  placeholder="Mensagem quando morador retira uma encomenda..."
                  value={form.collection_message}
                  onChange={e => setForm(f => ({ ...f, collection_message: e.target.value }))}
                  className="min-h-[100px]"
                  disabled={!form.notify_collection_enabled}
                />
                <p className="text-xs text-muted-foreground">Use {'{resident_name}'}, {'{collected_by_name}'}, {'{collected_date}'} e {'{collected_time}'} como variáveis</p>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div className="space-y-1">
                    <Label className="text-xs">Delay (minutos)</Label>
                    <Input type="number" min="0" value={form.collection_delay_minutes} onChange={e => setForm(f => ({ ...f, collection_delay_minutes: parseInt(e.target.value) || 0 }))} disabled={!form.notify_collection_enabled} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Prioridade</Label>
                    <select value={form.collection_priority} onChange={e => setForm(f => ({ ...f, collection_priority: e.target.value }))} disabled={!form.notify_collection_enabled} className="w-full h-9 rounded-md border border-input bg-background px-2 py-1 text-xs">
                      <option value="normal">Normal</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>
                </div>
              </div>

              </CardContent>
              </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 px-6 pt-6">
              <h2 className="text-base font-semibold flex items-center gap-2"><Clock className="h-4 w-4" />Gerenciamento da Fila</h2>
              <p className="text-xs text-muted-foreground">Controle o processamento de notificações com segurança</p>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30">
                <div>
                  <p className="font-semibold text-sm">Ativar processamento da fila</p>
                  <p className="text-xs text-muted-foreground">Quando desativado, mensagens ficam na fila indefinidamente</p>
                </div>
                <Switch checked={form.queue_enabled} onCheckedChange={v => setForm(f => ({ ...f, queue_enabled: v }))} />
              </div>

              {form.queue_enabled && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Intervalo entre mensagens</Label>
                    <Select 
                      value={String(form.queue_interval_minutes)} 
                      onValueChange={v => setForm(f => ({ ...f, queue_interval_minutes: parseInt(v) }))}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map(minutes => (
                          <SelectItem key={minutes} value={String(minutes)}>
                            {minutes} minuto{minutes > 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                      Uma mensagem a cada {form.queue_interval_minutes} minuto{form.queue_interval_minutes > 1 ? 's' : ''} protege contra bloqueios do WhatsApp
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700 space-y-1">
                  <p className="font-semibold">⚠️ Recomendação</p>
                  <p>Mantenha no mínimo 1 minuto de intervalo. Envios muito rápidos podem resultar em bloqueio permanente pela WhatsApp.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 px-6 pt-6">
              <h2 className="text-base font-semibold flex items-center gap-2"><Clock className="h-4 w-4" />Horário de Silêncio</h2>
              <p className="text-xs text-muted-foreground">Intervalo em que as notificações NÃO serão enviadas (proteção contra banimento)</p>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Hora de Início</Label>
                  <select 
                    value={form.silence_start_hour} 
                    onChange={e => setForm(f => ({ ...f, silence_start_hour: parseInt(e.target.value) }))}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Quando o silêncio começa</p>
                </div>
                <div className="space-y-1">
                  <Label>Hora de Término</Label>
                  <select 
                    value={form.silence_end_hour} 
                    onChange={e => setForm(f => ({ ...f, silence_end_hour: parseInt(e.target.value) }))}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Quando as mensagens podem ser enviadas novamente</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700 space-y-1">
                  <p className="font-semibold">Configuração Padrão</p>
                  <p>Seu padrão atual: <strong>{form.silence_start_hour.toString().padStart(2, '0')}:00</strong> até <strong>{form.silence_end_hour.toString().padStart(2, '0')}:00</strong></p>
                  <p>Notificações serão enviadas: <strong>{form.silence_end_hour.toString().padStart(2, '0')}:00 até {form.silence_start_hour.toString().padStart(2, '0')}:00</strong></p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 px-6 pt-6">
              <h2 className="text-base font-semibold">Imagem para Status</h2>
              <p className="text-xs text-muted-foreground">Compartilhe uma imagem no status do WhatsApp (ex: logotipo do condomínio)</p>
            </CardHeader>
            <CardContent className="px-6 pb-6 space-y-4">
              <div className="space-y-2">
                {previewImage ? (
                  <div className="relative w-full max-w-xs">
                    <img src={previewImage} alt="Preview" className="w-full h-auto rounded-lg border border-border" />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => {
                        setPreviewImage(null);
                        setForm(f => ({ ...f, status_image_url: '' }));
                      }}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">Clique para selecionar ou arraste a imagem</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full">
            {saveMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : 'Salvar Todas as Configurações'}
          </Button>
        </>
      )}

      {!whatsappEnabled && (
        <Button onClick={handleSave} disabled={saveMutation.isPending} variant="outline" className="w-full">
          {saveMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : 'Salvar (Desativar integração)'}
        </Button>
      )}

      {/* Test */}
      {whatsappEnabled && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 px-6 pt-6">
            <h2 className="text-base font-semibold">Teste de Envio</h2>
            <p className="text-xs text-muted-foreground">Envie uma mensagem de teste para verificar a conexão</p>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-4">
            <div className="space-y-1">
              <Label>Número de Destino</Label>
              <Input
                placeholder="5511999999999"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Com código do país e DDD, sem espaços ou traços</p>
            </div>
            <div className="space-y-1">
              <Label>Mensagem</Label>
              <Input
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
              />
            </div>
            <Button onClick={handleTest} disabled={testing} variant="outline" className="w-full gap-2">
              {testing ? <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</> : <><Send className="h-4 w-4" />Enviar Teste</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {whatsappEnabled && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 px-6 pt-6">
            <h2 className="text-base font-semibold">Variáveis Disponíveis</h2>
            <p className="text-xs text-muted-foreground">Use estas variáveis nas mensagens acima</p>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">📦 Mensagem de Entrega</p>
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="font-mono bg-white p-2 rounded border border-slate-200">{'{tracking_code}'} - Código de rastreamento</div>
                  <div className="font-mono bg-white p-2 rounded border border-slate-200">{'{description}'} - Descrição do pacote</div>
                  <div className="font-mono bg-white p-2 rounded border border-slate-200">{'{resident_name}'} - Nome do morador</div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">🔄 Mensagem de Recusa/Avaria</p>
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="font-mono bg-white p-2 rounded border border-slate-200">{'{tracking_code}'} - Código de rastreamento</div>
                  <div className="font-mono bg-white p-2 rounded border border-slate-200">{'{reason}'} - Motivo da recusa</div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">🔑 Mensagem de Palavra-chave</p>
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="font-mono bg-white p-2 rounded border border-slate-200">{'{resident_name}'} - Nome do morador</div>
                  <div className="font-mono bg-white p-2 rounded border border-slate-200">{'{keyword}'} - Palavra-chave registrada</div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">📋 Mensagem de Confirmação de Retirada</p>
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="font-mono bg-white p-2 rounded border border-slate-200">{'{resident_name}'} - Nome do morador</div>
                  <div className="font-mono bg-white p-2 rounded border border-slate-200">{'{collected_by_name}'} - Quem retirou</div>
                  <div className="font-mono bg-white p-2 rounded border border-slate-200">{'{collected_date}'} - Data da retirada</div>
                  <div className="font-mono bg-white p-2 rounded border border-slate-200">{'{collected_time}'} - Hora da retirada</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

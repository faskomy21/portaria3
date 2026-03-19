import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Package, ArrowLeft, Send, CheckCircle2, Plus, Trash2, ScanLine } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import BarcodeScanner from '@/components/delivery/BarcodeScanner';
import MultiPhotoCapture from '@/components/delivery/MultiPhotoCapture';
import ResidentSearch from '@/components/shared/ResidentSearch';
import { toast } from 'sonner';


export default function NewDelivery() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1); // 1: scan, 2: details, 3: success
  const [photos, setPhotos] = useState([]); // array de base64
  const [photo, setPhoto] = useState(null); // foto capturada no step 1
  const [isSubmitting, setIsSubmitting] = useState(false); // controla carregamento
  const [scannedCodes, setScannedCodes] = useState([]); // múltiplos códigos
  const now = new Date();
  const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const [form, setForm] = useState({
    tracking_code: '',
    resident_id: '',
    carrier: '',
    description: '',
    received_at: localISO,
  });

  const { data: residents = [] } = useQuery({
    queryKey: ['residents'],
    queryFn: () => base44.entities.Resident.list('name'),
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['condo-settings'],
    queryFn: () => base44.entities.CondoSettings.list(),
  });

  const settings = settingsList[0] || {};
  const whatsappEnabled = !!(settings.whatsapp_instance_url && settings.whatsapp_api_key && settings.whatsapp_instance_name);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Delivery.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    },
  });

  function handleScan(code) {
    if (!code.trim()) return;
    // Adiciona código se ainda não estiver na lista
    setScannedCodes(prev => {
      if (prev.includes(code.trim())) {
        toast.warning('Código já adicionado.');
        return prev;
      }
      return [...prev, code.trim()];
    });
    if (photo) {
      setPhotos(prev => [photo, ...prev]);
      setPhoto(null);
    }
  }

  function removeCode(code) {
    setScannedCodes(prev => prev.filter(c => c !== code));
  }

  function proceedToDetails() {
    if (scannedCodes.length === 0) return;
    // Para compatibilidade, usa o primeiro código no form (todos serão criados no submit)
    setForm(prev => ({ ...prev, tracking_code: scannedCodes[0] }));
    setStep(2);
  }

  async function uploadPhoto(dataUrl) {
    const binaryString = atob(dataUrl.split(',')[1]);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    const file = new File([blob], 'foto_encomenda.jpg', { type: 'image/jpeg' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    return file_url;
  }

  async function sendWhatsApp(resident, photoUrls) {
    const photosLine = photoUrls.length > 0
      ? '\n\n📷 *Fotos da encomenda:*\n' + photoUrls.map((u, i) => `Foto ${i + 1}: ${u}`).join('\n')
      : '';

    let message = settings.delivery_message || 'Olá! Você recebeu uma encomenda na portaria. 📦\n\nDescrição: {description}\nCódigo: {tracking_code}\n\nFavor retirar na portaria.';
    message = message
      .replace('{description}', form.description || 'Não informado')
      .replace('{tracking_code}', form.tracking_code)
      + photosLine;

    // Valida comprimento máximo da mensagem (WhatsApp: ~4096 caracteres)
    if (message.length > 4000) {
      toast.error('Mensagem muito longa. Reduza a descrição ou número de fotos.');
      return 'failed';
    }

    const phone = resident.phone.replace(/\D/g, '');

    if (whatsappEnabled && settings.notify_delivery_enabled !== false) {
      // Nova entrega com delay configurado
      const delayMs = (settings.delivery_delay_minutes ?? 0) * 60 * 1000;
      const scheduledAt = delayMs > 0 ? new Date(Date.now() + delayMs).toISOString() : undefined;
      await base44.entities.NotificationQueue.create({ 
        phone, 
        message, 
        status: 'pending', 
        priority: settings.delivery_priority ?? 'normal',
        scheduled_at: scheduledAt
      });
      return 'queued';
    } else {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
      return 'sent';
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    const resident = residents.find(r => r.id === form.resident_id);
    if (!resident) return;

    // Valida campos obrigatórios
    const codes = scannedCodes.length > 0 ? scannedCodes : [form.tracking_code];
    if (codes.some(c => !c.trim())) {
      toast.error('Preencha todos os códigos de rastreamento.');
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedUrls = [];
      if (photos.length > 0) {
        toast.info('Enviando fotos...');
        const results = await Promise.allSettled(photos.map(uploadPhoto));
        uploadedUrls = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        if (uploadedUrls.length < photos.length) toast.error('Algumas fotos não puderam ser enviadas.');
      }

      // Envia notificação antes de criar entregas
      const notifResult = await sendWhatsApp(resident, uploadedUrls);
      if (notifResult === 'failed') {
        setIsSubmitting(false);
        return;
      }

      // Cria uma entrega para cada código escaneado
      await Promise.all(codes.map((code) =>
        createMutation.mutateAsync({
          tracking_code: code,
          resident_id: resident.id,
          resident_name: resident.name,
          apartment_number: resident.apartment_number,
          block_name: resident.block_name,
          carrier: form.carrier,
          description: form.description,
          status: 'pending',
          ...(uploadedUrls[0] && { photo_url: uploadedUrls[0] }),
        })
      ));

      if (notifResult === 'queued') {
        toast.success(`${codes.length} entrega(s) registrada(s)! Notificação será enviada em breve.`);
      } else {
        toast.success(`${codes.length} entrega(s) registrada(s) e notificação enviada!`);
      }
      setStep(3);
    } catch (err) {
      toast.error('Erro ao registrar entrega.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function reset() {
    const n = new Date();
    const iso = new Date(n.getTime() - n.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm({ tracking_code: '', resident_id: '', carrier: '', description: '', received_at: iso });
    setPhotos([]);
    setPhoto(null);
    setScannedCodes([]);
    setStep(1);
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/Deliveries">
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Nova Entrega</h1>
          <p className="text-muted-foreground text-sm">Registre e notifique o morador</p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${step >= s ? 'bg-primary' : 'bg-muted'}`} />
        ))}
      </div>

      {step === 1 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Package className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">Escanear Códigos</h2>
              <p className="text-sm text-muted-foreground">Escaneie um ou mais códigos. Depois avance para preencher os detalhes.</p>
            </div>
            <BarcodeScanner
              onScan={handleScan}
              onPhotoCapture={setPhoto}
              capturedPhoto={photo}
            />

            {/* Lista de códigos escaneados */}
            {scannedCodes.length > 0 && (
              <div className="mt-5 space-y-2">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <ScanLine className="h-4 w-4" />
                  {scannedCodes.length} código(s) escaneado(s):
                </p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {scannedCodes.map((code, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                      <span className="font-mono text-sm truncate flex-1">{code}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 ml-2 text-destructive hover:text-destructive" onClick={() => removeCode(code)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-2" onClick={proceedToDetails}>
                  <Plus className="h-4 w-4 mr-2" />
                  Avançar com {scannedCodes.length} código(s)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label>Código(s) de Rastreamento</Label>
                {scannedCodes.length > 1 ? (
                  <div className="space-y-1.5 mt-1 max-h-36 overflow-y-auto">
                    {scannedCodes.map((code, i) => (
                      <div key={i} className="bg-muted rounded-md px-3 py-2 font-mono text-sm">{code}</div>
                    ))}
                  </div>
                ) : (
                  <Input value={form.tracking_code} onChange={(e) => setForm({ ...form, tracking_code: e.target.value })} className="font-mono" />
                )}
              </div>
              <div>
                <Label>Morador Destinatário *</Label>
                <ResidentSearch
                  residents={residents}
                  value={form.resident_id}
                  onChange={(id) => setForm({ ...form, resident_id: id })}
                  placeholder="Digite o nome do morador..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Transportadora / Remetente</Label>
                <Input value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} placeholder="Ex: Correios, Mercado Livre" />
              </div>
              <div>
                <Label>Descrição do Pacote</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Caixa média, envelope..." />
              </div>
              <div>
                <Label>Data e Hora do Recebimento</Label>
                <Input
                  type="datetime-local"
                  value={form.received_at}
                  onChange={(e) => setForm({ ...form, received_at: e.target.value })}
                />
              </div>
              <MultiPhotoCapture photos={photos} onPhotosChange={setPhotos} label="Fotos da Encomenda" />
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1" disabled={isSubmitting}>Voltar</Button>
                <Button type="submit" className="flex-1" disabled={!form.resident_id || isSubmitting}>
                  <Send className="h-4 w-4 mr-2" /> {isSubmitting ? 'Enviando...' : 'Registrar e Notificar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {scannedCodes.length > 1 ? `${scannedCodes.length} Entregas Registradas!` : 'Entrega Registrada!'}
            </h2>
            <p className="text-muted-foreground mb-6">O morador foi notificado via WhatsApp.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={reset} className="flex-1">Nova Entrega</Button>
              <Button onClick={() => navigate('/Deliveries')} className="flex-1">Ver Entregas</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
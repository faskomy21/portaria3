import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PackageX, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import BarcodeScanner from '@/components/delivery/BarcodeScanner';
import MultiPhotoCapture from '@/components/delivery/MultiPhotoCapture';
import ResidentSearch from '@/components/shared/ResidentSearch';
import { toast } from 'sonner';

export default function NewRefusedDelivery() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState([]);
  const [photo, setPhoto] = useState(null); // foto capturada no step 1

  const [form, setForm] = useState({
    tracking_code: '',
    resident_id: '',
    carrier: '',
    reason: '',
    description: '',
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
    mutationFn: (data) => base44.entities.RefusedDelivery.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refused_deliveries'] });
    },
  });

  function handleScan(code) {
    setForm(prev => ({ ...prev, tracking_code: code }));
    // se capturou foto no step 1, adiciona ao array de fotos
    if (photo) {
      setPhotos(prev => [photo, ...prev]);
      setPhoto(null);
    }
    setStep(2);
  }

  async function uploadPhoto(dataUrl) {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], 'foto_avaria.jpg', { type: 'image/jpeg' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    return file_url;
  }

  async function sendWhatsApp(resident, photoUrls) {
    const photosLine = photoUrls.length > 0
      ? '\n\n📷 *Fotos da avaria:*\n' + photoUrls.map((u, i) => `Foto ${i + 1}: ${u}`).join('\n')
      : '';
    
    let message = settings.refused_message || 'Sua encomenda foi recusada ou chegou avariada. ⚠️\n\nCódigo: {tracking_code}\nMotivo: {reason}\n\nEntre em contato com a transportadora.';
    message = message
      .replace('{tracking_code}', form.tracking_code)
      .replace('{reason}', form.reason || 'Não informado')
      + photosLine;
    
    const phone = resident.phone.replace(/\D/g, '');

    if (whatsappEnabled && settings.notify_refused_enabled !== false) {
      // Escalone o delay: conta pendentes na fila e adiciona 5 min por posição (mínimo 2 min)
      const queuedItems = await base44.entities.NotificationQueue.filter({ status: 'pending' });
      const position = queuedItems.length;
      const delayMinutes = 2 + (position * 5);
      const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
      await base44.entities.NotificationQueue.create({ phone, message, scheduled_at: scheduledAt });
    } else {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const resident = residents.find(r => r.id === form.resident_id);
    if (!resident) return;

    let uploadedUrls = [];
    if (photos.length > 0) {
      toast.info('Enviando fotos...');
      const results = await Promise.allSettled(photos.map(uploadPhoto));
      uploadedUrls = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
      if (uploadedUrls.length < photos.length) {
        toast.error('Algumas fotos não puderam ser enviadas.');
      }
    }

    const data = {
      tracking_code: form.tracking_code,
      resident_id: resident.id,
      resident_name: resident.name,
      apartment_number: resident.apartment_number,
      block_name: resident.block_name,
      carrier: form.carrier,
      reason: form.reason,
      description: form.description,
      status: 'notified',
      notified_at: new Date().toISOString(),
      photo_urls: uploadedUrls,
      ...(uploadedUrls[0] && { photo_url: uploadedUrls[0] }),
    };

    try {
      await createMutation.mutateAsync(data);
      await sendWhatsApp(resident, uploadedUrls);
      toast.success('Recusa registrada e morador notificado!');
      setStep(3);
    } catch (err) {
      toast.error('Erro ao registrar recusa.');
    }
  }

  function reset() {
    setForm({ tracking_code: '', resident_id: '', carrier: '', reason: '', description: '' });
    setPhotos([]);
    setPhoto(null);
    setStep(1);
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/RefusedDeliveries">
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Registrar Recusa</h1>
          <p className="text-muted-foreground text-sm">Fotografe a avaria e notifique o morador</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${step >= s ? 'bg-rose-500' : 'bg-muted'}`} />
        ))}
      </div>

      {step === 1 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="h-16 w-16 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto mb-3">
                <PackageX className="h-8 w-8 text-rose-600" />
              </div>
              <h2 className="text-lg font-semibold">Escanear / Fotografar</h2>
              <p className="text-sm text-muted-foreground">Escaneie o código e registre a foto da avaria</p>
            </div>
            <BarcodeScanner
              onScan={handleScan}
              onPhotoCapture={setPhoto}
              capturedPhoto={photo}
            />
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label>Código de Rastreamento</Label>
                <Input value={form.tracking_code} onChange={(e) => setForm({ ...form, tracking_code: e.target.value })} className="font-mono" />
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
                <Label>Motivo da Recusa</Label>
                <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Ex: Caixa avariada, endereço errado..." />
              </div>
              <div>
                <Label>Descrição / Observações</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva a condição do pacote..." />
              </div>
              <MultiPhotoCapture photos={photos} onPhotosChange={setPhotos} />
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">Voltar</Button>
                <Button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-700" disabled={!form.resident_id || createMutation.isPending}>
                  <Send className="h-4 w-4 mr-2" /> Registrar e Notificar
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
            <h2 className="text-xl font-bold text-foreground mb-2">Recusa Registrada!</h2>
            <p className="text-muted-foreground mb-6">O morador foi notificado via WhatsApp com a foto da avaria.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={reset} className="flex-1">Nova Recusa</Button>
              <Button onClick={() => navigate('/RefusedDeliveries')} className="flex-1">Ver Registros</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
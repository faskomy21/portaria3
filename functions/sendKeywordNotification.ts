import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    // Suportar tanto automação (event/data) quanto chamada direta (payload simples)
    const data = payload.data || payload;

    // Buscar settings
    const settings = await base44.asServiceRole.entities.CondoSettings.list();
    const condoSettings = settings[0];

    if (!condoSettings) {
      return Response.json({ error: 'CondoSettings not found' }, { status: 400 });
    }

    // Verificar se WhatsApp está habilitado
    if (!condoSettings.whatsapp_instance_url || !condoSettings.whatsapp_api_key || !condoSettings.whatsapp_instance_name) {
      console.log('WhatsApp not configured - skipping notification');
      return Response.json({ success: true, message: 'WhatsApp not configured - notification skipped' }, { status: 200 });
    }

    if (condoSettings.notify_keyword_enabled === false) {
      return Response.json({ success: true, message: 'Keyword notification disabled - skipped' });
    }

    // Dados da palavra-chave
    const keyword = data.keyword || '';
    const residentName = data.resident_name || '';

    let phone = data.resident_phone || '';
    
    if (!phone && data.resident_id && data.resident_id !== 'manual') {
      try {
        const residents = await base44.asServiceRole.entities.Resident.list();
        const foundResident = residents.find(r => r.id === data.resident_id);
        if (foundResident) {
          phone = foundResident.phone;
        }
      } catch (e) {
        console.log('Could not fetch resident phone');
      }
    }

    if (!phone) {
      console.log('No phone available for keyword notification');
      return Response.json({ success: true, message: 'No phone available - notification skipped' }, { status: 200 });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    let message = condoSettings.keyword_message || 
      'Olá {resident_name}! 👋\n\nRecebemos sua palavra-chave de encomenda: *{keyword}*\n\nAguardamos suas encomendas na portaria!';
    
    message = message
       .replace('{resident_name}', residentName)
       .replace('{keyword}', keyword);

    // Usar delay configurado
    const delayMinutes = condoSettings.keyword_delay_minutes ?? 0;
    const priority = condoSettings.keyword_priority ?? 'normal';

    const scheduled_at = delayMinutes > 0 
      ? new Date(Date.now() + delayMinutes * 60 * 1000).toISOString() 
      : undefined;

    await base44.asServiceRole.entities.NotificationQueue.create({
      phone: cleanPhone,
      message,
      priority,
      scheduled_at,
    });

    return Response.json({ success: true, message: `Notification queued${delayMinutes > 0 ? ` for ${delayMinutes} minutes` : ''}` });
  } catch (error) {
    console.error('Error in sendKeywordNotification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
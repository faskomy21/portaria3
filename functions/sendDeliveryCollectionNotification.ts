import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    const { resident_phone, resident_name, resident_id, collected_by_name, collected_at } = payload;

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

    // Se não veio phone no payload, tentar buscar pelo resident_id
    let finalPhone = resident_phone;
    if (!finalPhone && resident_id) {
      try {
        const resident = await base44.asServiceRole.entities.Resident.get(resident_id);
        if (resident) finalPhone = resident.phone;
      } catch (_) {
        console.log('Could not fetch resident phone');
      }
    }

    if (!finalPhone) {
      console.log('No phone available for delivery collection notification');
      return Response.json({ success: true, message: 'No phone available - notification skipped' }, { status: 200 });
    }

    const cleanPhone = finalPhone.replace(/\D/g, '');

    // Formatar data e hora
    const date = new Date(collected_at);
    const TZ = 'America/Sao_Paulo';
    const formattedDate = date.toLocaleDateString('pt-BR', { timeZone: TZ });
    const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });

    // Montar mensagem a partir do template
    let message = condoSettings.collection_message || 
      'Olá {resident_name}! 📦\n\nSua encomenda foi retirada na portaria!\n\n📋 Dados da retirada:\nRetirado por: {collected_by_name}\nData: {collected_date}\nHora: {collected_time}';
    
    message = message
      .replace('{resident_name}', resident_name)
      .replace('{collected_by_name}', collected_by_name)
      .replace('{collected_date}', formattedDate)
      .replace('{collected_time}', formattedTime);

    // Enfileirar na fila de notificações com delay e prioridade configurados
    const delayMinutes = condoSettings.collection_delay_minutes ?? 0;
    const priority = condoSettings.collection_priority ?? 'normal';
    
    const scheduled_at = delayMinutes > 0 
      ? new Date(Date.now() + delayMinutes * 60 * 1000).toISOString() 
      : undefined;

    await base44.asServiceRole.entities.NotificationQueue.create({
      phone: cleanPhone,
      message: message,
      priority,
      scheduled_at,
    });
    
    return Response.json({ success: true, message: 'Notification queued' });


  } catch (error) {
    console.error('Error in sendDeliveryCollectionNotification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
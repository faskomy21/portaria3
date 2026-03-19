import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { resident_phone, resident_name, resident_id, collected_by_name, collected_at } = payload;

    const settings = await base44.asServiceRole.entities.CondoSettings.list();
    const condoSettings = settings[0];

    if (!condoSettings?.whatsapp_instance_url || !condoSettings?.whatsapp_api_key) {
      return Response.json({ success: true, message: 'WhatsApp not configured - skipped' });
    }

    if (condoSettings.notify_collection_enabled === false) {
      return Response.json({ success: true, message: 'Collection notification disabled - skipped' });
    }

    // Buscar telefone se não veio no payload
    let finalPhone = resident_phone;
    if (!finalPhone && resident_id) {
      try {
        const resident = await base44.asServiceRole.entities.Resident.get(resident_id);
        if (resident) finalPhone = resident.phone;
      } catch (_) {}
    }

    if (!finalPhone) {
      return Response.json({ success: true, message: 'No phone available - skipped' });
    }

    const cleanPhone = finalPhone.replace(/\D/g, '');

    const date = new Date(collected_at);
    const TZ = 'America/Sao_Paulo';
    const formattedDate = date.toLocaleDateString('pt-BR', { timeZone: TZ });
    const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });

    let message = condoSettings.collection_message ||
      'Olá {resident_name}! 📦\n\nSua encomenda foi retirada na portaria!\n\n📋 Dados da retirada:\nRetirado por: {collected_by_name}\nData: {collected_date}\nHora: {collected_time}';

    message = message
      .replace('{resident_name}', resident_name)
      .replace('{collected_by_name}', collected_by_name)
      .replace('{collected_date}', formattedDate)
      .replace('{collected_time}', formattedTime);

    // Salvar na fila com delay e prioridade configurados
    const delayMinutes = condoSettings.collection_delay_minutes ?? 0;
    const priority = condoSettings.collection_priority ?? 'normal';
    
    const scheduled_at = delayMinutes > 0 
      ? new Date(Date.now() + delayMinutes * 60 * 1000).toISOString() 
      : undefined;

    await base44.asServiceRole.entities.NotificationQueue.create({
      phone: cleanPhone,
      message,
      status: 'pending',
      attempts: 0,
      priority,
      scheduled_at,
    });

    return Response.json({ success: true, message: 'Queued successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
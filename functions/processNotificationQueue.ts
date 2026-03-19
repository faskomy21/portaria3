import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1. HORÁRIO DE SILÊNCIO - Busca configuração do usuário
    const now = new Date();
    const brasiliaTime = new Date(now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
    const hour = brasiliaTime.getHours();
    
    // Busca configurações de silêncio e fila
    const settingsList = await base44.asServiceRole.entities.CondoSettings.list();
    const settings = settingsList[0];
    
    // Verifica se fila está ativada
    if (settings?.queue_enabled === false) {
      return Response.json({ 
        success: true, 
        message: 'Processamento da fila está desativado' 
      });
    }
    
    const silenceStartHour = settings?.silence_start_hour ?? 23;
    const silenceEndHour = settings?.silence_end_hour ?? 8;
    const queueIntervalMinutes = settings?.queue_interval_minutes ?? 1;
    const queueIntervalSeconds = queueIntervalMinutes * 60;
    
    // Verifica se está no horário de silêncio
    const inSilence = silenceStartHour < silenceEndHour 
      ? (hour >= silenceStartHour && hour < silenceEndHour)
      : (hour >= silenceStartHour || hour < silenceEndHour);
    
    if (inSilence) {
      // Agenda para próxima janela de envio
      const nextWindow = new Date(brasiliaTime);
      nextWindow.setDate(nextWindow.getDate() + (hour >= silenceStartHour ? 1 : 0));
      nextWindow.setHours(silenceEndHour, 0, 0, 0);
      
      return Response.json({ 
        success: true, 
        message: `Fora do horário de silêncio. Próximo envio: ${nextWindow.toISOString()}` 
      });
    }

    // 2. LIMITE DIÁRIO - Max 10k mensagens/dia
    const todayStart = new Date(brasiliaTime);
    todayStart.setHours(0, 0, 0, 0);
    
    const sentToday = await base44.asServiceRole.entities.NotificationQueue.filter(
      { status: 'sent' }
    );
    
    const sentTodayCount = sentToday.filter(n => new Date(n.sent_at) >= todayStart).length;
    if (sentTodayCount >= 10000) {
      return Response.json({ 
        success: true, 
        message: 'Limite diário atingido (10k mensagens)' 
      });
    }

    // 3. Busca notificações pendentes
    const allPending = await base44.asServiceRole.entities.NotificationQueue.filter(
      { status: 'pending' },
      'created_date',
      20
    );

    // 4. Filtra as que já podem ser enviadas (sem scheduled_at ou scheduled_at no passado)
    const eligiblePending = allPending.filter(n => !n.scheduled_at || new Date(n.scheduled_at) <= now);
    
    // 5. RATE LIMIT - Intervalo configurado entre mensagens
    const filteredByRateLimit = eligiblePending.filter(notification => {
      if (!notification.last_phone_attempt) return true;

      const lastAttempt = new Date(notification.last_phone_attempt);
      const minIntervalMs = queueIntervalSeconds * 1000;
      return now - lastAttempt >= minIntervalMs;
    });

    if (filteredByRateLimit.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'Todas as notificações estão aguardando intervalo de rate limit' 
      });
    }
    
    // 6. Ordena por prioridade (high primeiro) e depois por data de criação
    const sortedPending = filteredByRateLimit.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1 };
      const aPriority = priorityOrder[a.priority] ?? 1;
      const bPriority = priorityOrder[b.priority] ?? 1;
      
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(a.created_date) - new Date(b.created_date);
    });
    
    // 7. PROCESSA 1 por vez + COOLDOWN entre requisições (500ms)
    const pending = sortedPending.slice(0, 1);

    if (!pending || pending.length === 0) {
      return Response.json({ success: true, message: 'No pending notifications' });
    }

    if (!settings?.whatsapp_instance_url || !settings?.whatsapp_api_key || !settings?.whatsapp_instance_name) {
      return Response.json({ success: false, error: 'WhatsApp not configured' }, { status: 400 });
    }

    const results = { sent: 0, failed: 0 };

    for (const notification of pending) {
      try {
        // Verificar se o número tem WhatsApp antes de enviar
        const checkUrl = `${settings.whatsapp_instance_url}/chat/whatsappNumbers/${settings.whatsapp_instance_name}`;
        const checkResponse = await fetch(checkUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': settings.whatsapp_api_key,
          },
          body: JSON.stringify({ numbers: [notification.phone] }),
        });

        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          const numberInfo = Array.isArray(checkData) ? checkData[0] : null;
          const hasWhatsApp = numberInfo?.exists === true;

          if (!hasWhatsApp) {
            await base44.asServiceRole.entities.NotificationQueue.update(notification.id, {
              status: 'failed',
              sent_at: new Date().toISOString(),
              attempts: (notification.attempts || 0) + 1,
              error: 'Número sem WhatsApp',
              last_phone_attempt: new Date().toISOString(),
            });
            results.failed++;
            continue;
          }
        }

        const apiUrl = `${settings.whatsapp_instance_url}/message/sendText/${settings.whatsapp_instance_name}`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': settings.whatsapp_api_key,
          },
          body: JSON.stringify({
            number: notification.phone,
            text: notification.message,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          await base44.asServiceRole.entities.NotificationQueue.update(notification.id, {
            status: 'sent',
            sent_at: new Date().toISOString(),
            attempts: (notification.attempts || 0) + 1,
            last_phone_attempt: new Date().toISOString(),
          });
          results.sent++;
        } else {
          // 8. BACKOFF EXPONENCIAL - Aguarda progressivamente em falhas
          const nextAttemptDelay = Math.min(Math.pow(2, notification.attempts || 0) * 60000, 3600000); // Max 1h
          const nextScheduledAt = new Date(now.getTime() + nextAttemptDelay).toISOString();
          
          await base44.asServiceRole.entities.NotificationQueue.update(notification.id, {
            status: 'pending',
            attempts: (notification.attempts || 0) + 1,
            error: JSON.stringify(data),
            scheduled_at: nextScheduledAt,
            last_phone_attempt: new Date().toISOString(),
          });
          results.failed++;
        }
      } catch (err) {
        const nextAttemptDelay = Math.min(Math.pow(2, notification.attempts || 0) * 60000, 3600000);
        const nextScheduledAt = new Date(now.getTime() + nextAttemptDelay).toISOString();
        
        await base44.asServiceRole.entities.NotificationQueue.update(notification.id, {
          attempts: (notification.attempts || 0) + 1,
          error: err.message,
          scheduled_at: nextScheduledAt,
          last_phone_attempt: new Date().toISOString(),
        });
        results.failed++;
      }
    }

    // COOLDOWN de 500ms antes de próximo ciclo
    await new Promise(resolve => setTimeout(resolve, 500));

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
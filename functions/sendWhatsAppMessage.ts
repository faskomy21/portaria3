import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { phone, message } = await req.json();

    if (!phone || !message) {
      return Response.json({ error: 'phone e message são obrigatórios' }, { status: 400 });
    }

    // Buscar configurações do condomínio
    const settings = await base44.asServiceRole.entities.CondoSettings.list();
    if (!settings || settings.length === 0) {
      return Response.json({ error: 'Configurações não encontradas' }, { status: 404 });
    }

    const s = settings[0];

    if (!s.whatsapp_instance_url || !s.whatsapp_api_key || !s.whatsapp_instance_name) {
      return Response.json({ error: 'Evolution API não configurada' }, { status: 400 });
    }

    const baseUrl = s.whatsapp_instance_url.replace(/\/$/, '');
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      return Response.json({ error: 'URL inválida da Evolution API' }, { status: 400 });
    }
    const instance = s.whatsapp_instance_name;
    const apiKey = s.whatsapp_api_key;

    const response = await fetch(`${baseUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify({
        number: phone,
        text: message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ error: data?.message || 'Erro ao enviar mensagem', details: data }, { status: response.status });
    }

    return Response.json({ success: true, data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
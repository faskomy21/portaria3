import { customBackendClient } from '@/api/customBackendClient';
import { IS_SELF_HOSTED } from '@/lib/runtime-config';

let resolvedClient = customBackendClient;

if (!IS_SELF_HOSTED) {
  const [{ createClient }, { appParams }] = await Promise.all([
    import('@base44/sdk'),
    import('@/lib/app-params'),
  ]);
  const { appId, token, functionsVersion, appBaseUrl } = appParams;

  resolvedClient = createClient({
    appId,
    token,
    functionsVersion,
    serverUrl: '',
    requiresAuth: false,
    appBaseUrl,
  });
}

export const base44 = resolvedClient;

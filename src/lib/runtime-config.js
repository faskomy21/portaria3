const rawApiUrl = import.meta.env.VITE_SELF_HOSTED_API_URL || '';
const selfHostedFlag = String(import.meta.env.VITE_SELF_HOSTED || '').toLowerCase();

export const SELF_HOSTED_API_URL = rawApiUrl.replace(/\/$/, '');
export const IS_SELF_HOSTED =
  selfHostedFlag === 'true' ||
  selfHostedFlag === '1' ||
  Boolean(SELF_HOSTED_API_URL);

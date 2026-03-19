import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

const selfHostedFlag = String(process.env.VITE_SELF_HOSTED || '').toLowerCase();
const isSelfHosted = selfHostedFlag === 'true' || selfHostedFlag === '1' || Boolean(process.env.VITE_SELF_HOSTED_API_URL);

export default defineConfig({
  logLevel: 'error',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    !isSelfHosted && base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ].filter(Boolean)
});

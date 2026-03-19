import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const selfHostedFlag = String(process.env.VITE_SELF_HOSTED || '').toLowerCase();
const isSelfHosted = selfHostedFlag === 'true' || selfHostedFlag === '1' || Boolean(process.env.VITE_SELF_HOSTED_API_URL);

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    !isSelfHosted && base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react(),
  ].filter(Boolean)
});

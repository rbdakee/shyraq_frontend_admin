import { z } from 'zod';

const schema = z.object({
  VITE_API_BASE_URL: z.string().min(1),
  // Falls back to the Vite-injected __APP_VERSION__ define (vite.config.ts) when the env var is absent.
  VITE_APP_VERSION: z.string().optional(),
  // WebSocket URL for socket.io. Falls back to same-origin `/ws` which works
  // with the Vite dev proxy (ws: true) and in production behind a reverse proxy.
  VITE_WS_URL: z.string().optional(),
});

const result = schema.safeParse(import.meta.env);

if (!result.success) {
  const flat = result.error.flatten();
  const fields = Object.entries(flat.fieldErrors)
    .map(([k, v]) => `  ${k}: ${(v as string[]).join(', ')}`)
    .join('\n');
  throw new Error(`[env] Missing or invalid environment variables:\n${fields}`);
}

// typeof guard is required: __APP_VERSION__ is only defined by the Vite `define`
// plugin and is absent under Vitest (no matching define in vitest.config.ts).
const appVersionFallback = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev';

export const env = {
  VITE_API_BASE_URL: result.data.VITE_API_BASE_URL,
  VITE_APP_VERSION: result.data.VITE_APP_VERSION ?? appVersionFallback,
  VITE_WS_URL: result.data.VITE_WS_URL,
};

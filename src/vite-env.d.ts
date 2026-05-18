/// <reference types="vite/client" />

declare global {
  const __APP_VERSION__: string;

  interface Window {
    __SHYRAQ_LAST_ERROR_ID__?: string;
  }
}

export {};

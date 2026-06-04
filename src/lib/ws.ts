import { io, type Socket } from 'socket.io-client';
import { env } from '@/env';

export interface WsOptions {
  token: string;
  onAuthError?: (reason: string) => void;
  onEvent?: (eventKey: string, payload: unknown) => void;
  onConnect?: (data: { user_id: string; rooms: string[] }) => void;
  onDisconnect?: (reason: string) => void;
}

export function buildWsUrl(): string {
  if (env.VITE_WS_URL) return env.VITE_WS_URL;
  // Same-origin: in dev Vite proxies /ws → backend; in prod reverse-proxy handles it.
  if (typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws`;
  }
  return '/ws';
}

export function createWsSocket(opts: WsOptions): Socket {
  const url = buildWsUrl();

  const socket = io(url, {
    auth: { token: opts.token },
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('auth_error', (data: unknown) => {
    const reason =
      typeof data === 'object' && data !== null && 'reason' in data
        ? String((data as Record<string, unknown>).reason)
        : 'unknown';
    opts.onAuthError?.(reason);
  });

  // WHY: backend emits `connected` with user_id + rooms on successful auth
  socket.on('connected', (data: unknown) => {
    if (typeof data === 'object' && data !== null) {
      const d = data as Record<string, unknown>;
      opts.onConnect?.({
        user_id: String(d.user_id ?? ''),
        rooms: Array.isArray(d.rooms) ? (d.rooms as string[]) : [],
      });
    }
  });

  socket.on('disconnect', (reason: string) => {
    opts.onDisconnect?.(reason);
  });

  // WHY: server emits events keyed by event_key (e.g. "attendance.checkin")
  // We use onAny to capture all events and forward to the handler.
  socket.onAny((eventName: string, payload: unknown) => {
    if (eventName === 'connected' || eventName === 'auth_error' || eventName === 'disconnect') {
      return;
    }
    opts.onEvent?.(eventName, payload);
  });

  return socket;
}

export function updateWsAuth(socket: Socket, token: string): void {
  (socket.auth as Record<string, unknown>).token = token;
  if (socket.connected) {
    socket.disconnect().connect();
  }
}

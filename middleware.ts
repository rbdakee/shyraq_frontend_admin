import { rewrite } from '@vercel/functions';

// Reverse-proxy /api/* to the backend. The host lives ONLY in the
// BACKEND_ORIGIN env var (Vercel dashboard + local .env, both git-ignored) —
// never in a committed file. `rewrite` proxies server-side (unlike redirect),
// so the backend host is never exposed to the browser either. Non-VITE_ prefix
// keeps it off the client bundle. Runs only on Vercel; local `pnpm dev` uses
// the Vite proxy (VITE_BACKEND_URL) instead.
export const config = {
  matcher: '/api/:path*',
};

export default function middleware(request: Request) {
  const origin = process.env.BACKEND_ORIGIN;
  if (!origin) {
    return new Response('BACKEND_ORIGIN is not configured', { status: 500 });
  }
  const { pathname, search } = new URL(request.url);
  return rewrite(new URL(pathname + search, origin));
}

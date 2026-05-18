import { Navigate, Outlet } from 'react-router-dom';
import { tokenStorage } from '@/lib/token-storage';

// WHY we check both access AND refresh: access token is in-memory (lost on
// page reload), but refresh persists in localStorage. On reload the guard
// sees refresh is present and renders the shell; the first protected API call
// triggers silent refresh in api/client.ts, which either succeeds (restoring
// the access token) or fails (client.ts itself redirects to /login).
// This avoids a flash of /login on every hard refresh.
export default function AuthGuard() {
  const hasToken = tokenStorage.getAccess() ?? tokenStorage.getRefresh();

  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

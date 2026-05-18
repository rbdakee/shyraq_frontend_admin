import { createBrowserRouter } from 'react-router-dom';
import AuthGuard from '@/components/layout/auth-guard';
import App from '@/App';

const lazyStub = async () => {
  const { default: Component } = await import('@/routes/_stub');
  return { Component };
};
const lazy403 = async () => {
  const { default: Component } = await import('@/routes/_403');
  return { Component };
};
const lazy404 = async () => {
  const { default: Component } = await import('@/routes/_404');
  return { Component };
};
const lazy500 = async () => {
  const { default: Component } = await import('@/routes/_500');
  return { Component };
};
const lazyLogin = async () => {
  const { default: Component } = await import('@/routes/login');
  return { Component };
};
const lazySessionExpired = async () => {
  const { default: Component } = await import('@/routes/_session-expired');
  return { Component };
};

export const router = createBrowserRouter([
  {
    path: '/login',
    lazy: lazyLogin,
  },
  {
    path: '/_session-expired',
    lazy: lazySessionExpired,
  },
  {
    Component: AuthGuard,
    children: [
      {
        Component: App,
        children: [
          {
            index: true,
            lazy: async () => {
              const { default: Component } = await import('@/routes/dashboard');
              return { Component };
            },
          },
          { path: 'enrollments', lazy: lazyStub },
          { path: 'enrollments/:id', lazy: lazyStub },
          { path: 'children', lazy: lazyStub },
          { path: 'children/new', lazy: lazyStub },
          { path: 'children/:id', lazy: lazyStub },
          { path: 'groups', lazy: lazyStub },
          { path: 'groups/:id', lazy: lazyStub },
          { path: 'staff', lazy: lazyStub },
          { path: 'staff/:id', lazy: lazyStub },
          { path: 'structure/locations', lazy: lazyStub },
          { path: 'structure/cameras', lazy: lazyStub },
          { path: 'schedule/templates', lazy: lazyStub },
          { path: 'schedule/templates/:id', lazy: lazyStub },
          { path: 'schedule/weeks', lazy: lazyStub },
          { path: 'meal-plans', lazy: lazyStub },
          { path: 'content', lazy: lazyStub },
          { path: 'content/qundylyq', lazy: lazyStub },
          { path: 'billing/invoices', lazy: lazyStub },
          { path: 'billing/invoices/:id', lazy: lazyStub },
          { path: 'billing/payments', lazy: lazyStub },
          { path: 'billing/payments/:id', lazy: lazyStub },
          { path: 'billing/tariff-plans', lazy: lazyStub },
          { path: 'billing/tariff-assignments', lazy: lazyStub },
          { path: 'billing/holidays', lazy: lazyStub },
          { path: 'billing/refunds', lazy: lazyStub },
          { path: 'billing/discounts', lazy: lazyStub },
          { path: 'billing/discounts/new', lazy: lazyStub },
          { path: 'billing/discounts/:id', lazy: lazyStub },
          { path: 'billing/fiscal-receipts', lazy: lazyStub },
          { path: 'parent-requests', lazy: lazyStub },
          { path: 'parent-requests/:id', lazy: lazyStub },
          { path: 'attendance', lazy: lazyStub },
          { path: 'attendance/daily-status', lazy: lazyStub },
          { path: 'diagnostics/templates', lazy: lazyStub },
          { path: 'face', lazy: lazyStub },
          { path: 'operations/lifecycle-dlq', lazy: lazyStub },
          { path: 'settings', lazy: lazyStub },
          { path: 'profile', lazy: lazyStub },
          { path: '_403', lazy: lazy403 },
          { path: '_500', lazy: lazy500 },
          { path: '*', lazy: lazy404 },
        ],
      },
    ],
  },
]);

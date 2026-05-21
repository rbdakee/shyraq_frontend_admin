import { createBrowserRouter } from 'react-router-dom';
import AuthGuard from '@/components/layout/auth-guard';
import App from '@/App';
import ServerError from '@/routes/_500';

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
        errorElement: <ServerError />,
        children: [
          {
            index: true,
            lazy: async () => {
              const { default: Component } = await import('@/routes/dashboard');
              return { Component };
            },
          },
          {
            path: 'enrollments',
            lazy: async () => {
              const { default: Component } = await import('@/routes/enrollments/index');
              return { Component };
            },
          },
          {
            path: 'enrollments/:id',
            lazy: async () => {
              const { default: Component } = await import('@/routes/enrollments/$id');
              return { Component };
            },
          },
          {
            path: 'children',
            lazy: async () => {
              const { default: Component } = await import('@/routes/children/index');
              return { Component };
            },
          },
          {
            path: 'children/new',
            lazy: async () => {
              const { default: Component } = await import('@/routes/children/new');
              return { Component };
            },
          },
          {
            path: 'children/:id',
            lazy: async () => {
              const { default: Component } = await import('@/routes/children/$id');
              return { Component };
            },
          },
          {
            path: 'groups',
            lazy: async () => {
              const { default: Component } = await import('@/routes/groups/index');
              return { Component };
            },
          },
          {
            path: 'groups/:id',
            lazy: async () => {
              const { default: Component } = await import('@/routes/groups/$id');
              return { Component };
            },
          },
          {
            path: 'staff',
            lazy: async () => {
              const { default: Component } = await import('@/routes/staff/index');
              return { Component };
            },
          },
          {
            path: 'staff/:id',
            lazy: async () => {
              const { default: Component } = await import('@/routes/staff/$id');
              return { Component };
            },
          },
          { path: 'structure/locations', lazy: lazyStub },
          { path: 'structure/cameras', lazy: lazyStub },
          { path: 'schedule/templates', lazy: lazyStub },
          { path: 'schedule/templates/:id', lazy: lazyStub },
          { path: 'schedule/weeks', lazy: lazyStub },
          { path: 'meal-plans', lazy: lazyStub },
          { path: 'content', lazy: lazyStub },
          { path: 'content/qundylyq', lazy: lazyStub },
          {
            path: 'billing/invoices',
            lazy: async () => {
              const { default: Component } = await import('@/routes/billing/invoices/index');
              return { Component };
            },
          },
          {
            path: 'billing/invoices/:id',
            lazy: async () => {
              const { default: Component } = await import('@/routes/billing/invoices/$id');
              return { Component };
            },
          },
          {
            path: 'billing/payments',
            lazy: async () => {
              const { default: Component } = await import('@/routes/billing/payments/index');
              return { Component };
            },
          },
          {
            path: 'billing/payments/:id',
            lazy: async () => {
              const { default: Component } = await import('@/routes/billing/payments/$id');
              return { Component };
            },
          },
          {
            path: 'billing/tariff-plans',
            lazy: async () => {
              const { default: Component } = await import('@/routes/billing/tariff-plans/index');
              return { Component };
            },
          },
          {
            path: 'billing/tariff-plans/:id',
            lazy: async () => {
              const { default: Component } = await import('@/routes/billing/tariff-plans/$id');
              return { Component };
            },
          },
          {
            path: 'billing/tariff-assignments',
            lazy: async () => {
              const { default: Component } =
                await import('@/routes/billing/tariff-assignments/index');
              return { Component };
            },
          },
          { path: 'billing/holidays', lazy: lazyStub },
          {
            path: 'billing/refunds',
            lazy: async () => {
              const { default: Component } = await import('@/routes/billing/refunds/index');
              return { Component };
            },
          },
          {
            path: 'billing/discounts',
            lazy: async () => {
              const { default: Component } = await import('@/routes/billing/discounts/index');
              return { Component };
            },
          },
          {
            path: 'billing/discounts/new',
            lazy: async () => {
              const { default: Component } = await import('@/routes/billing/discounts/new');
              return { Component };
            },
          },
          {
            path: 'billing/discounts/:id',
            lazy: async () => {
              const { default: Component } = await import('@/routes/billing/discounts/$id');
              return { Component };
            },
          },
          { path: 'billing/fiscal-receipts', lazy: lazyStub },
          {
            path: 'parent-requests',
            lazy: async () => {
              const { default: Component } = await import('@/routes/parent-requests/index');
              return { Component };
            },
          },
          {
            path: 'parent-requests/:id',
            lazy: async () => {
              const { default: Component } = await import('@/routes/parent-requests/$id');
              return { Component };
            },
          },
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

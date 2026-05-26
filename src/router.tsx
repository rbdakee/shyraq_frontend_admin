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
            path: 'more',
            lazy: async () => {
              const { default: Component } = await import('@/routes/more');
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
          {
            path: 'structure/locations',
            lazy: async () => {
              const { default: Component } = await import('@/routes/structure/locations/index');
              return { Component };
            },
          },
          {
            path: 'structure/cameras',
            lazy: async () => {
              const { default: Component } = await import('@/routes/structure/cameras/index');
              return { Component };
            },
          },
          {
            path: 'schedule/templates',
            lazy: async () => {
              const { default: Component } = await import('@/routes/schedule/templates/index');
              return { Component };
            },
          },
          {
            path: 'schedule/templates/:id',
            lazy: async () => {
              const { default: Component } = await import('@/routes/schedule/templates/$id');
              return { Component };
            },
          },
          {
            path: 'schedule/weeks',
            lazy: async () => {
              const { default: Component } = await import('@/routes/schedule/weeks');
              return { Component };
            },
          },
          {
            path: 'meal-plans',
            lazy: async () => {
              const { default: Component } = await import('@/routes/meal-plans/index');
              return { Component };
            },
          },
          {
            path: 'content',
            lazy: async () => {
              const { default: Component } = await import('@/routes/content/index');
              return { Component };
            },
          },
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
          {
            path: 'billing/holidays',
            lazy: async () => {
              const { default: Component } = await import('@/routes/billing/holidays/index');
              return { Component };
            },
          },
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
          {
            path: 'billing/fiscal-receipts',
            lazy: async () => {
              const { default: Component } = await import('@/routes/billing/fiscal-receipts/index');
              return { Component };
            },
          },
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
          {
            path: 'notifications',
            lazy: async () => {
              const { default: Component } = await import('@/routes/notifications');
              return { Component };
            },
          },
          {
            path: 'attendance',
            lazy: async () => {
              const { default: Component } = await import('@/routes/attendance/index');
              return { Component };
            },
          },
          {
            path: 'attendance/daily-status',
            lazy: async () => {
              const { default: Component } = await import('@/routes/attendance/daily-status');
              return { Component };
            },
          },
          {
            path: 'diagnostics/templates',
            lazy: async () => {
              const { default: Component } = await import('@/routes/diagnostics/templates/index');
              return { Component };
            },
          },
          {
            path: 'face',
            lazy: async () => {
              const { default: Component } = await import('@/routes/face/index');
              return { Component };
            },
          },
          {
            path: 'operations/lifecycle-dlq',
            lazy: async () => {
              const { default: Component } =
                await import('@/routes/operations/lifecycle-dlq/index');
              return { Component };
            },
          },
          {
            path: 'settings',
            lazy: async () => {
              const { default: Component } = await import('@/routes/settings/index');
              return { Component };
            },
          },
          { path: 'profile', lazy: lazyStub },
          { path: '_403', lazy: lazy403 },
          { path: '_500', lazy: lazy500 },
          { path: '*', lazy: lazy404 },
        ],
      },
    ],
  },
]);

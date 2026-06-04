import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import {
  UploadIcon,
  PhoneIcon,
  RefreshCwIcon,
  DownloadIcon,
  ShieldAlertIcon,
  Loader2Icon,
} from 'lucide-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useSessionStore } from '@/stores/session-store';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useUpdateMe, useMyQr } from '@/hooks/use-auth';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/use-notifications';
import { getInitials } from '@/lib/format';
import { getEventCategory } from '@/lib/notification-helpers';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import type { NotificationPreference } from '@/hooks/use-notifications';

const ProfileFormSchema = z.object({
  fullName: z.string().min(1),
  iin: z.string().max(12).optional(),
  dateOfBirth: z.string().optional(),
  locale: z.enum(['ru', 'kk']),
});

type ProfileFormValues = z.infer<typeof ProfileFormSchema>;

export default function ProfileRoute() {
  const { t } = useTranslation('profile');
  const { isMobile } = useBreakpoint();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') ?? 'profile';
  const user = useSessionStore((s) => s.user);
  const kg = useSessionStore((s) => s.currentKindergarten);

  if (isMobile) {
    return (
      <>
        <MobileTopBar title={t('title')} back />
        <div className="px-4 pb-6">
          <ProfileContent initialTab={initialTab} user={user} kgName={kg?.name} />
        </div>
      </>
    );
  }

  return (
    <div className="page">
      <div className="mb-1">
        <h1 className="text-[22px] font-bold leading-tight text-text-1">{t('title')}</h1>
        <div className="mt-1 text-[13px] text-text-3">
          {user?.full_name} · {t('subtitle')}
        </div>
      </div>
      <ProfileContent initialTab={initialTab} user={user} kgName={kg?.name} />
    </div>
  );
}

interface ProfileContentProps {
  initialTab: string;
  user: ReturnType<typeof useSessionStore.getState>['user'];
  kgName: string | undefined;
}

function ProfileContent({ initialTab, user, kgName }: ProfileContentProps) {
  const { t } = useTranslation('profile');

  return (
    <Tabs defaultValue={initialTab}>
      <TabsList variant="line" className="mb-4">
        <TabsTrigger value="profile">{t('tab_profile')}</TabsTrigger>
        <TabsTrigger value="qr">{t('tab_qr')}</TabsTrigger>
        <TabsTrigger value="notifications">{t('tab_notifications')}</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <ProfileTab user={user} />
      </TabsContent>
      <TabsContent value="qr">
        <QrTab user={user} kgName={kgName} />
      </TabsContent>
      <TabsContent value="notifications">
        <NotificationPreferencesTab />
      </TabsContent>
    </Tabs>
  );
}

function ProfileTab({ user }: { user: ReturnType<typeof useSessionStore.getState>['user'] }) {
  const { t } = useTranslation('profile');
  const updateMe = useUpdateMe();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: {
      fullName: user?.full_name ?? '',
      iin: user?.iin ?? '',
      dateOfBirth: user?.date_of_birth ?? '',
      locale: user?.locale ?? 'ru',
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    updateMe.mutate(
      {
        fullName: values.fullName,
        iin: values.iin || undefined,
        dateOfBirth: values.dateOfBirth || undefined,
        locale: values.locale,
      },
      {
        onSuccess: () => {
          toast.success(t('save_success'));
        },
        onError: (err) => {
          const mapped = mapValidationErrors(err, setError);
          if (!mapped) {
            toast.error(t('errors:unknown_error'));
          }
        },
      },
    );
  };

  const initials = getInitials(user?.full_name);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev p-5">
        <div className="mb-3 text-[15px] font-bold">{t('section_basic')}</div>
        <div className="mb-4 flex items-center gap-4">
          <div
            className="flex size-16 items-center justify-center rounded-full text-[20px] font-bold text-on-primary"
            style={{
              background: 'linear-gradient(135deg, var(--primary-soft), var(--primary))',
            }}
          >
            {initials}
          </div>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-[var(--r-md)] border border-line bg-bg-elev px-3 py-1.5 text-[13px] font-semibold text-text-1 hover:bg-bg-sunken"
            >
              <UploadIcon className="size-3.5" />
              {t('upload_photo')}
            </button>
            <span className="text-[11px] text-text-4">{t('photo_hint')}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-text-2">
              {t('field_full_name')}
            </label>
            <input
              {...register('fullName')}
              className="h-9 w-full rounded-[var(--r-md)] border border-line bg-bg-elev px-3 text-[14px] outline-none focus:border-primary"
            />
            {errors.fullName && (
              <div className="mt-1 text-[12px] text-danger-fg">{errors.fullName.message}</div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-text-2">
                {t('field_phone')}
              </label>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-2.5 size-3.5 text-text-4" />
                <input
                  value={user?.phone ?? ''}
                  disabled
                  className="h-9 w-full rounded-[var(--r-md)] border border-line bg-bg-sunken pl-8 pr-3 text-[14px] text-text-3"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-text-2">
                {t('field_iin')}
              </label>
              <input
                {...register('iin')}
                maxLength={12}
                className="h-9 w-full rounded-[var(--r-md)] border border-line bg-bg-elev px-3 text-[14px] outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-text-2">
                {t('field_dob')}
              </label>
              <input
                {...register('dateOfBirth')}
                type="date"
                className="h-9 w-full rounded-[var(--r-md)] border border-line bg-bg-elev px-3 text-[14px] outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-text-2">
                {t('field_locale')}
              </label>
              <select
                {...register('locale')}
                className="h-9 w-full rounded-[var(--r-md)] border border-line bg-bg-elev px-3 text-[14px] outline-none focus:border-primary"
              >
                <option value="ru">{t('locale_ru')}</option>
                <option value="kk">{t('locale_kk')}</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!isDirty || isSubmitting || updateMe.isPending}
              className="rounded-[var(--r-md)] bg-primary px-5 py-2 text-[13.5px] font-semibold text-on-primary shadow-[var(--shyraq-shadow-1)] hover:bg-primary-hover disabled:opacity-50"
            >
              {t('common:actions.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QrTab({
  user,
  kgName,
}: {
  user: ReturnType<typeof useSessionStore.getState>['user'];
  kgName: string | undefined;
}) {
  const { t } = useTranslation('profile');
  const { data: qrData, isLoading, error, refetch } = useMyQr();

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev p-5">
        <div className="mb-4 text-[15px] font-bold">{t('qr_title')}</div>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="flex size-48 items-center justify-center rounded-[var(--r-lg)] border border-line bg-white p-3">
            {isLoading && <Loader2Icon className="size-8 animate-spin text-text-3" />}
            {error && <div className="text-center text-[12px] text-danger-fg">{t('qr_error')}</div>}
            {qrData && <QRCodeSVG value={qrData.token} size={168} level="M" />}
          </div>
          <div className="flex-1">
            <div className="text-lg font-bold">{user?.full_name}</div>
            <div className="mt-1 text-[13px] text-text-3">
              {t('qr_role_label')} · {kgName}
            </div>
            <div className="my-3 border-t border-line" />
            <div className="text-[13px] text-text-2">{t('qr_description')}</div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-[var(--r-md)] border border-line bg-bg-elev px-3 py-1.5 text-[13px] font-semibold text-text-1 hover:bg-bg-sunken"
                onClick={() => void refetch()}
              >
                <RefreshCwIcon className="size-3.5" />
                {t('qr_refresh')}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-[var(--r-md)] border border-line bg-bg-elev px-3 py-1.5 text-[13px] font-semibold text-text-1 hover:bg-bg-sunken"
              >
                <DownloadIcon className="size-3.5" />
                {t('qr_download')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev p-4">
        <div className="mb-2 text-[15px] font-bold">{t('qr_security_title')}</div>
        <div className="mb-3 text-[12px] text-text-3">{t('qr_security_body')}</div>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--r-md)] border border-danger-fg/20 bg-transparent px-3 py-2 text-[13px] font-semibold text-danger-fg hover:bg-danger-soft"
        >
          <ShieldAlertIcon className="size-3.5" />
          {t('qr_revoke_all')}
        </button>
      </div>
    </div>
  );
}

function NotificationPreferencesTab() {
  const { t } = useTranslation('notifications');
  const { data: prefsData, isLoading } = useNotificationPreferences();
  const updatePrefs = useUpdateNotificationPreferences();

  const preferences = prefsData?.preferences ?? [];

  const grouped = preferences.reduce<Record<string, NotificationPreference[]>>((acc, pref) => {
    const cat = getEventCategory(pref.event_key);
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(pref);
    return acc;
  }, {});

  const [localPrefs, setLocalPrefs] = useState<Record<string, { push: boolean; inApp: boolean }>>(
    {},
  );

  const getToggleState = (pref: NotificationPreference) => {
    const local = localPrefs[pref.event_key];
    return {
      push: local?.push ?? pref.push_enabled,
      inApp: local?.inApp ?? pref.in_app_enabled,
    };
  };

  const handleToggle = (eventKey: string, field: 'push' | 'inApp', value: boolean) => {
    const pref = preferences.find((p) => p.event_key === eventKey);
    if (!pref) return;

    const current = getToggleState(pref);
    const updated = { ...current, [field]: value };
    setLocalPrefs((prev) => ({ ...prev, [eventKey]: updated }));

    updatePrefs.mutate(
      [
        {
          event_key: eventKey,
          push_enabled: field === 'push' ? value : current.push,
          in_app_enabled: field === 'inApp' ? value : current.inApp,
        },
      ],
      {
        onSuccess: () => {
          setLocalPrefs((prev) => {
            const next = { ...prev };
            delete next[eventKey];
            return next;
          });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev p-6 text-center text-[13px] text-text-3">
        {t('common:loading')}
      </div>
    );
  }

  const categoryKeys = Object.keys(grouped);

  return (
    <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev overflow-hidden">
      <div className="border-b border-line px-5 py-3.5">
        <div className="text-[15px] font-bold">{t('preferences.title')}</div>
      </div>
      {categoryKeys.length === 0 && (
        <div className="px-5 py-8 text-center text-[13px] text-text-3">{t('empty')}</div>
      )}
      {categoryKeys.map((cat) => (
        <div key={cat}>
          <div className="border-b border-line bg-bg-sunken px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-text-4">
            {t(`category.${cat}`, { defaultValue: cat })}
          </div>
          {grouped[cat]!.map((pref) => {
            const state = getToggleState(pref);
            const fallback = pref.event_key.replace(/\./g, ' ').replace(/_/g, ' ');
            const displayKey = t(`event_keys.${pref.event_key}`, { defaultValue: fallback });
            return (
              <div
                key={pref.event_key}
                className="flex items-center gap-4 border-b border-line px-5 py-3.5"
              >
                <div className="flex-1">
                  <div className="text-[14px] font-semibold capitalize">{displayKey}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] text-text-3">{t('preferences.push')}</span>
                  <Switch
                    size="sm"
                    checked={state.push}
                    onCheckedChange={(v: boolean) => handleToggle(pref.event_key, 'push', v)}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] text-text-3">{t('preferences.in_app')}</span>
                  <Switch
                    size="sm"
                    checked={state.inApp}
                    onCheckedChange={(v: boolean) => handleToggle(pref.event_key, 'inApp', v)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

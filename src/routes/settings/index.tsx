import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  BuildingIcon,
  GlobeIcon,
  IdCardIcon,
  CreditCardIcon,
  ReceiptIcon,
  BellIcon,
  MailIcon,
  PhoneIcon,
  NewspaperIcon,
  ScanIcon,
  StethoscopeIcon,
  ChevronRightIcon,
  CheckIcon,
  UploadIcon,
  Trash2Icon,
  Loader2Icon,
  AlertTriangleIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { OtpInput } from '@/components/forms/otp-input';
import { PhoneInput } from '@/components/forms/phone-input';
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBox } from '@/components/feedback/skeleton';
import { FullScreenSheet } from '@/components/forms/full-screen-sheet';
import MobileTopBar from '@/components/layout/mobile-top-bar';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useUiStore } from '@/stores/ui-store';
import { THEMES, RADII, type ThemeName, type RadiusName } from '@/lib/themes';
import { useSessionStore } from '@/stores/session-store';
import {
  useKindergartenFull,
  useUpdateKindergartenSettings,
  useUploadKindergartenLogo,
  useDeleteKindergartenLogo,
} from '@/hooks/use-kindergarten';
import {
  useKaspiStatus,
  useInitKaspiConnect,
  useSendKaspiPhone,
  useVerifyKaspiOtp,
  useDisconnectKaspi,
  type KaspiStatus,
} from '@/hooks/use-kaspi';
import { mapValidationErrors } from '@/components/forms/map-validation-errors';
import { SpecialistTypesTab } from './specialist-types-tab';
import { isAppError, getErrorCode, toI18nKey } from '@/lib/error-map';
import { formatDateTime } from '@/lib/format';
import { DEFAULT_TIMEZONE } from '@/lib/constants';

const THEME_NAMES: ThemeName[] = [
  'green',
  'orange',
  'blue',
  'dark',
  'warmCream',
  'forestMint',
  'oceanBlue',
  'mono',
];
const RADIUS_NAMES: RadiusName[] = ['sharp', 'soft', 'round'];

// --- Zod schema for the operations form ---

const OpsFormSchema = z.object({
  timezone: z.string().min(1),
  currency: z.string().min(1),
  late_pickup_fee_amount: z.string(),
  payment_grace_days: z.string(),
  otp_expiry_seconds: z.string(),
  prepay_discount_3m: z.string(),
  prepay_discount_6m: z.string(),
  prepay_discount_12m: z.string(),
  prepay_discount_24m: z.string(),
});
type OpsFormValues = z.infer<typeof OpsFormSchema>;

function parseOptNum(v: string): number | undefined {
  if (v === '') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

// Logo upload constraints (N11): backend enforces ≤5 MB image/* — mirror client-side
// for instant feedback; backend re-validates regardless.
const LOGO_MAX_BYTES = 5 * 1024 * 1024;

export default function SettingsPage() {
  const { t } = useTranslation('common');
  const { isMobile } = useBreakpoint();
  const theme = useUiStore((s) => s.theme);
  const radius = useUiStore((s) => s.radius);
  const setTheme = useUiStore((s) => s.setTheme);
  const setRadius = useUiStore((s) => s.setRadius);
  const kg = useSessionStore((s) => s.currentKindergarten);
  const [sheet, setSheet] = useState<'general' | 'specialties' | null>(null);

  if (!isMobile) {
    return <DesktopSettings />;
  }

  return (
    <>
      <MobileTopBar title={t('mobile_settings_title')} sub={kg?.name ?? ''} />

      <div className="flex flex-col gap-0">
        {/* Kindergarten section */}
        <div className="m-section-h" style={{ marginTop: 0 }}>
          <div className="m-section-title">{t('mobile_settings_section_kg')}</div>
        </div>
        <div className="m-card flush">
          <button
            type="button"
            className="m-drawer-item w-full text-left"
            onClick={() => setSheet('general')}
          >
            <div className="m-drawer-ic">
              <BuildingIcon />
            </div>
            <div className="grow">
              <div>{t('mobile_settings_general')}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                {t('mobile_settings_general_sub')}
              </div>
            </div>
            <ChevronRightIcon style={{ width: 16, height: 16, color: 'var(--text-4)' }} />
          </button>
          <button
            type="button"
            className="m-drawer-item w-full text-left"
            onClick={() => setSheet('specialties')}
          >
            <div className="m-drawer-ic info">
              <StethoscopeIcon />
            </div>
            <div className="grow">
              <div>{t('mobile_settings_specialties')}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                {t('mobile_settings_specialties_sub')}
              </div>
            </div>
            <ChevronRightIcon style={{ width: 16, height: 16, color: 'var(--text-4)' }} />
          </button>
          <div className="m-drawer-item">
            <div className="m-drawer-ic">
              <GlobeIcon />
            </div>
            <div className="grow">
              <div>{t('mobile_settings_languages')}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>RU · KK</div>
            </div>
            <ChevronRightIcon style={{ width: 16, height: 16, color: 'var(--text-4)' }} />
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic info">
              <IdCardIcon />
            </div>
            <div className="grow">
              <div>{t('mobile_settings_requisites')}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                {t('mobile_settings_requisites_sub')}
              </div>
            </div>
            <ChevronRightIcon style={{ width: 16, height: 16, color: 'var(--text-4)' }} />
          </div>
        </div>

        {/* Billing section */}
        <div className="m-section-h">
          <div className="m-section-title">{t('mobile_settings_section_billing')}</div>
        </div>
        <div className="m-card flush">
          <div className="m-drawer-item">
            <div className="m-drawer-ic">
              <CreditCardIcon />
            </div>
            <div className="grow">
              <div>{t('mobile_settings_providers')}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Kaspi, Halyk</div>
            </div>
            <Badge variant="success" dot className="text-[10px]">
              2/2
            </Badge>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic">
              <ReceiptIcon />
            </div>
            <div className="grow">
              <div>{t('mobile_settings_ofd')}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Onlinekassa.kz</div>
            </div>
            <Badge variant="success" dot className="text-[10px]">
              OK
            </Badge>
          </div>
        </div>

        {/* Notifications section */}
        <div className="m-section-h">
          <div className="m-section-title">{t('mobile_settings_section_notifications')}</div>
        </div>
        <div className="m-card flush">
          <div className="m-drawer-item">
            <div className="m-drawer-ic warn">
              <BellIcon />
            </div>
            <div className="grow">{t('mobile_settings_push_failures')}</div>
            <label className="toggle on">
              <span className="track" />
            </label>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic">
              <MailIcon />
            </div>
            <div className="grow">{t('mobile_settings_email_digest')}</div>
            <label className="toggle on">
              <span className="track" />
            </label>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic">
              <PhoneIcon />
            </div>
            <div className="grow">{t('mobile_settings_sms_parents')}</div>
            <label className="toggle">
              <span className="track" />
            </label>
          </div>
        </div>

        {/* Appearance section */}
        <div className="m-section-h">
          <div className="m-section-title">{t('mobile_settings_section_appearance')}</div>
        </div>
        <div className="m-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
            {t('mobile_settings_theme')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {THEME_NAMES.map((tn) => {
              const def = THEMES[tn];
              const isActive = theme === tn;
              return (
                <button
                  key={tn}
                  type="button"
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    border: isActive ? '1.5px solid var(--primary)' : '1px solid var(--line)',
                    background: isActive ? 'var(--primary-soft)' : 'var(--bg-elev)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onClick={() => setTheme(tn)}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 0,
                      borderRadius: 6,
                      overflow: 'hidden',
                      marginBottom: 6,
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.08)',
                    }}
                  >
                    {def.swatches.slice(0, 3).map((c, j) => (
                      <div key={j} style={{ flex: 1, height: 24, background: c }} />
                    ))}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    {t(`mobile_settings_theme_${tn}`)}
                    {isActive && (
                      <CheckIcon style={{ width: 12, height: 12, color: 'var(--primary)' }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 16, marginBottom: 10 }}>
            {t('mobile_settings_radius')}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {RADIUS_NAMES.map((rn) => {
              const isActive = radius === rn;
              return (
                <button
                  key={rn}
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: RADII[rn].tokens['--r-md'],
                    border: isActive ? '1.5px solid var(--primary)' : '1px solid var(--line)',
                    background: isActive ? 'var(--primary-soft)' : 'var(--bg-elev)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onClick={() => setRadius(rn)}
                >
                  {t(`mobile_settings_radius_${rn}`)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Integrations section */}
        <div className="m-section-h">
          <div className="m-section-title">{t('mobile_settings_section_integrations')}</div>
        </div>
        <div className="m-card flush" style={{ marginBottom: 18 }}>
          <div className="m-drawer-item">
            <div className="m-drawer-ic info">
              <NewspaperIcon />
            </div>
            <div className="grow">
              <div>{t('mobile_settings_parent_app')}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>API · 1.4.0</div>
            </div>
            <Badge variant="success" dot className="text-[10px]">
              {t('mobile_settings_integration_active')}
            </Badge>
          </div>
          <div className="m-drawer-item">
            <div className="m-drawer-ic">
              <ScanIcon />
            </div>
            <div className="grow">
              <div>{t('mobile_settings_face_edge')}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>Phase C</div>
            </div>
            <Badge variant="neutral" dot className="text-[10px]">
              Phase C
            </Badge>
          </div>
        </div>
      </div>

      <FullScreenSheet
        open={sheet === 'general'}
        onOpenChange={(v) => {
          if (!v) setSheet(null);
        }}
        title={t('mobile_settings_general')}
        description={t('mobile_settings_general_sub')}
      >
        <MobileGeneralSheet />
      </FullScreenSheet>

      <FullScreenSheet
        open={sheet === 'specialties'}
        onOpenChange={(v) => {
          if (!v) setSheet(null);
        }}
        title={t('mobile_settings_specialties')}
        description={t('mobile_settings_specialties_sub')}
      >
        <SpecialistTypesTab />
      </FullScreenSheet>
    </>
  );
}

// Mobile "General" settings body: read-only contacts + N11 logo card.
function MobileGeneralSheet() {
  const { t } = useTranslation('settings');
  const kgQuery = useKindergartenFull();
  const kg = kgQuery.data;

  if (kgQuery.isPending) {
    return <SkeletonBox height={280} />;
  }
  if (kgQuery.isError || !kg) {
    return <ErrorState onRetry={() => void kgQuery.refetch()} />;
  }

  const readonlyCls =
    'h-9 w-full rounded-[var(--r-md)] border border-line bg-bg-sunken px-3 text-[14px] text-text-3 outline-none';

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev p-4">
        <div className="mb-1 text-[15px] font-bold text-text-1">{t('general_contacts')}</div>
        <div className="mb-3 text-[12.5px] text-text-3">{t('general_readonly_hint')}</div>
        <div className="flex flex-col gap-4">
          <FieldWrapper label={t('field_name')}>
            <input value={kg.name} disabled className={readonlyCls} />
          </FieldWrapper>
          <FieldWrapper label={t('field_address')}>
            <input value={kg.address ?? '—'} disabled className={readonlyCls} />
          </FieldWrapper>
          <FieldWrapper label={t('field_phone')}>
            <div className="relative">
              <PhoneIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-3" />
              <input value={kg.phone ?? '—'} disabled className={`${readonlyCls} pl-8`} />
            </div>
          </FieldWrapper>
          <FieldWrapper label={t('field_slug')} hint={t('field_slug_hint')}>
            <input value={kg.slug} disabled className={readonlyCls} />
          </FieldWrapper>
        </div>
      </div>
      <KindergartenLogoCard kg={kg} />
    </div>
  );
}

// ========== DESKTOP SETTINGS ==========

function DesktopSettings() {
  const { t } = useTranslation('settings');
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') ?? 'general';
  const kgQuery = useKindergartenFull();
  const kg = kgQuery.data;

  const handleTabChange = useCallback(
    (value: string) => {
      setSearchParams({ tab: value }, { replace: true });
    },
    [setSearchParams],
  );

  if (kgQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2Icon className="size-6 animate-spin text-text-3" />
      </div>
    );
  }

  if (kgQuery.isError || !kg) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <h1 className="text-xl font-bold text-text-1">{t('errors:unknown_error')}</h1>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="h1">{t('title')}</h1>
          <div className="page-sub">
            {kg.name} · {t('subtitle')}
          </div>
        </div>
        {tab === 'operations' && (
          <button
            type="submit"
            form="ops-form"
            className="inline-flex h-9 items-center gap-2 rounded-[var(--r-md)] bg-primary px-4 text-[13.5px] font-semibold text-on-primary hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)]"
          >
            {t('save')}
          </button>
        )}
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="general">{t('tab_general')}</TabsTrigger>
          <TabsTrigger value="operations">{t('tab_operations')}</TabsTrigger>
          <TabsTrigger value="design">
            {t('tab_design')}
            <span className="ml-1 text-[11px] text-text-3">{Object.keys(THEMES).length}</span>
          </TabsTrigger>
          <TabsTrigger value="payments">{t('tab_payments')}</TabsTrigger>
          <TabsTrigger value="fiscal">{t('tab_fiscal')}</TabsTrigger>
          <TabsTrigger value="specialties">{t('tab_specialties')}</TabsTrigger>
          <TabsTrigger value="subscription">{t('tab_subscription')}</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab kg={kg} />
        </TabsContent>
        <TabsContent value="operations">
          <OperationsTab kg={kg} />
        </TabsContent>
        <TabsContent value="design">
          <DesignTab />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab />
        </TabsContent>
        <TabsContent value="fiscal">
          <FiscalTab kg={kg} />
        </TabsContent>
        <TabsContent value="specialties">
          <SpecialistTypesTab />
        </TabsContent>
        <TabsContent value="subscription">
          <SubscriptionTab kg={kg} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ========== GENERAL TAB ==========

function GeneralTab({ kg }: { kg: NonNullable<ReturnType<typeof useKindergartenFull>['data']> }) {
  const { t } = useTranslation('settings');

  // WHY read-only: the live backend exposes no PATCH for top-level kindergarten
  // fields (name/address/phone) — only PATCH /kindergartens/me/settings (the JSONB
  // settings bag, edited on the Operations tab). Editing identity fields here would
  // be a no-op, so we present them read-only. See OPEN_QUESTIONS §C17 / BACKEND_NEEDINGS.
  // (The logo IS editable — dedicated N11 upload/delete endpoints.)
  const readonlyCls =
    'h-9 w-full rounded-[var(--r-md)] border border-line bg-bg-sunken px-3 text-[14px] text-text-3 outline-none';

  return (
    <div className="grid gap-[22px] lg:grid-cols-[1fr_320px]">
      <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev p-5">
        <div className="mb-1 text-[15px] font-bold text-text-1">{t('general_contacts')}</div>
        <div className="mb-3 text-[12.5px] text-text-3">{t('general_readonly_hint')}</div>
        <div className="flex flex-col gap-4">
          <FieldWrapper label={t('field_name')}>
            <input value={kg.name} disabled className={readonlyCls} />
          </FieldWrapper>
          <FieldWrapper label={t('field_address')}>
            <input value={kg.address ?? '—'} disabled className={readonlyCls} />
          </FieldWrapper>
          <div className="grid grid-cols-2 gap-[14px]">
            <FieldWrapper label={t('field_phone')}>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-3" />
                <input value={kg.phone ?? '—'} disabled className={`${readonlyCls} pl-8`} />
              </div>
            </FieldWrapper>
            <FieldWrapper label={t('field_slug')} hint={t('field_slug_hint')}>
              <input value={kg.slug} disabled className={readonlyCls} />
            </FieldWrapper>
          </div>
        </div>
      </div>
      <KindergartenLogoCard kg={kg} />
    </div>
  );
}

// N11 logo — preview + upload/delete. Shared by the desktop General tab and the
// mobile General settings sheet (mutations are dedicated logo endpoints).
function KindergartenLogoCard({
  kg,
}: {
  kg: NonNullable<ReturnType<typeof useKindergartenFull>['data']>;
}) {
  const { t } = useTranslation('settings');
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadLogo = useUploadKindergartenLogo();
  const deleteLogo = useDeleteKindergartenLogo();

  const busy = uploadLogo.isPending || deleteLogo.isPending;

  function handleLogoError(err: unknown) {
    if (isAppError(err)) {
      toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
    } else {
      toast.error(t('errors:unknown_error'));
    }
    console.error(err);
  }

  function handleFilePicked(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('errors:logo_type_invalid'));
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      toast.error(t('errors:logo_too_large'));
      return;
    }
    uploadLogo.mutate(file, {
      onSuccess: () => toast.success(t('logo_upload_success')),
      onError: handleLogoError,
    });
  }

  function handleDeleteLogo() {
    deleteLogo.mutate(undefined, {
      onSuccess: () => toast.success(t('logo_delete_success')),
      onError: handleLogoError,
    });
  }

  return (
    <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev p-4">
      <div className="mb-2 text-[15px] font-bold text-text-1">{t('general_logo')}</div>
      <div className="mb-3 flex aspect-square w-full items-center justify-center overflow-hidden rounded-[var(--r-md)] bg-bg-sunken text-[13px] text-text-3">
        {kg.logo_url ? (
          <img src={kg.logo_url} alt={kg.name} className="size-full object-contain" />
        ) : (
          'LOGO 1:1'
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFilePicked(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[var(--r-md)] border border-line bg-bg-elev text-[13px] font-semibold text-text-1 hover:bg-bg-sunken disabled:opacity-60"
      >
        {uploadLogo.isPending ? (
          <Loader2Icon className="size-3.5 animate-spin" />
        ) : (
          <UploadIcon className="size-3.5" />
        )}
        {t('upload_logo')}
      </button>
      {kg.logo_url && (
        <button
          type="button"
          disabled={busy}
          onClick={handleDeleteLogo}
          className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[var(--r-md)] border border-[var(--danger)] bg-transparent text-[13px] font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-60"
        >
          <Trash2Icon className="size-3.5" />
          {t('logo_delete')}
        </button>
      )}
      <div className="mt-2 text-[12px] text-text-3">{t('logo_hint')}</div>
    </div>
  );
}

// ========== OPERATIONS TAB ==========

function OperationsTab({
  kg,
}: {
  kg: NonNullable<ReturnType<typeof useKindergartenFull>['data']>;
}) {
  const { t } = useTranslation('settings');
  const updateSettings = useUpdateKindergartenSettings();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OpsFormValues>({
    resolver: zodResolver(OpsFormSchema),
    defaultValues: {
      timezone: kg.settings.timezone ?? 'Asia/Almaty',
      currency: kg.settings.currency ?? 'KZT',
      late_pickup_fee_amount: String(kg.settings.late_pickup_fee_amount ?? ''),
      payment_grace_days: String(kg.settings.payment_grace_days ?? ''),
      otp_expiry_seconds: String(kg.settings.otp_expiry_seconds ?? ''),
      prepay_discount_3m: String(kg.settings.prepay_discount_3m ?? ''),
      prepay_discount_6m: String(kg.settings.prepay_discount_6m ?? ''),
      prepay_discount_12m: String(kg.settings.prepay_discount_12m ?? ''),
      prepay_discount_24m: String(kg.settings.prepay_discount_24m ?? ''),
    },
  });

  const onSubmit = (values: OpsFormValues) => {
    const settingsBag: Record<string, unknown> = {};
    settingsBag.timezone = values.timezone;
    settingsBag.currency = values.currency;
    const lp = parseOptNum(values.late_pickup_fee_amount);
    if (lp != null) settingsBag.late_pickup_fee_amount = lp;
    const pg = parseOptNum(values.payment_grace_days);
    if (pg != null) settingsBag.payment_grace_days = pg;
    const oe = parseOptNum(values.otp_expiry_seconds);
    if (oe != null) settingsBag.otp_expiry_seconds = oe;
    const p3 = parseOptNum(values.prepay_discount_3m);
    if (p3 != null) settingsBag.prepay_discount_3m = p3;
    const p6 = parseOptNum(values.prepay_discount_6m);
    if (p6 != null) settingsBag.prepay_discount_6m = p6;
    const p12 = parseOptNum(values.prepay_discount_12m);
    if (p12 != null) settingsBag.prepay_discount_12m = p12;
    const p24 = parseOptNum(values.prepay_discount_24m);
    if (p24 != null) settingsBag.prepay_discount_24m = p24;

    updateSettings.mutate(
      { settings: settingsBag },
      {
        onSuccess: () => {
          toast.success(t('save_success'));
        },
        onError: (err) => {
          const mapped = mapValidationErrors(err, setError);
          if (!mapped) {
            if (isAppError(err)) {
              toast.error(t(toI18nKey(err)));
            } else {
              toast.error(t('errors:unknown_error'));
            }
          }
        },
      },
    );
  };

  return (
    <div className="grid gap-[22px] lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev p-5">
          <div className="mb-3 text-[15px] font-bold text-text-1">{t('ops_time_currency')}</div>
          <form id="ops-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-[14px]">
              <FieldWrapper label={t('field_timezone')} error={errors.timezone?.message}>
                <select
                  {...register('timezone')}
                  className="h-9 w-full rounded-[var(--r-md)] border border-line bg-bg-elev px-3 text-[14px] text-text-1 outline-none focus:border-primary"
                >
                  <option value="Asia/Almaty">Asia/Almaty (UTC+5)</option>
                  <option value="Asia/Aqtobe">Asia/Aqtobe (UTC+5)</option>
                  <option value="Asia/Atyrau">Asia/Atyrau (UTC+5)</option>
                  <option value="Asia/Oral">Asia/Oral (UTC+5)</option>
                  <option value="Asia/Aqtau">Asia/Aqtau (UTC+5)</option>
                  <option value="Asia/Qostanay">Asia/Qostanay (UTC+6)</option>
                  <option value="Asia/Qyzylorda">Asia/Qyzylorda (UTC+5)</option>
                </select>
              </FieldWrapper>
              <FieldWrapper label={t('field_currency')} error={errors.currency?.message}>
                <select
                  {...register('currency')}
                  className="h-9 w-full rounded-[var(--r-md)] border border-line bg-bg-elev px-3 text-[14px] text-text-1 outline-none focus:border-primary"
                >
                  <option value="KZT">KZT</option>
                </select>
              </FieldWrapper>
            </div>
            <div className="grid grid-cols-2 gap-[14px]">
              <FieldWrapper
                label={t('field_late_pickup_fee')}
                error={errors.late_pickup_fee_amount?.message}
              >
                <input
                  type="number"
                  {...register('late_pickup_fee_amount')}
                  className="h-9 w-full rounded-[var(--r-md)] border border-line bg-bg-elev px-3 text-[14px] text-text-1 outline-none focus:border-primary"
                />
              </FieldWrapper>
              <FieldWrapper
                label={t('field_payment_grace_days')}
                error={errors.payment_grace_days?.message}
              >
                <input
                  type="number"
                  {...register('payment_grace_days')}
                  className="h-9 w-full rounded-[var(--r-md)] border border-line bg-bg-elev px-3 text-[14px] text-text-1 outline-none focus:border-primary"
                />
              </FieldWrapper>
            </div>
            <FieldWrapper
              label={t('field_otp_expiry')}
              hint={t('field_otp_expiry_hint')}
              error={errors.otp_expiry_seconds?.message}
            >
              <input
                type="number"
                {...register('otp_expiry_seconds')}
                className="h-9 w-full rounded-[var(--r-md)] border border-line bg-bg-elev px-3 text-[14px] text-text-1 outline-none focus:border-primary"
              />
            </FieldWrapper>
            {isSubmitting && <Loader2Icon className="size-4 animate-spin text-text-3" />}
          </form>
        </div>

        <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev p-5">
          <div className="mb-3 text-[15px] font-bold text-text-1">{t('ops_prepay_discounts')}</div>
          <div className="mb-3 text-[12px] text-text-3">{t('ops_prepay_hint')}</div>
          <div className="grid grid-cols-2 gap-[14px]">
            <FieldWrapper label={t('field_prepay_3m')}>
              <input
                type="number"
                {...register('prepay_discount_3m')}
                form="ops-form"
                className="h-9 w-full rounded-[var(--r-md)] border border-line bg-bg-elev px-3 text-[14px] text-text-1 outline-none focus:border-primary"
              />
            </FieldWrapper>
            <FieldWrapper label={t('field_prepay_6m')}>
              <input
                type="number"
                {...register('prepay_discount_6m')}
                form="ops-form"
                className="h-9 w-full rounded-[var(--r-md)] border border-line bg-bg-elev px-3 text-[14px] text-text-1 outline-none focus:border-primary"
              />
            </FieldWrapper>
          </div>
          <div className="mt-[14px] grid grid-cols-2 gap-[14px]">
            <FieldWrapper label={t('field_prepay_12m')}>
              <input
                type="number"
                {...register('prepay_discount_12m')}
                form="ops-form"
                className="h-9 w-full rounded-[var(--r-md)] border border-line bg-bg-elev px-3 text-[14px] text-text-1 outline-none focus:border-primary"
              />
            </FieldWrapper>
            <FieldWrapper label={t('field_prepay_24m')}>
              <input
                type="number"
                {...register('prepay_discount_24m')}
                form="ops-form"
                className="h-9 w-full rounded-[var(--r-md)] border border-line bg-bg-elev px-3 text-[14px] text-text-1 outline-none focus:border-primary"
              />
            </FieldWrapper>
          </div>
        </div>
      </div>
      <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev p-4">
        <div className="mb-3 text-[15px] font-bold text-text-1">{t('ops_hint_title')}</div>
        <div className="text-[13px] leading-relaxed text-text-2">{t('ops_hint_text')}</div>
      </div>
    </div>
  );
}

// ========== DESIGN TAB ==========

const THEME_GROUPS: Array<{
  labelKey: string;
  subKey: string;
  keys: ThemeName[];
}> = [
  {
    labelKey: 'design_brand',
    subKey: 'design_brand_sub',
    keys: ['green', 'orange', 'blue', 'mono'],
  },
  {
    labelKey: 'design_extended',
    subKey: 'design_extended_sub',
    keys: ['warmCream', 'forestMint', 'oceanBlue'],
  },
  { labelKey: 'design_dark', subKey: 'design_dark_sub', keys: ['dark'] },
];

const TOKEN_GROUPS = [
  {
    labelKey: 'token_group_accent',
    items: ['--primary', '--primary-hover', '--primary-soft', '--primary-fg'],
  },
  {
    labelKey: 'token_group_surfaces',
    items: ['--bg', '--bg-elev', '--bg-sunken', '--bg-subtle', '--bg-sidebar'],
  },
  { labelKey: 'token_group_text', items: ['--text-1', '--text-2', '--text-3', '--text-4'] },
  {
    labelKey: 'token_group_semantic',
    items: ['--success', '--warning', '--danger', '--info'],
  },
  { labelKey: 'token_group_borders', items: ['--border', '--border-strong', '--line'] },
];

const RADIUS_OPTIONS: Array<{
  id: RadiusName;
  labelKey: string;
  subKey: string;
  previewRadius: number;
}> = [
  { id: 'sharp', labelKey: 'radius_sharp', subKey: 'radius_sharp_sub', previewRadius: 3 },
  { id: 'soft', labelKey: 'radius_soft', subKey: 'radius_soft_sub', previewRadius: 8 },
  { id: 'round', labelKey: 'radius_round', subKey: 'radius_round_sub', previewRadius: 14 },
];

function DesignTab() {
  const { t } = useTranslation('settings');
  const theme = useUiStore((s) => s.theme);
  const radius = useUiStore((s) => s.radius);
  const setTheme = useUiStore((s) => s.setTheme);
  const setRadius = useUiStore((s) => s.setRadius);

  // Resolve the live CSS-var token values for the active theme+radius.
  // ui-store.applyTheme() writes the bundle onto :root synchronously inside
  // setTheme/setRadius, so by the time this render runs getComputedStyle already
  // reflects the new values — a memo keyed on [theme, radius] replaces the old
  // 300ms polling effect (no post-commit setState needed).
  const tokenVals = useMemo<Record<string, string>>(() => {
    if (typeof document === 'undefined') return {};
    const cs = getComputedStyle(document.documentElement);
    const out: Record<string, string> = {};
    for (const g of TOKEN_GROUPS) {
      for (const k of g.items) {
        out[k] = cs.getPropertyValue(k).trim();
      }
    }
    return out;
    // theme/radius aren't read in the body but ARE the trigger: they drive the
    // :root CSS-var bundle that getComputedStyle reads, so they must stay as deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, radius]);

  const currentThemeDef = THEMES[theme];

  return (
    <div className="grid gap-[22px] lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-4">
        {THEME_GROUPS.map((g) => (
          <div key={g.labelKey} className="rounded-[var(--r-lg)] border border-line bg-bg-elev">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <div>
                <div className="text-[15px] font-bold text-text-1">{t(g.labelKey)}</div>
                <div className="text-[12px] text-text-3">{t(g.subKey)}</div>
              </div>
            </div>
            <div
              className="grid gap-3 p-4"
              style={{
                gridTemplateColumns: g.keys.length >= 3 ? 'repeat(2, 1fr)' : '1fr',
              }}
            >
              {g.keys.map((k) => {
                const th = THEMES[k];
                const active = theme === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTheme(k)}
                    className="flex flex-col overflow-hidden text-left transition-transform"
                    style={{
                      border: active ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                      borderRadius: 'var(--r-lg)',
                      background: 'var(--bg-elev)',
                      boxShadow: active ? 'var(--shadow-2, none)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Mini app mockup */}
                    <div
                      className="relative"
                      style={{
                        height: 88,
                        background: th.tokens['--bg'] ?? '#fff',
                        borderBottom: '1px solid var(--line)',
                      }}
                    >
                      <div className="absolute inset-0 flex">
                        <div
                          style={{
                            width: 22,
                            background: th.tokens['--bg-sidebar'] ?? th.tokens['--bg'],
                            borderRight: `1px solid ${th.tokens['--line'] ?? '#eee'}`,
                          }}
                        >
                          <div
                            style={{
                              marginTop: 8,
                              marginLeft: 5,
                              width: 12,
                              height: 4,
                              borderRadius: 2,
                              background: th.tokens['--primary'],
                            }}
                          />
                          <div
                            style={{
                              marginTop: 6,
                              marginLeft: 5,
                              width: 10,
                              height: 3,
                              borderRadius: 2,
                              background: th.tokens['--text-3'] ?? '#999',
                              opacity: 0.4,
                            }}
                          />
                          <div
                            style={{
                              marginTop: 4,
                              marginLeft: 5,
                              width: 12,
                              height: 3,
                              borderRadius: 2,
                              background: th.tokens['--text-3'] ?? '#999',
                              opacity: 0.4,
                            }}
                          />
                          <div
                            style={{
                              marginTop: 4,
                              marginLeft: 5,
                              width: 8,
                              height: 3,
                              borderRadius: 2,
                              background: th.tokens['--text-3'] ?? '#999',
                              opacity: 0.4,
                            }}
                          />
                        </div>
                        <div style={{ flex: 1, padding: 6 }}>
                          <div
                            style={{
                              width: 32,
                              height: 5,
                              borderRadius: 2,
                              background: th.tokens['--text-1'] ?? '#000',
                            }}
                          />
                          <div className="mt-1.5 flex gap-1">
                            <div
                              style={{
                                flex: 1,
                                height: 22,
                                borderRadius: 3,
                                background: th.tokens['--bg-elev'] ?? '#fff',
                                border: `1px solid ${th.tokens['--line'] ?? '#eee'}`,
                              }}
                            />
                            <div
                              style={{
                                flex: 1,
                                height: 22,
                                borderRadius: 3,
                                background: th.tokens['--primary-soft'] ?? '#eee',
                              }}
                            />
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              height: 18,
                              borderRadius: 3,
                              background: th.tokens['--primary'],
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex overflow-hidden"
                          style={{
                            borderRadius: 'var(--r-xs)',
                            boxShadow: '0 0 0 1px var(--border)',
                          }}
                        >
                          {th.swatches.map((c, i) => (
                            <span key={i} style={{ width: 10, height: 14, background: c }} />
                          ))}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13.5px] font-bold text-text-1">{th.label}</div>
                          <div className="text-[12px] text-text-3">{th.sub}</div>
                        </div>
                        {active && <Badge variant="default">{t('design_current_badge')}</Badge>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Radius picker */}
        <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev p-5">
          <div className="mb-3 text-[15px] font-bold text-text-1">{t('design_radius')}</div>
          <div className="mb-3 text-[12px] text-text-3">{t('design_radius_hint')}</div>
          <div className="grid grid-cols-3 gap-[10px]">
            {RADIUS_OPTIONS.map((r) => {
              const active = radius === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRadius(r.id)}
                  className="text-left"
                  style={{
                    padding: 14,
                    cursor: 'pointer',
                    border: active ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                    borderRadius: 'var(--r-lg)',
                    background: 'var(--bg-elev)',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 24,
                      background: 'var(--primary)',
                      borderRadius: r.previewRadius,
                      marginBottom: 10,
                    }}
                  />
                  <div className="text-[13.5px] font-bold text-text-1">{t(r.labelKey)}</div>
                  <div className="mt-0.5 text-[12px] text-text-3">{t(r.subKey)}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      <div className="flex flex-col gap-4">
        {/* Current theme summary */}
        <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev p-4">
          <div className="mb-3 text-[15px] font-bold text-text-1">{t('design_current_theme')}</div>
          <div
            className="flex items-center gap-2 rounded-[var(--r-md)] p-3"
            style={{ background: 'var(--bg-sunken)' }}
          >
            <span
              className="flex overflow-hidden"
              style={{
                borderRadius: 'var(--r-xs)',
                boxShadow: '0 0 0 1px var(--border)',
              }}
            >
              {currentThemeDef.swatches.map((c, i) => (
                <span key={i} style={{ width: 14, height: 18, background: c }} />
              ))}
            </span>
            <div>
              <div className="text-[13.5px] font-bold text-text-1">{currentThemeDef.label}</div>
              <div className="text-[12px] text-text-3">{currentThemeDef.sub}</div>
            </div>
          </div>
        </div>

        {/* Token values */}
        <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="text-[15px] font-bold text-text-1">{t('design_token_values')}</div>
            <span className="text-[12px] text-text-3">{t('design_token_source')}</span>
          </div>
          <div className="flex max-h-[480px] flex-col gap-3.5 overflow-y-auto p-3">
            {TOKEN_GROUPS.map((g) => (
              <div key={g.labelKey}>
                <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-text-3">
                  {t(g.labelKey)}
                </div>
                <div className="flex flex-col gap-1">
                  {g.items.map((k) => (
                    <div key={k} className="flex items-center gap-2 font-mono text-[11.5px]">
                      <span
                        className="size-[18px] shrink-0 rounded"
                        style={{
                          background: tokenVals[k] ?? 'transparent',
                          boxShadow: '0 0 0 1px var(--border)',
                        }}
                      />
                      <span className="flex-1 text-text-2">{k}</span>
                      <span className="text-text-3">{tokenVals[k]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hint */}
        <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev p-4">
          <div className="mb-2 text-[15px] font-bold text-text-1">{t('design_hint_title')}</div>
          <div className="text-[12.5px] leading-relaxed text-text-2">{t('design_hint_text')}</div>
        </div>
      </div>
    </div>
  );
}

// ========== FISCAL TAB ==========

function FiscalTab({ kg }: { kg: NonNullable<ReturnType<typeof useKindergartenFull>['data']> }) {
  const { t } = useTranslation('settings');
  const s = kg.settings;

  return (
    <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev p-5">
      {/* Banner */}
      <div className="mb-4 rounded-[var(--r-md)] border border-info-soft bg-[var(--info-soft)] px-4 py-3">
        <div className="mb-1 text-[13.5px] font-bold text-text-1">{t('fiscal_banner_title')}</div>
        <div className="text-[13px] text-text-2">{t('fiscal_banner_text')}</div>
      </div>
      <div
        className="grid gap-x-4 gap-y-3 text-[13.5px]"
        style={{ gridTemplateColumns: '160px 1fr' }}
      >
        <div className="text-text-3">{t('fiscal_provider')}</div>
        <div className="text-text-1">{s.fiscal_provider ?? t('fiscal_not_set')}</div>
        <div className="text-text-3">{t('fiscal_bin')}</div>
        <div className="font-mono text-text-1">{s.fiscal_bin ?? t('fiscal_not_set')}</div>
        <div className="text-text-3">{t('fiscal_kkm')}</div>
        <div className="font-mono text-text-1">{s.fiscal_kkm_id ?? t('fiscal_not_set')}</div>
        <div className="text-text-3">{t('fiscal_status')}</div>
        <div>
          {s.fiscal_active ? (
            <Badge variant="success">{t('fiscal_connected')}</Badge>
          ) : (
            <Badge variant="neutral">{t('fiscal_disconnected')}</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== SUBSCRIPTION TAB ==========

function SubscriptionTab({
  kg,
}: {
  kg: NonNullable<ReturnType<typeof useKindergartenFull>['data']>;
}) {
  const { t } = useTranslation('settings');

  return (
    <div className="grid gap-[22px] lg:grid-cols-[1fr_320px]">
      <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev p-5">
        <div className="mb-3 text-[15px] font-bold text-text-1">{t('sub_current_plan')}</div>
        <div
          className="rounded-[12px] p-5"
          style={{
            background: 'linear-gradient(135deg, var(--primary-soft) 0%, var(--success-soft) 100%)',
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <Badge variant="default">{kg.plan}</Badge>
              <div className="mt-2 text-[24px] font-bold tracking-tight text-text-1">
                {t('sub_up_to_children', { count: 150 })}
              </div>
              <div className="mt-1 text-[13px] text-text-2">{t('sub_all_modules')}</div>
            </div>
          </div>
          <div className="my-3 h-px bg-line" />
          <div className="text-[13px] text-text-2">
            {t('sub_valid_until')} <strong>31.12.2026</strong> · {t('sub_auto_renewal')}
          </div>
        </div>
      </div>
      <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev p-4">
        <div className="mb-2 text-[15px] font-bold text-text-1">{t('sub_danger_zone')}</div>
        <button
          type="button"
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[var(--r-md)] border border-[var(--danger)] bg-transparent text-[13px] font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)]"
          disabled
        >
          {t('sub_close_kg')}
        </button>
        <div className="mt-2 text-[12px] text-text-3">{t('sub_close_hint')}</div>
      </div>
    </div>
  );
}

// ========== PAYMENTS TAB (Kaspi Pay onboarding) ==========

const KASPI_STATUS_BADGE: Record<KaspiStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  pending: 'warning',
  expired: 'warning',
  revoked: 'neutral',
};

function PaymentsTab() {
  const { t } = useTranslation('settings');
  const tz = DEFAULT_TIMEZONE;
  const statusQuery = useKaspiStatus();
  const disconnectMutation = useDisconnectKaspi();

  const [wizardOpen, setWizardOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const status = statusQuery.data;

  function handleDisconnect() {
    disconnectMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(t('pay_disconnect_success'));
        setDisconnectOpen(false);
      },
      onError: (err) => {
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
    });
  }

  if (statusQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2Icon className="size-5 animate-spin text-text-3" />
      </div>
    );
  }

  const isConnected = status?.connected && status.status === 'active';
  const isExpired = status?.status === 'expired';
  const isPending = status?.status === 'pending';

  return (
    <div className="grid gap-[22px] lg:grid-cols-[1fr_320px]">
      <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev p-5">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-[var(--r-md)] bg-bg-sunken text-text-1">
              <CreditCardIcon className="size-5" />
            </div>
            <div>
              <div className="text-[15px] font-bold text-text-1">{t('pay_kaspi_title')}</div>
              <div className="text-[12.5px] text-text-3">{t('pay_kaspi_sub')}</div>
            </div>
          </div>
          {status && (
            <Badge variant={KASPI_STATUS_BADGE[status.status]} dot>
              {t(`pay_status_${status.status}`)}
            </Badge>
          )}
        </div>

        {isExpired && (
          <div className="mb-4 flex gap-2.5 rounded-[var(--r-md)] border border-[var(--warning-soft-border)] bg-[var(--warning-soft)] p-3.5">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-[color:var(--warning-text)]" />
            <div className="text-[12.5px] leading-snug text-[color:var(--warning-text)]">
              {t('pay_expired_banner')}
            </div>
          </div>
        )}

        {isConnected ? (
          <div
            className="grid gap-x-4 gap-y-3 text-[13.5px]"
            style={{ gridTemplateColumns: '160px 1fr' }}
          >
            <div className="text-text-3">{t('pay_connected_phone')}</div>
            <div className="font-mono text-text-1">{status?.phone ?? '—'}</div>
            <div className="text-text-3">{t('pay_org_name')}</div>
            <div className="text-text-1">{status?.org_name ?? '—'}</div>
            <div className="text-text-3">{t('pay_last_checked')}</div>
            <div className="text-text-1">
              {status?.last_checked_at ? formatDateTime(status.last_checked_at, tz) : '—'}
            </div>
          </div>
        ) : (
          <div className="text-[13px] text-text-2">
            {isPending ? t('pay_pending_desc') : t('pay_empty_desc')}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          {isConnected ? (
            <>
              <Button variant="outline" onClick={() => setWizardOpen(true)}>
                {t('pay_reconnect_btn')}
              </Button>
              <Button
                variant="outline"
                className="border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                onClick={() => setDisconnectOpen(true)}
              >
                {t('pay_disconnect_btn')}
              </Button>
            </>
          ) : (
            <Button onClick={() => setWizardOpen(true)}>
              {isExpired || isPending ? t('pay_reconnect_btn') : t('pay_connect_btn')}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-[var(--r-lg)] border border-line bg-bg-elev p-4">
        <div className="mb-2 text-[15px] font-bold text-text-1">{t('pay_hint_title')}</div>
        <div className="text-[12.5px] leading-relaxed text-text-2">{t('pay_hint_text')}</div>
      </div>

      <KaspiWizard open={wizardOpen} onOpenChange={setWizardOpen} />

      <DestructiveConfirm
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        title={t('pay_disconnect_confirm_title')}
        description={t('pay_disconnect_confirm_desc')}
        confirmLabel={t('pay_disconnect_btn')}
        onConfirm={handleDisconnect}
        loading={disconnectMutation.isPending}
      />
    </div>
  );
}

// Cashier phone is a bare 11-digit MSISDN `7XXXXXXXXXX` (NOT E.164) — HANDOFF §25a.
// We reuse the shared PhoneInput (E.164 `+7…`) and strip the leading `+` on send.
const KASPI_PHONE_RE = /^7\d{10}$/;
// Kaspi SMS code is 4 digits (login OTP is 6 — hence the explicit length).
const KASPI_OTP_LEN = 4;

function KaspiWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation('settings');
  const initMutation = useInitKaspiConnect();
  const sendPhoneMutation = useSendKaspiPhone();
  const verifyMutation = useVerifyKaspiOtp();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [processId, setProcessId] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);

  function reset() {
    setStep('phone');
    setProcessId(null);
    setPhone('');
    setPhoneError(null);
    setOtp('');
    setOtpError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  // The init step is hidden from the user: kick it off lazily on first phone submit.
  function handleSendPhone() {
    // PhoneInput stores E.164 (`+7…`); Kaspi wants the bare `7XXXXXXXXXX`.
    const bare = phone.replace(/^\+/, '');
    if (!KASPI_PHONE_RE.test(bare)) {
      setPhoneError(t('pay_phone_invalid'));
      return;
    }
    setPhoneError(null);

    const send = (pid: string) => {
      sendPhoneMutation.mutate(
        { processId: pid, phone: bare },
        {
          onSuccess: () => {
            setOtp('');
            setOtpError(null);
            setStep('otp');
          },
          onError: (err) => {
            const code = getErrorCode(err);
            if (code === 'kaspi_invalid_phone' || code === 'invalid_phone_format') {
              // Phone-specific rejection → surface inline on the field, not a toast.
              setPhoneError(t(`errors:${code}`));
            } else if (code === 'kaspi_unknown_process') {
              // TTL (~5 min) expired before send → restart the whole wizard.
              toast.error(t('errors:kaspi_unknown_process'));
              reset();
            } else {
              toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
            }
            console.error(err);
          },
        },
      );
    };

    if (processId) {
      send(processId);
      return;
    }
    initMutation.mutate(undefined, {
      onSuccess: (res) => {
        setProcessId(res.process_id);
        send(res.process_id);
      },
      onError: (err) => {
        toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
        console.error(err);
      },
    });
  }

  function handleVerify() {
    if (!processId || otp.length < KASPI_OTP_LEN) return;
    setOtpError(null);
    verifyMutation.mutate(
      { processId, otp },
      {
        onSuccess: () => {
          toast.success(t('pay_connect_success'));
          handleOpenChange(false);
        },
        onError: (err) => {
          const code = getErrorCode(err);
          if (code === 'kaspi_otp_invalid') {
            setOtpError(t('errors:kaspi_otp_invalid'));
          } else if (code === 'kaspi_unknown_process') {
            // TTL (~5 min) expired — restart the whole wizard.
            toast.error(t('errors:kaspi_unknown_process'));
            reset();
          } else {
            toast.error(t(toI18nKey(err), { defaultValue: t('errors:unknown_error') }));
          }
          console.error(err);
        },
      },
    );
  }

  const sending = initMutation.isPending || sendPhoneMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] shadow-[var(--shadow-3)]">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {t('pay_wizard_title')}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[color:var(--text-3)]">
            {step === 'phone' ? t('pay_step_phone_desc') : t('pay_step_otp_desc')}
          </DialogDescription>
        </DialogHeader>

        {step === 'phone' ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-[12.5px] font-semibold text-[color:var(--text-2)]">
              {t('pay_phone_label')}
            </label>
            <PhoneInput
              value={phone}
              onChange={(v) => {
                setPhone(v);
                if (phoneError) setPhoneError(null);
              }}
              hasError={!!phoneError}
            />
            {phoneError && (
              <p className="text-[12px] text-[color:var(--danger-fg)]">{phoneError}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <OtpInput
              value={otp}
              onChange={(v) => {
                setOtp(v);
                if (otpError) setOtpError(null);
              }}
              length={KASPI_OTP_LEN}
              hasError={!!otpError}
            />
            {otpError && (
              <p className="text-center text-[12px] text-[color:var(--danger-fg)]">{otpError}</p>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'otp' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep('phone')}
              disabled={verifyMutation.isPending}
            >
              {t('pay_back')}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            {t('pay_cancel')}
          </Button>
          {step === 'phone' ? (
            <Button type="button" onClick={handleSendPhone} disabled={sending}>
              {t('pay_send_code')}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleVerify}
              disabled={verifyMutation.isPending || otp.length < KASPI_OTP_LEN}
            >
              {t('pay_verify')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========== SHARED FIELD WRAPPER ==========

function FieldWrapper({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[13px] font-semibold text-text-2">
        {label}
        {required && <span className="ml-0.5 text-[var(--danger)]">*</span>}
      </label>
      {children}
      {hint && <div className="mt-0.5 text-[12px] text-text-3">{hint}</div>}
      {error && <div className="mt-0.5 text-[12px] text-[var(--danger-fg)]">{error}</div>}
    </div>
  );
}

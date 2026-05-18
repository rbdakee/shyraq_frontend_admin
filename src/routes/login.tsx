import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, LoaderCircleIcon } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/cn';
import { toI18nKey, isAppError } from '@/lib/error-map';
import { useUiStore } from '@/stores/ui-store';
import { useSessionStore } from '@/stores/session-store';
import { useRequestOtp, useVerifyOtp, useSelectRole, hasAdminRole } from '@/hooks/use-auth';
import type { AuthResponse } from '@/hooks/use-auth';

import { PhoneInput } from '@/components/forms/phone-input';
import { OtpInput, type OtpInputHandle } from '@/components/forms/otp-input';
import { OTP_RESEND_SECONDS, OTP_LOCK_SECONDS } from '@/lib/constants';

type Step = 'phone' | 'otp' | 'select' | 'no-access' | 'locked';

const PhoneSchema = z.object({
  phone: z.string().regex(/^\+7\d{10}$/, 'auth.phone_invalid'),
});

const OtpSchema = z.object({
  code: z.string().length(6, 'auth.otp_length'),
});

type PhoneForm = z.infer<typeof PhoneSchema>;
type OtpForm = z.infer<typeof OtpSchema>;

function LangToggle() {
  const { locale, setLocale } = useUiStore();

  return (
    <div className="inline-flex rounded-[var(--r-md)] bg-bg-sunken p-0.5 text-xs font-semibold">
      <button
        type="button"
        className={cn(
          'cursor-pointer rounded-[var(--r-sm)] border-none bg-transparent px-2 py-1 text-text-3',
          locale === 'ru' && 'bg-bg-elev text-text-1 shadow-[var(--shyraq-shadow-1)]',
        )}
        onClick={() => setLocale('ru')}
      >
        RU
      </button>
      <button
        type="button"
        className={cn(
          'cursor-pointer rounded-[var(--r-sm)] border-none bg-transparent px-2 py-1 text-text-3',
          locale === 'kk' && 'bg-bg-elev text-text-1 shadow-[var(--shyraq-shadow-1)]',
        )}
        onClick={() => setLocale('kk')}
      >
        KK
      </button>
    </div>
  );
}

function LoginPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [resend, setResend] = useState(0);
  const [lockCountdown, setLockCountdown] = useState(0);
  const [otpError, setOtpError] = useState('');

  const [pendingAuthResponse, setPendingAuthResponse] = useState<AuthResponse | null>(null);
  const [selectedKgId, setSelectedKgId] = useState<string | null>(null);

  const otpRef = useRef<OtpInputHandle>(null);

  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const selectRoleMutation = useSelectRole();

  const roles = useSessionStore((s) => s.roles);

  const phoneForm = useForm<PhoneForm>({
    resolver: zodResolver(PhoneSchema),
    defaultValues: { phone: '' },
  });

  const otpForm = useForm<OtpForm>({
    resolver: zodResolver(OtpSchema),
    defaultValues: { code: '' },
  });

  useEffect(() => {
    if (resend <= 0) return;
    const timer = setInterval(() => setResend((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(timer);
  }, [resend]);

  useEffect(() => {
    if (lockCountdown <= 0) return;
    const timer = setInterval(() => setLockCountdown((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(timer);
  }, [lockCountdown]);

  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => otpRef.current?.focus(), 100);
    }
  }, [step]);

  function handlePhoneSubmit(data: PhoneForm) {
    setPhone(data.phone);
    requestOtp.mutate(
      { phone: data.phone },
      {
        onSuccess: () => {
          setStep('otp');
          setResend(OTP_RESEND_SECONDS);
          otpForm.reset({ code: '' });
          setOtpError('');
        },
        onError: (err) => {
          if (isAppError(err)) {
            if (err.code === 'otp_rate_limit' || err.code === 'otp_locked') {
              setLockCountdown(OTP_LOCK_SECONDS);
              setStep('locked');
              return;
            }
            toast.error(t(toI18nKey(err)));
          } else {
            toast.error(t('errors:unknown_error'));
          }
        },
      },
    );
  }

  function handleResend() {
    if (resend > 0) return;
    requestOtp.mutate(
      { phone },
      {
        onSuccess: () => {
          setResend(OTP_RESEND_SECONDS);
          setOtpError('');
        },
        onError: (err) => {
          if (isAppError(err)) {
            if (err.code === 'otp_rate_limit' || err.code === 'otp_locked') {
              setLockCountdown(OTP_LOCK_SECONDS);
              setStep('locked');
              return;
            }
            toast.error(t(toI18nKey(err)));
          }
        },
      },
    );
  }

  function handleOtpSubmit(data: OtpForm) {
    setOtpError('');
    verifyOtp.mutate(
      { phone, code: data.code },
      {
        onSuccess: (res) => {
          if (!hasAdminRole(res)) {
            setStep('no-access');
            return;
          }

          if (res.pending_role_select) {
            setPendingAuthResponse(res);
            const adminKgs = res.kindergartens.filter((kg) =>
              res.roles.some((r) => r.role === 'admin' && r.kindergarten_id === kg.id),
            );
            if (adminKgs.length > 0) {
              setSelectedKgId(adminKgs[0].id);
            }
            setStep('select');
            return;
          }

          navigate('/');
        },
        onError: (err) => {
          if (isAppError(err)) {
            if (err.code === 'invalid_otp') {
              setOtpError(t(toI18nKey(err)));
              return;
            }
            if (err.code === 'otp_expired_or_missing') {
              setOtpError(t(toI18nKey(err)));
              return;
            }
            if (err.code === 'otp_rate_limit' || err.code === 'otp_locked') {
              setLockCountdown(OTP_LOCK_SECONDS);
              setStep('locked');
              return;
            }
            if (err.code === 'no_active_roles') {
              setStep('no-access');
              return;
            }
            toast.error(t(toI18nKey(err)));
          } else {
            toast.error(t('errors:unknown_error'));
          }
        },
      },
    );
  }

  function handleSelectSubmit() {
    if (!selectedKgId) return;
    selectRoleMutation.mutate(
      { kindergarten_id: selectedKgId },
      {
        onSuccess: (res) => {
          if (!hasAdminRole(res)) {
            setStep('no-access');
            return;
          }
          navigate('/');
        },
        onError: (err) => {
          if (isAppError(err)) {
            toast.error(t(toI18nKey(err)));
          } else {
            toast.error(t('errors:unknown_error'));
          }
        },
      },
    );
  }

  function formatTimer(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  const adminKindergartens =
    pendingAuthResponse?.kindergartens.filter((kg) =>
      (pendingAuthResponse?.roles ?? roles).some(
        (r) => r.role === 'admin' && r.kindergarten_id === kg.id,
      ),
    ) ?? [];

  return (
    <div className="grid min-h-screen grid-cols-2 bg-bg">
      {/* Left Art Panel */}
      <div
        className="relative flex flex-col justify-between overflow-hidden p-10 text-white"
        style={{
          background: `
            radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--primary-bright) 35%, transparent), transparent 50%),
            radial-gradient(circle at 70% 80%, rgba(245, 166, 35, 0.18), transparent 50%),
            linear-gradient(135deg, var(--primary) 0%, var(--primary-active) 100%)
          `,
        }}
      >
        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        {/* Brand header */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold text-white"
            style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-bright) 100%)',
            }}
          >
            Sh
          </div>
          <div className="text-lg font-extrabold tracking-tight">Shyraq</div>
          <div className="rounded border border-white/20 px-2 py-1 text-[11px] font-bold uppercase tracking-widest opacity-60">
            Admin
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 flex flex-col gap-7">
          <div className="text-xs font-bold uppercase tracking-[0.1em] opacity-70">
            {t('hero_tag')}
          </div>
          <h1 className="max-w-[380px] text-4xl font-bold leading-[1.15] tracking-tight">
            {t('hero_title')}
          </h1>
          <div className="flex max-w-[380px] flex-col gap-3 text-sm opacity-85">
            <div className="flex items-start gap-2.5">
              <CheckCircleIcon className="mt-0.5 h-[18px] w-[18px] shrink-0" />
              <span>{t('hero_bullet_1')}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircleIcon className="mt-0.5 h-[18px] w-[18px] shrink-0" />
              <span>{t('hero_bullet_2')}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircleIcon className="mt-0.5 h-[18px] w-[18px] shrink-0" />
              <span>{t('hero_bullet_3')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs opacity-55">{t('hero_copyright')}</div>
      </div>

      {/* Right Card Panel */}
      <div className="flex items-center justify-center p-10">
        <div className="w-full max-w-[400px] rounded-[var(--r-xl)] border border-line bg-bg-elev p-8 shadow-[var(--shyraq-shadow-3)]">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold leading-snug tracking-tight text-text-1">
              {step === 'select'
                ? t('select_kindergarten_title')
                : step === 'no-access'
                  ? t('no_access_title')
                  : step === 'locked'
                    ? t('locked_title')
                    : t('login_title')}
            </h2>
            <LangToggle />
          </div>

          {/* Phone Step */}
          {step === 'phone' && (
            <form onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)}>
              <p className="mb-4 mt-0 text-[13.5px] text-text-3">{t('phone_hint')}</p>
              <div className="mb-3.5 flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-text-2">
                  {t('phone_label')} <span className="text-danger">*</span>
                </label>
                <Controller
                  name="phone"
                  control={phoneForm.control}
                  render={({ field, fieldState }) => (
                    <>
                      <PhoneInput
                        value={field.value}
                        onChange={field.onChange}
                        hasError={!!fieldState.error}
                      />
                      {fieldState.error && (
                        <span className="text-xs text-danger-fg">
                          {t(fieldState.error.message ?? 'auth.phone_invalid')}
                        </span>
                      )}
                    </>
                  )}
                />
              </div>
              <button
                type="submit"
                disabled={requestOtp.isPending}
                className={cn(
                  'flex h-10 w-full items-center justify-center gap-1.5 rounded-[var(--r-md)] border border-transparent text-sm font-semibold text-white shadow-[var(--shyraq-shadow-1)] transition-all',
                  'bg-primary hover:bg-primary-hover active:bg-primary-active',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                {requestOtp.isPending && <LoaderCircleIcon className="h-4 w-4 animate-spin" />}
                {t('get_code')}
              </button>
              <div className="mt-3.5 text-center text-xs text-text-3">{t('terms_notice')}</div>
            </form>
          )}

          {/* OTP Step */}
          {step === 'otp' && (
            <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)}>
              <p className="mb-4 mt-0 text-[13.5px] text-text-3">
                {t('otp_hint')} <strong className="text-text-1">{phone}</strong>.{' '}
                <button
                  type="button"
                  className="cursor-pointer border-none bg-transparent font-semibold text-primary"
                  onClick={() => {
                    setStep('phone');
                    setOtpError('');
                  }}
                >
                  {t('change_phone')}
                </button>
              </p>

              <Controller
                name="code"
                control={otpForm.control}
                render={({ field }) => (
                  <div className="mb-4 mt-4">
                    <OtpInput
                      ref={otpRef}
                      value={field.value}
                      onChange={field.onChange}
                      hasError={!!otpError}
                    />
                  </div>
                )}
              />

              {otpError && (
                <div className="mb-3 text-center text-xs text-danger-fg">{otpError}</div>
              )}

              <div className="mb-4 text-center text-xs text-text-3">
                {resend > 0 ? (
                  <>
                    {t('resend_timer')}{' '}
                    <strong className="text-text-2">0:{String(resend).padStart(2, '0')}</strong>
                  </>
                ) : (
                  <button
                    type="button"
                    className="cursor-pointer border-none bg-transparent font-semibold text-primary"
                    onClick={handleResend}
                    disabled={requestOtp.isPending}
                  >
                    {t('resend_code')}
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={verifyOtp.isPending}
                className={cn(
                  'flex h-10 w-full items-center justify-center gap-1.5 rounded-[var(--r-md)] border border-transparent text-sm font-semibold text-white shadow-[var(--shyraq-shadow-1)] transition-all',
                  'bg-primary hover:bg-primary-hover active:bg-primary-active',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                {verifyOtp.isPending && <LoaderCircleIcon className="h-4 w-4 animate-spin" />}
                {t('sign_in')}
              </button>
            </form>
          )}

          {/* Select Kindergarten Step */}
          {step === 'select' && (
            <div>
              <p className="mb-4 mt-0 text-[13.5px] text-text-3">{t('select_kindergarten_hint')}</p>
              <div className="mb-4 mt-4 flex flex-col gap-2.5">
                {adminKindergartens.map((kg) => (
                  <label
                    key={kg.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-[10px] border-[1.5px] p-3.5',
                      selectedKgId === kg.id
                        ? 'border-primary bg-primary-soft'
                        : 'border-border bg-bg-elev',
                    )}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-sunken text-lg">
                      🌱
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold">{kg.name}</div>
                      <div className="text-xs text-text-3">{kg.slug}</div>
                    </div>
                    <input
                      type="radio"
                      name="kindergarten"
                      checked={selectedKgId === kg.id}
                      onChange={() => setSelectedKgId(kg.id)}
                      className="accent-primary"
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                disabled={!selectedKgId || selectRoleMutation.isPending}
                onClick={handleSelectSubmit}
                className={cn(
                  'flex h-10 w-full items-center justify-center gap-1.5 rounded-[var(--r-md)] border border-transparent text-sm font-semibold text-white shadow-[var(--shyraq-shadow-1)] transition-all',
                  'bg-primary hover:bg-primary-hover active:bg-primary-active',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                {selectRoleMutation.isPending && (
                  <LoaderCircleIcon className="h-4 w-4 animate-spin" />
                )}
                {t('continue')}
              </button>
            </div>
          )}

          {/* No Access Screen */}
          {step === 'no-access' && (
            <div>
              <p className="mb-6 mt-0 text-[13.5px] text-text-3">{t('no_access_message')}</p>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  phoneForm.reset({ phone: '' });
                }}
                className={cn(
                  'flex h-10 w-full items-center justify-center rounded-[var(--r-md)] border border-border bg-bg-elev text-sm font-semibold text-text-1 transition-all',
                  'hover:bg-bg-sunken hover:border-border-strong',
                )}
              >
                {t('try_another_number')}
              </button>
            </div>
          )}

          {/* Locked Screen */}
          {step === 'locked' && (
            <div>
              <p className="mb-4 mt-0 text-[13.5px] text-text-3">{t('locked_message')}</p>
              {lockCountdown > 0 && (
                <div className="mb-4 text-center text-2xl font-bold text-text-1">
                  {formatTimer(lockCountdown)}
                </div>
              )}
              {lockCountdown <= 0 && (
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className={cn(
                    'flex h-10 w-full items-center justify-center rounded-[var(--r-md)] border border-transparent text-sm font-semibold text-white shadow-[var(--shyraq-shadow-1)] transition-all',
                    'bg-primary hover:bg-primary-hover active:bg-primary-active',
                  )}
                >
                  {t('try_again')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

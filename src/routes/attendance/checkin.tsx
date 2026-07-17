import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ScanLineIcon,
  VideoIcon,
  VideoOffIcon,
  PauseIcon,
  PlayIcon,
  UserIcon,
  PhoneIcon,
  LogInIcon,
  LogOutIcon,
  HandIcon,
  ChevronLeftIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { DestructiveConfirm } from '@/components/feedback/destructive-confirm';
import { ManualMarkModal } from './_components/manual-mark-modal';
import { ScanSectionTabs } from './_components/scan-section-tabs';

import { useScanQr, useCheckIn, useCheckOut, useAttendanceEvents } from '@/hooks/use-attendance';
import type {
  ScanQrResponse,
  LinkedChild,
  AttendanceEvent,
  AttendanceEventType,
} from '@/hooks/use-attendance';
import { useGroups } from '@/hooks/use-groups';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { isAppError } from '@/lib/error-map';
import { toI18nKey } from '@/lib/error-map';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { toISODateTz, formatPhone, getInitials } from '@/lib/format';
import { cn } from '@/lib/cn';

type ScannerStatus = 'off' | 'starting' | 'scanning' | 'paused' | 'denied' | 'no-device';

const AUTO_RESET_MS = 4000;

function formatTimeOnly(isoString: string, tz: string): string {
  const d = new Date(isoString);
  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('hour')}:${get('minute')}`;
}

function getChildLastEvent(
  childId: string,
  events: AttendanceEvent[],
): AttendanceEvent | undefined {
  return events.find((e) => e.childId === childId);
}

function buildChildHint(
  childId: string,
  events: AttendanceEvent[],
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const last = getChildLastEvent(childId, events);
  if (!last) return t('checkin.hint.notArrivedYet');
  const time = formatTimeOnly(last.recordedAt, DEFAULT_TIMEZONE);
  if (last.eventType === 'check_in') {
    return t('checkin.hint.inKindergartenSince', { time });
  }
  return t('checkin.hint.leftAt', { time });
}

export default function CheckinPage() {
  const { t } = useTranslation('attendance');
  const tErrors = useTranslation('errors').t;
  const { isMobile } = useBreakpoint();
  const navigate = useNavigate();

  const todayStr = toISODateTz(new Date(), DEFAULT_TIMEZONE);

  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>('off');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [scanResult, setScanResult] = useState<ScanQrResponse | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [duplicateConfirmOpen, setDuplicateConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<AttendanceEventType | null>(null);
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rateLimitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastScannedTokenRef = useRef<string>('');

  const scanMutation = useScanQr();
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();

  const todayEvents = useAttendanceEvents({ from: todayStr, to: todayStr, limit: 200 });
  const eventsList = useMemo(() => todayEvents.data ?? [], [todayEvents.data]);

  const groupsQuery = useGroups({ archived: false });
  const groupMap = new Map((groupsQuery.data ?? []).map((g) => [g.id, g.name]));

  const stopStream = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startRateLimitCountdown = useCallback((seconds: number) => {
    setRateLimitSeconds(seconds);
    if (rateLimitTimerRef.current) clearInterval(rateLimitTimerRef.current);
    rateLimitTimerRef.current = setInterval(() => {
      setRateLimitSeconds((prev) => {
        if (prev <= 1) {
          if (rateLimitTimerRef.current) clearInterval(rateLimitTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleTokenScanned = useCallback(
    (token: string) => {
      if (token === lastScannedTokenRef.current) return;
      lastScannedTokenRef.current = token;

      setScanResult(null);
      setSelectedChildId(null);

      scanMutation.mutate(token, {
        onSuccess: (data) => {
          setScanResult(data);
        },
        onError: (error) => {
          if (isAppError(error) && error.code === 'qr_rate_limit_exceeded') {
            const details = error.details as Record<string, unknown> | undefined;
            const retryAfter = typeof details?.retryAfter === 'number' ? details.retryAfter : 60;
            startRateLimitCountdown(retryAfter);
          }
          toast.error(tErrors(toI18nKey(error)));
        },
      });
    },
    [scanMutation, startRateLimitCountdown, tErrors],
  );

  const startScanning = useCallback(
    (video: HTMLVideoElement) => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);

      if ('BarcodeDetector' in window) {
        type NativeBarcodeDetector = {
          detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
        };
        type BarcodeDetectorCtor = new (opts: { formats: string[] }) => NativeBarcodeDetector;
        const Ctor = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor })
          .BarcodeDetector;
        const detector = new Ctor({ formats: ['qr_code'] });

        scanIntervalRef.current = setInterval(() => {
          if (video.readyState < 2) return;
          void detector.detect(video).then((barcodes) => {
            if (barcodes.length > 0 && barcodes[0]!.rawValue) {
              handleTokenScanned(barcodes[0]!.rawValue);
            }
          });
        }, 250);
      } else {
        void (async () => {
          const { BrowserQRCodeReader } = await import('@zxing/browser');
          const reader = new BrowserQRCodeReader();
          scanIntervalRef.current = setInterval(() => {
            if (video.readyState < 2) return;
            void reader
              .decodeOnceFromVideoElement(video)
              .then((result) => {
                if (result) {
                  handleTokenScanned(result.getText());
                }
              })
              .catch(() => {
                // decode failures are normal when QR is not in frame
              });
          }, 350);
        })();
      }
    },
    [handleTokenScanned],
  );

  const startCamera = useCallback(
    async (deviceId?: string) => {
      setScannerStatus('starting');
      lastScannedTokenRef.current = '';

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');

        if (videoDevices.length === 0) {
          setScannerStatus('no-device');
          return;
        }

        setCameras(videoDevices);
        const targetId = deviceId ?? videoDevices[0]!.deviceId;
        if (!selectedCameraId) setSelectedCameraId(targetId);

        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: { exact: targetId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        stopStream();
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          startScanning(videoRef.current);
        }

        setScannerStatus('scanning');
      } catch (err) {
        const e = err as DOMException;
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
          setScannerStatus('denied');
        } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
          setScannerStatus('no-device');
        } else {
          setScannerStatus('denied');
        }
      }
    },
    [stopStream, startScanning, selectedCameraId],
  );

  const pauseCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getVideoTracks()) {
        track.enabled = false;
      }
    }
    setScannerStatus('paused');
  }, []);

  const resumeCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getVideoTracks()) {
        track.enabled = true;
      }
    }
    if (videoRef.current) {
      startScanning(videoRef.current);
    }
    setScannerStatus('scanning');
    lastScannedTokenRef.current = '';
  }, [startScanning]);

  const switchCamera = useCallback(
    (deviceId: string) => {
      setSelectedCameraId(deviceId);
      stopStream();
      void startCamera(deviceId);
    },
    [stopStream, startCamera],
  );

  const resetCard = useCallback(() => {
    setScanResult(null);
    setSelectedChildId(null);
    lastScannedTokenRef.current = '';
  }, []);

  const scheduleReset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      resetCard();
    }, AUTO_RESET_MS);
  }, [resetCard]);

  const executeMark = useCallback(
    (eventType: AttendanceEventType) => {
      if (!scanResult || !selectedChildId) return;

      const childName =
        scanResult.linkedChildren?.find((c) => c.id === selectedChildId)?.fullName ?? '';

      if (eventType === 'check_in') {
        checkInMutation.mutate(
          { childId: selectedChildId },
          {
            onSuccess: (event) => {
              const time = formatTimeOnly(event.recordedAt, DEFAULT_TIMEZONE);
              toast.success(
                t('checkin.toast_success', {
                  name: childName,
                  action: t('event_type.check_in'),
                  time,
                }),
              );
              scheduleReset();
            },
            onError: (err) => {
              toast.error(tErrors(toI18nKey(err)));
            },
          },
        );
      } else {
        checkOutMutation.mutate(
          { childId: selectedChildId, pickupUserId: scanResult.user.id },
          {
            onSuccess: (event) => {
              const time = formatTimeOnly(event.recordedAt, DEFAULT_TIMEZONE);
              toast.success(
                t('checkin.toast_success', {
                  name: childName,
                  action: t('event_type.check_out'),
                  time,
                }),
              );
              scheduleReset();
            },
            onError: (err) => {
              toast.error(tErrors(toI18nKey(err)));
            },
          },
        );
      }
    },
    [scanResult, selectedChildId, scheduleReset, checkInMutation, checkOutMutation, t, tErrors],
  );

  const handleMark = useCallback(
    (eventType: AttendanceEventType) => {
      if (!scanResult || !selectedChildId) return;

      const lastEvent = getChildLastEvent(selectedChildId, eventsList);
      if (eventType === 'check_in' && lastEvent?.eventType === 'check_in') {
        setPendingAction('check_in');
        setDuplicateConfirmOpen(true);
        return;
      }

      executeMark(eventType);
    },
    [scanResult, selectedChildId, eventsList, executeMark],
  );

  const isPending = checkInMutation.isPending || checkOutMutation.isPending;
  const isParent = scanResult?.user.role === 'parent';
  const children = scanResult?.linkedChildren ?? [];
  const allowedActions = scanResult?.allowedActions ?? [];
  const hasCheckIn = allowedActions.includes('check_in');
  const hasCheckOut = allowedActions.includes('check_out');
  const noActions = allowedActions.length === 0;

  const selectedChildLastEvent = selectedChildId
    ? getChildLastEvent(selectedChildId, eventsList)
    : undefined;
  const suggestedAction: AttendanceEventType | null =
    selectedChildLastEvent?.eventType === 'check_in' ? 'check_out' : 'check_in';

  const scannerStatusText = (() => {
    if (rateLimitSeconds > 0) return t('checkin.status.rateLimit', { seconds: rateLimitSeconds });
    switch (scannerStatus) {
      case 'off':
        return t('checkin.status.cameraOff');
      case 'starting':
        return t('checkin.status.starting');
      case 'scanning':
        return scanMutation.isPending
          ? t('checkin.status.recognizing')
          : t('checkin.status.pointQr');
      case 'paused':
        return t('checkin.status.paused');
      case 'denied':
        return t('checkin.status.denied');
      case 'no-device':
        return t('checkin.status.noDevice');
    }
  })();

  // WHY useEffect: release hardware camera + timers on unmount to prevent
  // the camera indicator staying lit and memory leaks from dangling intervals.
  useEffect(() => {
    return () => {
      stopStream();
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (rateLimitTimerRef.current) clearInterval(rateLimitTimerRef.current);
    };
  }, [stopStream]);

  const dialogs = (
    <>
      <DestructiveConfirm
        open={duplicateConfirmOpen}
        onOpenChange={setDuplicateConfirmOpen}
        title={t('checkin.duplicateConfirm.title')}
        description={t('checkin.duplicateConfirm.description', {
          time: selectedChildLastEvent
            ? formatTimeOnly(selectedChildLastEvent.recordedAt, DEFAULT_TIMEZONE)
            : '',
        })}
        confirmLabel={t('checkin.duplicateConfirm.confirm')}
        onConfirm={() => {
          setDuplicateConfirmOpen(false);
          if (pendingAction) {
            executeMark(pendingAction);
            setPendingAction(null);
          }
        }}
      />
      <ManualMarkModal open={manualOpen} onOpenChange={setManualOpen} />
    </>
  );

  const scanResultContent = (
    <>
      {scanMutation.isPending && (
        <div className="flex items-center gap-3 py-2">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      )}

      {scanResult && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[16px] font-bold text-[color:var(--primary-fg)]">
              {getInitials(scanResult.user.fullName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
                {scanResult.user.fullName}
              </div>
              <div className="flex items-center gap-2 text-[13px] text-[color:var(--text-3)]">
                {scanResult.user.phone && (
                  <span className="flex items-center gap-1">
                    <PhoneIcon className="size-3.5" />
                    {formatPhone(scanResult.user.phone)}
                  </span>
                )}
              </div>
            </div>
            <Badge variant="neutral" className="shrink-0">
              {scanResult.user.role}
            </Badge>
          </div>

          {noActions && isParent && (
            <div className="rounded-[var(--r-lg)] border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3 text-[13px] text-[color:var(--warning-fg)]">
              {t('checkin.noPickupRights')}
            </div>
          )}

          {isParent && children.length === 0 && (
            <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-sunken)] px-4 py-6 text-center text-[13px] text-[color:var(--text-3)]">
              {t('checkin.noChildren')}
            </div>
          )}

          {isParent && children.length > 0 && (
            <div className="flex flex-col gap-2">
              {children.map((child) => (
                <ChildRadioCard
                  key={child.id}
                  child={child}
                  selected={selectedChildId === child.id}
                  groupName={child.currentGroupId ? groupMap.get(child.currentGroupId) : undefined}
                  hint={buildChildHint(child.id, eventsList, t)}
                  onSelect={() => setSelectedChildId(child.id)}
                />
              ))}
            </div>
          )}

          {isParent && children.length > 0 && (
            <div className="flex gap-3">
              <Button
                size="lg"
                className={cn(
                  'flex-1 gap-2 text-[15px]',
                  suggestedAction === 'check_in' &&
                    selectedChildId &&
                    'ring-2 ring-[var(--primary)] ring-offset-2',
                )}
                disabled={!selectedChildId || !hasCheckIn || noActions || isPending}
                onClick={() => handleMark('check_in')}
              >
                <LogInIcon className="size-5" />
                {t('event_type.check_in')}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className={cn(
                  'flex-1 gap-2 text-[15px]',
                  suggestedAction === 'check_out' &&
                    selectedChildId &&
                    'ring-2 ring-[var(--primary)] ring-offset-2',
                )}
                disabled={!selectedChildId || !hasCheckOut || noActions || isPending}
                onClick={() => handleMark('check_out')}
              >
                <LogOutIcon className="size-5" />
                {t('event_type.check_out')}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );

  if (isMobile) {
    const showResultSheet = !!scanResult || scanMutation.isPending;

    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-black">
        <div className="relative flex-1">
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />

          {scannerStatus === 'scanning' && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-56 w-56 rounded-[var(--r-lg)] border-2 border-white/60" />
            </div>
          )}

          {(scannerStatus === 'off' ||
            scannerStatus === 'paused' ||
            scannerStatus === 'denied' ||
            scannerStatus === 'no-device') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--bg-sunken)]">
              {scannerStatus === 'off' && (
                <>
                  <VideoOffIcon className="size-16 text-[color:var(--text-4)]" />
                  <Button onClick={() => void startCamera()} className="gap-2">
                    <VideoIcon className="size-4" />
                    {t('checkin.startCamera')}
                  </Button>
                </>
              )}
              {scannerStatus === 'paused' && (
                <Button onClick={resumeCamera} className="gap-2">
                  <PlayIcon className="size-4" />
                  {t('checkin.resume')}
                </Button>
              )}
              {scannerStatus === 'denied' && (
                <div className="px-8">
                  <ErrorState
                    title={t('checkin.error.deniedTitle')}
                    text={t('checkin.error.deniedText')}
                  />
                </div>
              )}
              {scannerStatus === 'no-device' && (
                <div className="px-8">
                  <ErrorState
                    title={t('checkin.error.noDeviceTitle')}
                    text={t('checkin.error.noDeviceText')}
                  />
                </div>
              )}
            </div>
          )}

          <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-gradient-to-b from-black/50 to-transparent p-3 pb-10">
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-full bg-black/40 text-white"
              onClick={() => navigate('/attendance')}
              aria-label={t('actions.back', { ns: 'common' })}
            >
              <ChevronLeftIcon className="size-5" />
            </button>
            <span className="flex-1 text-center text-[13px] font-medium text-white/80">
              {scannerStatusText}
            </span>
            <div className="size-9" />
          </div>

          {(scannerStatus === 'scanning' || scannerStatus === 'starting') && (
            <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 bg-gradient-to-t from-black/50 to-transparent p-4 pt-10 pb-[max(16px,env(safe-area-inset-bottom))]">
              <div className="flex gap-2">
                {scannerStatus === 'scanning' && (
                  <Button
                    variant="outline"
                    onClick={pauseCamera}
                    className="flex-1 gap-2 border-white/20 bg-black/40 text-white hover:bg-black/60 hover:text-white"
                  >
                    <PauseIcon className="size-4" />
                    {t('checkin.pause')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setManualOpen(true)}
                  className="flex-1 gap-2 border-white/20 bg-black/40 text-white hover:bg-black/60 hover:text-white"
                >
                  <HandIcon className="size-4" />
                  {t('checkin.manualMark')}
                </Button>
              </div>
              {cameras.length > 1 && scannerStatus === 'scanning' && (
                <Select value={selectedCameraId} onValueChange={switchCamera}>
                  <SelectTrigger className="w-full border-white/20 bg-black/40 text-[13px] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cameras.map((cam) => (
                      <SelectItem key={cam.deviceId} value={cam.deviceId}>
                        {cam.label || t('checkin.camera', { n: cameras.indexOf(cam) + 1 })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
        </div>

        <Sheet
          open={showResultSheet}
          onOpenChange={(v) => {
            if (!v) resetCard();
          }}
        >
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="max-h-[70dvh] overflow-y-auto rounded-t-[var(--r-xl)] px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--border)]" />
            <SheetTitle className="sr-only">{t('tab_checkin')}</SheetTitle>
            <SheetDescription className="sr-only">{t('checkin.placeholder.text')}</SheetDescription>
            {scanResultContent}
          </SheetContent>
        </Sheet>

        {dialogs}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="mb-4">
        <ScanSectionTabs active="checkin" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Left column — Scanner */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[var(--r-xl)] border border-[var(--line)] bg-[var(--bg-elev)] p-4 shadow-[var(--shadow-1)]">
            <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-[var(--r-lg)] bg-black">
              <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              {scannerStatus === 'scanning' && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-48 w-48 rounded-[var(--r-lg)] border-2 border-white/60" />
                </div>
              )}
              {(scannerStatus === 'off' || scannerStatus === 'paused') && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-sunken)]">
                  <VideoOffIcon className="size-12 text-[color:var(--text-4)]" />
                </div>
              )}
            </div>

            <div className="mb-3 text-center text-[13px] text-[color:var(--text-3)]">
              {scannerStatusText}
            </div>

            <div className="flex flex-col gap-2">
              {scannerStatus === 'off' && (
                <Button onClick={() => void startCamera()} className="w-full gap-2">
                  <VideoIcon className="size-4" />
                  {t('checkin.startCamera')}
                </Button>
              )}

              {scannerStatus === 'scanning' && (
                <Button variant="outline" onClick={pauseCamera} className="w-full gap-2">
                  <PauseIcon className="size-4" />
                  {t('checkin.pause')}
                </Button>
              )}

              {scannerStatus === 'paused' && (
                <Button onClick={resumeCamera} className="w-full gap-2">
                  <PlayIcon className="size-4" />
                  {t('checkin.resume')}
                </Button>
              )}

              {scannerStatus === 'denied' && (
                <ErrorState
                  title={t('checkin.error.deniedTitle')}
                  text={t('checkin.error.deniedText')}
                />
              )}

              {scannerStatus === 'no-device' && (
                <ErrorState
                  title={t('checkin.error.noDeviceTitle')}
                  text={t('checkin.error.noDeviceText')}
                />
              )}

              {cameras.length > 1 &&
                (scannerStatus === 'scanning' || scannerStatus === 'paused') && (
                  <Select value={selectedCameraId} onValueChange={switchCamera}>
                    <SelectTrigger className="w-full text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cameras.map((cam) => (
                        <SelectItem key={cam.deviceId} value={cam.deviceId}>
                          {cam.label || t('checkin.camera', { n: cameras.indexOf(cam) + 1 })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
            </div>
          </div>

          <Button variant="outline" className="w-full gap-2" onClick={() => setManualOpen(true)}>
            <HandIcon className="size-4" />
            {t('checkin.manualMark')}
          </Button>
        </div>

        {/* Right column — Result */}
        <div className="flex flex-col gap-4">
          {!scanResult && !scanMutation.isPending && (
            <EmptyState
              icon={<ScanLineIcon className="size-9 text-[color:var(--text-4)]" />}
              title={t('checkin.placeholder.title')}
              text={t('checkin.placeholder.text')}
            />
          )}

          {scanMutation.isPending && (
            <div className="rounded-[var(--r-xl)] border border-[var(--line)] bg-[var(--bg-elev)] p-5 shadow-[var(--shadow-1)]">
              <div className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-full" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            </div>
          )}

          {scanResult && (
            <>
              {/* Parent card */}
              <div className="rounded-[var(--r-xl)] border border-[var(--line)] bg-[var(--bg-elev)] p-5 shadow-[var(--shadow-1)]">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[16px] font-bold text-[color:var(--primary-fg)]">
                    {getInitials(scanResult.user.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold text-[color:var(--text-1)]">
                      {scanResult.user.fullName}
                    </div>
                    <div className="flex items-center gap-2 text-[13px] text-[color:var(--text-3)]">
                      {scanResult.user.phone && (
                        <span className="flex items-center gap-1">
                          <PhoneIcon className="size-3.5" />
                          {formatPhone(scanResult.user.phone)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="neutral" className="shrink-0">
                    {scanResult.user.role}
                  </Badge>
                </div>
              </div>

              {/* No allowed actions banner */}
              {noActions && isParent && (
                <div className="rounded-[var(--r-lg)] border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3 text-[13px] text-[color:var(--warning-fg)]">
                  {t('checkin.noPickupRights')}
                </div>
              )}

              {/* Empty children */}
              {isParent && children.length === 0 && (
                <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--bg-sunken)] px-4 py-6 text-center text-[13px] text-[color:var(--text-3)]">
                  {t('checkin.noChildren')}
                </div>
              )}

              {/* Children radio-cards */}
              {isParent && children.length > 0 && (
                <div className="flex flex-col gap-2">
                  {children.map((child) => (
                    <ChildRadioCard
                      key={child.id}
                      child={child}
                      selected={selectedChildId === child.id}
                      groupName={
                        child.currentGroupId ? groupMap.get(child.currentGroupId) : undefined
                      }
                      hint={buildChildHint(child.id, eventsList, t)}
                      onSelect={() => setSelectedChildId(child.id)}
                    />
                  ))}
                </div>
              )}

              {/* Action buttons */}
              {isParent && children.length > 0 && (
                <div className="flex gap-3">
                  <Button
                    size="lg"
                    className={cn(
                      'flex-1 gap-2 text-[15px]',
                      suggestedAction === 'check_in' &&
                        selectedChildId &&
                        'ring-2 ring-[var(--primary)] ring-offset-2',
                    )}
                    disabled={!selectedChildId || !hasCheckIn || noActions || isPending}
                    onClick={() => handleMark('check_in')}
                  >
                    <LogInIcon className="size-5" />
                    {t('event_type.check_in')}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className={cn(
                      'flex-1 gap-2 text-[15px]',
                      suggestedAction === 'check_out' &&
                        selectedChildId &&
                        'ring-2 ring-[var(--primary)] ring-offset-2',
                    )}
                    disabled={!selectedChildId || !hasCheckOut || noActions || isPending}
                    onClick={() => handleMark('check_out')}
                  >
                    <LogOutIcon className="size-5" />
                    {t('event_type.check_out')}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Today's events feed */}
          {eventsList.length > 0 && (
            <div className="rounded-[var(--r-xl)] border border-[var(--line)] bg-[var(--bg-elev)] p-4 shadow-[var(--shadow-1)]">
              <h3 className="mb-3 text-[14px] font-semibold text-[color:var(--text-1)]">
                {t('checkin.todayFeed')}
              </h3>
              <div className="flex flex-col gap-1.5">
                {eventsList.slice(0, 20).map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-2 rounded-[var(--r-md)] px-2 py-1.5 text-[13px] hover:bg-[var(--bg-sunken)]"
                  >
                    <span className="w-12 shrink-0 font-mono text-[12px] text-[color:var(--text-3)]">
                      {formatTimeOnly(ev.recordedAt, DEFAULT_TIMEZONE)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[color:var(--text-2)]">
                      {ev.child_name ?? '—'}
                    </span>
                    <Badge
                      variant={ev.eventType === 'check_in' ? 'success' : 'info'}
                      className="shrink-0"
                    >
                      {t(`event_type.${ev.eventType}`)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {dialogs}
    </div>
  );
}

interface ChildRadioCardProps {
  child: LinkedChild;
  selected: boolean;
  groupName?: string;
  hint: string;
  onSelect: () => void;
}

function ChildRadioCard({ child, selected, groupName, hint, onSelect }: ChildRadioCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex items-center gap-3 rounded-[var(--r-lg)] border p-3 text-left transition-colors',
        selected
          ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
          : 'border-[var(--line)] bg-[var(--bg-elev)] hover:border-[var(--border)]',
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--bg-sunken)] text-[14px] font-semibold text-[color:var(--text-2)]">
        {child.photoUrl ? (
          <img src={child.photoUrl} alt="" className="size-10 rounded-full object-cover" />
        ) : (
          <UserIcon className="size-5 text-[color:var(--text-4)]" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-[color:var(--text-1)]">{child.fullName}</div>
        <div className="flex flex-wrap items-center gap-x-2 text-[12px] text-[color:var(--text-3)]">
          {groupName && <span>{groupName}</span>}
          <span>{hint}</span>
        </div>
      </div>
      <div
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
          selected
            ? 'border-[var(--primary)] bg-[var(--primary)]'
            : 'border-[var(--border)] bg-transparent',
        )}
      >
        {selected && <div className="size-2 rounded-full bg-white" />}
      </div>
    </button>
  );
}

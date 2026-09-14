import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useCameraStream } from '@/hooks/use-cameras';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { formatDateTime } from '@/lib/format';
import { DEFAULT_TIMEZONE } from '@/lib/constants';
import { formatCodecLabel } from './codec-utils';

const CameraPlayer = lazy(() => import('@/components/media/camera-player'));

interface CameraViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cameraId: string;
  cameraName: string;
  locationName: string;
  videoCodec: string | null;
  codecCheckedAt: string | null;
}

export function CameraViewerDialog({
  open,
  onOpenChange,
  cameraId,
  cameraName,
  locationName,
  videoCodec,
  codecCheckedAt,
}: CameraViewerDialogProps) {
  const { t } = useTranslation('structure');
  const { isMobile } = useBreakpoint();

  const streamQuery = useCameraStream(cameraId, { enabled: open });

  const streams = streamQuery.data?.streams ?? [];
  const codec = streamQuery.data?.video_codec ?? videoCodec;

  function handleRetry() {
    void streamQuery.refetch();
  }

  const codecLabel = formatCodecLabel(codec);
  const checkedAtLabel = codecCheckedAt
    ? t('camera_codec_checked_at', { date: formatDateTime(codecCheckedAt, DEFAULT_TIMEZONE) })
    : null;

  const footer = (
    <div className="flex items-center gap-3 text-[12px] text-[color:var(--text-3)]">
      {codecLabel && (
        <span>{t('viewer_codec_label', { codec: codecLabel })}</span>
      )}
      {checkedAtLabel && <span>{checkedAtLabel}</span>}
      <span>{t('viewer_no_audio')}</span>
    </div>
  );

  const playerContent = (
    <Suspense
      fallback={
        <div className="aspect-[16/9] rounded-[var(--r-md)] bg-neutral-900">
          <Skeleton className="h-full w-full rounded-[var(--r-md)] bg-neutral-800" />
        </div>
      }
    >
      <CameraPlayer
        streams={streams}
        videoCodec={codec}
        isLoading={streamQuery.isLoading}
        onSessionLost={handleRetry}
        onRetry={handleRetry}
      />
    </Suspense>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          showCloseButton
          className="flex h-[100dvh] max-h-[100dvh] flex-col gap-0 rounded-none border-t-0 bg-[var(--bg)] p-0 text-[color:var(--text-1)]"
        >
          <SheetTitle className="sr-only">{cameraName}</SheetTitle>
          <SheetDescription className="sr-only">{locationName}</SheetDescription>
          <div className="flex flex-col gap-1 px-4 pt-4 pb-2">
            <div className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
              {cameraName}
            </div>
            <div className="text-[13px] text-[color:var(--text-3)]">{locationName}</div>
          </div>
          <div className="flex-1 px-4">{playerContent}</div>
          <div className="px-4 py-3">{footer}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[840px] rounded-[var(--r-xl)] border-[var(--line)] bg-[var(--bg-elev)] p-0 shadow-[var(--shadow-3)]"
        showCloseButton
      >
        <DialogHeader className="px-[22px] pt-[18px] pb-2">
          <DialogTitle className="text-[17px] font-bold tracking-[-0.01em] text-[color:var(--text-1)]">
            {cameraName}
          </DialogTitle>
          <div className="text-[13px] text-[color:var(--text-3)]">{locationName}</div>
        </DialogHeader>
        <div className="px-[22px]">{playerContent}</div>
        <div className="px-[22px] pb-[14px]">{footer}</div>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Maximize, Minimize, VideoOff, MonitorX } from 'lucide-react';
import { cn } from '@/lib/cn';
import { HLS_MAX_BUFFER_LENGTH, HLS_MAX_MAX_BUFFER_LENGTH } from '@/lib/constants';
import {
  resolvePlayback,
  detectCapabilities,
  type MediaCapabilities,
} from '@/lib/media-capabilities';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export interface CameraPlayerProps {
  streams: { transport: string; url: string }[];
  videoCodec: string | null;
  isLoading?: boolean;
  onSessionLost?: () => void;
  onRetry?: () => void;
  className?: string;
}

type PlayerState = 'connecting' | 'playing' | 'error';

export default function CameraPlayer({
  streams,
  videoCodec,
  isLoading,
  onSessionLost,
  onRetry,
  className,
}: CameraPlayerProps) {
  const { t } = useTranslation('structure');
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<HlsInstance | null>(null);
  const onSessionLostRef = useRef(onSessionLost);

  useEffect(() => {
    onSessionLostRef.current = onSessionLost;
  }, [onSessionLost]);

  const [playerState, setPlayerState] = useState<PlayerState>('connecting');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const [caps] = useState<MediaCapabilities>(() => detectCapabilities());

  const playback = isLoading
    ? null
    : resolvePlayback({ streams, videoCodec }, caps);

  const hlsUrl = playback?.kind === 'hls-js' ? playback.url : null;
  const nativeUrl = playback?.kind === 'native-hls' ? playback.url : null;

  useEffect(() => {
    if (!hlsUrl) return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    const retryState = { network: false, media: false };

    (async () => {
      const { default: Hls } = await import('hls.js');
      if (cancelled) return;

      if (!Hls.isSupported()) {
        setPlayerState('error');
        return;
      }

      const hls = new Hls({
        maxBufferLength: HLS_MAX_BUFFER_LENGTH,
        maxMaxBufferLength: HLS_MAX_MAX_BUFFER_LENGTH,
      });
      hlsRef.current = hls as HlsInstance;

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          const httpCode = data.response?.code;
          if (httpCode === 403 || httpCode === 404) {
            onSessionLostRef.current?.();
            return;
          }
          if (!retryState.network) {
            retryState.network = true;
            hls.startLoad();
            return;
          }
          setPlayerState('error');
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          if (!retryState.media) {
            retryState.media = true;
            hls.recoverMediaError();
            return;
          }
          setPlayerState('error');
        } else {
          setPlayerState('error');
        }
      });

      setPlayerState('connecting');
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
    })();

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [hlsUrl]);

  useEffect(() => {
    if (!nativeUrl) return;
    const video = videoRef.current;
    if (!video) return;

    video.src = nativeUrl;
    setPlayerState('connecting');

    function handleError() {
      onSessionLostRef.current?.();
    }
    video.addEventListener('error', handleError);
    return () => {
      video.removeEventListener('error', handleError);
      video.removeAttribute('src');
      video.load();
    };
  }, [nativeUrl]);

  // WHY the url deps: while the stream request is in flight <video> is not
  // mounted yet, so an empty dep list attaches this listener to nothing and the
  // connecting overlay stays on top of an already-playing stream forever.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function onPlaying() {
      setPlayerState('playing');
    }
    video.addEventListener('playing', onPlaying);
    // Playback can already be running by the time the listener attaches — the
    // `playing` event fires between mount and effect and would be missed.
    if (!video.paused && video.readyState >= video.HAVE_FUTURE_DATA) {
      setPlayerState('playing');
    }
    return () => video.removeEventListener('playing', onPlaying);
  }, [hlsUrl, nativeUrl]);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen();
    }
  }

  const showVideo = playback?.kind === 'hls-js' || playback?.kind === 'native-hls';

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative aspect-[16/9] overflow-hidden rounded-md bg-neutral-900',
        className,
      )}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onFocus={() => setShowControls(true)}
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          setShowControls(false);
        }
      }}
    >
      {showVideo && (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-contain"
          autoPlay
          muted
          playsInline
        />
      )}

      {(isLoading || (showVideo && playerState === 'connecting')) && (
        <Overlay>
          <Skeleton className="absolute inset-0 rounded-none bg-neutral-800" />
          <span className="relative z-10 text-sm text-neutral-300">
            {t('viewer_connecting')}
          </span>
        </Overlay>
      )}

      {playback?.kind === 'unsupported-codec' && (
        <Overlay>
          <MonitorX className="mb-2 h-10 w-10 text-neutral-400" />
          <p className="text-sm font-medium text-neutral-200">
            {t('viewer_codec_unsupported')}
          </p>
          <p className="mt-1 max-w-xs text-center text-xs text-neutral-400">
            {t('viewer_codec_unsupported_text')}
          </p>
        </Overlay>
      )}

      {playback?.kind === 'no-stream' && (
        <Overlay>
          <VideoOff className="mb-2 h-10 w-10 text-neutral-400" />
          <p className="text-sm font-medium text-neutral-200">
            {t('viewer_no_stream')}
          </p>
          <p className="mt-1 max-w-xs text-center text-xs text-neutral-400">
            {t('viewer_no_stream_text')}
          </p>
        </Overlay>
      )}

      {showVideo && playerState === 'error' && (
        <Overlay>
          <AlertTriangle className="mb-2 h-10 w-10 text-neutral-400" />
          <p className="text-sm font-medium text-neutral-200">
            {t('viewer_error')}
          </p>
          <p className="mt-1 max-w-xs text-center text-xs text-neutral-400">
            {t('viewer_error_text')}
          </p>
          {onRetry && (
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={onRetry}
            >
              {t('viewer_retry')}
            </Button>
          )}
        </Overlay>
      )}

      {showVideo && playerState === 'playing' && (
        <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-success" />
          <span className="text-xs font-medium text-white">
            {t('viewer_live')}
          </span>
        </div>
      )}

      {showVideo && playerState === 'playing' && (
        <div
          className={cn(
            'absolute right-3 bottom-3 z-10 transition-opacity',
            showControls ? 'opacity-100' : 'opacity-0',
          )}
        >
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-md bg-black/60 p-2 text-white transition-colors hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            title={isFullscreen ? t('viewer_fullscreen_exit') : t('viewer_fullscreen')}
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
      {children}
    </div>
  );
}

// WHY: hls.js is dynamically imported — we cannot use its class type at module
// scope without pulling the entire bundle into the main chunk.  This minimal
// interface covers the methods we call in the cleanup path.
interface HlsInstance {
  destroy(): void;
}

import React, { useEffect, useRef, useState, memo } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { loadYouTubeIframeApi } from './CustomVideoPlayer';

export interface InlinePreviewPlayerProps {
  videoId: string;
  thumbnailUrl: string;
  title: string;
  durationStr?: string;
  durationSeconds?: number;
  onSelect: (currentTime: number) => void;
  onOpenChannel?: (e: React.MouseEvent) => void;
}

const formatCountdown = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const InlinePreviewPlayerComponent: React.FC<InlinePreviewPlayerProps> = ({
  videoId,
  title,
  durationStr,
  durationSeconds = 60,
  onSelect,
  onOpenChannel
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const currentTimeRef = useRef<number>(0);
  const isScrubbingRef = useRef<boolean>(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRevealedRef = useRef<boolean>(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds || 60);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const clearRevealTimer = () => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  };

  const revealWhenFrameReady = () => {
    if (hasRevealedRef.current) return;
    clearRevealTimer();
    // Brief frame-paint settle so the iframe never flashes a black frame before first video frame renders
    revealTimerRef.current = setTimeout(() => {
      hasRevealedRef.current = true;
      setIsVideoVisible(true);
    }, 180);
  };

  const startPolling = () => {
    stopPolling();
    pollingIntervalRef.current = setInterval(() => {
      if (isScrubbingRef.current) return;
      try {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          const curr = playerRef.current.getCurrentTime();
          if (typeof curr === 'number' && !isNaN(curr)) {
            currentTimeRef.current = curr;
            setCurrentTime(curr);
            if (curr > 0.05 && !hasRevealedRef.current) {
              clearRevealTimer();
              hasRevealedRef.current = true;
              setIsVideoVisible(true);
            }
          }
          if (typeof playerRef.current.getDuration === 'function') {
            const dur = playerRef.current.getDuration();
            if (typeof dur === 'number' && dur > 0) {
              setDuration(dur);
            }
          }
        }
      } catch {}
    }, 200);
  };

  useEffect(() => {
    let isCancelled = false;
    clearRevealTimer();
    stopPolling();

    hasRevealedRef.current = false;
    setIsPlaying(false);
    setIsVideoVisible(false);
    setIsMuted(true);
    setIsScrubbing(false);
    isScrubbingRef.current = false;
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setDuration(durationSeconds || 60);

    const forceIframeFillStyles = (iframe: HTMLIFrameElement | null | undefined) => {
      if (!iframe) return;
      try {
        iframe.style.position = 'absolute';
        iframe.style.left = '0';
        iframe.style.right = '0';
        iframe.style.top = '-33.3333%';
        iframe.style.bottom = 'auto';
        iframe.style.width = '100%';
        iframe.style.height = '166.6667%';
        iframe.style.border = '0';
        iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
      } catch {}
    };

    loadYouTubeIframeApi().then(() => {
      if (isCancelled || !mountRef.current) return;

      // Destroy any leftover player before creating a new one
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }

      mountRef.current.innerHTML = '';
      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.left = '0';
      div.style.top = '-33.3333%';
      div.style.width = '100%';
      div.style.height = '166.6667%';
      mountRef.current.appendChild(div);

      try {
        const player = new window.YT.Player(div, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            modestbranding: 1,
            cc_load_policy: 0,
            playsinline: 1,
            fs: 0,
            rel: 0,
            cc_lang_pref: 'hi',
            hl: 'hi',
            disablekb: 1,
            iv_load_policy: 3,
            enablejsapi: 1,
            origin: window.location.origin
          },
          events: {
            onReady: (event: any) => {
              if (isCancelled) return;
              forceIframeFillStyles(
                event.target?.getIframe?.() || mountRef.current?.querySelector('iframe')
              );
              try {
                const dur = event.target?.getDuration?.();
                if (typeof dur === 'number' && dur > 0) {
                  setDuration(dur);
                }
              } catch {}
              try {
                event.target.mute?.();
                event.target.playVideo?.();
                if (event.target?.getPlayerState?.() === 1) {
                  setIsPlaying(true);
                  startPolling();
                  revealWhenFrameReady();
                }
              } catch {}
            },
            onStateChange: (event: any) => {
              if (isCancelled) return;
              const state = event?.data;
              if (state === 1) {
                // PLAYING: video loaded in background, reveal seamlessly over thumbnail
                setIsPlaying(true);
                try {
                  const dur = event.target?.getDuration?.();
                  if (typeof dur === 'number' && dur > 0) {
                    setDuration(dur);
                  }
                } catch {}
                startPolling();
                revealWhenFrameReady();
              } else {
                // PAUSED (2), BUFFERING (3), ENDED (0), CUED (5) -> stop polling
                stopPolling();
                if (state === 0) {
                  try {
                    const dur = event.target?.getDuration?.();
                    if (typeof dur === 'number' && dur > 0) {
                      setDuration(dur);
                      currentTimeRef.current = dur;
                      setCurrentTime(dur);
                    }
                  } catch {}
                }
              }
            }
          }
        });
        playerRef.current = player;
        forceIframeFillStyles(mountRef.current?.querySelector('iframe'));
      } catch (err) {
        console.warn('Preview YT.Player creation error:', err);
      }
    });

    return () => {
      isCancelled = true;
      clearRevealTimer();
      stopPolling();
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
  }, [videoId]);

  // Mute/Unmute toggle
  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (playerRef.current) {
        if (isMuted) {
          playerRef.current.unMute?.();
          setIsMuted(false);
        } else {
          playerRef.current.mute?.();
          setIsMuted(true);
        }
      }
    } catch (err) {
      console.warn('Mute toggle error:', err);
    }
  };

  // Scrubbing logic along bottom 20px strip
  const seekToPointerPosition = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const effectiveDuration = duration > 0 ? duration : durationSeconds || 60;
    const targetTime = fraction * effectiveDuration;
    currentTimeRef.current = targetTime;
    setCurrentTime(targetTime);
    try {
      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(targetTime, true);
      }
    } catch {}
  };

  const handleScrubPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
    isScrubbingRef.current = true;
    setIsScrubbing(true);
    seekToPointerPosition(e);
  };

  const handleScrubPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return;
    e.stopPropagation();
    seekToPointerPosition(e);
  };

  const handleScrubPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return;
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {}
    seekToPointerPosition(e);
    isScrubbingRef.current = false;
    setIsScrubbing(false);
  };

  const handleContainerClick = () => {
    onSelect(currentTimeRef.current);
  };

  const effectiveDuration = duration > 0 ? duration : durationSeconds || 60;
  const remainingSeconds = Math.max(0, effectiveDuration - currentTime);
  const progressPercent = Math.min(100, Math.max(0, (currentTime / (effectiveDuration || 1)) * 100));
  const badgeText =
    isPlaying || isScrubbing
      ? formatCountdown(remainingSeconds)
      : durationStr || formatCountdown(effectiveDuration);

  return (
    <div
      onClick={handleContainerClick}
      className={`relative w-full h-full overflow-hidden transition-opacity duration-200 ${
        isVideoVisible
          ? 'opacity-100 bg-black pointer-events-auto cursor-pointer'
          : 'opacity-0 pointer-events-none'
      }`}
      style={{ aspectRatio: '16 / 9' }}
    >
      {/* Fallback 16:9 spacer so height never derives from child iframe */}
      <div style={{ paddingTop: '56.25%' }} aria-hidden="true" />

      {/* z-0: Absolute YouTube mount container showing only center 60% of iframe (clipping top/bottom 20% YT UI) */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0 [&>iframe]:!absolute [&>iframe]:!left-0 [&>iframe]:!top-[-33.3333%] [&>iframe]:!w-full [&>iframe]:!h-[166.6667%] [&>iframe]:!border-0"
      />

      {/* z-15: Full-surface tap target so clicking anywhere on video immediately opens the main watch player */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          handleContainerClick();
        }}
        className="absolute inset-0 z-[15] cursor-pointer"
        aria-label={`Play ${title}`}
      />

      {/* z-20: Bottom-edge progress line + 20px transparent touch scrub area */}
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handleScrubPointerDown}
        onPointerMove={handleScrubPointerMove}
        onPointerUp={handleScrubPointerEnd}
        onPointerCancel={handleScrubPointerEnd}
        className="absolute bottom-0 inset-x-0 h-5 z-20 flex items-end cursor-pointer"
        style={{ touchAction: 'none' }}
        aria-label="Seek video preview"
      >
        <div
          className={`w-full relative bg-white/25 transition-[height] duration-100 ${
            isScrubbing ? 'h-[5px]' : 'h-[3px]'
          }`}
        >
          <div
            className="h-full bg-[#ff0000]"
            style={{ width: `${progressPercent}%` }}
          />
          {(isPlaying || isScrubbing) && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-[#ff0000] pointer-events-none transition-[width,height] duration-100 ${
                isScrubbing ? 'w-4 h-4' : 'w-3 h-3'
              }`}
              style={{ left: `${progressPercent}%` }}
            />
          )}
        </div>
      </div>

      {/* z-30: Top-right crisp white countdown timer matching reference image */}
      <div className="absolute top-2.5 right-3 pointer-events-none z-30">
        <span
          className="text-[13px] font-medium tabular-nums text-white leading-none"
          style={{
            fontFamily: "'Inter', sans-serif",
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.85)'
          }}
        >
          {badgeText}
        </span>
      </div>

      {/* z-30: Bottom-left subtle channel tag circle matching reference image */}
      {onOpenChannel && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onOpenChannel(e);
          }}
          className="absolute bottom-3 left-3 w-7 h-7 rounded-full flex items-center justify-center text-white pointer-events-auto z-30 active:scale-95 transition-transform"
          style={{ backgroundColor: 'rgba(20, 20, 20, 0.72)' }}
          title="Open channel"
          aria-label="Open channel"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2c0 .7.5 1.2 1.2 1.2h16.8c.7 0 1.2-.5 1.2-1.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
        </button>
      )}

      {/* z-30: Bottom-right mute button (sleek dark circle matching reference image) */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-2 pointer-events-auto z-30">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleToggleMute}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors active:scale-95"
          style={{ backgroundColor: 'rgba(20, 20, 20, 0.78)' }}
          title={isMuted ? 'Unmute' : 'Mute'}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      </div>
    </div>
  );
};

export const InlinePreviewPlayer = memo(InlinePreviewPlayerComponent);

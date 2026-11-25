import React, { useEffect, useRef, useState, memo } from 'react';
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

const InlinePreviewPlayerComponent: React.FC<InlinePreviewPlayerProps> = ({
  videoId,
  title,
  onSelect
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const currentTimeRef = useRef<number>(0);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRevealedRef = useRef<boolean>(false);

  const [isVideoVisible, setIsVideoVisible] = useState(false);

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
      try {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          const curr = playerRef.current.getCurrentTime();
          if (typeof curr === 'number' && !isNaN(curr)) {
            currentTimeRef.current = curr;
            if (curr > 0.05 && !hasRevealedRef.current) {
              clearRevealTimer();
              hasRevealedRef.current = true;
              setIsVideoVisible(true);
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
    setIsVideoVisible(false);
    currentTimeRef.current = 0;

    const forceIframeFillStyles = (iframe: HTMLIFrameElement | null | undefined) => {
      if (!iframe) return;
      try {
        iframe.style.position = 'absolute';
        iframe.style.inset = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
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
      div.style.inset = '0';
      div.style.width = '100%';
      div.style.height = '100%';
      mountRef.current.appendChild(div);

      try {
        const player = new window.YT.Player(div, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 1,
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
                event.target.mute?.();
                event.target.playVideo?.();
                if (event.target?.getPlayerState?.() === 1) {
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
                startPolling();
                revealWhenFrameReady();
              } else {
                // PAUSED (2), BUFFERING (3), ENDED (0), CUED (5) -> stop polling
                stopPolling();
                if (state === 0) {
                  try {
                    const dur = event.target?.getDuration?.();
                    if (typeof dur === 'number' && dur > 0) {
                      currentTimeRef.current = dur;
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

  const handleContainerClick = () => {
    onSelect(currentTimeRef.current);
  };

  return (
    <div
      onClick={handleContainerClick}
      className={`relative w-full h-full flex items-center justify-center overflow-hidden transition-opacity duration-200 ${
        isVideoVisible
          ? 'opacity-100 pointer-events-auto cursor-pointer'
          : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* 60% size YouTube iframe player centered over the always-visible thumbnail */}
      <div className="relative w-[60%] h-[60%] bg-black overflow-hidden shadow-lg">
        <div
          ref={mountRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-0 [&>iframe]:!absolute [&>iframe]:!inset-0 [&>iframe]:!w-full [&>iframe]:!h-full [&>iframe]:!border-0"
        />
      </div>

      {/* Full-surface tap target so tapping opens the main watch player at current timestamp */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          handleContainerClick();
        }}
        className="absolute inset-0 z-[15] cursor-pointer"
        aria-label={`Play ${title}`}
      />
    </div>
  );
};

export const InlinePreviewPlayer = memo(InlinePreviewPlayerComponent);

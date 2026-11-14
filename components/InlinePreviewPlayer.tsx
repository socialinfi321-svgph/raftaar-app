import React, { useEffect, useRef, useState, memo } from 'react';
import { Volume2, VolumeX, Subtitles } from 'lucide-react';
import { loadYouTubeIframeApi } from './CustomVideoPlayer';

export interface InlinePreviewPlayerProps {
  videoId: string;
  thumbnailUrl: string;
  title: string;
  durationStr?: string;
  durationSeconds?: number;
  onSelect: (currentTime: number) => void;
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
  thumbnailUrl,
  title,
  durationStr,
  durationSeconds = 60,
  onSelect
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const currentTimeRef = useRef<number>(0);
  const isScrubbingRef = useRef<boolean>(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ccCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isCC, setIsCC] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds || 60);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
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
          }
          if (typeof playerRef.current.getDuration === 'function') {
            const dur = playerRef.current.getDuration();
            if (typeof dur === 'number' && dur > 0) {
              setDuration(dur);
            }
          }
        }
      } catch {}
    }, 250);
  };

  useEffect(() => {
    let isCancelled = false;
    setIsPlaying(false);
    setIsMuted(true);
    setIsCC(false);
    setIsScrubbing(false);
    isScrubbingRef.current = false;
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setDuration(durationSeconds || 60);

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
            controls: 0,
            playsinline: 1,
            fs: 0,
            rel: 0,
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
                event.target.playVideo();
              } catch {}
            },
            onStateChange: (event: any) => {
              if (isCancelled) return;
              const state = event?.data;
              if (state === 1) {
                // PLAYING
                setIsPlaying(true);
                try {
                  const dur = event.target?.getDuration?.();
                  if (typeof dur === 'number' && dur > 0) {
                    setDuration(dur);
                  }
                } catch {}
                startPolling();
              } else {
                // PAUSED (2), BUFFERING (3), ENDED (0), CUED (5) -> stop polling
                stopPolling();
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
      stopPolling();
      if (ccCheckTimerRef.current) {
        clearTimeout(ccCheckTimerRef.current);
        ccCheckTimerRef.current = null;
      }
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

  // Closed Captions (CC) toggle with Hindi -> English -> First track fallback
  const handleToggleCC = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ccCheckTimerRef.current) {
      clearTimeout(ccCheckTimerRef.current);
      ccCheckTimerRef.current = null;
    }

    if (!isCC) {
      setIsCC(true);
      try {
        playerRef.current?.loadModule?.('captions');
        playerRef.current?.setOption?.('captions', 'track', { languageCode: 'hi' });
      } catch {}

      ccCheckTimerRef.current = setTimeout(() => {
        try {
          const tracks = playerRef.current?.getOption?.('captions', 'tracklist');
          if (!Array.isArray(tracks) || tracks.length === 0) {
            setIsCC(false);
            window.dispatchEvent(
              new CustomEvent('raftaar:toast', {
                detail: { message: 'Is video mein captions nahi hain' }
              })
            );
            return;
          }

          const hiTrack = tracks.find((t: any) => {
            const code = String(t?.languageCode || '').toLowerCase();
            return code === 'hi' || code === 'hi-in';
          });
          const enTrack = tracks.find((t: any) => {
            const code = String(t?.languageCode || '').toLowerCase();
            return code === 'en' || code === 'en-us' || code === 'en-gb';
          });
          const chosen = hiTrack || enTrack || tracks[0];

          if (chosen?.languageCode) {
            playerRef.current?.setOption?.('captions', 'track', {
              languageCode: chosen.languageCode
            });
          } else {
            playerRef.current?.setOption?.('captions', 'track', chosen);
          }
        } catch {
          setIsCC(false);
          window.dispatchEvent(
            new CustomEvent('raftaar:toast', {
              detail: { message: 'Is video mein captions nahi hain' }
            })
          );
        }
      }, 600);
    } else {
      setIsCC(false);
      try {
        playerRef.current?.setOption?.('captions', 'track', {});
        playerRef.current?.unloadModule?.('captions');
      } catch {}
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
      className="relative w-full overflow-hidden bg-black cursor-pointer"
      style={{ aspectRatio: '16 / 9' }}
    >
      {/* Fallback 16:9 spacer so height never derives from child iframe */}
      <div style={{ paddingTop: '56.25%' }} aria-hidden="true" />

      {/* z-0: Absolute YouTube mount container overriding default 640x390 iframe sizing */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0 [&>iframe]:!absolute [&>iframe]:!inset-0 [&>iframe]:!w-full [&>iframe]:!h-full [&>iframe]:!border-0"
      />

      {/* z-10: Thumbnail overlay stays visible until PLAYING (state 1), then fades out in 150ms */}
      <div
        className={`absolute inset-0 z-10 bg-black pointer-events-none transition-opacity duration-150 ${
          isPlaying ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>

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

      {/* z-30: Bottom overlay row (Left plain white countdown + Right vertical CC & Mute 40x40 circles) */}
      <div className="absolute inset-x-0 bottom-5 px-3 flex items-end justify-between pointer-events-none z-30">
        {/* Left: Plain white countdown timer vertically aligned with Mute button */}
        <span
          className="min-h-[40px] flex items-center text-white text-[14px] font-medium tabular-nums leading-none"
          style={{
            fontFamily: "'Inter', sans-serif",
            textShadow: '0 1px 3px rgba(0,0,0,0.65)'
          }}
        >
          {badgeText}
        </span>

        {/* Right: Vertical column (CC on top, Mute below), 40x40 circles */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleToggleCC}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-95 ${
              isCC ? 'bg-white text-black' : 'text-white'
            }`}
            style={isCC ? undefined : { backgroundColor: 'rgba(38, 38, 38, 0.75)' }}
            title={isCC ? 'Turn off captions' : 'Turn on captions'}
            aria-label={isCC ? 'Turn off captions' : 'Turn on captions'}
          >
            <Subtitles size={18} />
          </button>

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleToggleMute}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors active:scale-95"
            style={{ backgroundColor: 'rgba(38, 38, 38, 0.75)' }}
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export const InlinePreviewPlayer = memo(InlinePreviewPlayerComponent);

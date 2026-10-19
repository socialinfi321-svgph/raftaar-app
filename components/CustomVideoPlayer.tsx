import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  memo
} from 'react';
import {
  AlertCircle,
  ExternalLink,
  SkipForward,
  VolumeX
} from 'lucide-react';

export interface CustomVideoPlayerRef {
  seekTo: (seconds: number) => void;
}

export interface CustomVideoPlayerProps {
  videoId: string;
  title?: string;
  totalDurationStr?: string;
  onBack?: () => void;
  onPlayNext?: () => void;
  onSeekReady?: (seekTo: (seconds: number) => void) => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Global singleton loader for official YouTube IFrame Player API
let ytApiPromise: Promise<void> | null = null;
export const loadYouTubeIframeApi = (): Promise<void> => {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }
  if (!ytApiPromise) {
    ytApiPromise = new Promise<void>((resolve) => {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === 'function') prevCallback();
        resolve();
      };
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        document.head.appendChild(tag);
      }
    });
  }
  return ytApiPromise;
};

// 3. Module load warm-up
if (typeof window !== 'undefined') {
  loadYouTubeIframeApi();
}

const CustomVideoPlayerComponent = forwardRef<CustomVideoPlayerRef, CustomVideoPlayerProps>(
  ({ videoId, onPlayNext, onSeekReady }, ref) => {
    const playerWrapperRef = useRef<HTMLDivElement>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const playerInstanceRef = useRef<any>(null);
    const loadedVideoIdRef = useRef<string | null>(null);
    const onPlayNextRef = useRef(onPlayNext);
    onPlayNextRef.current = onPlayNext;

    const [hasEmbedError, setHasEmbedError] = useState(false);
    const [isIframeVisible, setIsIframeVisible] = useState(false);
    const [showUnmutePill, setShowUnmutePill] = useState(false);

    const hasStartedPlayingRef = useRef(false);
    const thumbnailTimeoutRef = useRef<any>(null);
    const unmuteCheckTimeoutRef = useRef<any>(null);

    // Warm-up on mount as well
    useEffect(() => {
      loadYouTubeIframeApi();
    }, []);

    // 4. FULLSCREEN + LANDSCAPE: Listen to native fullscreen changes & lock orientation to landscape
    useEffect(() => {
      const handleFullscreenChange = async () => {
        try {
          const fsElement =
            document.fullscreenElement || (document as any).webkitFullscreenElement;
          if (fsElement) {
            // Entered fullscreen via native YouTube button
            try {
              await (screen.orientation as any)?.lock?.('landscape');
            } catch {}
          } else {
            // Exited fullscreen
            try {
              (screen.orientation as any)?.unlock?.();
            } catch {}
          }
        } catch {}
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        try {
          (screen.orientation as any)?.unlock?.();
        } catch {}
      };
    }, []);

    // Expose controls to parent via ref
    const seekTo = (seconds: number) => {
      try {
        if (playerInstanceRef.current && typeof playerInstanceRef.current.seekTo === 'function') {
          playerInstanceRef.current.seekTo(seconds, true);
          if (typeof playerInstanceRef.current.playVideo === 'function') {
            playerInstanceRef.current.playVideo();
          }
        }
      } catch (err) {
        console.warn('Seek error:', err);
      }
    };

    useImperativeHandle(ref, () => ({
      seekTo
    }), []);

    useEffect(() => {
      if (onSeekReady) {
        onSeekReady(seekTo);
      }
    }, [onSeekReady]);

    // Resume saved progress
    const handleResume = (player: any, vId: string) => {
      try {
        const savedTime = Number(localStorage.getItem(`raftaar_progress_${vId}`));
        const duration = typeof player.getDuration === 'function' ? player.getDuration() : 0;
        if (savedTime && savedTime >= 3 && (duration <= 0 || savedTime < duration - 10)) {
          player.seekTo(savedTime, true);
        }
      } catch {}
    };

    // Unmute action
    const handleUnmute = () => {
      try {
        if (playerInstanceRef.current && typeof playerInstanceRef.current.unMute === 'function') {
          playerInstanceRef.current.unMute();
        }
      } catch (err) {
        console.warn('Manual unMute failed:', err);
      }
      setShowUnmutePill(false);
    };

    // Helper to ensure iframe has allow & allowfullscreen
    const setIframeAttributes = (iframe: HTMLIFrameElement | null | undefined) => {
      if (iframe) {
        try {
          iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
          iframe.setAttribute('allowfullscreen', 'true');
        } catch {}
      }
    };

    // Initialize or load video using Official YouTube IFrame API
    useEffect(() => {
      let isCancelled = false;

      // Same videoId optimization: do not destroy or recreate player
      if (loadedVideoIdRef.current === videoId && playerInstanceRef.current) {
        return;
      }

      setHasEmbedError(false);
      setIsIframeVisible(false);
      setShowUnmutePill(false);
      hasStartedPlayingRef.current = false;

      if (thumbnailTimeoutRef.current) clearTimeout(thumbnailTimeoutRef.current);
      if (unmuteCheckTimeoutRef.current) clearTimeout(unmuteCheckTimeoutRef.current);

      // Max 4s timeout fallback to reveal iframe
      thumbnailTimeoutRef.current = setTimeout(() => {
        if (!isCancelled) {
          setIsIframeVisible(true);
        }
      }, 4000);

      // Reuse existing player instance with loadVideoById
      if (playerInstanceRef.current && typeof playerInstanceRef.current.loadVideoById === 'function') {
        try {
          loadedVideoIdRef.current = videoId;
          playerInstanceRef.current.loadVideoById(videoId);
          handleResume(playerInstanceRef.current, videoId);
          if (typeof playerInstanceRef.current.playVideo === 'function') {
            playerInstanceRef.current.playVideo();
          }
          return;
        } catch (err) {
          console.warn('loadVideoById failed, re-creating player:', err);
        }
      }

      loadYouTubeIframeApi().then(() => {
        if (isCancelled || !playerContainerRef.current) return;

        // Clean container div before mounting new player
        playerContainerRef.current.innerHTML = '';
        const mountDiv = document.createElement('div');
        mountDiv.style.width = '100%';
        mountDiv.style.height = '100%';
        playerContainerRef.current.appendChild(mountDiv);

        try {
          loadedVideoIdRef.current = videoId;
          playerInstanceRef.current = new window.YT.Player(mountDiv, {
            videoId,
            playerVars: {
              autoplay: 1,
              mute: 1,
              controls: 1,
              fs: 1,
              playsinline: 1,
              rel: 0,
              iv_load_policy: 3,
              enablejsapi: 1,
              origin: window.location.origin
            },
            events: {
              onReady: (event: any) => {
                if (isCancelled) return;
                setIframeAttributes(
                  event.target.getIframe?.() ||
                    playerContainerRef.current?.querySelector('iframe')
                );
                handleResume(event.target, videoId);
                try {
                  event.target.playVideo();
                } catch {}
              },
              onStateChange: (event: any) => {
                const state = event?.data;

                // State 1: PLAYING
                if (state === 1) {
                  if (!hasStartedPlayingRef.current) {
                    hasStartedPlayingRef.current = true;
                    setIsIframeVisible(true);
                    if (thumbnailTimeoutRef.current) {
                      clearTimeout(thumbnailTimeoutRef.current);
                    }

                    // Try calling unMute()
                    try {
                      event.target.unMute();
                    } catch (err) {
                      console.warn('Initial unMute error:', err);
                    }

                    // Check after 1.5s if still muted
                    unmuteCheckTimeoutRef.current = setTimeout(() => {
                      try {
                        if (
                          playerInstanceRef.current &&
                          typeof playerInstanceRef.current.isMuted === 'function'
                        ) {
                          if (playerInstanceRef.current.isMuted()) {
                            setShowUnmutePill(true);
                          }
                        }
                      } catch {}
                    }, 1500);
                  }
                } else if (state === 0 && onPlayNextRef.current) {
                  // State 0: ENDED
                  onPlayNextRef.current();
                }
              },
              onError: (event: any) => {
                const code = Number(event?.data);
                // Only treat official embed errors as errors
                if ([2, 5, 100, 101, 150, 153].includes(code)) {
                  setHasEmbedError(true);
                  setIsIframeVisible(true);
                  if (thumbnailTimeoutRef.current) {
                    clearTimeout(thumbnailTimeoutRef.current);
                  }
                }
              }
            }
          });

          // Set iframe attributes immediately before onReady
          setIframeAttributes(playerContainerRef.current?.querySelector('iframe'));
        } catch (err) {
          console.warn('YT.Player initialization warning:', err);
        }
      });

      return () => {
        isCancelled = true;
        if (thumbnailTimeoutRef.current) clearTimeout(thumbnailTimeoutRef.current);
        if (unmuteCheckTimeoutRef.current) clearTimeout(unmuteCheckTimeoutRef.current);
      };
    }, [videoId]);

    // Cleanup player only on component unmount
    useEffect(() => {
      return () => {
        if (playerInstanceRef.current && typeof playerInstanceRef.current.destroy === 'function') {
          try {
            playerInstanceRef.current.destroy();
          } catch {}
          playerInstanceRef.current = null;
          loadedVideoIdRef.current = null;
        }
        if (thumbnailTimeoutRef.current) clearTimeout(thumbnailTimeoutRef.current);
        if (unmuteCheckTimeoutRef.current) clearTimeout(unmuteCheckTimeoutRef.current);
      };
    }, []);

    // Save resume position periodically
    useEffect(() => {
      const progressInterval = setInterval(() => {
        try {
          if (
            playerInstanceRef.current &&
            typeof playerInstanceRef.current.getCurrentTime === 'function'
          ) {
            const curr = playerInstanceRef.current.getCurrentTime();
            if (typeof curr === 'number' && curr > 3) {
              localStorage.setItem(`raftaar_progress_${videoId}`, String(Math.floor(curr)));
            }
          }
        } catch {}
      }, 8000);

      return () => clearInterval(progressInterval);
    }, [videoId]);

    return (
      <div className="w-full bg-black flex flex-col">
        {/* Video Player Area: Pure aspect-video, no select-none, no top strip, no absolute overlays */}
        <div
          ref={playerWrapperRef}
          className="w-full bg-black relative aspect-video overflow-hidden"
          style={{
            backgroundImage: `url(https://i.ytimg.com/vi/${videoId}/hqdefault.jpg)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Video iframe container: opacity-0 until first PLAYING or 4s timeout */}
          <div
            ref={playerContainerRef}
            className={`w-full h-full flex items-center justify-center transition-opacity duration-300 [&>iframe]:w-full [&>iframe]:h-full ${
              isIframeVisible ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Embed Error Banner: Only absolute card allowed, shown only on error codes 2, 5, 100, 101, 150, 153 */}
          {hasEmbedError && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
              <AlertCircle size={36} className="text-amber-400 mb-2" />
              <p className="text-sm font-semibold mb-1 text-slate-200">
                Is video ko yahan nahi chala sakte
              </p>
              <p className="text-xs text-slate-400 mb-4 max-w-xs">
                Creator ne is video ko third-party apps me chalana disable kiya hua hai.
              </p>
              <div className="flex items-center gap-3">
                <a
                  href={`https://www.youtube.com/watch?v=${videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  <ExternalLink size={14} />
                  <span>Open on YouTube</span>
                </a>
                {onPlayNext && (
                  <button
                    onClick={onPlayNext}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
                  >
                    <SkipForward size={14} />
                    <span>Next video</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tap to Unmute Pill: Strictly BELOW the player, never over the video */}
        {showUnmutePill && (
          <div className="w-full flex items-center justify-center py-2 bg-neutral-950">
            <button
              type="button"
              onClick={handleUnmute}
              className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded-full shadow-md active:scale-95 transition-all"
            >
              <VolumeX size={14} />
              <span>Tap to unmute</span>
            </button>
          </div>
        )}
      </div>
    );
  }
);

CustomVideoPlayerComponent.displayName = 'CustomVideoPlayer';

export const CustomVideoPlayer = memo(CustomVideoPlayerComponent);

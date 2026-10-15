import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  memo
} from 'react';
import {
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  SkipForward
} from 'lucide-react';

export interface CustomVideoPlayerRef {
  seekTo: (seconds: number) => void;
}

export interface CustomVideoPlayerProps {
  videoId: string;
  title: string;
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
const loadYouTubeIframeApi = (): Promise<void> => {
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

const CustomVideoPlayerComponent = forwardRef<CustomVideoPlayerRef, CustomVideoPlayerProps>(
  ({ videoId, onBack, onPlayNext, onSeekReady }, ref) => {
    const playerWrapperRef = useRef<HTMLDivElement>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const playerInstanceRef = useRef<any>(null);
    const loadedVideoIdRef = useRef<string | null>(null);
    const onPlayNextRef = useRef(onPlayNext);
    onPlayNextRef.current = onPlayNext;

    const [hasEmbedError, setHasEmbedError] = useState(false);

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

    // Handle resume time checking
    const handleResume = (player: any, vId: string) => {
      try {
        const savedTime = Number(localStorage.getItem(`raftaar_progress_${vId}`));
        const duration = typeof player.getDuration === 'function' ? player.getDuration() : 0;
        if (savedTime && savedTime >= 3 && (duration <= 0 || savedTime < duration - 10)) {
          player.seekTo(savedTime, true);
        }
      } catch {}
    };

    // Initialize or reload YouTube player using official IFrame API
    useEffect(() => {
      let isCancelled = false;
      setHasEmbedError(false);

      // Avoid re-initialization if same video is already loaded
      if (loadedVideoIdRef.current === videoId && playerInstanceRef.current) {
        return;
      }

      loadYouTubeIframeApi().then(() => {
        if (isCancelled || !playerContainerRef.current) return;

        // If player already exists, load video by ID
        if (playerInstanceRef.current && typeof playerInstanceRef.current.loadVideoById === 'function') {
          try {
            loadedVideoIdRef.current = videoId;
            playerInstanceRef.current.loadVideoById(videoId);
            handleResume(playerInstanceRef.current, videoId);
            if (typeof playerInstanceRef.current.playVideo === 'function') {
              playerInstanceRef.current.playVideo();
            }
            return;
          } catch {
            // Re-create player if reload fails
          }
        }

        // Clean container div before instantiation
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
              controls: 1,
              rel: 0,
              playsinline: 1,
              fs: 1,
              iv_load_policy: 3,
              origin: window.location.origin
            },
            events: {
              onReady: (event: any) => {
                if (isCancelled) return;
                try {
                  const iframe = event.target.getIframe?.();
                  if (iframe) {
                    iframe.setAttribute(
                      'allow',
                      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen'
                    );
                    iframe.setAttribute('allowfullscreen', 'true');
                  }
                } catch {}
                handleResume(event.target, videoId);
                try {
                  event.target.playVideo();
                } catch {}
              },
              onStateChange: (event: any) => {
                // state === 0 means ENDED
                if (event.data === 0 && onPlayNextRef.current) {
                  onPlayNextRef.current();
                }
              },
              onError: (event: any) => {
                const code = Number(event.data);
                if ([2, 5, 100, 101, 150, 153].includes(code)) {
                  setHasEmbedError(true);
                }
              }
            }
          });
        } catch (err) {
          console.warn('YT.Player creation warning:', err);
        }
      });

      return () => {
        isCancelled = true;
      };
    }, [videoId]);

    // Cleanup player on unmount
    useEffect(() => {
      return () => {
        if (playerInstanceRef.current && typeof playerInstanceRef.current.destroy === 'function') {
          try {
            playerInstanceRef.current.destroy();
          } catch {}
          playerInstanceRef.current = null;
          loadedVideoIdRef.current = null;
        }
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
      <div
        ref={playerWrapperRef}
        className="w-full bg-black relative aspect-video select-none overflow-hidden"
      >
        {/* Floating Back Button (Top Left) */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="absolute top-2 left-2 z-20 p-2 rounded-full bg-black/45 hover:bg-black/75 text-white backdrop-blur-xs transition-all active:scale-90 shadow-md"
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        {/* Video Box with native YouTube controls & native fullscreen button */}
        <div
          ref={playerContainerRef}
          className="w-full h-full flex items-center justify-center [&>iframe]:w-full [&>iframe]:h-full"
        />

        {/* Embed Error Banner (Only shown if YouTube video cannot be embedded) */}
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
    );
  }
);

CustomVideoPlayerComponent.displayName = 'CustomVideoPlayer';

export const CustomVideoPlayer = memo(CustomVideoPlayerComponent);

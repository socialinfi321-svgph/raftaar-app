import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, AlertCircle, ExternalLink, SkipForward, Maximize, Minimize } from 'lucide-react';

interface CustomVideoPlayerProps {
  videoId: string;
  title: string;
  totalDurationStr?: string;
  onBack?: () => void;
  onPlayNext?: () => void;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  videoId,
  title,
  onBack,
  onPlayNext
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasEmbedError, setHasEmbedError] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isManualWide, setIsManualWide] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isPortrait, setIsPortrait] = useState(
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls after 2.8 seconds
  const resetHideTimer = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setShowControls(true);
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2800);
  };

  // Toggle controls on user tap/click
  const handleToggleControls = () => {
    setShowControls(prev => {
      if (prev) {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        return false;
      } else {
        resetHideTimer();
        return true;
      }
    });
  };

  // Show controls briefly on video load, then auto-hide
  useEffect(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2200);

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [videoId]);

  // Handle YouTube iframe error messages
  useEffect(() => {
    setIsLoaded(false);
    setHasEmbedError(false);

    const handleMessage = (event: MessageEvent) => {
      try {
        if (!event.data) return;
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        const code = Number(data?.info ?? data?.data);
        if (
          data &&
          (data.event === 'onError' || [2, 5, 100, 101, 150].includes(code))
        ) {
          setHasEmbedError(true);
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [videoId]);

  // Orientation & Fullscreen detection
  useEffect(() => {
    const handleCheck = () => {
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);

      const isMobile =
        /Mobi|Android|iPhone|iPod/i.test(navigator.userAgent) ||
        (window.matchMedia('(pointer: coarse)').matches && Math.min(window.innerWidth, window.innerHeight) <= 600);

      let landscape = false;
      if (isMobile) {
        if (window.screen?.orientation) {
          landscape = window.screen.orientation.type.includes('landscape');
        } else {
          landscape = Math.abs(Number(window.orientation || 0)) === 90 || window.innerWidth > window.innerHeight;
        }
      }
      setIsLandscape(landscape);
    };

    const handleFullscreenChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs && !isLandscape) {
        setIsManualWide(false);
      }
    };

    handleCheck();
    window.addEventListener('resize', handleCheck);
    window.addEventListener('orientationchange', handleCheck);
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', handleCheck);
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('resize', handleCheck);
      window.removeEventListener('orientationchange', handleCheck);
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', handleCheck);
      }
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isLandscape]);

  // Toggle Fullscreen / Horizontal Wide expansion
  const handleToggleFullscreen = async () => {
    const nextWide = !isManualWide;
    setIsManualWide(nextWide);
    resetHideTimer();

    const elem = containerRef.current;
    if (nextWide) {
      // Enter wide mode
      if (elem && !document.fullscreenElement) {
        try {
          if (elem.requestFullscreen) {
            await elem.requestFullscreen();
          } else if ((elem as any).webkitRequestFullscreen) {
            await (elem as any).webkitRequestFullscreen();
          }
        } catch {}
      }
      try {
        if ((screen.orientation as any)?.lock) {
          await (screen.orientation as any).lock('landscape');
        }
      } catch {}
    } else {
      // Exit wide mode
      if (document.fullscreenElement) {
        try {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          }
        } catch {}
      }
      try {
        if ((screen.orientation as any)?.unlock) {
          (screen.orientation as any).unlock();
        }
      } catch {}
    }
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1&enablejsapi=1&fs=1&origin=${encodeURIComponent(originUrl)}`;

  const isWide = isManualWide || isFullscreen || isLandscape;

  return (
    <div
      ref={containerRef}
      className={`bg-black select-none transition-all duration-300 relative ${
        isWide
          ? 'fixed inset-0 z-[99999] w-screen h-[100dvh] bg-black flex items-center justify-center overflow-hidden'
          : 'w-full aspect-video sm:rounded-2xl overflow-hidden shadow-xl flex flex-col'
      }`}
    >
      {/* Inner Video Canvas: When user is on portrait phone in wide mode, rotates 90deg to be full horizontal display */}
      <div
        className="relative bg-black flex items-center justify-center overflow-hidden transition-all duration-300"
        style={
          isWide && isPortrait
            ? {
                width: '100dvh',
                height: '100vw',
                transform: 'rotate(90deg)',
                transformOrigin: 'center center'
              }
            : {
                width: '100%',
                height: '100%'
              }
        }
      >
        {/* Invisible Tap Zone at the top to toggle controls without interrupting YouTube iframe player */}
        <div
          onClick={handleToggleControls}
          className="absolute top-0 left-0 right-0 h-16 z-20 cursor-pointer"
          title="Tap to toggle controls"
        />

        {/* Top Overlay: Small title and back chevron (Fades out when inactive, NO wide button here) */}
        <div
          className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/90 via-black/40 to-transparent transition-opacity duration-300 pointer-events-none ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 pr-2 pointer-events-auto">
            {onBack && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isWide) {
                    setIsManualWide(false);
                    if (document.fullscreenElement) {
                      document.exitFullscreen?.().catch(() => {});
                    }
                  } else {
                    onBack();
                  }
                }}
                className="p-1 rounded-full text-white/95 hover:text-white hover:bg-white/20 active:scale-95 transition-all shrink-0"
                title={isWide ? 'Exit Full Screen' : 'Close video'}
                aria-label={isWide ? 'Exit Full Screen' : 'Close video'}
              >
                <ChevronDown size={22} />
              </button>
            )}
            {/* Small title that disappears automatically with controls */}
            <span className="text-[12px] sm:text-xs font-normal text-white/90 truncate max-w-[75vw] drop-shadow-sm">
              {title}
            </span>
          </div>
        </div>

        {/* Bottom Right: Fullscreen / Horizontal Wide Button (Always works and rotates to horizontal) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleFullscreen();
          }}
          className={`absolute bottom-3 right-3 z-30 flex items-center justify-center w-9 h-9 rounded-lg bg-black/75 hover:bg-black/90 text-white/95 hover:text-white backdrop-blur-md border border-white/20 active:scale-90 shadow-xl transition-all duration-200 pointer-events-auto ${
            showControls || isWide ? 'opacity-100 scale-100' : 'opacity-70 sm:opacity-0 hover:opacity-100'
          }`}
          title={isWide ? 'Exit Full Screen' : 'Full Screen Horizontal'}
          aria-label={isWide ? 'Exit Full Screen' : 'Full Screen Horizontal'}
        >
          {isWide ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>

        {/* Video Container: Exact 16:9 proper shape, zero crop, zero black badges */}
        <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
          {/* Loading Spinner behind iframe */}
          {!isLoaded && !hasEmbedError && (
            <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-black text-white">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {/* Embed Error Banner */}
          {hasEmbedError ? (
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
          ) : (
            <iframe
              key={videoId}
              src={embedUrl}
              title={title}
              referrerPolicy="strict-origin-when-cross-origin"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              onLoad={() => setIsLoaded(true)}
              className="w-full h-full border-0 absolute inset-0"
              style={{ width: '100%', height: '100%' }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

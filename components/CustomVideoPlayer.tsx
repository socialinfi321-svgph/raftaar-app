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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls after 2.5 seconds
  const resetHideTimer = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setShowControls(true);
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2500);
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
    }, 2000);

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

  // Mobile Orientation & Fullscreen detection
  useEffect(() => {
    const isMobileDevice = () => {
      if (typeof window === 'undefined') return false;
      return (
        /Mobi|Android|iPhone|iPod/i.test(navigator.userAgent) ||
        (window.matchMedia('(pointer: coarse)').matches && Math.min(window.innerWidth, window.innerHeight) <= 600)
      );
    };

    const handleOrientation = () => {
      const isMobile = isMobileDevice();
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
      setIsFullscreen(!!document.fullscreenElement);
    };

    handleOrientation();
    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', handleOrientation);
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', handleOrientation);
      }
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Toggle Fullscreen / Landscape expansion
  const handleToggleFullscreen = async () => {
    const elem = containerRef.current;
    if (!elem) return;

    if (!document.fullscreenElement) {
      try {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen();
        }
        if ((screen.orientation as any)?.lock) {
          try {
            await (screen.orientation as any).lock('landscape');
          } catch {}
        }
        setIsFullscreen(true);
      } catch {
        setIsFullscreen(prev => !prev);
      }
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        if ((screen.orientation as any)?.unlock) {
          try {
            (screen.orientation as any).unlock();
          } catch {}
        }
        setIsFullscreen(false);
      } catch {
        setIsFullscreen(false);
      }
    }
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(originUrl)}`;

  const isWide = isFullscreen || isLandscape;

  return (
    <div
      ref={containerRef}
      className={`bg-black overflow-hidden select-none transition-all duration-300 relative ${
        isWide
          ? 'fixed inset-0 z-[99999] w-screen h-[100dvh] flex flex-col items-center justify-center'
          : 'w-full aspect-video sm:rounded-2xl shadow-xl flex flex-col'
      }`}
    >
      {/* Invisible Touch Zone at the top to toggle controls without interrupting YouTube iframe player */}
      <div
        onClick={handleToggleControls}
        className="absolute top-0 left-0 right-0 h-14 z-20 cursor-pointer"
        title="Tap to toggle controls"
      />

      {/* Tap-to-show / auto-hide top overlay with small title and back chevron (Fades out when inactive) */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 py-1.5 bg-gradient-to-b from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 pr-2">
          {onBack && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isWide && document.fullscreenElement) {
                  document.exitFullscreen?.().catch(() => {});
                }
                onBack();
              }}
              className="p-1 rounded-full text-white/95 hover:text-white hover:bg-white/20 active:scale-95 transition-all shrink-0"
              title="Close video"
              aria-label="Close video"
            >
              <ChevronDown size={20} />
            </button>
          )}
          {/* Small title that disappears automatically with controls */}
          <span className="text-[11px] sm:text-xs font-normal text-white/90 truncate max-w-[65vw] drop-shadow-sm">
            {title}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleFullscreen();
          }}
          className="p-1 rounded-full text-white/95 hover:text-white hover:bg-white/20 active:scale-95 transition-all shrink-0 ml-2"
          title={isWide ? 'Exit Fullscreen' : 'Fullscreen'}
          aria-label={isWide ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isWide ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
      </div>

      {/* Video Container: Clips out YouTube's default top header (channel avatar, big title, clock, share) */}
      <div className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center ${isWide ? 'w-screen h-[100dvh]' : ''}`}>
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
          /* Shift iframe up by 58px to crop YouTube's header (channel avatar logo, clock icon, share icon, and title) */
          <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
            <iframe
              key={videoId}
              src={embedUrl}
              title={title}
              referrerPolicy="strict-origin-when-cross-origin"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen; web-share"
              allowFullScreen
              onLoad={() => setIsLoaded(true)}
              className="w-full border-0 absolute left-0"
              style={{
                top: isWide ? '-48px' : '-58px',
                height: isWide ? 'calc(100% + 48px)' : 'calc(100% + 58px)',
                width: '100%'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

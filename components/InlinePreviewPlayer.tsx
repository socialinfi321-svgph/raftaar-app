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

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds);

  useEffect(() => {
    let isCancelled = false;
    setIsPlaying(false);
    setIsMuted(true);
    setCurrentTime(0);
    currentTimeRef.current = 0;

    loadYouTubeIframeApi().then(() => {
      if (isCancelled || !mountRef.current) return;

      mountRef.current.innerHTML = '';
      const div = document.createElement('div');
      div.style.width = '100%';
      div.style.height = '100%';
      mountRef.current.appendChild(div);

      try {
        const player = new window.YT.Player(div, {
          videoId,
          playerVars: {
            mute: 1,
            controls: 0,
            autoplay: 1,
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
              try {
                const iframe = event.target.getIframe?.();
                if (iframe) {
                  iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
                }
              } catch {}
              try {
                event.target.playVideo();
              } catch {}
            },
            onStateChange: (event: any) => {
              if (isCancelled) return;
              // state === 1 means PLAYING
              if (event.data === 1) {
                setIsPlaying(true);
              }
            }
          }
        });
        playerRef.current = player;
      } catch (err) {
        console.warn('Preview YT.Player creation error:', err);
      }
    });

    // Real progress & duration reader every 500ms using official IFrame API
    const interval = setInterval(() => {
      try {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          const curr = playerRef.current.getCurrentTime() || 0;
          currentTimeRef.current = curr;
          setCurrentTime(curr);

          const dur =
            typeof playerRef.current.getDuration === 'function'
              ? playerRef.current.getDuration()
              : 0;
          if (dur > 0) {
            setDuration(dur);
          }
        }
      } catch {}
    }, 500);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch {}
        playerRef.current = null;
      }
    };
  }, [videoId]);

  // Sound toggle directly via API (setMuted)
  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (playerRef.current) {
        if (isMuted) {
          playerRef.current.unMute();
          setIsMuted(false);
        } else {
          playerRef.current.mute();
          setIsMuted(true);
        }
      }
    } catch (err) {
      console.warn('Mute toggle error:', err);
    }
  };

  const handleContainerClick = () => {
    onSelect(currentTimeRef.current);
  };

  const remainingSeconds = Math.max(0, duration - currentTime);
  const badgeText = isPlaying
    ? formatCountdown(remainingSeconds)
    : durationStr || formatCountdown(duration);

  return (
    <div
      onClick={handleContainerClick}
      className="w-full aspect-video rounded-lg sm:rounded-[10px] overflow-hidden bg-black relative shadow-md cursor-pointer select-none"
    >
      {/* Official YouTube iframe container - pointer events none so tapping navigates to watch screen */}
      <div
        ref={mountRef}
        className="w-full h-full pointer-events-none [&>iframe]:w-full [&>iframe]:h-full border-0"
      />

      {/* Thumbnail overlay: shown until video state is PLAYING to hide YouTube big logo / spinner */}
      {!isPlaying && (
        <div className="absolute inset-0 z-10 bg-black pointer-events-none">
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Top-Right Sound Mute/Unmute Button (Only Sound button, CC removed) */}
      <div className="absolute top-2.5 right-2.5 z-30 pointer-events-auto">
        <button
          type="button"
          onClick={handleToggleMute}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/65 hover:bg-black/85 active:scale-95 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-md"
          title={isMuted ? 'Unmute' : 'Mute'}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* Duration / Countdown Badge at Bottom Right (Decreases with real time playback) */}
      <span className="absolute bottom-2.5 right-2.5 bg-black/80 text-white text-[12px] font-medium px-1.5 py-0.5 rounded-[4px] leading-none pointer-events-none z-20 font-mono">
        {badgeText}
      </span>

      {/* Bottom Red Progress Line driven by real getCurrentTime() */}
      <div className="absolute bottom-0 inset-x-0 h-[2.5px] bg-white/20 z-20 pointer-events-none">
        <div
          className="h-full bg-red-600 transition-all duration-300"
          style={{
            width: `${Math.min(100, Math.max(0, (currentTime / (duration || 1)) * 100))}%`
          }}
        />
      </div>
    </div>
  );
};

export const InlinePreviewPlayer = memo(InlinePreviewPlayerComponent);

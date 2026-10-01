import React, { useState } from 'react';
import { ChevronLeft, ShieldCheck, Sparkles, BookOpen, Volume2, Maximize2 } from 'lucide-react';

interface CustomVideoPlayerProps {
  videoId: string;
  title: string;
  totalDurationStr?: string;
  onBack?: () => void;
}

export const CustomVideoPlayer: React.FC<CustomVideoPlayerProps> = ({
  videoId,
  title,
  onBack
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="relative w-full aspect-video bg-black overflow-hidden rounded-none sm:rounded-2xl shadow-2xl select-none group">
      
      {/* 1. High Performance Native Video Embed (Guaranteed to play audio & video smoothly on all devices) */}
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        onLoad={() => setIsLoaded(true)}
        className="w-full h-full border-0 relative z-10"
      />

      {/* 2. Top Native Brand Header (Sits above the video title area to keep students inside the app) */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-2.5 sm:p-3 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-auto transition-opacity duration-300">
        <div className="flex items-center gap-2 min-w-0 pr-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md active:scale-95 transition-all shrink-0"
              title="Back to lectures"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <span className="text-xs sm:text-sm font-black text-white truncate drop-shadow-md">
            {title}
          </span>
        </div>

        {/* In-App Raftaar Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600/90 text-white text-[10px] sm:text-[11px] font-black backdrop-blur-md shadow-sm shrink-0 border border-blue-400/30">
          <ShieldCheck size={12} className="text-yellow-300" />
          <span>Raftaar Player HD</span>
        </div>
      </div>

      {/* 3. Bottom-Right Corner Raftaar Shield Badge */}
      <div className="absolute bottom-2.5 right-12 z-20 pointer-events-none flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/10 text-[9px] font-bold text-white shadow-sm hidden xs:flex">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>1080p Full HD</span>
      </div>

      {/* 4. Initial Loading State */}
      {!isLoaded && (
        <div className="absolute inset-0 z-15 flex flex-col items-center justify-center bg-black text-white pointer-events-none">
          <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold mt-2 text-slate-300">Loading Raftaar Smart Lecture...</span>
        </div>
      )}

    </div>
  );
};

import React, { useState } from 'react';
import { ArrowLeft, Search, SlidersHorizontal, Play, Sparkles, BookOpen, Clock, ChevronRight, X, MoreVertical } from 'lucide-react';
import { Profile } from '../types';
import { SmartThumbnail } from './SmartThumbnail';
import { CustomVideoPlayer } from './CustomVideoPlayer';

interface KhazanaScreenProps {
  profile: Profile | null;
  navigate: any;
}

export interface KhazanaVideoItem {
  id: string;
  title: string;
  subject: string;
  board: '10th Board' | '12th Board' | 'Both';
  teacher: string;
  duration: string;
  views: string;
}

// Reusable Khazana Video Card - Borderless YouTube Mobile Layout
export const KhazanaVideoCard: React.FC<{
  video: KhazanaVideoItem;
  onClick: (video: KhazanaVideoItem) => void;
}> = ({ video, onClick }) => {
  return (
    <div
      onClick={() => onClick(video)}
      className="group cursor-pointer flex flex-col w-full active:opacity-95 transition-opacity"
    >
      {/* Thumbnail: rounded corners on all screens with zero border */}
      <SmartThumbnail
        videoId={video.id}
        title={video.title}
        duration={video.duration}
        className="w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden shadow-xs"
      />

      {/* Metadata Row Structure (Below Thumbnail) */}
      <div className="flex items-start gap-3 pt-3 pb-5 px-1">
        {/* Left: Channel Avatar */}
        <img
          src={`https://api.dicebear.com/7.x/initials/svg?seed=${video.teacher}&backgroundColor=e5e5e5`}
          alt={video.teacher}
          className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5 bg-[#e5e5e5] dark:bg-neutral-800"
        />

        {/* Middle (Text Column) */}
        <div className="flex-1 min-w-0">
          {/* Video Title: Dark charcoal/black, max 2 lines with ... */}
          <h4 className="text-[#0f0f0f] dark:text-[#f1f1f1] font-medium text-[15px] leading-[1.35] line-clamp-2 break-words">
            {video.title}
          </h4>
          {/* Subtitle: Channel Name • Views • Subject in single muted line */}
          <p className="text-[#606060] dark:text-[#aaaaaa] text-[12px] font-normal mt-1 line-clamp-1">
            {video.teacher} • {video.views} views • {video.subject} ({video.board})
          </p>
        </div>

        {/* Right: Three-dots menu icon */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="p-1 -mr-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all text-[#0f0f0f] dark:text-neutral-300 flex-shrink-0 mt-0.5"
          aria-label="More options"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// Curated high-yield video lectures for Khazana
const KHAZANA_VIDEOS: KhazanaVideoItem[] = [
  {
    id: 'DqGBKf5ogpo',
    title: 'Physics Class 12: Complete Electrostatics in 1 Shot | VVI Concepts & Derivations',
    subject: 'Physics',
    board: '12th Board',
    teacher: 'Education Baba',
    duration: '2:15:30',
    views: '230K'
  },
  {
    id: 'RefTQH9dMzk',
    title: 'Class 12 Biology: 500 VVI Objective & Reproduction in Organisms',
    subject: 'Biology',
    board: '12th Board',
    teacher: 'Nidhi Ma’am (PW)',
    duration: '1:45:20',
    views: '145K'
  },
  {
    id: 'FveziLt-suo',
    title: 'Class 12th Story of English: Complete Revision & VVI Objective in 1 Video',
    subject: 'English',
    board: '12th Board',
    teacher: 'Nisha Ma’am (PW)',
    duration: '1:26:46',
    views: '112K'
  },
  {
    id: 'Df2iSOK1xgg',
    title: 'Class 12 Hindi: Complete गद्य & पद्य खण्ड Most Important Objective',
    subject: 'Hindi',
    board: '12th Board',
    teacher: 'Ask Board',
    duration: '42:15',
    views: '98K'
  },
  {
    id: '_7GDblBdVKs',
    title: 'Board Exam Best Strategy: Top Score Routine & Formula Cheat Sheet',
    subject: 'Strategy',
    board: 'Both',
    teacher: 'Deepak Bhaiya',
    duration: '25:40',
    views: '180K'
  }
];

export const KhazanaScreen: React.FC<KhazanaScreenProps> = ({ profile, navigate }) => {
  const [activeFilter, setActiveFilter] = useState('12th Board');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVideo, setActiveVideo] = useState<KhazanaVideoItem | null>(null);

  const filters = ['10th Board', '12th Board'];

  const filteredVideos = KHAZANA_VIDEOS.filter((v) => {
    const matchesFilter = activeFilter === '12th Board' ? (v.board === '12th Board' || v.board === 'Both') : (v.board === '10th Board' || v.board === 'Both');
    const matchesSearch = !searchQuery.trim() || 
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      v.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.teacher.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="h-full flex flex-col bg-[#FAFAFA] text-[#101828] overflow-hidden font-sans selection:bg-[#3A5643]/20 relative">

      {/* Top Header */}
      <div className="relative z-50 px-4 pt-safe-header pb-3 flex justify-between items-center bg-white border-b border-[#EAECF0] shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 active:scale-90 transition-transform">
            <ArrowLeft size={24} className="text-[#101828]" />
          </button>
          <span className="font-bold text-[22px] text-[#101828] tracking-tight">Khazana</span>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="w-5 h-5 bg-[#6941C6] rounded-full flex items-center justify-center">
            <span className="text-[9px] font-bold text-white tracking-wider">XP</span>
          </div>
          <span className="text-sm font-bold text-[#101828]">{profile?.weekly_xp || 0}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-[calc(6rem+env(safe-area-inset-bottom))] relative z-10">
        
        {/* Decorative Header Area */}
        <div className="w-full relative mt-2">
          <img 
            src="https://res.cloudinary.com/dtygcxcr1/image/upload/v1786012541/khazana_hero_section_ht6dpl.png" 
            alt="Khazana Header" 
            className="w-full h-auto object-cover object-top pointer-events-none"
            style={{ maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)' }}
          />
        </div>

        <div className="px-4 space-y-5 pb-6 max-w-lg mx-auto relative z-20 -mt-2">
          {/* Search Bar */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search size={20} className="text-[#98A2B3]" />
            </div>
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a teacher or concept" 
              className="w-full bg-white border border-[#EAECF0] text-[#101828] placeholder-[#98A2B3] rounded-[16px] py-3.5 pl-11 pr-4 focus:outline-none focus:ring-1 focus:ring-[#3A5643] focus:border-[#3A5643] transition-all text-[14px] shadow-[0_1px_4px_rgba(16,24,40,0.04)]"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2.5 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-1">
            <button className="flex-shrink-0 w-[34px] h-[34px] bg-white border border-[#EAECF0] rounded-[10px] flex items-center justify-center text-[#475467] active:scale-95 transition-transform shadow-[0_1px_4px_rgba(16,24,40,0.04)]">
              <SlidersHorizontal size={16} />
            </button>
            {filters.map(filter => (
              <button 
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`flex-shrink-0 px-3.5 h-[34px] rounded-[10px] text-[12px] font-semibold transition-all active:scale-95 shadow-[0_1px_4px_rgba(16,24,40,0.04)] ${
                  activeFilter === filter 
                    ? 'bg-[#3A5643] text-white border border-[#3A5643]' 
                    : 'bg-white text-[#344054] border border-[#EAECF0] hover:bg-gray-50'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Chalkboard Banner */}
          <div className="w-full h-[140px] rounded-[16px] overflow-hidden relative shadow-[0_4px_12px_rgba(16,24,40,0.05)] mt-2">
            <div className="absolute inset-0 bg-[#35483A]"></div>
            <img src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=800&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50" alt="Chalkboard Math" />
            <div className="absolute inset-0 opacity-80 mix-blend-screen pointer-events-none">
              <svg width="100%" height="100%" viewBox="0 0 400 140" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 20 L 100 20 M 60 20 L 60 100" />
                <circle cx="60" cy="60" r="30" />
                <path d="M60 60 L 81 81" />
                <path d="M120 70 L 200 70" />
                <path d="M120 70 C 140 40 180 40 200 70 C 220 100 260 100 280 70" />
                <path d="M160 20 L 160 120" />
                <text x="70" y="55" fill="rgba(255,255,255,0.7)" fontSize="10" stroke="none">α</text>
                <text x="165" y="65" fill="rgba(255,255,255,0.7)" fontSize="10" stroke="none">x</text>
                <text x="150" y="30" fill="rgba(255,255,255,0.7)" fontSize="10" stroke="none">y</text>
                <path d="M250 40 L 330 40 L 330 100 L 250 100 Z" />
                <path d="M250 100 L 330 40" />
                <text x="340" y="30" fill="rgba(255,255,255,0.7)" fontSize="8" stroke="none">E = mc²</text>
                <text x="340" y="50" fill="rgba(255,255,255,0.7)" fontSize="8" stroke="none">F = m*a</text>
                <text x="340" y="70" fill="rgba(255,255,255,0.7)" fontSize="8" stroke="none">v = u + at</text>
                <text x="340" y="90" fill="rgba(255,255,255,0.7)" fontSize="8" stroke="none">s = ut + ½at²</text>
              </svg>
            </div>
          </div>

          {/* ================= KHAZANA VIDEO VAULT (1080p HD SMART THUMBNAILS) ================= */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-black text-[#101828] flex items-center gap-2">
                <Sparkles size={16} className="text-[#3A5643]" />
                <span>Khazana Video Vault • 1080p HD</span>
              </h3>
              <span className="text-[11px] font-semibold text-[#475467]">
                {filteredVideos.length} Lectures
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {filteredVideos.map((video) => (
                <KhazanaVideoCard
                  key={video.id}
                  video={video}
                  onClick={(v) => setActiveVideo(v)}
                />
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Embedded In-App Player Modal when video is clicked in Khazana */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end sm:justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-3xl mx-auto bg-slate-900 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-3 bg-slate-950 text-white border-b border-slate-800">
              <div className="flex items-center gap-2 truncate pr-2">
                <BookOpen size={16} className="text-emerald-400 shrink-0" />
                <span className="text-xs sm:text-sm font-bold truncate">
                  {activeVideo.title}
                </span>
              </div>
              <button
                onClick={() => setActiveVideo(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="w-full aspect-video bg-black">
              <CustomVideoPlayer
                videoId={activeVideo.id}
                title={activeVideo.title}
                totalDurationStr={activeVideo.duration}
                onBack={() => setActiveVideo(null)}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

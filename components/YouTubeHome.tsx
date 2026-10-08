import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useBackHandler } from '../hooks/useBackHandler';
import { 
  ArrowLeft, Search, X, ThumbsUp, Share2, 
  Bookmark, Bell, MoreVertical, Compass, RotateCw, AlertTriangle, RefreshCw,
  FileText, Download, BookOpen, MessageSquare, Play
} from 'lucide-react';
import { CustomVideoPlayer } from './CustomVideoPlayer';
import { SmartThumbnail } from './SmartThumbnail';
import { 
  searchVideos, 
  fetchHomeVideos, 
  fetchRecommendedVideos,
  markIdsAsShown,
  VideoItem
} from '../services/videoService';

export { searchVideos, fetchHomeVideos, fetchRecommendedVideos };
export type { VideoItem };

const CATEGORIES = [
  'All',
  'Physics',
  'Chemistry',
  'Maths',
  'Biology',
  'Hindi',
  'English',
  'One Shot',
  'Questions',
  'Solutions'
];

// Helper: Decode HTML entities
const decodeHtml = (html?: string): string => {
  if (!html) return '';
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
};

// Helper: Format count (e.g. 1200000 -> 1.2M, 5400 -> 5.4K)
const formatCount = (count?: number): string => {
  if (count === undefined || count === null) return '';
  const num = Number(count);
  if (num >= 1000000) {
    const val = (num / 1000000).toFixed(1).replace(/\.0$/, '');
    return `${val}M`;
  }
  if (num >= 1000) {
    const val = (num / 1000).toFixed(1).replace(/\.0$/, '');
    return `${val}K`;
  }
  return `${num}`;
};

// Helper: Format view counts
const formatViews = (views?: number): string => {
  if (views === undefined || views === null) return '';
  const num = Number(views);
  if (num >= 1000000) {
    const val = (num / 1000000).toFixed(1).replace(/\.0$/, '');
    return `${val}M views`;
  }
  if (num >= 1000) {
    const val = (num / 1000).toFixed(1).replace(/\.0$/, '');
    return `${val}K views`;
  }
  return `${num} views`;
};

// Helper: Format relative time
const timeAgo = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
};

// Channel Avatar Badge: Real avatar if available, otherwise round badge with first letter of channel title
const ChannelAvatar: React.FC<{
  avatar?: string;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ avatar, title = '', size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-10 h-10 text-base'
  }[size];

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={title}
        className={`${sizeClasses} rounded-full object-cover shrink-0 bg-slate-200 dark:bg-neutral-800 ${className}`}
      />
    );
  }

  const initial = (title ? title.trim().charAt(0) : 'R').toUpperCase();
  return (
    <div
      className={`${sizeClasses} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center shrink-0 uppercase shadow-xs ${className}`}
    >
      {initial}
    </div>
  );
};

export const YouTubeHome: React.FC<{ navigate: any }> = ({ navigate }) => {
  // Feed state
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasApiError, setHasApiError] = useState(false);
  const [apiErrorMsg, setApiErrorMsg] = useState<string | null>(null);

  // Active Category / Search
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Paging and Pool references
  const feedPoolRef = useRef<VideoItem[]>([]);
  const searchNextTokenRef = useRef<string | null>(null);
  const homeNextOffsetRef = useRef<number | null>(null);
  const isReplenishingRef = useRef(false);
  const sessionSeenIds = useRef<Set<string>>(new Set());
  const activeRequestId = useRef(0);

  // Top header scroll hide & pull to refresh
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const playerTopRef = useRef<HTMLDivElement>(null);

  // Pull-to-refresh
  const touchStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  // Watch Player State
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [recommendedVideos, setRecommendedVideos] = useState<VideoItem[]>([]);
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const recPoolRef = useRef<VideoItem[]>([]);
  const recNextOffsetRef = useRef<number>(0);
  const isReplenishingRecsRef = useRef(false);
  const recSentinelRef = useRef<HTMLDivElement>(null);

  // Watch Screen Interactions
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isDescOpen, setIsDescOpen] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Android hardware back button integration
  useBackHandler(() => {
    if (selectedVideo) {
      setSelectedVideo(null);
      return true;
    }
    if (isSearchExpanded) {
      setIsSearchExpanded(false);
      return true;
    }
    if (searchQuery) {
      setSearchQuery('');
      setSearchInput('');
      return true;
    }
    navigate('/');
    return true;
  });

  // Lazy replenishment when feed pool < 15
  const replenishPool = useCallback(async () => {
    if (isReplenishingRef.current || feedPoolRef.current.length >= 15) return;
    isReplenishingRef.current = true;

    try {
      if (searchQuery.trim()) {
        if (!searchNextTokenRef.current) {
          isReplenishingRef.current = false;
          return;
        }
        const offset = parseInt(searchNextTokenRef.current, 10) || 0;
        const res = await searchVideos(searchQuery.trim(), { offset });
        searchNextTokenRef.current = res.nextToken;
        const newUnseen = res.items.filter(it => !sessionSeenIds.current.has(it.id));
        newUnseen.forEach(it => sessionSeenIds.current.add(it.id));
        feedPoolRef.current.push(...newUnseen);
      } else {
        if (homeNextOffsetRef.current === null) {
          isReplenishingRef.current = false;
          return;
        }
        const res = await fetchHomeVideos(activeCategory, { offset: homeNextOffsetRef.current });
        homeNextOffsetRef.current = res.nextOffset;
        const newUnseen = res.items.filter(it => !sessionSeenIds.current.has(it.id));
        newUnseen.forEach(it => sessionSeenIds.current.add(it.id));
        feedPoolRef.current.push(...newUnseen);
      }

      setVideos(prev => {
        if (prev.length === 0 && feedPoolRef.current.length > 0) {
          const initial = feedPoolRef.current.splice(0, 12);
          markIdsAsShown(initial.map(i => i.id));
          return initial;
        }
        return prev;
      });
    } catch {
      // If Supabase has nothing left, stop quietly (no API call)
    } finally {
      isReplenishingRef.current = false;
    }
  }, [searchQuery, activeCategory]);

  // Load next bundle of 10 from pool
  const loadNextBundleFromPool = useCallback(() => {
    if (feedPoolRef.current.length === 0) {
      replenishPool();
      return;
    }

    const nextBatch = feedPoolRef.current.splice(0, 10);
    if (nextBatch.length > 0) {
      setVideos(prev => [...prev, ...nextBatch]);
      markIdsAsShown(nextBatch.map(b => b.id));
    }

    if (feedPoolRef.current.length < 15) {
      replenishPool();
    }
  }, [replenishPool]);

  // Main Feed Loader
  const loadFeedData = useCallback(
    async (isReload = false) => {
      const reqId = ++activeRequestId.current;
      setLoading(true);
      setHasApiError(false);
      setApiErrorMsg(null);

      if (isReload) {
        setVideos([]);
        feedPoolRef.current = [];
        homeNextOffsetRef.current = null;
        searchNextTokenRef.current = null;
      }

      // 1. SEARCH MODE (Supabase first, paginated)
      if (searchQuery.trim()) {
        try {
          const res = await searchVideos(searchQuery.trim(), { offset: 0 });
          if (reqId !== activeRequestId.current) return;

          if (res.error) {
            setHasApiError(true);
            setApiErrorMsg(res.error);
          }

          if (res.items.length > 0) {
            searchNextTokenRef.current = res.nextToken;
            sessionSeenIds.current.clear();
            res.items.forEach(it => sessionSeenIds.current.add(it.id));
            feedPoolRef.current = [...res.items];
            const initial = feedPoolRef.current.splice(0, 12);
            setVideos(initial);
            markIdsAsShown(initial.map(i => i.id));
          } else {
            setVideos([]);
            setHasApiError(true);
            if (!res.error) setApiErrorMsg('Koi video nahi mila.');
          }
        } catch (e: any) {
          if (reqId !== activeRequestId.current) return;
          setHasApiError(true);
          setApiErrorMsg(e?.message || 'Search request failed');
        } finally {
          if (reqId === activeRequestId.current) setLoading(false);
        }
        return;
      }

      // 2. HOME FEED (Supabase only, different for every refresh)
      try {
        const res = await fetchHomeVideos(activeCategory, {
          offset: 0,
          isRefresh: isReload
        });
        if (reqId !== activeRequestId.current) return;

        if (res.error) {
          setHasApiError(true);
          setApiErrorMsg(res.error);
        }

        if (res.items.length > 0) {
          homeNextOffsetRef.current = res.nextOffset;
          sessionSeenIds.current.clear();
          res.items.forEach(it => sessionSeenIds.current.add(it.id));
          feedPoolRef.current = [...res.items];
          const initial = feedPoolRef.current.splice(0, 12);
          setVideos(initial);
          markIdsAsShown(initial.map(i => i.id));
        } else {
          setVideos([]);
          setHasApiError(true);
          if (!res.error) setApiErrorMsg('Database me videos uplabdh nahi hain.');
        }
      } catch (e: any) {
        if (reqId !== activeRequestId.current) return;
        setHasApiError(true);
        setApiErrorMsg(e?.message || 'Database connection error');
      } finally {
        if (reqId === activeRequestId.current) setLoading(false);
      }
    },
    [searchQuery, activeCategory]
  );

  // Initial & Filter Load
  useEffect(() => {
    loadFeedData();
  }, [activeCategory, searchQuery]);

  // IntersectionObserver sentinel for prefetching next bundle 1200px before end
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loading) {
          loadNextBundleFromPool();
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '1200px 0px 1200px 0px'
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, loadNextBundleFromPool]);

  // Full reload handler
  const handleFullReload = useCallback(() => {
    if (selectedVideo) {
      setSelectedVideo(null);
    }
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    loadFeedData(true);
  }, [loadFeedData, selectedVideo]);

  // Listen for 'raftaar:home-refresh' custom event from App.tsx
  useEffect(() => {
    const onHomeRefresh = () => {
      handleFullReload();
    };
    window.addEventListener('raftaar:home-refresh', onHomeRefresh);
    return () => window.removeEventListener('raftaar:home-refresh', onHomeRefresh);
  }, [handleFullReload]);

  // Smart Header hide/show on scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const delta = scrollTop - lastScrollY.current;

    if (delta > 8 && scrollTop > 50) {
      setIsHeaderVisible(false);
      window.dispatchEvent(new CustomEvent('app:nav-visible', { detail: { visible: false } }));
    } else if (delta < -8 || scrollTop <= 15) {
      setIsHeaderVisible(true);
      window.dispatchEvent(new CustomEvent('app:nav-visible', { detail: { visible: true } }));
    }
    lastScrollY.current = scrollTop;
  };

  // Pull to refresh touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartY.current = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current > 0 && scrollContainerRef.current && scrollContainerRef.current.scrollTop <= 0) {
      const diff = e.touches[0].clientY - touchStartY.current;
      if (diff > 0) {
        const distance = Math.min(diff * 0.45, 70);
        setPullDistance(distance);
        setIsPulling(true);
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 50) {
      handleFullReload();
    }
    setPullDistance(0);
    setIsPulling(false);
    touchStartY.current = 0;
  };

  // Search submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setSearchQuery(searchInput.trim());
    setActiveCategory('');
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setActiveCategory('All');
  };

  // Handle Video Click -> Watch Screen
  const handleSelectVideo = (vid: VideoItem) => {
    setSelectedVideo(vid);
    setLikeCount(vid.likeCount || 0);
    setIsLiked(false);
    setIsSaved(false);
    setIsDescOpen(false);
    setRecommendedVideos([]);
    recPoolRef.current = [];
    recNextOffsetRef.current = 0;

    // Up Next recommendations from Supabase
    setLoadingRecommended(true);
    fetchRecommendedVideos(vid, { offset: 0 })
      .then(res => {
        const merged = res.items.filter(it => it.id !== vid.id && !it.isShort);
        recPoolRef.current = merged;
        const initialRecs = recPoolRef.current.splice(0, 10);
        setRecommendedVideos(initialRecs);
      })
      .finally(() => {
        setLoadingRecommended(false);
      });

    setTimeout(() => {
      playerTopRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // Up Next lazy replenishment when recPool < 10
  const replenishRecPool = useCallback(async () => {
    if (!selectedVideo || isReplenishingRecsRef.current || recPoolRef.current.length >= 10) return;
    isReplenishingRecsRef.current = true;

    try {
      recNextOffsetRef.current += 15;
      const res = await fetchRecommendedVideos(selectedVideo, { offset: recNextOffsetRef.current });
      const newUnseen = res.items.filter(
        it => !sessionSeenIds.current.has(it.id) && it.id !== selectedVideo.id && !it.isShort
      );
      newUnseen.forEach(it => sessionSeenIds.current.add(it.id));
      recPoolRef.current.push(...newUnseen);
    } catch {
      // Stop quietly
    } finally {
      isReplenishingRecsRef.current = false;
    }
  }, [selectedVideo]);

  // Infinite scroll on Up next list
  useEffect(() => {
    const sentinel = recSentinelRef.current;
    if (!sentinel || !selectedVideo) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingRecommended) {
          if (recPoolRef.current.length > 0) {
            const nextBatch = recPoolRef.current.splice(0, 8);
            setRecommendedVideos(prev => [...prev, ...nextBatch]);
          }
          if (recPoolRef.current.length < 10) {
            replenishRecPool();
          }
        }
      },
      { rootMargin: '800px 0px 800px 0px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [selectedVideo, loadingRecommended, replenishRecPool]);

  // Next video player handler
  const handlePlayNextVideo = () => {
    if (recommendedVideos.length > 0) {
      handleSelectVideo(recommendedVideos[0]);
    }
  };

  const handleToggleLike = () => {
    if (isLiked) {
      setIsLiked(false);
      setLikeCount(prev => Math.max(0, prev - 1));
    } else {
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
      showToast('Added to Liked Videos');
    }
  };

  const handleShare = () => {
    if (navigator.share && selectedVideo) {
      navigator.share({
        title: selectedVideo.title,
        text: `Watch ${selectedVideo.title} on Raftaar`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      showToast('Link copied to clipboard');
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300 relative select-none">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-950 px-4 py-2 rounded-full text-xs font-bold shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2 border border-slate-700 dark:border-slate-300">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER / SEARCH BAR */}
      {!selectedVideo ? (
        <header className="sticky top-0 z-50 bg-white dark:bg-[#0f0f0f] border-b border-neutral-100 dark:border-neutral-800/60 shadow-xs">
          {/* Status Bar Safe Area Spacer */}
          <div 
            className="w-full h-[max(28px,env(safe-area-inset-top,28px))] shrink-0 pointer-events-none select-none bg-white/95 dark:bg-[#0f0f0f]/95 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Top Logo / Search Row */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isHeaderVisible || isSearchExpanded
                ? 'h-12 opacity-100 translate-y-0'
                : 'h-0 opacity-0 -translate-y-full pointer-events-none'
            }`}
          >
            <div className="h-12 px-3 flex items-center justify-between">
              {isSearchExpanded ? (
                /* Search Overlay Mode */
                <form onSubmit={handleSearchSubmit} className="flex items-center w-full h-10 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSearchExpanded(false)}
                    className="p-1.5 -ml-1 text-[#0f0f0f] dark:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                    aria-label="Back"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <div className="flex-1 flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-full px-3 py-1.5 focus-within:ring-1 focus-within:ring-black dark:focus-within:ring-white">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search videos and lectures..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="w-full bg-transparent text-[15px] text-[#0f0f0f] dark:text-white placeholder-neutral-500 outline-none"
                    />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput('');
                          searchInputRef.current?.focus();
                        }}
                        className="p-1 text-neutral-500 hover:text-neutral-800 dark:hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="p-1.5 text-[#0f0f0f] dark:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                    aria-label="Search"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </form>
              ) : (
                /* Default Header Layout */
                <>
                  <div
                    className="flex items-center gap-1.5 cursor-pointer select-none"
                    onClick={() => {
                      if (selectedVideo) setSelectedVideo(null);
                      setActiveCategory('All');
                      setSearchQuery('');
                    }}
                  >
                    <div className="w-7 h-5 sm:w-8 sm:h-5.5 bg-[#FF0000] rounded-[6px] flex items-center justify-center shadow-xs">
                      <Play size={11} className="fill-white text-white ml-0.5" />
                    </div>
                    <span className="text-[19px] font-bold tracking-tighter text-[#0f0f0f] dark:text-white font-sans">
                      Raftaar
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => showToast('New lectures uploaded!')}
                      className="relative text-[#0f0f0f] dark:text-white p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full active:scale-95 transition-all"
                      aria-label="Notifications"
                    >
                      <Bell className="w-6 h-6" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsSearchExpanded(true);
                        setTimeout(() => searchInputRef.current?.focus(), 80);
                      }}
                      className="text-[#0f0f0f] dark:text-white p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full active:scale-95 transition-all"
                      aria-label="Search"
                    >
                      <Search className="w-6 h-6" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Category Filter Chips Row */}
          <div className={`px-3 py-2 flex items-center gap-2 overflow-x-auto hide-scrollbar transition-all duration-300 ${
            isHeaderVisible ? 'border-t border-neutral-100/60 dark:border-neutral-800/40' : ''
          }`}>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('All');
                setSearchQuery('');
                setSearchInput('');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[#0f0f0f] dark:text-neutral-200 shrink-0 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all"
              title="Explore all"
            >
              <Compass size={18} />
            </button>
            <div className="w-[1px] h-5 bg-neutral-200 dark:bg-neutral-800 shrink-0" />

            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat && !searchQuery;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat);
                    setSearchQuery('');
                    setSearchInput('');
                  }}
                  className={`rounded-lg px-3 py-1.5 text-[14px] font-medium shrink-0 transition-colors whitespace-nowrap active:scale-95 ${
                    isActive
                      ? 'bg-[#0f0f0f] text-white dark:bg-white dark:text-[#0f0f0f]'
                      : 'bg-neutral-100 text-[#0f0f0f] dark:bg-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </header>
      ) : (
        /* Video Watch Mode Safe Area */
        <div 
          className="w-full h-[max(12px,env(safe-area-inset-top,12px))] bg-black shrink-0 z-50"
          aria-hidden="true"
        />
      )}

      {/* MAIN CONTAINER */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-y-auto hide-scrollbar bg-slate-50 dark:bg-slate-950"
      >
        {/* Pull to refresh visual indicator */}
        {isPulling && (
          <div 
            style={{ height: `${pullDistance}px` }} 
            className="w-full flex items-center justify-center overflow-hidden transition-all text-slate-500"
          >
            <RefreshCw size={18} className={`${pullDistance > 50 ? 'animate-spin text-brand-600' : ''}`} />
          </div>
        )}

        {selectedVideo ? (
          /* ================= 1. VIDEO WATCH VIEW ================= */
          <div ref={playerTopRef} className="max-w-5xl mx-auto pb-16 animate-fade-in bg-white dark:bg-[#0f0f0f]">
            {/* Player Container */}
            <div className="w-full sticky top-0 sm:relative z-30 shadow-md bg-black">
              <CustomVideoPlayer
                videoId={selectedVideo.id}
                title={selectedVideo.title}
                totalDurationStr={selectedVideo.duration}
                onBack={() => setSelectedVideo(null)}
                onPlayNext={handlePlayNextVideo}
              />
            </div>

            <div className="p-4 sm:p-5 space-y-3.5">
              {/* Playlist Header if present: {playlistTitle} - Lecture {playlistPosition + 1} */}
              {selectedVideo.playlistTitle && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                  <BookOpen size={13} />
                  <span>
                    {selectedVideo.playlistTitle} - Lecture {(selectedVideo.playlistPosition ?? 0) + 1}
                  </span>
                </div>
              )}

              {/* Video Title (render as plain text) & Details */}
              <div className="flex items-start justify-between gap-3">
                <div 
                  onClick={() => setIsDescOpen(true)}
                  className="flex-1 cursor-pointer group"
                >
                  <h1 className="text-[17px] sm:text-[19px] font-bold text-slate-900 dark:text-white leading-[1.32] line-clamp-2 tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {decodeHtml(selectedVideo.title)}
                  </h1>
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[13px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    {selectedVideo.viewCount !== undefined && (
                      <span>{formatViews(selectedVideo.viewCount)}</span>
                    )}
                    <span>{timeAgo(selectedVideo.publishedAt)}</span>
                    {selectedVideo.duration && <span>• {selectedVideo.duration}</span>}
                    {selectedVideo.subject && (
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        #{selectedVideo.subject}
                      </span>
                    )}
                    <span className="text-slate-900 dark:text-slate-200 font-bold hover:underline">...more</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Options: Save to Khazana or Report')}
                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 rounded-full shrink-0 mt-0.5"
                  aria-label="Options"
                >
                  <MoreVertical size={20} />
                </button>
              </div>

              {/* Channel Profile Row: REAL channel avatar, channel name and {formatCount(subscriberCount)} subscribers */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2.5">
                  <ChannelAvatar
                    avatar={selectedVideo.channelAvatar}
                    title={selectedVideo.channelTitle}
                    size="lg"
                    className="border border-slate-200 dark:border-slate-700"
                  />
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-white leading-tight">
                      {selectedVideo.channelTitle || 'Channel'}
                    </h3>
                    {selectedVideo.subscriberCount !== undefined && (
                      <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                        {formatCount(selectedVideo.subscriberCount)} subscribers
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsFollowed(!isFollowed);
                    showToast(isFollowed ? 'Unfollowed channel' : 'Following channel');
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs active:scale-95 ${
                    isFollowed
                      ? 'bg-neutral-200 dark:bg-neutral-800 text-slate-800 dark:text-neutral-200'
                      : 'bg-[#0f0f0f] dark:bg-white text-white dark:text-[#0f0f0f] hover:opacity-90'
                  }`}
                >
                  {isFollowed ? 'Following' : 'Follow'}
                </button>
              </div>

              {/* Action Buttons (Like, Share, Save) */}
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pt-1">
                <button
                  onClick={handleToggleLike}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isLiked
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900'
                      : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  <ThumbsUp size={15} className={isLiked ? 'fill-current' : ''} />
                  <span>{likeCount > 0 ? formatCount(likeCount) : 'Like'}</span>
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-all"
                >
                  <Share2 size={15} />
                  <span>Share</span>
                </button>

                <button
                  onClick={() => {
                    setIsSaved(!isSaved);
                    showToast(isSaved ? 'Removed from Khazana' : 'Saved to Khazana ✨');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isSaved
                      ? 'bg-red-50 dark:bg-red-950/70 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900'
                      : 'bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  <Bookmark size={15} className={isSaved ? 'fill-current' : ''} />
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>
              </div>

              {/* Small Comments Notice */}
              <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-neutral-800/60 border border-slate-200/60 dark:border-neutral-800 flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                <MessageSquare size={16} className="text-slate-400 dark:text-neutral-500 shrink-0" />
                <span>Comments jaldi aa rahe hain</span>
              </div>

              {/* Secondary Action Cards (Notes, Download) */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  onClick={() => showToast('Class Notes downloaded to your device!')}
                  className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-slate-100 dark:bg-neutral-800/80 hover:bg-slate-200 dark:hover:bg-neutral-800 border border-slate-200/80 dark:border-neutral-700/60 transition-all active:scale-95"
                >
                  <FileText size={18} className="text-blue-500 mb-1" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                    Notes
                  </span>
                </button>

                <button
                  onClick={() => showToast('Lecture offline available!')}
                  className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-slate-100 dark:bg-neutral-800/80 hover:bg-slate-200 dark:hover:bg-neutral-800 border border-slate-200/80 dark:border-neutral-700/60 transition-all active:scale-95"
                >
                  <Download size={18} className="text-slate-600 dark:text-slate-400 mb-1" />
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                    Download
                  </span>
                </button>
              </div>

              {/* Suggested Videos List */}
              <div className="space-y-1.5 pt-1">
                {recommendedVideos.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    onClick={() => handleSelectVideo(item)}
                    className="group cursor-pointer flex items-start gap-2.5 py-1 px-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 active:opacity-90 transition-all"
                  >
                    <div className="w-32 sm:w-40 shrink-0">
                      <SmartThumbnail
                        videoId={item.id}
                        title={item.title}
                        duration={item.duration}
                        priority={idx < 2}
                        className="rounded-lg sm:rounded-xl overflow-hidden shadow-xs"
                        badgeClassName="!bottom-1 !right-1 !text-[10px] !px-1.5 !py-0.5"
                      />
                    </div>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-[#0f0f0f] dark:text-[#f1f1f1] font-medium text-[12.5px] sm:text-[13.5px] leading-[1.25] line-clamp-2 break-words flex-1">
                          {decodeHtml(item.title)}
                        </h4>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            showToast('Options: Save to Khazana');
                          }}
                          className="p-1 text-[#606060] dark:text-neutral-400 hover:text-black dark:hover:text-white shrink-0 -mt-1 -mr-1 rounded-full"
                          aria-label="Options"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>

                      <p className="text-[#606060] dark:text-[#aaaaaa] text-[11px] font-normal mt-0.5 line-clamp-1">
                        {item.channelTitle}
                      </p>

                      <div className="text-[#606060] dark:text-[#aaaaaa] text-[10.5px] font-normal mt-0.5 flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
                        {item.viewCount !== undefined && (
                          <>
                            <span>{formatViews(item.viewCount)}</span>
                            <span>•</span>
                          </>
                        )}
                        <span>{timeAgo(item.publishedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Rec sentinel */}
                <div ref={recSentinelRef} className="h-8 w-full" />
              </div>
            </div>
          </div>
        ) : (
          /* ================= 2. MAIN FEED ================= */
          <div className="max-w-6xl mx-auto pb-20">
            {/* Search active notice */}
            {searchQuery && (
              <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Showing results for: <strong className="text-slate-900 dark:text-white">"{searchQuery}"</strong>
                </span>
                <button
                  onClick={handleClearSearch}
                  className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline"
                >
                  Clear search
                </button>
              </div>
            )}

            {/* Error Notification Card: Videos load nahi ho paaye - Retry */}
            {hasApiError && (
              <div className="mx-4 my-6 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={20} />
                </div>
                <span className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Videos load nahi ho paaye - Retry
                </span>
                {apiErrorMsg && (
                  <span className="text-xs text-amber-700/80 dark:text-amber-400/80 max-w-sm break-words">
                    {apiErrorMsg}
                  </span>
                )}
                <button
                  onClick={() => loadFeedData(true)}
                  className="mt-1 px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-transform shadow-xs"
                >
                  <RotateCw size={13} />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* Video Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4.5 sm:gap-4 sm:p-4 pt-1.5">
              {loading && videos.length === 0 ? (
                /* Skeleton loader */
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col w-full animate-pulse">
                    <div className="px-3.5 sm:px-0">
                      <div className="w-full aspect-video bg-[#e5e5e5] dark:bg-neutral-800 rounded-[18px] sm:rounded-[22px]" />
                    </div>
                    <div className="flex items-start gap-3 pt-2.5 pb-5 px-3.5 sm:px-1">
                      <div className="w-9 h-9 rounded-full bg-[#e5e5e5] dark:bg-neutral-800 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 space-y-2 pt-0.5">
                        <div className="h-4 bg-[#e5e5e5] dark:bg-neutral-800 rounded w-full" />
                        <div className="h-4 bg-[#e5e5e5] dark:bg-neutral-800 rounded w-3/4" />
                        <div className="h-3 bg-[#e5e5e5] dark:bg-neutral-800 rounded w-1/2 mt-1" />
                      </div>
                    </div>
                  </div>
                ))
              ) : videos.length > 0 ? (
                videos.map((vid, idx) => (
                  <div
                    key={`${vid.id}-${idx}`}
                    onClick={() => handleSelectVideo(vid)}
                    className="group cursor-pointer flex flex-col w-full active:opacity-95 transition-opacity"
                  >
                    <div className="px-3.5 sm:px-0">
                      <SmartThumbnail
                        videoId={vid.id}
                        title={vid.title}
                        duration={vid.duration}
                        priority={idx < 3}
                        className="w-full aspect-video !rounded-[18px] sm:!rounded-[22px] overflow-hidden shadow-xs"
                        imgClassName="!rounded-[18px] sm:!rounded-[22px]"
                      />
                    </div>

                    <div className="flex items-start gap-3 pt-2.5 pb-5 px-3.5 sm:px-1">
                      <ChannelAvatar
                        avatar={vid.channelAvatar}
                        title={vid.channelTitle}
                        size="md"
                        className="mt-0.5"
                      />

                      <div className="flex-1 min-w-0">
                        <h3 className="text-[#0f0f0f] dark:text-[#f1f1f1] font-medium text-[14px] sm:text-[15px] leading-[1.35] tracking-[-0.01em] line-clamp-2 break-words">
                          {decodeHtml(vid.title)}
                        </h3>
                        <div className="text-[#606060] dark:text-[#aaaaaa] text-[12px] leading-[1.35] mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <span className="font-normal text-[#606060] dark:text-[#aaaaaa] hover:text-[#0f0f0f] dark:hover:text-white transition-colors">
                            {vid.channelTitle}
                          </span>
                          {vid.viewCount !== undefined && (
                            <>
                              <span className="text-[10px] text-neutral-400 dark:text-neutral-500">•</span>
                              <span>{formatViews(vid.viewCount)}</span>
                            </>
                          )}
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">•</span>
                          <span>{timeAgo(vid.publishedAt)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          showToast('Options: Share & Save');
                        }}
                        className="p-1 -mr-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all text-[#0f0f0f] dark:text-neutral-300 shrink-0 mt-0.5"
                        aria-label="More options"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : !hasApiError ? (
                <div className="col-span-full py-16 text-center text-slate-500">
                  <p className="text-sm font-semibold mb-2">No videos found.</p>
                  <button
                    onClick={() => loadFeedData(true)}
                    className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold shadow-xs"
                  >
                    Try again
                  </button>
                </div>
              ) : null}
            </div>

            {/* Sentinel element for infinite scroll */}
            <div ref={sentinelRef} className="h-10 w-full" />
          </div>
        )}
      </div>

      {/* DESCRIPTION BOTTOM SHEET */}
      {isDescOpen && selectedVideo && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsDescOpen(false)}
        >
          <div 
            className="w-full max-h-[82vh] bg-white dark:bg-[#181818] rounded-t-3xl shadow-2xl flex flex-col border-t border-slate-200 dark:border-neutral-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grabber handle */}
            <div className="w-12 h-1 bg-slate-300 dark:bg-neutral-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-neutral-800 shrink-0">
              <h2 className="text-[17px] font-bold text-slate-900 dark:text-white">Description</h2>
              <button 
                onClick={() => setIsDescOpen(false)}
                className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Close description"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <h3 className="text-[16px] font-bold text-slate-900 dark:text-white leading-snug">
                {decodeHtml(selectedVideo.title)}
              </h3>

              {/* Stats Bar */}
              <div className="flex items-center justify-around py-3 px-2 bg-slate-50 dark:bg-neutral-900 rounded-2xl border border-slate-100 dark:border-neutral-800 text-center">
                <div>
                  <p className="text-[15px] font-black text-slate-900 dark:text-white">
                    {selectedVideo.viewCount !== undefined ? formatViews(selectedVideo.viewCount) : '—'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">Views</p>
                </div>
                <div className="w-[1px] h-6 bg-slate-200 dark:bg-neutral-800" />
                <div>
                  <p className="text-[15px] font-black text-slate-900 dark:text-white">
                    {likeCount > 0 ? likeCount.toLocaleString() : '—'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">Likes</p>
                </div>
                <div className="w-[1px] h-6 bg-slate-200 dark:bg-neutral-800" />
                <div>
                  <p className="text-[15px] font-black text-slate-900 dark:text-white">
                    {timeAgo(selectedVideo.publishedAt)}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">Uploaded</p>
                </div>
              </div>

              {/* Channel Row: REAL channel avatar, channel name and {formatCount(subscriberCount)} subscribers */}
              <div className="flex items-center gap-3 py-1">
                <ChannelAvatar
                  avatar={selectedVideo.channelAvatar}
                  title={selectedVideo.channelTitle}
                  size="lg"
                  className="border border-slate-200 dark:border-slate-700"
                />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {selectedVideo.channelTitle || 'Channel'}
                  </p>
                  {selectedVideo.subscriberCount !== undefined && (
                    <p className="text-xs text-slate-500">
                      {formatCount(selectedVideo.subscriberCount)} subscribers
                    </p>
                  )}
                </div>
              </div>

              {/* Description Text: shows description_short; if empty show nothing */}
              {selectedVideo.description ? (
                <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {selectedVideo.description}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

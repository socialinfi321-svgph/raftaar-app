import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useBackHandler } from '../hooks/useBackHandler';
import { 
  ArrowLeft, Search, X, ThumbsUp, ThumbsDown, Share2, 
  Bookmark, Bell, MoreVertical, MoreHorizontal, RotateCw, AlertTriangle, RefreshCw,
  FileText, Download, BookOpen, MessageSquare, Play, Check, ChevronRight, ChevronDown,
  Sparkles, Users, ListVideo, Layers, Volume2, VolumeX, Subtitles, Send
} from 'lucide-react';
import { Profile } from '../types';
import { CustomVideoPlayer, CustomVideoPlayerRef, loadYouTubeIframeApi } from './CustomVideoPlayer';
import { InlinePreviewPlayer } from './InlinePreviewPlayer';
import { SmartThumbnail } from './SmartThumbnail';
import { 
  searchVideos, 
  fetchHomeVideos, 
  fetchRecommendedVideos,
  fetchChannelDetails,
  fetchChannelVideos,
  fetchChannelPlaylists,
  fetchPlaylistVideos,
  markIdsAsShown,
  VideoItem,
  RecCursor,
  ChannelDetails,
  PlaylistDetails
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

// Helper: Full view count with commas
const formatFullViews = (views?: number): string => {
  if (views === undefined || views === null) return '0 views';
  return `${Number(views).toLocaleString('en-IN')} views`;
};

// Helper: Format published date like "12 Sep 2026"
const formatFullDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
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

// Helper: Parse timestamp (e.g. "15:30" or "1:05:20") into total seconds
const parseTimestampSeconds = (str: string): number | null => {
  const parts = str.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return null;
};

// Channel Avatar Badge
const ChannelAvatar: React.FC<{
  avatar?: string;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}> = ({ avatar, title = '', size = 'md', className = '', onClick }) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-10 h-10 text-base',
    xl: 'w-16 h-16 sm:w-20 sm:h-20 text-xl font-bold'
  }[size];

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={title}
        onClick={onClick}
        className={`${sizeClasses} rounded-full object-cover shrink-0 bg-neutral-200 dark:bg-neutral-800 ${className} ${onClick ? 'cursor-pointer hover:opacity-90' : ''}`}
      />
    );
  }

  const initial = (title ? title.trim().charAt(0) : 'R').toUpperCase();
  return (
    <div
      onClick={onClick}
      className={`${sizeClasses} rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 text-white font-bold flex items-center justify-center shrink-0 uppercase shadow-xs ${className} ${onClick ? 'cursor-pointer hover:opacity-90' : ''}`}
    >
      {initial}
    </div>
  );
};

// Mobile-only landscape fill detection (never triggers on desktop)
const LANDSCAPE_FILL_QUERY = '(orientation: landscape) and (max-height: 520px) and (pointer: coarse)';

const useLandscapeFill = (): boolean => {
  const [isLandscapeFill, setIsLandscapeFill] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(LANDSCAPE_FILL_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(LANDSCAPE_FILL_QUERY);
    const update = () => setIsLandscapeFill(mql.matches);
    update();
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', update);
      return () => mql.removeEventListener('change', update);
    }
    mql.addListener(update);
    return () => mql.removeListener(update);
  }, []);

  return isLandscapeFill;
};

export const YouTubeHome: React.FC<{ navigate: any; profile?: Profile | null }> = ({ navigate, profile }) => {
  const nameParts = (profile?.full_name || 'Developer').trim().split(/\s+/);
  const firstName = nameParts[0] || 'Developer';
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);

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
  const [isSearchingFallback, setIsSearchingFallback] = useState(false);
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
  const headerRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const playerTopRef = useRef<HTMLDivElement>(null);

  // Pull-to-refresh
  const touchStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  // Watch Player State
  const playerRef = useRef<CustomVideoPlayerRef>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [recommendedVideos, setRecommendedVideos] = useState<VideoItem[]>([]);
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const recPoolRef = useRef<VideoItem[]>([]);
  const recCursorRef = useRef<RecCursor | null>({ tier: 1, offset: 0 });
  const recSeenRef = useRef<Set<string>>(new Set());
  const isReplenishingRecsRef = useRef(false);
  const recSentinelRef = useRef<HTMLDivElement>(null);

  // Watch Screen Interactions
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isDescOpen, setIsDescOpen] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Playlist Context for Watch Screen (when watching video from a playlist)
  const [activePlaylistContext, setActivePlaylistContext] = useState<{
    id: string;
    title: string;
    videos: VideoItem[];
  } | null>(null);

  // Watch Screen Filter Chips & Comments
  const [watchFilter, setWatchFilter] = useState<'All' | 'From this channel' | 'Related' | 'Recently uploaded'>('All');
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [commentsList, setCommentsList] = useState([
    {
      id: '1',
      user: 'Rohan Sharma',
      avatarBg: 'bg-indigo-600',
      text: 'Sir aapka teaching method bhot accha hai! Concept ekdum crystal clear ho gaya ❤️',
      time: '2 hours ago',
      likes: 24
    },
    {
      id: '2',
      user: 'Priya Patel',
      avatarBg: 'bg-emerald-600',
      text: 'Best revision lecture! Thank you so much PW team 🙌',
      time: '5 hours ago',
      likes: 18
    },
    {
      id: '3',
      user: 'Aman Verma',
      avatarBg: 'bg-amber-600',
      text: 'Is chapter ke previous year questions bhi solve karwa dijiye please.',
      time: '1 day ago',
      likes: 9
    }
  ]);

  // Channel & Playlist Dedicated View States
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [channelDetails, setChannelDetails] = useState<ChannelDetails | null>(null);
  const [channelVideos, setChannelVideos] = useState<VideoItem[]>([]);
  const [channelPlaylists, setChannelPlaylists] = useState<PlaylistDetails[]>([]);
  const [channelTab, setChannelTab] = useState<'home' | 'videos' | 'shorts' | 'playlists'>('home');
  const [channelVideoSort, setChannelVideoSort] = useState<'latest' | 'popular' | 'oldest'>('latest');
  const [loadingChannel, setLoadingChannel] = useState(false);

  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [playlistTitle, setPlaylistTitle] = useState<string | null>(null);
  const [playlistVideosList, setPlaylistVideosList] = useState<VideoItem[]>([]);

  // Warm up YouTube IFrame API on mount
  useEffect(() => {
    loadYouTubeIframeApi();
  }, []);

  // Watch screen native Android WebView bridge & mobile landscape fill
  const isWatchActive = Boolean(selectedVideo);
  const isMobileLandscape = useLandscapeFill();
  const isLandscapeFillActive = isWatchActive && isMobileLandscape;

  useEffect(() => {
    try {
      (window as any).RaftaarNative?.setWatchMode?.(isWatchActive);
    } catch {}
    return () => {
      try {
        (window as any).RaftaarNative?.setWatchMode?.(false);
      } catch {}
    };
  }, [isWatchActive]);

  useEffect(() => {
    if (!isLandscapeFillActive) {
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.dispatchEvent(new CustomEvent('app:nav-visible', { detail: { visible: false } }));

    return () => {
      document.body.style.overflow = prevOverflow;
      window.dispatchEvent(new CustomEvent('app:nav-visible', { detail: { visible: true } }));
    };
  }, [isLandscapeFillActive]);

  // IntersectionObserver-driven Inline Autoplay on Home feed
  const [activePreviewVideoId, setActivePreviewVideoId] = useState<string | null>(null);
  const activePreviewVideoIdRef = useRef<string | null>(null);
  activePreviewVideoIdRef.current = activePreviewVideoId;

  const cardElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const visibilityRatiosRef = useRef<Map<string, number>>(new Map());
  const lastScrollTimeRef = useRef<number>(0);
  const dwellTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const candidateVideoIdRef = useRef<string | null>(null);

  const isPreviewBlocked = useCallback((): boolean => {
    if (typeof document !== 'undefined' && document.hidden) return true;
    if (selectedVideo || activeChannelId || activePlaylistId) return true;
    const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
    const conn = nav?.connection || nav?.mozConnection || nav?.webkitConnection;
    if (conn?.saveData === true) return true;
    if (conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') return true;
    return false;
  }, [selectedVideo, activeChannelId, activePlaylistId]);

  const pickBestCandidate = useCallback((): string | null => {
    let bestId: string | null = null;
    let bestRatio = -1;
    let bestTop = Infinity;

    visibilityRatiosRef.current.forEach((ratio, id) => {
      if (ratio < 0.6) return;
      const el = cardElementsRef.current.get(id);
      if (!el) return;
      const top = el.getBoundingClientRect().top;

      if (ratio > bestRatio + 0.001) {
        bestRatio = ratio;
        bestTop = top;
        bestId = id;
      } else if (Math.abs(ratio - bestRatio) <= 0.001 && top < bestTop) {
        bestTop = top;
        bestId = id;
      }
    });

    return bestId;
  }, []);

  const schedulePreviewActivation = useCallback(
    (candidateId: string | null) => {
      if (dwellTimerRef.current) {
        clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
      candidateVideoIdRef.current = candidateId;

      if (!candidateId || isPreviewBlocked()) {
        return;
      }

      const attemptActivate = (targetId: string) => {
        if (isPreviewBlocked()) return;
        const latestBest = pickBestCandidate();
        if (latestBest !== targetId) return;

        const sinceScroll = Date.now() - lastScrollTimeRef.current;
        if (sinceScroll < 120) {
          dwellTimerRef.current = setTimeout(() => {
            attemptActivate(targetId);
          }, 120 - sinceScroll);
          return;
        }

        setActivePreviewVideoId(targetId);
      };

      dwellTimerRef.current = setTimeout(() => {
        attemptActivate(candidateId);
      }, 150);
    },
    [isPreviewBlocked, pickBestCandidate]
  );

  const evaluatePreviewCandidate = useCallback(() => {
    if (isPreviewBlocked()) {
      if (dwellTimerRef.current) {
        clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
      candidateVideoIdRef.current = null;
      if (activePreviewVideoIdRef.current !== null) {
        setActivePreviewVideoId(null);
      }
      return;
    }

    const currentActive = activePreviewVideoIdRef.current;
    if (currentActive) {
      const currentRatio = visibilityRatiosRef.current.get(currentActive) ?? 0;
      // Keep current video playing continuously until user slides at least 50% off screen
      if (currentRatio >= 0.5) {
        return;
      }
      setActivePreviewVideoId(null);
    }

    const bestCandidate = pickBestCandidate();

    if (
      bestCandidate !== candidateVideoIdRef.current ||
      (bestCandidate && !dwellTimerRef.current)
    ) {
      schedulePreviewActivation(bestCandidate);
    }
  }, [isPreviewBlocked, pickBestCandidate, schedulePreviewActivation]);

  // Observe every home feed card's media box using IntersectionObserver
  useEffect(() => {
    if (selectedVideo || activeChannelId || activePlaylistId || videos.length === 0) {
      if (dwellTimerRef.current) {
        clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
      if (activePreviewVideoIdRef.current !== null) {
        setActivePreviewVideoId(null);
      }
      return;
    }

    const rootEl = scrollContainerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const vidId = entry.target.getAttribute('data-video-id');
          if (!vidId) return;
          visibilityRatiosRef.current.set(vidId, entry.intersectionRatio);
        });
        evaluatePreviewCandidate();
      },
      {
        root: rootEl,
        threshold: [0, 0.25, 0.5, 0.6, 0.75, 1]
      }
    );

    cardElementsRef.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
      if (dwellTimerRef.current) {
        clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
    };
  }, [videos, selectedVideo, activeChannelId, activePlaylistId, evaluatePreviewCandidate]);

  // Stop preview when tab is hidden; re-evaluate when visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (dwellTimerRef.current) {
          clearTimeout(dwellTimerRef.current);
          dwellTimerRef.current = null;
        }
        candidateVideoIdRef.current = null;
        setActivePreviewVideoId(null);
      } else {
        evaluatePreviewCandidate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [evaluatePreviewCandidate]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  // Listen for custom toast events (e.g. 429 live search limit)
  useEffect(() => {
    const handleToastEvent = (e: any) => {
      if (e.detail?.message) {
        showToast(e.detail.message);
      }
    };
    window.addEventListener('raftaar:toast', handleToastEvent);
    return () => window.removeEventListener('raftaar:toast', handleToastEvent);
  }, []);

  // Android hardware back button integration
  useBackHandler(() => {
    if (isProfileDrawerOpen) {
      setIsProfileDrawerOpen(false);
      return true;
    }
    if (isCommentsOpen) {
      setIsCommentsOpen(false);
      return true;
    }
    if (activePlaylistId) {
      setActivePlaylistId(null);
      return true;
    }
    if (activeChannelId) {
      setActiveChannelId(null);
      return true;
    }
    if (isDescOpen) {
      setIsDescOpen(false);
      return true;
    }
    if (selectedVideo) {
      setSelectedVideo(null);
      setActivePlaylistContext(null);
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

  // Open Channel Page
  const handleOpenChannel = useCallback(async (channelId: string) => {
    if (!channelId) return;
    setActiveChannelId(channelId);
    setLoadingChannel(true);
    setChannelTab('home');
    setChannelVideoSort('latest');

    try {
      const [details, vidsRes, plsRes] = await Promise.all([
        fetchChannelDetails(channelId),
        fetchChannelVideos(channelId, 'latest'),
        fetchChannelPlaylists(channelId)
      ]);
      setChannelDetails(details);
      setChannelVideos(vidsRes.items);
      setChannelPlaylists(plsRes.playlists);
    } finally {
      setLoadingChannel(false);
    }
  }, []);

  // Open Playlist Page
  const handleOpenPlaylist = useCallback(async (plId: string) => {
    if (!plId) return;
    setActivePlaylistId(plId);

    try {
      const res = await fetchPlaylistVideos(plId);
      setPlaylistTitle(res.playlistTitle || 'Playlist');
      setPlaylistVideosList(res.items);
    } catch {
      setPlaylistVideosList([]);
    }
  }, []);

  // Update channel video sorting
  useEffect(() => {
    if (!activeChannelId) return;
    if (channelTab === 'videos') {
      setLoadingChannel(true);
      fetchChannelVideos(activeChannelId, channelVideoSort)
        .then(res => setChannelVideos(res.items))
        .finally(() => setLoadingChannel(false));
    } else if (channelTab === 'shorts') {
      setLoadingChannel(true);
      fetchChannelVideos(activeChannelId, 'latest', { isShorts: true })
        .then(res => setChannelVideos(res.items))
        .finally(() => setLoadingChannel(false));
    }
  }, [activeChannelId, channelTab, channelVideoSort]);

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
        const res = await searchVideos(searchQuery.trim(), { 
          offset,
          onFallbackState: setIsSearchingFallback
        });
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
      // Stop quietly
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
      setActivePreviewVideoId(null);

      if (isReload) {
        setVideos([]);
        feedPoolRef.current = [];
        homeNextOffsetRef.current = null;
        searchNextTokenRef.current = null;
      }

      // 1. SEARCH MODE
      if (searchQuery.trim()) {
        try {
          const res = await searchVideos(searchQuery.trim(), { 
            offset: 0,
            onFallbackState: setIsSearchingFallback
          });
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

      // 2. HOME FEED
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

  // Sentinel for prefetching next bundle 1200px before end
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
    if (selectedVideo) setSelectedVideo(null);
    if (activeChannelId) setActiveChannelId(null);
    if (activePlaylistId) setActivePlaylistId(null);
    visibilityRatiosRef.current.clear();
    candidateVideoIdRef.current = null;
    setActivePreviewVideoId(null);
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    loadFeedData(true);
  }, [loadFeedData, selectedVideo, activeChannelId, activePlaylistId]);

  // Listen for 'raftaar:home-refresh' custom event from App.tsx
  useEffect(() => {
    const onHomeRefresh = () => {
      handleFullReload();
    };
    window.addEventListener('raftaar:home-refresh', onHomeRefresh);
    return () => window.removeEventListener('raftaar:home-refresh', onHomeRefresh);
  }, [handleFullReload]);

  // Smart Header hide/show on scroll + Keep active preview playing until >= 50% slid away
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
    lastScrollTimeRef.current = Date.now();

    const activeId = activePreviewVideoIdRef.current;
    if (activeId) {
      const activeEl = cardElementsRef.current.get(activeId);
      const rootEl = scrollContainerRef.current;
      if (activeEl && rootEl) {
        const elRect = activeEl.getBoundingClientRect();
        const rootRect = rootEl.getBoundingClientRect();
        const visibleTop = Math.max(elRect.top, rootRect.top);
        const visibleBottom = Math.min(elRect.bottom, rootRect.bottom);
        const visibleH = Math.max(0, visibleBottom - visibleTop);
        const liveRatio = elRect.height > 0 ? visibleH / elRect.height : 0;
        visibilityRatiosRef.current.set(activeId, liveRatio);

        // Only stop active video and switch once user slides at least 50% off screen
        if (liveRatio < 0.5) {
          setActivePreviewVideoId(null);
          const nextBest = pickBestCandidate();
          schedulePreviewActivation(nextBest);
        }
        return;
      }
    }

    // No active preview currently playing: schedule best visible card once scroll settles
    const bestCandidate = pickBestCandidate();
    schedulePreviewActivation(bestCandidate);
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

  // Handle Video Click -> Watch Screen & Unlimited Up Next
  const handleSelectVideo = (
    vid: VideoItem,
    playlistCtx?: { id: string; title: string; videos: VideoItem[] } | null,
    previewSeconds?: number
  ) => {
    // If preview was playing this video, save current progress so main player resumes at exact second
    if (typeof previewSeconds === 'number' && previewSeconds >= 1) {
      try {
        localStorage.setItem(`raftaar_progress_${vid.id}`, String(Math.floor(previewSeconds)));
      } catch {}
    }
    if (playlistCtx !== undefined) {
      setActivePlaylistContext(playlistCtx);
    }
    setSelectedVideo(vid);
    setActivePreviewVideoId(null);
    setLikeCount(vid.likeCount || 0);
    setIsLiked(false);
    setIsSaved(false);
    setIsDescOpen(false);
    setIsCommentsOpen(false);
    setWatchFilter('All');
    setRecommendedVideos([]);
    recPoolRef.current = [];

    // Reset unlimited cursor and seen Set for Up Next
    recCursorRef.current = { tier: 1, offset: 0 };
    recSeenRef.current = new Set([vid.id]);

    // Initial batch of Up Next recommendations
    setLoadingRecommended(true);
    fetchRecommendedVideos(vid, { cursor: recCursorRef.current })
      .then(res => {
        recCursorRef.current = res.nextCursor;
        const fresh = res.items.filter(it => !recSeenRef.current.has(it.id));
        fresh.forEach(it => recSeenRef.current.add(it.id));
        recPoolRef.current = fresh;
        const initialBatch = recPoolRef.current.splice(0, 10);
        setRecommendedVideos(initialBatch);
      })
      .finally(() => {
        setLoadingRecommended(false);
      });

    setTimeout(() => {
      playerTopRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // Unlimited Up Next replenishRecPool
  const replenishRecPool = useCallback(async () => {
    if (!selectedVideo || isReplenishingRecsRef.current) return;
    if (recCursorRef.current === null && recPoolRef.current.length === 0) return;

    isReplenishingRecsRef.current = true;

    try {
      if (recPoolRef.current.length > 0) {
        const nextBatch = recPoolRef.current.splice(0, 8);
        setRecommendedVideos(prev => [...prev, ...nextBatch]);
      }

      if (recPoolRef.current.length < 10 && recCursorRef.current !== null) {
        const res = await fetchRecommendedVideos(selectedVideo, { cursor: recCursorRef.current });
        recCursorRef.current = res.nextCursor;
        const fresh = res.items.filter(it => !recSeenRef.current.has(it.id));
        fresh.forEach(it => recSeenRef.current.add(it.id));
        recPoolRef.current.push(...fresh);

        setRecommendedVideos(prev => {
          if (prev.length === 0 && recPoolRef.current.length > 0) {
            return recPoolRef.current.splice(0, 8);
          }
          return prev;
        });
      }
    } catch {
      // Stop quietly
    } finally {
      isReplenishingRecsRef.current = false;
    }
  }, [selectedVideo]);

  // Infinite scroll on Up next list with 1200px rootMargin prefetch
  useEffect(() => {
    const sentinel = recSentinelRef.current;
    if (!sentinel || !selectedVideo) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingRecommended) {
          replenishRecPool();
        }
      },
      { rootMargin: '1200px 0px 1200px 0px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [selectedVideo, loadingRecommended, replenishRecPool]);

  // Next video player handler
  const handlePlayNextVideo = () => {
    if (activePlaylistContext && activePlaylistContext.videos.length > 0) {
      const currIdx = activePlaylistContext.videos.findIndex(v => v.id === selectedVideo?.id);
      if (currIdx >= 0 && currIdx < activePlaylistContext.videos.length - 1) {
        handleSelectVideo(activePlaylistContext.videos[currIdx + 1], activePlaylistContext);
        return;
      }
    }
    if (recommendedVideos.length > 0) {
      handleSelectVideo(recommendedVideos[0], null);
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    const newComment = {
      id: String(Date.now()),
      user: 'You (Student)',
      avatarBg: 'bg-rose-600',
      text: commentInput.trim(),
      time: 'Just now',
      likes: 0
    };
    setCommentsList(prev => [newComment, ...prev]);
    setCommentInput('');
    showToast('Comment posted! ✨');
  };

  // Filter recommendations based on selected chip
  const filteredRecommendedVideos = useMemo(() => {
    if (watchFilter === 'From this channel' && selectedVideo?.channelId) {
      return recommendedVideos.filter(v => v.channelId === selectedVideo.channelId);
    }
    return recommendedVideos;
  }, [recommendedVideos, watchFilter, selectedVideo]);

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

  // Render clickable description text with timestamps
  const renderDescriptionBody = (text?: string) => {
    if (!text) return null;
    const lines = text.split('\n');

    return lines.map((line, idx) => {
      const match = line.match(/^(\(?\d{1,2}:[0-5]\d(?::[0-5]\d)?\)?)\s*(.*)$/);
      if (match) {
        const rawTime = match[1].replace(/[()]/g, '');
        const sec = parseTimestampSeconds(rawTime);
        if (sec !== null) {
          return (
            <div key={idx} className="my-1">
              <button
                type="button"
                onClick={() => {
                  playerRef.current?.seekTo(sec);
                  setIsDescOpen(false);
                }}
                className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-mono text-[13px] font-semibold text-left py-0.5"
              >
                <span className="bg-blue-50 dark:bg-blue-950/80 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">
                  {rawTime}
                </span>
                <span className="font-sans font-normal text-[#0f0f0f] dark:text-white">
                  {match[2]}
                </span>
              </button>
            </div>
          );
        }
      }

      return (
        <div key={idx} className="min-h-[1.25rem]">
          {line}
        </div>
      );
    });
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0f0f0f] font-sans transition-colors duration-300 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[300] bg-neutral-900/95 dark:bg-white/95 text-white dark:text-[#0f0f0f] px-4 py-2 rounded-full text-xs font-bold shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2 border border-neutral-700 dark:border-neutral-300 pointer-events-none">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================= STUDY-STYLE PROFILE SIDE DRAWER ================= */}
      <div
        className={`fixed inset-0 bg-black/60 z-[298] transition-opacity duration-300 ${
          isProfileDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsProfileDrawerOpen(false)}
      />
      <div
        className={`fixed top-0 left-0 h-[100dvh] w-[82%] max-w-[300px] bg-white dark:bg-slate-900 z-[299] shadow-2xl transition-transform duration-300 ease-in-out transform flex flex-col ${
          isProfileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="pt-safe-header px-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-full bg-[#00897b] flex items-center justify-center text-white text-2xl font-normal uppercase shadow">
              {firstName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white truncate capitalize">
                {profile?.full_name || firstName}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Weekly XP: <span className="font-semibold text-[#00897b] dark:text-teal-400">{profile?.weekly_xp || 0}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 py-4 px-3 flex flex-col gap-1">
          {[
            { label: 'Study Dashboard', icon: 'fa-book-open', path: '/' },
            { label: 'Practice Chapters', icon: 'fa-brain', path: '/practice' },
            { label: 'Mock Exams', icon: 'fa-file-signature', path: '/exam' },
            { label: 'Rewards & Rank', icon: 'fa-trophy', path: '/rewards' }
          ].map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => {
                setIsProfileDrawerOpen(false);
                navigate(item.path);
              }}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"
            >
              <div className="flex items-center gap-3.5">
                <i className={`fa-solid ${item.icon} w-5 text-center text-sm text-slate-500 dark:text-slate-400`} />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          ))}
        </div>
      </div>

      {/* ================= DEDICATED CHANNEL PAGE VIEW ================= */}
      {activeChannelId && (
        <div className="fixed inset-0 z-[150] bg-white dark:bg-[#0f0f0f] flex flex-col overflow-y-auto animate-fade-in">
          {/* Top Bar */}
          <div className="sticky top-0 z-30 flex items-center justify-between px-3 pt-safe-header pb-2 bg-white/95 dark:bg-[#0f0f0f]/95 backdrop-blur-md border-b border-neutral-100 dark:border-neutral-800">
            <button
              onClick={() => setActiveChannelId(null)}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#0f0f0f] dark:text-white"
              aria-label="Back"
            >
              <ArrowLeft size={22} />
            </button>
            <span className="text-base font-bold text-[#0f0f0f] dark:text-white truncate max-w-[65vw]">
              {channelDetails?.channelTitle || 'Channel'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsSearchExpanded(true);
                  setActiveChannelId(null);
                }}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#0f0f0f] dark:text-white"
                aria-label="Search"
              >
                <Search size={20} />
              </button>
              <button
                onClick={() => showToast('Channel options')}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#0f0f0f] dark:text-white"
                aria-label="More"
              >
                <MoreVertical size={20} />
              </button>
            </div>
          </div>

          {/* Channel Banner */}
          <div className="w-full h-32 sm:h-44 bg-neutral-200 dark:bg-neutral-800 relative overflow-hidden shrink-0">
            {channelDetails?.channelBannerUrl ? (
              <img
                src={channelDetails.channelBannerUrl}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-between px-6 bg-gradient-to-r from-neutral-300 via-neutral-200 to-neutral-300 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#0f0f0f] dark:text-white tracking-tight">
                    {channelDetails?.channelTitle || 'Official Faculty'}
                  </h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">High Yield Educational Lecture Series</p>
                </div>
                <Sparkles size={28} className="text-amber-500 opacity-70" />
              </div>
            )}
          </div>

          {/* Channel Header Profile Section */}
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-start gap-3.5">
              <ChannelAvatar
                avatar={channelDetails?.channelAvatar}
                title={channelDetails?.channelTitle}
                size="xl"
                className="border-2 border-white dark:border-[#0f0f0f] shadow-md -mt-4 sm:-mt-6"
              />
              <div className="flex-1 min-w-0 pt-0.5">
                <h1 className="text-[18px] sm:text-[21px] font-bold text-[#0f0f0f] dark:text-white flex items-center gap-1.5 leading-tight">
                  <span className="truncate">{channelDetails?.channelTitle || 'Channel'}</span>
                  <Check size={15} className="text-white bg-black dark:bg-white dark:text-black rounded-full p-0.5 shrink-0" />
                </h1>
                {channelDetails?.channelHandle && (
                  <p className="text-[12.5px] text-neutral-600 dark:text-neutral-400 font-medium">
                    {channelDetails.channelHandle}
                  </p>
                )}
                <p className="text-[12px] text-neutral-600 dark:text-neutral-400 mt-0.5 font-normal">
                  {formatCount(channelDetails?.subscriberCount)} subscribers • {channelDetails?.videoCount ? `${channelDetails.videoCount} videos` : 'Educational content'}
                </p>
              </div>
            </div>

            {/* Description Snippet: 1 single clean line */}
            {channelDetails?.description && (
              <p className="text-[12.5px] text-neutral-600 dark:text-neutral-400 mt-2 line-clamp-1 leading-snug">
                {channelDetails.description}
              </p>
            )}

            {/* Action Buttons: Subscribe & Community */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => {
                  setIsFollowed(!isFollowed);
                  showToast(isFollowed ? 'Unsubscribed' : 'Subscribed to channel');
                }}
                className={`flex-1 py-2 rounded-full text-[13.5px] font-bold transition-all shadow-xs active:scale-98 ${
                  isFollowed
                    ? 'bg-neutral-200 dark:bg-neutral-800 text-[#0f0f0f] dark:text-white'
                    : 'bg-[#0f0f0f] dark:bg-white text-white dark:text-[#0f0f0f] hover:opacity-90'
                }`}
              >
                {isFollowed ? 'Subscribed' : 'Subscribe'}
              </button>
              <button
                onClick={() => showToast('Community posts coming soon')}
                className="px-4 py-2 rounded-full border border-neutral-300 dark:border-neutral-700 text-[#0f0f0f] dark:text-white text-[13.5px] font-bold flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <Users size={16} />
                <span>Community</span>
              </button>
            </div>
          </div>

          {/* Sticky Channel Tabs */}
          <div className="sticky top-12 z-20 bg-white dark:bg-[#0f0f0f] flex items-center border-b border-neutral-200 dark:border-neutral-800 px-3 overflow-x-auto hide-scrollbar shrink-0 mt-1">
            {(['home', 'videos', 'shorts', 'playlists'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setChannelTab(tab)}
                className={`px-4 py-2.5 text-[14px] font-bold capitalize whitespace-nowrap transition-colors relative ${
                  channelTab === tab
                    ? 'text-[#0f0f0f] dark:text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-[#0f0f0f] dark:hover:text-white'
                }`}
              >
                {tab}
                {channelTab === tab && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#0f0f0f] dark:bg-white rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Channel Tab Content */}
          <div className="flex-1 p-3">
            {channelTab === 'videos' && (
              <div className="flex items-center gap-2 mb-3">
                {(['latest', 'popular', 'oldest'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setChannelVideoSort(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                      channelVideoSort === s
                        ? 'bg-[#0f0f0f] text-white dark:bg-white dark:text-[#0f0f0f]'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {channelTab === 'shorts' ? (
              /* Shorts: 3-column vertical grid */
              <div className="grid grid-cols-3 gap-2">
                {channelVideos.length > 0 ? (
                  channelVideos.map(vid => (
                    <div
                      key={vid.id}
                      onClick={() => {
                        handleSelectVideo(vid);
                        setActiveChannelId(null);
                      }}
                      className="group cursor-pointer aspect-[9/16] rounded-xl overflow-hidden bg-black relative shadow-xs active:scale-95 transition-transform"
                    >
                      <img
                        src={vid.thumbnail}
                        alt={vid.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-[11px] font-semibold text-white line-clamp-2 leading-tight drop-shadow-sm">
                          {decodeHtml(vid.title)}
                        </p>
                        <p className="text-[10px] text-neutral-300 mt-0.5">
                          {formatViews(vid.viewCount)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="col-span-3 text-center py-12 text-xs text-neutral-500">No shorts available</p>
                )}
              </div>
            ) : channelTab === 'playlists' ? (
              /* Playlists Tab */
              <div className="space-y-3">
                {channelPlaylists.length > 0 ? (
                  channelPlaylists.map(pl => (
                    <div
                      key={pl.playlistId}
                      onClick={() => handleOpenPlaylist(pl.playlistId)}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/60 cursor-pointer transition-all border border-neutral-100 dark:border-neutral-800"
                    >
                      <div className="w-32 sm:w-36 aspect-video bg-neutral-200 dark:bg-neutral-800 rounded-lg overflow-hidden relative shrink-0">
                        {pl.thumbnail ? (
                          <img src={pl.thumbnail} alt={pl.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-indigo-900 text-white">
                            <ListVideo size={24} />
                          </div>
                        )}
                        <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Layers size={10} />
                          <span>{pl.videoCount}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-bold text-[#0f0f0f] dark:text-white line-clamp-2">
                          {pl.title}
                        </h4>
                        <p className="text-[11.5px] text-neutral-600 dark:text-neutral-400 mt-1">
                          {pl.videoCount} lectures • View playlist
                        </p>
                      </div>
                      <ChevronRight size={18} className="text-neutral-400" />
                    </div>
                  ))
                ) : (
                  <p className="text-center py-12 text-xs text-neutral-500">No playlists found</p>
                )}
              </div>
            ) : (
              /* Videos & Home List */
              <div className="space-y-3">
                {channelVideos.length > 0 ? (
                  channelVideos.map(vid => (
                    <div
                      key={vid.id}
                      onClick={() => {
                        handleSelectVideo(vid);
                        setActiveChannelId(null);
                      }}
                      className="flex items-start gap-3 p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/60 cursor-pointer transition-all"
                    >
                      <div className="w-32 sm:w-36 aspect-video rounded-lg overflow-hidden shrink-0 relative bg-black">
                        <SmartThumbnail
                          videoId={vid.id}
                          title={vid.title}
                          duration={vid.duration}
                          className="w-full h-full rounded-lg"
                        />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h4 className="text-[12.5px] sm:text-[13px] font-medium text-[#0f0f0f] dark:text-white line-clamp-2 leading-snug">
                          {decodeHtml(vid.title)}
                        </h4>
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1 flex items-center gap-1.5">
                          {vid.viewCount !== undefined && <span>{formatViews(vid.viewCount)}</span>}
                          <span>•</span>
                          <span>{timeAgo(vid.publishedAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-12 text-xs text-neutral-500">No videos available</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= DEDICATED PLAYLIST PAGE VIEW ================= */}
      {activePlaylistId && (
        <div className="fixed inset-0 z-[160] bg-white dark:bg-[#0f0f0f] flex flex-col overflow-y-auto animate-fade-in">
          <div className="sticky top-0 z-30 flex items-center justify-between px-3 pt-safe-header pb-2 bg-white/95 dark:bg-[#0f0f0f]/95 backdrop-blur-md border-b border-neutral-100 dark:border-neutral-800">
            <button
              onClick={() => setActivePlaylistId(null)}
              className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#0f0f0f] dark:text-white"
              aria-label="Back"
            >
              <ArrowLeft size={22} />
            </button>
            <span className="text-base font-bold text-[#0f0f0f] dark:text-white truncate max-w-[65vw]">
              {playlistTitle || 'Playlist'}
            </span>
            <div className="w-8" />
          </div>

          <div className="p-4 bg-gradient-to-b from-neutral-100 dark:from-neutral-900 to-transparent">
            <h1 className="text-lg sm:text-xl font-bold text-[#0f0f0f] dark:text-white leading-tight">
              {playlistTitle}
            </h1>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
              {playlistVideosList.length} lectures in complete sequence
            </p>
            {playlistVideosList.length > 0 && (
              <button
                onClick={() => {
                  const pCtx = {
                    id: activePlaylistId || 'playlist',
                    title: playlistTitle || 'Playlist',
                    videos: playlistVideosList
                  };
                  handleSelectVideo(playlistVideosList[0], pCtx);
                  setActivePlaylistId(null);
                }}
                className="mt-3 px-5 py-2 rounded-full bg-[#0f0f0f] dark:bg-white text-white dark:text-[#0f0f0f] text-xs font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-transform"
              >
                <Play size={14} className="fill-current" />
                <span>Play all lectures</span>
              </button>
            )}
          </div>

          <div className="flex-1 p-3 space-y-2">
            {playlistVideosList.map((vid, idx) => (
              <div
                key={vid.id}
                onClick={() => {
                  const pCtx = {
                    id: activePlaylistId || 'playlist',
                    title: playlistTitle || 'Playlist',
                    videos: playlistVideosList
                  };
                  handleSelectVideo(vid, pCtx);
                  setActivePlaylistId(null);
                }}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/60 cursor-pointer transition-all border border-neutral-100 dark:border-neutral-800"
              >
                <span className="text-xs font-bold text-neutral-400 w-5 text-center shrink-0">
                  {idx + 1}
                </span>
                <div className="w-32 sm:w-36 aspect-video rounded-lg overflow-hidden shrink-0 bg-black">
                  <SmartThumbnail
                    videoId={vid.id}
                    title={vid.title}
                    duration={vid.duration}
                    className="w-full h-full rounded-lg"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[12.5px] sm:text-[13px] font-medium text-[#0f0f0f] dark:text-white line-clamp-2 leading-snug">
                    {decodeHtml(vid.title)}
                  </h4>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 truncate">
                    {vid.channelTitle} • {formatViews(vid.viewCount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TOP HEADER / SEARCH BAR ================= */}
      {!selectedVideo ? (
        <header ref={headerRef} className="sticky top-0 z-50 bg-white dark:bg-[#0f0f0f] border-b border-neutral-100 dark:border-neutral-800/60 shadow-xs">
          {/* Status Bar Safe Area Spacer (compact upper header) */}
          <div 
            className="w-full h-[max(10px,env(safe-area-inset-top,0px))] shrink-0 bg-white/95 dark:bg-[#0f0f0f]/95 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Top Logo / Search Row */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isHeaderVisible || isSearchExpanded
                ? 'h-10 opacity-100 translate-y-0'
                : 'h-0 opacity-0 -translate-y-full'
            }`}
          >
            <div className="h-10 px-3 flex items-center justify-between">
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
                        className="p-1 text-neutral-500 hover:text-[#0f0f0f] dark:hover:text-white"
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
                /* Default Header Layout: Study-section profile + small Hii greeting */
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => setIsProfileDrawerOpen(true)}
                      className="relative py-0.5 shrink-0 cursor-pointer focus:outline-none rounded-full active:scale-95 transition-transform"
                      aria-label="Open profile menu"
                    >
                      <div className="w-9 h-9 rounded-full bg-[#00897b] text-white flex items-center justify-center text-[15px] font-normal uppercase shadow-xs ring-2 ring-slate-100 dark:ring-slate-800">
                        {firstName.charAt(0)}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center gap-[2px]">
                        <span className="w-[7px] h-[1.3px] rounded-full bg-slate-800 dark:bg-slate-200" />
                        <span className="w-[7px] h-[1.3px] rounded-full bg-slate-800 dark:bg-slate-200" />
                        <span className="w-[7px] h-[1.3px] rounded-full bg-slate-800 dark:bg-slate-200" />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (selectedVideo) setSelectedVideo(null);
                        setActiveCategory('All');
                        setSearchQuery('');
                        scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-left min-w-0 cursor-pointer focus:outline-none"
                    >
                      <span
                        className="text-[13px] font-medium tracking-[-0.01em] text-[#0f0f0f] dark:text-white truncate block max-w-[160px] leading-none"
                        style={{
                          fontFamily: '"Inter", "Noto Sans Devanagari", -apple-system, BlinkMacSystemFont, sans-serif'
                        }}
                      >
                        Hii, <span className="font-semibold text-[#5b5ce6] dark:text-[#8e8dff]">{firstName}</span>
                      </span>
                    </button>
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

          {/* Category Tabs Row: Boxless editorial tabs with distinct Outfit font (no Trending/Compass icon) */}
          <div className={`px-3.5 pt-0.5 pb-1.5 flex items-center gap-5 overflow-x-auto hide-scrollbar transition-all duration-300 ${
            isHeaderVisible ? 'border-t border-neutral-100/60 dark:border-neutral-800/40' : ''
          }`}>
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
                  style={{
                    fontFamily: '"Outfit", "Noto Sans Devanagari", sans-serif'
                  }}
                  className={`relative pb-1 text-[13.5px] tracking-[0.01em] shrink-0 transition-colors whitespace-nowrap bg-transparent ${
                    isActive
                      ? 'font-semibold text-[#0f0f0f] dark:text-white'
                      : 'font-medium text-neutral-500 dark:text-neutral-400 hover:text-[#0f0f0f] dark:hover:text-white'
                  }`}
                >
                  {cat}
                  {isActive && (
                    <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full bg-[#00897b] dark:bg-teal-400" />
                  )}
                </button>
              );
            })}
          </div>
        </header>
      ) : null}

      {/* ================= MAIN CONTAINER ================= */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-y-auto hide-scrollbar bg-white dark:bg-[#0f0f0f]"
      >
        {/* Pull to refresh visual indicator */}
        {isPulling && (
          <div 
            style={{ height: `${pullDistance}px` }} 
            className="w-full flex items-center justify-center overflow-hidden transition-all text-neutral-500"
          >
            <RefreshCw size={18} className={`${pullDistance > 50 ? 'animate-spin text-brand-600' : ''}`} />
          </div>
        )}

        {selectedVideo ? (
          /* ================= 1. VIDEO WATCH VIEW ================= */
          <div
            ref={playerTopRef}
            className={
              isLandscapeFillActive
                ? 'w-full h-full bg-black'
                : 'max-w-5xl mx-auto pb-16 animate-fade-in bg-white dark:bg-[#0f0f0f]'
            }
          >
            {/* Player Container: Fixed 100dvw x 100dvh in mobile landscape fill; sticky portrait otherwise */}
            <div
              className={
                isLandscapeFillActive
                  ? 'fixed inset-0 w-[100dvw] h-[100dvh] z-[9999] bg-black flex flex-col'
                  : 'w-full sticky top-0 sm:relative z-30 shadow-md bg-black'
              }
              style={
                isLandscapeFillActive
                  ? {
                      position: 'fixed',
                      inset: 0,
                      width: '100dvw',
                      height: '100dvh',
                      zIndex: 9999,
                      backgroundColor: '#000'
                    }
                  : undefined
              }
            >
              {/* Safe Area Spacer: Hidden via class in landscape fill so player index never changes */}
              <div
                className={isLandscapeFillActive ? 'hidden' : 'safe-top-bar'}
                aria-hidden="true"
              />
              <CustomVideoPlayer
                ref={playerRef}
                videoId={selectedVideo.id}
                title={selectedVideo.title}
                totalDurationStr={selectedVideo.duration}
                isLandscapeFill={isLandscapeFillActive}
                onBack={() => {
                  setSelectedVideo(null);
                  setActivePlaylistContext(null);
                }}
                onPlayNext={handlePlayNextVideo}
              />
            </div>

            {!isLandscapeFillActive && (
            <div className="p-3.5 sm:p-4 space-y-3">
              {/* Title & More menu button */}
              <div className="flex items-start justify-between gap-2">
                <div 
                  onClick={() => setIsDescOpen(true)}
                  className="flex-1 cursor-pointer group"
                >
                  <h1 className="text-[#0f0f0f] dark:text-white text-[15px] sm:text-[16px] font-semibold leading-snug line-clamp-2 tracking-tight">
                    {decodeHtml(selectedVideo.title)}
                  </h1>
                  <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 text-neutral-600 dark:text-neutral-400 text-[12px] mt-1 font-normal">
                    {selectedVideo.viewCount !== undefined && (
                      <span>{formatViews(selectedVideo.viewCount)}</span>
                    )}
                    {selectedVideo.viewCount !== undefined && <span>•</span>}
                    <span>{timeAgo(selectedVideo.publishedAt)}</span>
                    <span className="text-[#0f0f0f] dark:text-white font-semibold hover:underline ml-1">...more</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Options: Save to Khazana or Report')}
                  className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10 rounded-full shrink-0 -mt-1"
                  aria-label="Options"
                >
                  <MoreVertical size={20} />
                </button>
              </div>

              {/* Channel Row: Avatar + Name + Subscribers + Subscribe Button (matching Image 1) */}
              <div className="flex items-center justify-between pt-0.5">
                <div 
                  onClick={() => selectedVideo.channelId && handleOpenChannel(selectedVideo.channelId)}
                  className="flex items-center gap-2.5 cursor-pointer group min-w-0 flex-1 mr-3"
                >
                  <ChannelAvatar
                    avatar={selectedVideo.channelAvatar}
                    title={selectedVideo.channelTitle}
                    size="md"
                    className="border border-neutral-200 dark:border-neutral-700 group-hover:opacity-90 shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="text-[#0f0f0f] dark:text-white font-semibold text-[13.5px] sm:text-[14px] leading-tight flex items-center gap-1 group-hover:underline truncate">
                      <span className="truncate">{selectedVideo.channelTitle || 'Channel'}</span>
                      <Check size={12} className="text-white bg-black dark:bg-white dark:text-black rounded-full p-0.5 shrink-0" />
                    </h3>
                    {selectedVideo.subscriberCount !== undefined && (
                      <p className="text-neutral-600 dark:text-neutral-400 text-[11.5px] font-normal mt-0.5">
                        {formatCount(selectedVideo.subscriberCount)} subscribers
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsFollowed(!isFollowed);
                    showToast(isFollowed ? 'Unsubscribed' : 'Subscribed');
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0 ${
                    isFollowed
                      ? 'bg-neutral-200 dark:bg-neutral-800 text-[#0f0f0f] dark:text-white'
                      : 'bg-[#0f0f0f] dark:bg-white text-white dark:text-[#0f0f0f] hover:opacity-90'
                  }`}
                >
                  {isFollowed ? 'Subscribed' : 'Subscribe'}
                </button>
              </div>

              {/* Action Buttons Carousel (joined Like/Dislike, Share, Save, Download) */}
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pt-1">
                {/* Joined Like / Dislike pill */}
                <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-full shrink-0">
                  <button
                    onClick={handleToggleLike}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-l-full transition-all hover:bg-neutral-200 dark:hover:bg-neutral-700 ${
                      isLiked ? 'text-brand-600 dark:text-brand-400' : 'text-[#0f0f0f] dark:text-white'
                    }`}
                  >
                    <ThumbsUp size={15} className={isLiked ? 'fill-current' : ''} />
                    <span>{likeCount > 0 ? formatCount(likeCount) : 'Like'}</span>
                  </button>
                  <div className="w-[1px] h-4 bg-neutral-300 dark:bg-neutral-700" />
                  <button
                    onClick={() => showToast('Disliked')}
                    className="px-2.5 py-1.5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-r-full transition-all"
                    aria-label="Dislike"
                  >
                    <ThumbsDown size={15} />
                  </button>
                </div>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-[#0f0f0f] dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 shrink-0 transition-all"
                >
                  <Share2 size={15} />
                  <span>Share</span>
                </button>

                <button
                  onClick={() => {
                    setIsSaved(!isSaved);
                    showToast(isSaved ? 'Removed from Khazana' : 'Saved to Khazana ✨');
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                    isSaved
                      ? 'bg-neutral-200 dark:bg-neutral-700 text-[#0f0f0f] dark:text-white'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-[#0f0f0f] dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  <Bookmark size={15} className={isSaved ? 'fill-current' : ''} />
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>

                <button
                  onClick={() => showToast('Lecture downloaded offline!')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-[#0f0f0f] dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 shrink-0 transition-all"
                >
                  <Download size={15} />
                  <span>Download</span>
                </button>
              </div>

              {/* Comments Preview Card (as in Image 1) */}
              <div 
                onClick={() => setIsCommentsOpen(true)}
                className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800/70 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0f0f0f] dark:text-white">
                    <span>Comments</span>
                    <span className="font-normal text-neutral-500 dark:text-neutral-400">
                      {commentsList.length}
                    </span>
                  </div>
                  <ChevronDown size={15} className="text-neutral-500" />
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full ${commentsList[0]?.avatarBg || 'bg-indigo-600'} text-white flex items-center justify-center text-[9.5px] font-bold shrink-0`}>
                    {commentsList[0]?.user?.[0] || 'U'}
                  </div>
                  <p className="text-[11.5px] text-neutral-700 dark:text-neutral-300 truncate flex-1">
                    {commentsList[0]?.text || 'Be the first to comment!'}
                  </p>
                </div>
              </div>

              {/* Recommendations Filter Chips (as in Image 2) */}
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pt-1">
                {(['All', 'From this channel', 'Related', 'Recently uploaded'] as const).map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setWatchFilter(chip)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      watchFilter === chip
                        ? 'bg-[#0f0f0f] dark:bg-white text-white dark:text-[#0f0f0f]'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-[#0f0f0f] dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Recommendations Section */}
              {activePlaylistContext && activePlaylistContext.videos.length > 0 ? (
                /* 1) Playlist Mode: Sequence list with index numbers */
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between p-2.5 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#0f0f0f] dark:text-white truncate">
                        {activePlaylistContext.title}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        Playlist • {activePlaylistContext.videos.length} videos
                      </p>
                    </div>
                    <button
                      onClick={() => setActivePlaylistContext(null)}
                      className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white ml-2 shrink-0"
                    >
                      Exit playlist
                    </button>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {activePlaylistContext.videos.map((vid, idx) => {
                      const isCurrent = vid.id === selectedVideo.id;
                      return (
                        <div
                          key={vid.id}
                          onClick={() => handleSelectVideo(vid, activePlaylistContext)}
                          className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all ${
                            isCurrent
                              ? 'bg-neutral-200/70 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700'
                              : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                          }`}
                        >
                          <span className="text-xs font-bold text-neutral-400 w-5 text-center shrink-0">
                            {isCurrent ? <Play size={12} className="fill-current text-brand-600 dark:text-brand-400 mx-auto" /> : idx + 1}
                          </span>
                          <div className="w-28 sm:w-32 aspect-video rounded-lg overflow-hidden shrink-0 bg-black">
                            <SmartThumbnail
                              videoId={vid.id}
                              title={vid.title}
                              duration={vid.duration}
                              className="w-full h-full rounded-lg"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-[12px] sm:text-[12.5px] font-medium leading-snug line-clamp-2 ${
                              isCurrent ? 'text-brand-600 dark:text-brand-400 font-semibold' : 'text-[#0f0f0f] dark:text-white'
                            }`}>
                              {decodeHtml(vid.title)}
                            </h4>
                            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-0.5 truncate">
                              {vid.channelTitle}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* 2) Normal Mode: FULL THUMBNAIL recommendation cards (matching Image 2) */
                <div className="space-y-4 pt-2">
                  {filteredRecommendedVideos.map((item, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      onClick={() => handleSelectVideo(item, null)}
                      className="group cursor-pointer flex flex-col w-full active:opacity-90 transition-opacity pb-2"
                    >
                      {/* Full width 16:9 Thumbnail: edge-to-edge on mobile, rounded on sm+ */}
                      <div className="-mx-3.5 sm:mx-0 w-[calc(100%+1.75rem)] sm:w-full aspect-video">
                        <SmartThumbnail
                          videoId={item.id}
                          title={item.title}
                          duration={item.duration}
                          priority={idx < 2}
                          roundedClassName="rounded-none sm:rounded-[10px]"
                          className="w-full h-full overflow-hidden shadow-xs"
                        />
                      </div>

                      {/* Video metadata row below thumbnail matching Image 2 */}
                      <div className="flex items-start gap-3 mt-2.5 px-0.5">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.channelId) handleOpenChannel(item.channelId);
                          }}
                        >
                          <ChannelAvatar
                            avatar={item.channelAvatar}
                            title={item.channelTitle}
                            size="md"
                            className="shrink-0 mt-0.5 hover:opacity-85 transition-opacity"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-[#0f0f0f] dark:text-white font-medium text-[13.5px] sm:text-[14.5px] leading-snug line-clamp-2">
                              {decodeHtml(item.title)}
                            </h4>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                showToast('Options: Save to Khazana');
                              }}
                              className="p-1 text-neutral-600 dark:text-neutral-400 hover:text-[#0f0f0f] dark:hover:text-white shrink-0 -mt-0.5 rounded-full"
                              aria-label="Options"
                            >
                              <MoreVertical size={18} />
                            </button>
                          </div>

                          <p className="text-[11.5px] text-neutral-600 dark:text-neutral-400 mt-1 flex items-center flex-wrap gap-x-1.5">
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                if (item.channelId) handleOpenChannel(item.channelId);
                              }}
                              className="hover:underline cursor-pointer"
                            >
                              {item.channelTitle}
                            </span>
                            <span>•</span>
                            {item.viewCount !== undefined && (
                              <>
                                <span>{formatViews(item.viewCount)}</span>
                                <span>•</span>
                              </>
                            )}
                            <span>{timeAgo(item.publishedAt)}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Rec sentinel with 1200px margin */}
                  <div ref={recSentinelRef} className="h-10 w-full" />
                </div>
              )}
            </div>
            )}
          </div>
        ) : (
          /* ================= 2. MAIN FEED ================= */
          <div className="max-w-6xl mx-auto pb-20">
            {/* Search active notice */}
            {searchQuery && (
              <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-xs text-neutral-600 dark:text-neutral-400">
                  Showing results for: <strong className="text-[#0f0f0f] dark:text-white">"{searchQuery}"</strong>
                </span>
                <button
                  onClick={handleClearSearch}
                  className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline"
                >
                  Clear search
                </button>
              </div>
            )}

            {/* Fallback Live Search Skeleton Indicator */}
            {isSearchingFallback && (
              <div className="mx-4 my-3 p-3 bg-indigo-50/90 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/50 rounded-xl flex items-center justify-center gap-2.5 text-xs text-indigo-700 dark:text-indigo-300 font-medium animate-pulse">
                <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400 animate-spin" />
                <span>Searching YouTube for more lectures…</span>
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

            {/* Video Cards Grid: Full-bleed on mobile, spaced sharp grid on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-2 sm:gap-4 sm:p-4 pt-1.5">
              {loading && videos.length === 0 ? (
                /* Skeleton loader matching Header -> Full-bleed Media -> Title */
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col w-full animate-pulse">
                    <div className="px-3.5 py-2.5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="h-3.5 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3" />
                        <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-1/4" />
                      </div>
                    </div>
                    <div className="w-full aspect-video bg-neutral-200 dark:bg-neutral-800" />
                    <div className="px-3.5 pt-2.5 pb-4 space-y-2">
                      <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-full" />
                      <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
                    </div>
                  </div>
                ))
              ) : videos.length > 0 ? (
                videos.map((vid, idx) => {
                  const isInlineActive = activePreviewVideoId === vid.id;

                  return (
                    <div
                      key={`${vid.id}-${idx}`}
                      className="flex flex-col w-full"
                    >
                      {/* 1. HEADER ROW (Above Video): Avatar (lg) + Channel & Views•Time + MoreHorizontal */}
                      <div className="px-3.5 py-2.5 flex items-center gap-3">
                        <ChannelAvatar
                          avatar={vid.channelAvatar}
                          title={vid.channelTitle}
                          size="lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (vid.channelId) handleOpenChannel(vid.channelId);
                          }}
                        />

                        <div className="flex-1 min-w-0">
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              if (vid.channelId) handleOpenChannel(vid.channelId);
                            }}
                            style={{
                              fontFamily:
                                '"Inter", "Noto Sans Devanagari", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
                            }}
                            className="font-semibold text-[13px] tracking-[-0.012em] text-[#0f0f0f] dark:text-white truncate cursor-pointer hover:underline leading-[1.2]"
                          >
                            {vid.channelTitle}
                          </div>
                          <div
                            style={{
                              fontFamily:
                                '"Inter", "Noto Sans Devanagari", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
                            }}
                            className="text-[11px] font-normal tracking-[-0.005em] text-[#737373] dark:text-neutral-400 truncate mt-0.5 leading-[1.2]"
                          >
                            {vid.viewCount !== undefined
                              ? `${formatViews(vid.viewCount)} • ${timeAgo(vid.publishedAt)}`
                              : timeAgo(vid.publishedAt)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            showToast('Options: Share & Save');
                          }}
                          className="w-6 h-6 flex items-center justify-center text-[#0f0f0f] dark:text-white shrink-0 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all"
                          aria-label="More options"
                        >
                          <MoreHorizontal size={20} />
                        </button>
                      </div>

                      {/* 2. MEDIA (Full-Bleed 16:9, Zero Rounding, Zero Shadow; IntersectionObserver target) */}
                      <div
                        data-video-id={vid.id}
                        ref={(el) => {
                          if (el) cardElementsRef.current.set(vid.id, el);
                          else cardElementsRef.current.delete(vid.id);
                        }}
                        className="w-full relative"
                      >
                        {isInlineActive ? (
                          <InlinePreviewPlayer
                            videoId={vid.id}
                            title={vid.title}
                            thumbnailUrl={vid.thumbnail}
                            durationStr={vid.duration}
                            durationSeconds={vid.durationSeconds}
                            onSelect={(currentTime) => handleSelectVideo(vid, null, currentTime)}
                          />
                        ) : (
                          <div
                            onClick={() => handleSelectVideo(vid)}
                            className="w-full cursor-pointer"
                          >
                            <SmartThumbnail
                              videoId={vid.id}
                              title={vid.title}
                              duration={vid.duration}
                              priority={idx < 3}
                              flush
                              imgClassName="rounded-none"
                            />
                          </div>
                        )}
                      </div>

                      {/* 3. TITLE (Below Video): Small crisp slightly-bold text matching reference image for both English & Hindi */}
                      <div
                        onClick={() => handleSelectVideo(vid)}
                        className="px-3.5 pt-2.5 pb-4 cursor-pointer"
                      >
                        <h3
                          style={{
                            fontFamily:
                              '"Inter", "Noto Sans Devanagari", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
                          }}
                          className="text-[13px] font-medium tracking-[-0.01em] leading-[1.35] line-clamp-2 text-[#0f0f0f] dark:text-neutral-100 break-words"
                        >
                          {decodeHtml(vid.title)}
                        </h3>
                      </div>
                    </div>
                  );
                })
              ) : !hasApiError ? (
                <div className="col-span-full py-16 text-center text-neutral-500">
                  <p className="text-sm font-semibold mb-2 text-[#0f0f0f] dark:text-white">No videos found.</p>
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

      {/* ================= DESCRIPTION SHEET: Opens below the player without covering it ================= */}
      {isDescOpen && selectedVideo && !isLandscapeFillActive && (
        <div 
          className="fixed inset-x-0 bottom-0 watch-sheet-backdrop z-[200] flex flex-col justify-end bg-black/40 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsDescOpen(false)}
        >
          <div 
            className="w-full h-full max-h-full bg-white dark:bg-[#181818] rounded-t-2xl shadow-2xl flex flex-col border-t border-neutral-200 dark:border-neutral-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grabber handle */}
            <div className="w-12 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
              <h2 className="text-[16px] font-bold text-[#0f0f0f] dark:text-white">Description</h2>
              <button 
                onClick={() => setIsDescOpen(false)}
                className="p-1.5 rounded-full text-neutral-500 hover:text-[#0f0f0f] dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Close description"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3.5 whitespace-pre-wrap break-words">
              {/* 1. Title */}
              <h3 className="text-[15px] font-bold text-[#0f0f0f] dark:text-white leading-snug">
                {decodeHtml(selectedVideo.title)}
              </h3>

              {/* 2. Stats Row */}
              <div className="flex items-center justify-around py-3 px-2 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-100 dark:border-neutral-800 text-center">
                <div>
                  <p className="text-[14px] font-black text-[#0f0f0f] dark:text-white">
                    {formatFullViews(selectedVideo.viewCount)}
                  </p>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 font-medium">Views</p>
                </div>
                <div className="w-[1px] h-6 bg-neutral-200 dark:bg-neutral-800" />
                <div>
                  <p className="text-[14px] font-black text-[#0f0f0f] dark:text-white">
                    {formatFullDate(selectedVideo.publishedAt)}
                  </p>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400 font-medium">Uploaded</p>
                </div>
                {selectedVideo.likeCount !== undefined && (
                  <>
                    <div className="w-[1px] h-6 bg-neutral-200 dark:bg-neutral-800" />
                    <div>
                      <p className="text-[14px] font-black text-[#0f0f0f] dark:text-white">
                        {formatCount(selectedVideo.likeCount)}
                      </p>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 font-medium">Likes</p>
                    </div>
                  </>
                )}
                {selectedVideo.duration && (
                  <>
                    <div className="w-[1px] h-6 bg-neutral-200 dark:bg-neutral-800" />
                    <div>
                      <p className="text-[14px] font-black text-[#0f0f0f] dark:text-white">
                        {selectedVideo.duration}
                      </p>
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-400 font-medium">Duration</p>
                    </div>
                  </>
                )}
              </div>

              {/* 3. Channel Row */}
              <div 
                onClick={() => {
                  if (selectedVideo.channelId) {
                    setIsDescOpen(false);
                    handleOpenChannel(selectedVideo.channelId);
                  }
                }}
                className="flex items-center gap-3 py-1 cursor-pointer group"
              >
                <ChannelAvatar
                  avatar={selectedVideo.channelAvatar}
                  title={selectedVideo.channelTitle}
                  size="lg"
                  className="border border-neutral-200 dark:border-neutral-700"
                />
                <div>
                  <p className="text-sm font-bold text-[#0f0f0f] dark:text-white group-hover:underline">
                    {selectedVideo.channelTitle || 'Channel'}
                  </p>
                  {selectedVideo.subscriberCount !== undefined && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      {formatCount(selectedVideo.subscriberCount)} subscribers
                    </p>
                  )}
                </div>
              </div>

              {/* 4. Full Description with timestamps */}
              {selectedVideo.description ? (
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed font-sans">
                  {renderDescriptionBody(selectedVideo.description)}
                </div>
              ) : null}

              {/* 5. Hashtags as Chips */}
              {selectedVideo.hashtags && selectedVideo.hashtags.length > 0 && (
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap gap-1.5">
                  {selectedVideo.hashtags.map((ht, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 text-xs font-semibold"
                    >
                      #{ht.replace(/^#/, '')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= COMMENTS SHEET: Opens below the player without covering it ================= */}
      {isCommentsOpen && selectedVideo && !isLandscapeFillActive && (
        <div 
          className="fixed inset-x-0 bottom-0 watch-sheet-backdrop z-[200] flex flex-col justify-end bg-black/40 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsCommentsOpen(false)}
        >
          <div 
            className="w-full h-full max-h-full bg-white dark:bg-[#181818] rounded-t-2xl shadow-2xl flex flex-col border-t border-neutral-200 dark:border-neutral-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grabber handle */}
            <div className="w-12 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
              <h2 className="text-[15px] font-bold text-[#0f0f0f] dark:text-white">
                Comments <span className="font-normal text-xs text-neutral-500">({commentsList.length})</span>
              </h2>
              <button 
                onClick={() => setIsCommentsOpen(false)}
                className="p-1 rounded-full text-neutral-500 hover:text-[#0f0f0f] dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Close comments"
              >
                <X size={18} />
              </button>
            </div>

            {/* Comment Input */}
            <form onSubmit={handleAddComment} className="p-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                U
              </div>
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-full px-3.5 py-1.5 text-xs text-[#0f0f0f] dark:text-white placeholder-neutral-400 focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!commentInput.trim()}
                className="p-1.5 rounded-full text-brand-600 dark:text-brand-400 disabled:opacity-40 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Post comment"
              >
                <Send size={16} />
              </button>
            </form>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
              {commentsList.map((cmt) => (
                <div key={cmt.id} className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-full ${cmt.avatarBg} text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5`}>
                    {cmt.user[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#0f0f0f] dark:text-white">{cmt.user}</span>
                      <span className="text-[11px] text-neutral-500">{cmt.time}</span>
                    </div>
                    <p className="text-xs text-[#0f0f0f] dark:text-neutral-200 mt-0.5 break-words">
                      {cmt.text}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-neutral-500 text-[11px]">
                      <button 
                        onClick={() => {
                          setCommentsList(prev => prev.map(c => c.id === cmt.id ? { ...c, likes: c.likes + 1 } : c));
                        }}
                        className="flex items-center gap-1 hover:text-[#0f0f0f] dark:hover:text-white"
                      >
                        <ThumbsUp size={12} />
                        <span>{cmt.likes}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

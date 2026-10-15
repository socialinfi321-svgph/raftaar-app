import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useBackHandler } from '../hooks/useBackHandler';
import { 
  ArrowLeft, Search, X, ThumbsUp, ThumbsDown, Share2, 
  Bookmark, Bell, MoreVertical, Compass, RotateCw, AlertTriangle, RefreshCw,
  FileText, Download, BookOpen, MessageSquare, Play, Check, ChevronRight, ChevronDown,
  Sparkles, Users, ListVideo, Layers, Volume2, VolumeX, Subtitles, Send
} from 'lucide-react';
import { CustomVideoPlayer, CustomVideoPlayerRef } from './CustomVideoPlayer';
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
  onClick?: () => void;
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

  // Inline Autoplay on Home feed (idle scroll detection)
  const [activePreviewVideoId, setActivePreviewVideoId] = useState<string | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(60);
  const [isPreviewMuted, setIsPreviewMuted] = useState(true);
  const [isPreviewCC, setIsPreviewCC] = useState(false);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const idleScrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cardElementsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // Toggle Mute without reloading iframe or restarting video
  const handleTogglePreviewMute = () => {
    const iframe = previewIframeRef.current;
    const nextMuted = !isPreviewMuted;
    if (iframe && iframe.contentWindow) {
      const command = nextMuted ? 'mute' : 'unMute';
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: command, args: [] }),
        '*'
      );
    }
    setIsPreviewMuted(nextMuted);
  };

  // Toggle Captions CC without reloading iframe or restarting video
  const handleTogglePreviewCC = () => {
    const iframe = previewIframeRef.current;
    const nextCC = !isPreviewCC;
    if (iframe && iframe.contentWindow) {
      if (nextCC) {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'loadModule', args: ['captions'] }),
          '*'
        );
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'setOption', args: ['captions', 'reload', true] }),
          '*'
        );
      } else {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'setOption', args: ['captions', 'track', {}] }),
          '*'
        );
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'unloadModule', args: ['captions'] }),
          '*'
        );
      }
    }
    setIsPreviewCC(nextCC);
  };

  // Increment preview progress bar
  useEffect(() => {
    if (!activePreviewVideoId) {
      setPreviewProgress(0);
      return;
    }
    const timer = setInterval(() => {
      setPreviewProgress(p => (p < previewDuration ? p + 1 : p));
    }, 1000);
    return () => clearInterval(timer);
  }, [activePreviewVideoId, previewDuration]);

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

  // Smart Header hide/show on scroll + Idle detection for inline autoplay
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

    // Reset inline preview if scrolling
    if (activePreviewVideoId) {
      setActivePreviewVideoId(null);
    }
    if (idleScrollTimerRef.current) {
      clearTimeout(idleScrollTimerRef.current);
    }

    // After 2.8 seconds of idle scroll, trigger inline preview on center card
    if (!selectedVideo && !activeChannelId && !activePlaylistId) {
      idleScrollTimerRef.current = setTimeout(() => {
        const centerY = window.innerHeight / 2;
        let closestId: string | null = null;
        let closestDist = Infinity;

        cardElementsRef.current.forEach((el, id) => {
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const cardCenter = rect.top + rect.height / 2;
          const dist = Math.abs(cardCenter - centerY);
          if (dist < closestDist && rect.top > 60 && rect.bottom < window.innerHeight) {
            closestDist = dist;
            closestId = id;
          }
        });

        if (closestId) {
          const targetVid = videos.find(v => v.id === closestId);
          setActivePreviewVideoId(closestId);
          setPreviewProgress(0);
          setPreviewDuration(targetVid?.durationSeconds || 180);
        }
      }, 2800);
    }
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
    playlistCtx?: { id: string; title: string; videos: VideoItem[] } | null
  ) => {
    // If preview was playing this video, save current progress so main player continues seamlessly
    if (activePreviewVideoId === vid.id && previewProgress > 2) {
      try {
        localStorage.setItem(`raftaar_progress_${vid.id}`, String(Math.floor(previewProgress)));
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

      {/* ================= DEDICATED CHANNEL PAGE VIEW ================= */}
      {activeChannelId && (
        <div className="fixed inset-0 z-[150] bg-white dark:bg-[#0f0f0f] flex flex-col overflow-y-auto animate-fade-in">
          {/* Top Bar */}
          <div className="sticky top-0 z-30 flex items-center justify-between px-3 h-12 bg-white/95 dark:bg-[#0f0f0f]/95 backdrop-blur-md border-b border-neutral-100 dark:border-neutral-800">
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
          <div className="sticky top-0 z-30 flex items-center justify-between px-3 h-12 bg-white/95 dark:bg-[#0f0f0f]/95 backdrop-blur-md border-b border-neutral-100 dark:border-neutral-800">
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
        <header className="sticky top-0 z-50 bg-white dark:bg-[#0f0f0f] border-b border-neutral-100 dark:border-neutral-800/60 shadow-xs">
          {/* Status Bar Safe Area Spacer (clean without select-none / pointer-events-none) */}
          <div 
            className="w-full h-[max(28px,env(safe-area-inset-top,28px))] shrink-0 bg-white/95 dark:bg-[#0f0f0f]/95 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Top Logo / Search Row */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              isHeaderVisible || isSearchExpanded
                ? 'h-12 opacity-100 translate-y-0'
                : 'h-0 opacity-0 -translate-y-full'
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
                /* Default Header Layout */
                <>
                  <div
                    className="flex items-center gap-1.5 cursor-pointer"
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
              className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-[#0f0f0f] dark:text-white shrink-0 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all"
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
                      : 'bg-neutral-100 text-[#0f0f0f] dark:bg-neutral-800 dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {cat}
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
          <div ref={playerTopRef} className="max-w-5xl mx-auto pb-16 animate-fade-in bg-white dark:bg-[#0f0f0f]">
            {/* Player Container: Sticky at top with safe area for mobile status bar (battery/network) */}
            <div className="w-full sticky top-0 sm:relative z-30 shadow-md bg-black">
              {/* Safe Area Spacer: Ensures battery, network, clock sit in black safe zone without covering the video */}
              <div className="safe-top-bar" aria-hidden="true" />
              <CustomVideoPlayer
                ref={playerRef}
                videoId={selectedVideo.id}
                title={selectedVideo.title}
                totalDurationStr={selectedVideo.duration}
                onBack={() => {
                  setSelectedVideo(null);
                  setActivePlaylistContext(null);
                }}
                onPlayNext={handlePlayNextVideo}
              />
            </div>

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
                      {/* Full width 16:9 Thumbnail with modern subtle rounded corners */}
                      <div className="w-full aspect-video">
                        <SmartThumbnail
                          videoId={item.id}
                          title={item.title}
                          duration={item.duration}
                          priority={idx < 2}
                          className="w-full h-full rounded-lg sm:rounded-[10px] overflow-hidden shadow-xs"
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

            {/* Video Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4.5 sm:gap-4 sm:p-4 pt-1.5">
              {loading && videos.length === 0 ? (
                /* Skeleton loader */
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col w-full animate-pulse">
                    <div className="px-3.5 sm:px-0">
                      <div className="w-full aspect-video bg-neutral-200 dark:bg-neutral-800 rounded-lg sm:rounded-[10px]" />
                    </div>
                    <div className="flex items-start gap-3 pt-2.5 pb-5 px-3.5 sm:px-1">
                      <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 space-y-2 pt-0.5">
                        <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-full" />
                        <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
                        <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2 mt-1" />
                      </div>
                    </div>
                  </div>
                ))
              ) : videos.length > 0 ? (
                videos.map((vid, idx) => {
                  const isInlineActive = activePreviewVideoId === vid.id;

                  return (
                    <div
                      key={`${vid.id}-${idx}`}
                      ref={(el) => {
                        if (el) cardElementsRef.current.set(vid.id, el);
                        else cardElementsRef.current.delete(vid.id);
                      }}
                      className="group cursor-pointer flex flex-col w-full active:opacity-95 transition-opacity"
                    >
                      <div className="px-3.5 sm:px-0 relative">
                        {isInlineActive ? (
                          /* YouTube-style Inline Autoplay Preview (Matches Image 1) */
                          <div 
                            onClick={() => handleSelectVideo(vid)}
                            className="w-full aspect-video rounded-lg sm:rounded-[10px] overflow-hidden bg-black relative shadow-md cursor-pointer"
                          >
                            <iframe
                              ref={previewIframeRef}
                              src={`https://www.youtube.com/embed/${vid.id}?enablejsapi=1&autoplay=1&mute=1&controls=0&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0`}
                              title={vid.title}
                              allow="autoplay; encrypted-media; picture-in-picture"
                              className="w-full h-full pointer-events-none border-0"
                            />

                            {/* Top-Right Vertical Actions: Sound (Top) and CC (Bottom) like in Image 1 */}
                            <div className="absolute top-2.5 right-2.5 flex flex-col gap-2 z-30 pointer-events-auto">
                              {/* Sound Mute/Unmute Button (Top) */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePreviewMute();
                                }}
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/65 hover:bg-black/85 active:scale-95 backdrop-blur-md flex items-center justify-center text-white transition-all shadow-md"
                                title={isPreviewMuted ? 'Unmute' : 'Mute'}
                                aria-label={isPreviewMuted ? 'Unmute' : 'Mute'}
                              >
                                {isPreviewMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                              </button>

                              {/* Captions CC Button (Below Mute) */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePreviewCC();
                                }}
                                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full ${
                                  isPreviewCC 
                                    ? 'bg-white text-black' 
                                    : 'bg-black/65 hover:bg-black/85 text-white'
                                } active:scale-95 backdrop-blur-md flex items-center justify-center transition-all shadow-md`}
                                title={isPreviewCC ? 'Captions on' : 'Captions off'}
                                aria-label={isPreviewCC ? 'Captions on' : 'Captions off'}
                              >
                                <div className={`w-[22px] h-[16px] rounded-[3px] border-[1.5px] ${
                                  isPreviewCC ? 'border-black bg-black text-white' : 'border-white text-white'
                                } flex items-center justify-center text-[9px] font-extrabold tracking-tighter leading-none`}>
                                  CC
                                </div>
                              </button>
                            </div>

                            {/* Duration Badge at Bottom Right (like in Image 1) */}
                            {vid.duration && (
                              <span className="absolute bottom-2.5 right-2.5 bg-black/80 text-white text-[12px] font-medium px-1.5 py-0.5 rounded-[4px] leading-none pointer-events-none z-20">
                                {vid.duration}
                              </span>
                            )}

                            {/* Bottom Red Progress Line (subtle and sleek like YouTube Image 1) */}
                            <div className="absolute bottom-0 inset-x-0 h-[2.5px] bg-white/20 z-20 pointer-events-none">
                              <div 
                                className="h-full bg-red-600 transition-all duration-300" 
                                style={{ width: `${Math.min(100, Math.max(3, (previewProgress / previewDuration) * 100))}%` }} 
                              />
                            </div>
                          </div>
                        ) : (
                          <div onClick={() => handleSelectVideo(vid)}>
                            <SmartThumbnail
                              videoId={vid.id}
                              title={vid.title}
                              duration={vid.duration}
                              priority={idx < 3}
                              className="w-full aspect-video rounded-lg sm:rounded-[10px] overflow-hidden shadow-xs"
                              imgClassName="rounded-lg sm:rounded-[10px]"
                            />
                          </div>
                        )}
                      </div>

                      <div 
                        onClick={() => handleSelectVideo(vid)}
                        className="flex items-start gap-3 pt-2.5 pb-5 px-3.5 sm:px-1"
                      >
                        <ChannelAvatar
                          avatar={vid.channelAvatar}
                          title={vid.channelTitle}
                          size="md"
                          onClick={() => vid.channelId && handleOpenChannel(vid.channelId)}
                          className="mt-0.5"
                        />

                        <div className="flex-1 min-w-0">
                          <h3 className="text-[#0f0f0f] dark:text-white font-semibold text-[14px] sm:text-[15px] leading-[1.35] tracking-[-0.01em] line-clamp-2 break-words">
                            {decodeHtml(vid.title)}
                          </h3>
                          <div className="text-neutral-600 dark:text-neutral-400 text-[12px] leading-[1.35] mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (vid.channelId) handleOpenChannel(vid.channelId);
                              }}
                              className="font-normal text-neutral-600 dark:text-neutral-400 hover:text-[#0f0f0f] dark:hover:text-white transition-colors cursor-pointer hover:underline"
                            >
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
                          className="p-1 -mr-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all text-[#0f0f0f] dark:text-white shrink-0 mt-0.5"
                          aria-label="More options"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
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
      {isDescOpen && selectedVideo && (
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
      {isCommentsOpen && selectedVideo && (
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

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useBackHandler } from '../hooks/useBackHandler';
import { 
  ArrowLeft, Search, X, ThumbsUp, ThumbsDown, Share2, 
  Bookmark, Bell, Check, MessageSquare, Send,
  Play, BookOpen, MoreVertical, Compass, RotateCw, AlertTriangle, RefreshCw,
  Zap, FileText, Download, Heart, Sparkles
} from 'lucide-react';
import { CustomVideoPlayer } from './CustomVideoPlayer';
import { SmartThumbnail } from './SmartThumbnail';

const HARDCODED_API_KEY = 'AIzaSyCS7J0dtUjJVMzaB0jbr-aDGqcTqGa3GPo';
const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || HARDCODED_API_KEY;

// 1. Audience Hint & Context Stub (plug-in ready)
export const AUDIENCE_HINT = '';
export const getUserContext = () => null;

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelId: string;
  channelTitle: string;
  channelAvatar: string;
  publishedAt: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  duration?: string;
}

interface CommentItem {
  id: string;
  author: string;
  avatar: string;
  text: string;
  time: string;
  likes: number;
  userLiked?: boolean;
}

// 12 Generic educational seed topics for home feed
const SEED_TOPICS = [
  'physics lecture',
  'chemistry lecture',
  'maths important questions',
  'biology NCERT',
  'hindi grammar',
  'english grammar',
  'one shot revision',
  'objective questions',
  'model paper solution',
  'study tips',
  'general knowledge',
  'current affairs'
];

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

// Fallback high-yield videos ONLY for first launch if network/quota is completely unavailable
const FALLBACK_VIDEOS: VideoItem[] = [
  {
    id: 'RefTQH9dMzk',
    title: 'Biology 500 Important Objective Questions | Full Syllabus Revision',
    description: 'Complete high-yield session covering 500 important questions for upcoming examination.',
    thumbnail: 'https://i.ytimg.com/vi/RefTQH9dMzk/hqdefault.jpg',
    channelId: 'UCjlW2KXq_RFIpSnz5nFtoMQ',
    channelTitle: 'PW Education',
    channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=PW',
    publishedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'Df2iSOK1xgg',
    title: 'Hindi Grammar & Literature Most Important Questions | One Shot',
    description: 'Complete Hindi important objective questions and grammar revision.',
    thumbnail: 'https://i.ytimg.com/vi/Df2iSOK1xgg/hqdefault.jpg',
    channelId: 'UCLgzbnsZWyMgQI2dvkGBJzw',
    channelTitle: 'Board Education',
    channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Ask',
    publishedAt: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    id: 'FveziLt-suo',
    title: 'Complete English Grammar & Objective Questions Marathon',
    description: 'Master English syllabus with important questions and step-by-step guidance.',
    thumbnail: 'https://i.ytimg.com/vi/FveziLt-suo/hqdefault.jpg',
    channelId: 'UCOH0ke8-Oa3Ej5VYmEP72uw',
    channelTitle: 'English Medium Hub',
    channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=EnglishPW',
    publishedAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'DqGBKf5ogpo',
    title: 'Physics Electrostatics & Current Electricity in 1 Shot | Full Revision',
    description: 'Complete formula revision, derivations, and top concept explanations.',
    thumbnail: 'https://i.ytimg.com/vi/DqGBKf5ogpo/hqdefault.jpg',
    channelId: 'UCQObkI1w-DEMc9XzD5fQRlA',
    channelTitle: 'Education Baba',
    channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=EduBaba',
    publishedAt: new Date(Date.now() - 86400000 * 7).toISOString()
  }
];

// Helper: Decode HTML entities
const decodeHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
};

// Helper: Format ISO 8601 duration (PT1H20M15S -> 1:20:15)
const parseDuration = (iso: string): string => {
  if (!iso) return '';
  const matches = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) return '';
  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  const seconds = parseInt(matches[3] || '0', 10);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
  if (!dateString) return 'Recently';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Recently';
    const now = new Date();
    const diff = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
    if (diff < 60) return 'Just now';
    const minutes = Math.floor(diff / 60);
    if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    const hours = Math.floor(diff / 3600);
    if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    const days = Math.floor(diff / 86400);
    if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    const years = Math.floor(days / 365);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  } catch {
    return 'Recently';
  }
};

// Helper: Check if video is a YouTube Short (duration <= 65s or title/description contains #shorts)
export const isShortVideo = (item: VideoItem): boolean => {
  const title = (item.title || '').toLowerCase();
  const desc = (item.description || '').toLowerCase();
  const text = `${title} ${desc}`;
  if (
    text.includes('#shorts') ||
    text.includes('#short') ||
    text.includes('/shorts/') ||
    text.includes(' shorts ') ||
    text.endsWith(' shorts') ||
    text.includes('#ytshorts') ||
    text.includes('ytshorts')
  ) {
    return true;
  }
  if (item.duration) {
    const parts = item.duration.split(':').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const totalSecs = parts[0] * 60 + parts[1];
      if (totalSecs <= 65) return true;
    } else if (parts.length === 1 && !isNaN(parts[0])) {
      if (parts[0] <= 65) return true;
    }
  }
  return false;
};

// Helper: Unicode tokenization for Hindi + English
const tokenize = (text: string): string[] => {
  const matches = text.toLowerCase().match(/[\p{L}\p{N}]+/gu);
  return matches ? Array.from(matches) : [];
};

// Section 2: Re-rank search results by relevance to exact typed query
const rerankSearchResults = (items: VideoItem[], query: string): VideoItem[] => {
  const normQuery = query.toLowerCase().trim();
  if (!normQuery) return items;

  const queryTokens = tokenize(normQuery);
  const scored = items.map((item, originalIndex) => {
    const normTitle = decodeHtml(item.title).toLowerCase();
    let score = 0;
    if (normTitle.includes(normQuery)) {
      score = 100;
    } else if (queryTokens.length > 0) {
      const titleTokens = new Set(tokenize(normTitle));
      let matched = 0;
      for (const t of queryTokens) {
        if (titleTokens.has(t)) matched++;
      }
      score = 10 * (matched / queryTokens.length);
    }
    return { item, score, originalIndex };
  });

  // Do not drop low-score results unless there are more than 20 better ones
  const betterCount = scored.filter(s => s.score > 0).length;
  let candidates = scored;
  if (betterCount > 20) {
    candidates = scored.filter(s => s.score > 0);
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.originalIndex - b.originalIndex;
  });

  return candidates.map(c => c.item);
};

// Section 6: Clean title for Watch Screen recommendations
const cleanTitleForRecommendations = (title: string): string => {
  let cleaned = decodeHtml(title)
    .replace(/\[.*?\]/g, ' ')
    .replace(/\(.*?\)/g, ' ')
    .split('|')[0]
    .replace(/#\S+/g, ' ')
    .replace(/\b(19\d\d|20\d\d)\b/g, ' ')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ')
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);
  return words.slice(0, 6).join(' ') || title.slice(0, 30);
};

// Stopwords for generating related search queries
const STOP_WORDS = new Set([
  'the', 'of', 'and', 'in', 'to', 'a', 'is', 'for', 'on', 'with', 'by', 'at', 'this', 'that', 'from',
  'an', 'ka', 'ki', 'ke', 'ko', 'me', 'mein', 'par', 'se', 'hai', 'hain', 'aur', 'kya', 'kaise', 'bhi',
  'kare', 'kar', 'karo', 'video', 'full', 'live', 'new', 'lecture', 'class', 'part'
]);

// LocalStorage Cache Manager (6 hours TTL, max 10 queries)
const CACHE_PREFIX = 'raftaar_pool_cache_';
const CACHE_KEYS_LIST = 'raftaar_pool_cache_keys';
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

const getCachedPool = (key: string): { items: VideoItem[]; nextToken: string | null } | null => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.timestamp > SIX_HOURS_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return { items: data.items || [], nextToken: data.nextToken || null };
  } catch {
    return null;
  }
};

const setCachedPool = (key: string, items: VideoItem[], nextToken: string | null) => {
  if (!items || items.length === 0) return;
  try {
    const entry = { timestamp: Date.now(), items, nextToken };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    
    // Manage keys list
    let keys: string[] = [];
    try {
      keys = JSON.parse(localStorage.getItem(CACHE_KEYS_LIST) || '[]');
    } catch {}
    keys = [key, ...keys.filter(k => k !== key)].slice(0, 10);
    localStorage.setItem(CACHE_KEYS_LIST, JSON.stringify(keys));
  } catch {}
};

// LocalStorage: Deprioritize last 100 shown IDs
const RECENT_SHOWN_KEY = 'raftaar_recent_shown_ids';
const getRecentShownIds = (): Set<string> => {
  try {
    const arr = JSON.parse(localStorage.getItem(RECENT_SHOWN_KEY) || '[]');
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};
const markIdsAsShown = (ids: string[]) => {
  try {
    const existing: string[] = JSON.parse(localStorage.getItem(RECENT_SHOWN_KEY) || '[]');
    const merged = [...ids, ...existing.filter(id => !ids.includes(id))].slice(0, 100);
    localStorage.setItem(RECENT_SHOWN_KEY, JSON.stringify(merged));
  } catch {}
};

// LocalStorage: Pick 2 random topics avoiding last 6
const RECENT_TOPICS_KEY = 'raftaar_last_seed_topics';
const pickRandomSeedTopics = (): [string, string] => {
  let lastUsed: string[] = [];
  try {
    lastUsed = JSON.parse(localStorage.getItem(RECENT_TOPICS_KEY) || '[]');
  } catch {}

  const available = SEED_TOPICS.filter(t => !lastUsed.includes(t));
  const pool = available.length >= 2 ? available : SEED_TOPICS;

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picked: [string, string] = [shuffled[0], shuffled[1] || SEED_TOPICS[0]];

  try {
    const updated = [...picked, ...lastUsed.filter(t => !picked.includes(t))].slice(0, 6);
    localStorage.setItem(RECENT_TOPICS_KEY, JSON.stringify(updated));
  } catch {}

  return picked;
};

// Interleave streams round-robin, shuffle in chunks of 6, enforce max 2 consecutive from same channel
const interleaveAndFormatPool = (streams: VideoItem[][], dedupeSet: Set<string>): VideoItem[] => {
  const result: VideoItem[] = [];
  const maxLen = Math.max(...streams.map(s => s.length), 0);

  for (let i = 0; i < maxLen; i++) {
    for (const stream of streams) {
      if (i < stream.length) {
        const item = stream[i];
        if (item && item.id && !dedupeSet.has(item.id)) {
          dedupeSet.add(item.id);
          result.push(item);
        }
      }
    }
  }

  // Shuffle in chunks of 6
  for (let i = 0; i < result.length; i += 6) {
    const end = Math.min(i + 6, result.length);
    for (let j = end - 1; j > i; j--) {
      const r = i + Math.floor(Math.random() * (j - i + 1));
      const temp = result[j];
      result[j] = result[r];
      result[r] = temp;
    }
  }

  // Enforce: Never put more than 2 videos from the same channel in a row
  for (let i = 2; i < result.length; i++) {
    if (
      result[i].channelId &&
      result[i].channelId === result[i - 1].channelId &&
      result[i].channelId === result[i - 2].channelId
    ) {
      // Find the next item with a different channelId
      const swapIdx = result.findIndex((item, idx) => idx > i && item.channelId !== result[i].channelId);
      if (swapIdx !== -1) {
        const temp = result[i];
        result[i] = result[swapIdx];
        result[swapIdx] = temp;
      }
    }
  }

  return result;
};

export const YouTubeHome: React.FC<{ navigate: any }> = ({ navigate }) => {
  // Feed state
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasApiError, setHasApiError] = useState(false);

  // Active Category / Search
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
  const recSentinelRef = useRef<HTMLDivElement>(null);

  // Watch Screen Interactions
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isDescOpen, setIsDescOpen] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [activeRecTab, setActiveRecTab] = useState<'next' | 'teacher' | 'topic'>('next');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Suggestions dynamic filtered list based on active tab with SHORTS EXCLUDED
  const displayedRecs = useMemo(() => {
    let baseList = recommendedVideos;
    if (activeRecTab === 'teacher') {
      const fromChannel = recommendedVideos.filter(
        r => r.channelTitle?.toLowerCase() === selectedVideo?.channelTitle?.toLowerCase() ||
             (r.channelId && r.channelId === selectedVideo?.channelId)
      );
      baseList = fromChannel.length > 0 ? fromChannel : recommendedVideos;
    } else if (activeRecTab === 'topic') {
      const otherChannels = recommendedVideos.filter(
        r => r.channelTitle?.toLowerCase() !== selectedVideo?.channelTitle?.toLowerCase()
      );
      baseList = otherChannels.length > 0 ? otherChannels : recommendedVideos;
    }
    // Filter out all Shorts videos!
    return baseList.filter(it => !isShortVideo(it));
  }, [recommendedVideos, activeRecTab, selectedVideo]);

  // Comments State
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState('');

  // Feed Engine Refs
  const feedPoolRef = useRef<VideoItem[]>([]);
  const recPoolRef = useRef<VideoItem[]>([]);
  const isReplenishingRef = useRef(false);
  const isReplenishingRecsRef = useRef(false);
  const sessionSeenIds = useRef<Set<string>>(new Set());
  const activeRequestId = useRef(0);
  const searchNextTokenRef = useRef<string | null>(null);
  const searchPagesFetchedRef = useRef(0);
  const activeSeedTopicsRef = useRef<string[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Hardware Back Handler
  useBackHandler(() => {
    if (isDescOpen) {
      setIsDescOpen(false);
      return true;
    }
    if (selectedVideo) {
      setSelectedVideo(null);
      return true;
    }
    navigate('/');
    return true;
  });

  // Core YouTube API Batch Fetcher (maxResults=50 with videos.list & channels.list enrichment)
  const fetchEnrichedYouTubeVideos = useCallback(
    async (
      query: string,
      options: {
        pageToken?: string;
        isUserSearch?: boolean;
        signal?: AbortSignal;
      } = {}
    ): Promise<{ items: VideoItem[]; nextToken: string | null }> => {
      try {
        const rawQ = query.trim();
        if (!rawQ) return { items: [], nextToken: null };

        // Has Devanagari characters check
        const hasDevanagari = /[\u0900-\u097F]/.test(rawQ);
        const encodedQ = encodeURIComponent(rawQ);
        const pageParam = options.pageToken ? `&pageToken=${encodeURIComponent(options.pageToken)}` : '';
        const langParam = hasDevanagari ? '&relevanceLanguage=hi' : '';

        // Exact query, order=relevance, strict, embeddable, region=IN, maxResults=50
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&q=${encodedQ}&type=video&videoEmbeddable=true&safeSearch=strict&regionCode=IN&order=relevance${langParam}${pageParam}&key=${API_KEY}`;

        const res = await fetch(searchUrl, { signal: options.signal });
        if (!res.ok) {
          throw new Error(`YouTube API Search error status ${res.status}`);
        }

        const data = await res.json();
        if (!data.items || data.items.length === 0) {
          return { items: [], nextToken: null };
        }

        const videoIds = data.items.map((it: any) => it.id?.videoId).filter(Boolean);
        const channelIds = [...new Set(data.items.map((it: any) => it.snippet?.channelId).filter(Boolean))];

        // 1. Batch enrich with videos.list (statistics + duration)
        let statsMap: Record<string, { views?: number; likes?: number; comments?: number; duration?: string }> = {};
        if (videoIds.length > 0) {
          try {
            const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds.join(',')}&key=${API_KEY}`;
            const vRes = await fetch(vUrl, { signal: options.signal });
            if (vRes.ok) {
              const vData = await vRes.json();
              (vData.items || []).forEach((item: any) => {
                statsMap[item.id] = {
                  views: item.statistics?.viewCount ? parseInt(item.statistics.viewCount, 10) : undefined,
                  likes: item.statistics?.likeCount ? parseInt(item.statistics.likeCount, 10) : undefined,
                  comments: item.statistics?.commentCount ? parseInt(item.statistics.commentCount, 10) : undefined,
                  duration: parseDuration(item.contentDetails?.duration || '')
                };
              });
            }
          } catch {}
        }

        // 2. Batch enrich with channels.list (avatars)
        let avatarMap: Record<string, string> = {};
        if (channelIds.length > 0) {
          try {
            const cUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelIds.join(',')}&key=${API_KEY}`;
            const cRes = await fetch(cUrl, { signal: options.signal });
            if (cRes.ok) {
              const cData = await cRes.json();
              (cData.items || []).forEach((c: any) => {
                avatarMap[c.id] = c.snippet?.thumbnails?.default?.url || '';
              });
            }
          } catch {}
        }

        let items: VideoItem[] = data.items.map((it: any) => {
          const vidId = it.id?.videoId;
          const stats = statsMap[vidId];
          return {
            id: vidId,
            title: it.snippet?.title || 'Educational Lecture',
            description: it.snippet?.description || '',
            thumbnail: vidId ? `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg` : (it.snippet?.thumbnails?.high?.url || ''),
            channelId: it.snippet?.channelId || '',
            channelTitle: it.snippet?.channelTitle || 'Educator',
            channelAvatar: avatarMap[it.snippet?.channelId] || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(it.snippet?.channelTitle || 'Educator')}`,
            publishedAt: it.snippet?.publishedAt || new Date().toISOString(),
            viewCount: stats?.views,
            likeCount: stats?.likes,
            commentCount: stats?.comments,
            duration: stats?.duration
          };
        });

        // Filter out all Shorts videos per requirement
        items = items.filter(it => !isShortVideo(it));

        // If user performed an explicit search, re-rank on client (Section 2)
        if (options.isUserSearch) {
          items = rerankSearchResults(items, rawQ);
        }

        return { items, nextToken: data.nextPageToken || null };
      } catch (err: any) {
        if (err?.name === 'AbortError') throw err;
        console.warn('YouTube API fetch warning:', err);
        return { items: [], nextToken: null };
      }
    },
    []
  );

  // Lazy replenishment when pool < 15
  const replenishPool = useCallback(async () => {
    if (isReplenishingRef.current || feedPoolRef.current.length >= 15) return;
    isReplenishingRef.current = true;

    try {
      // A. SEARCH MODE REPLENISHMENT
      if (searchQuery.trim()) {
        if (searchPagesFetchedRef.current < 2 && searchNextTokenRef.current) {
          searchPagesFetchedRef.current += 1;
          const res = await fetchEnrichedYouTubeVideos(searchQuery.trim(), {
            pageToken: searchNextTokenRef.current,
            isUserSearch: true
          });
          searchNextTokenRef.current = res.nextToken;
          const newUnseen = res.items.filter(it => !sessionSeenIds.current.has(it.id));
          newUnseen.forEach(it => sessionSeenIds.current.add(it.id));
          feedPoolRef.current.push(...newUnseen);
        } else {
          // Section 3: Generate related queries from most frequent meaningful words in top titles
          const topTitles = videos.slice(0, 10).map(v => v.title).join(' ');
          const words = tokenize(topTitles).filter(w => !STOP_WORDS.has(w) && w.length > 2);
          const freqMap: Record<string, number> = {};
          words.forEach(w => { freqMap[w] = (freqMap[w] || 0) + 1; });
          const queryWords = new Set(tokenize(searchQuery));
          const sortedWords = Object.keys(freqMap)
            .filter(w => !queryWords.has(w))
            .sort((a, b) => freqMap[b] - freqMap[a]);

          const topRelated = sortedWords.slice(0, 2).join(' ');
          if (topRelated) {
            const relatedQ = `${searchQuery.trim()} ${topRelated}`;
            const res = await fetchEnrichedYouTubeVideos(relatedQ, { isUserSearch: true });
            const newUnseen = res.items.filter(it => !sessionSeenIds.current.has(it.id));
            newUnseen.forEach(it => sessionSeenIds.current.add(it.id));
            feedPoolRef.current.push(...newUnseen);
          }
        }
      } else if (activeCategory === 'All') {
        // B. HOME ("All" chip): Pick another random seed topic avoiding last 6
        const [nextTopic] = pickRandomSeedTopics();
        const seedQ = nextTopic + (AUDIENCE_HINT ? ` ${AUDIENCE_HINT}` : '');
        const res = await fetchEnrichedYouTubeVideos(seedQ);
        const newUnseen = res.items.filter(it => !sessionSeenIds.current.has(it.id));
        newUnseen.forEach(it => sessionSeenIds.current.add(it.id));
        feedPoolRef.current.push(...newUnseen);
      } else {
        const catQ = `${activeCategory} lecture` + (AUDIENCE_HINT ? ` ${AUDIENCE_HINT}` : '');
        const res = await fetchEnrichedYouTubeVideos(catQ);
        const newUnseen = res.items.filter(it => !sessionSeenIds.current.has(it.id));
        newUnseen.forEach(it => sessionSeenIds.current.add(it.id));
        feedPoolRef.current.push(...newUnseen);
      }

      // If videos was empty or ran dry, auto-fill from freshly replenished pool
      setVideos(prev => {
        if (prev.length === 0 && feedPoolRef.current.length > 0) {
          const initial = feedPoolRef.current.splice(0, 12);
          markIdsAsShown(initial.map(i => i.id));
          return initial;
        }
        return prev;
      });
    } catch {
      // Ignore background replenishment error
    } finally {
      isReplenishingRef.current = false;
    }
  }, [searchQuery, activeCategory, videos, fetchEnrichedYouTubeVideos]);

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

  // Main Feed Loader with Race Condition Guard & Cached Fallback
  const loadFeedData = useCallback(
    async (isReload = false) => {
      const reqId = ++activeRequestId.current;
      setLoading(true);
      setHasApiError(false);

      if (isReload) {
        setVideos([]);
        feedPoolRef.current = [];
      }

      // 1. SEARCH MODE
      if (searchQuery.trim()) {
        const query = searchQuery.trim();
        searchPagesFetchedRef.current = 1;
        searchNextTokenRef.current = null;

        // Check 6-hour cache
        const cached = getCachedPool(query);
        if (cached && cached.items.length > 0 && !isReload) {
          sessionSeenIds.current.clear();
          cached.items.forEach(it => sessionSeenIds.current.add(it.id));
          feedPoolRef.current = [...cached.items];
          const initial = feedPoolRef.current.splice(0, 12);
          setVideos(initial);
          markIdsAsShown(initial.map(i => i.id));
          setLoading(false);
          searchNextTokenRef.current = cached.nextToken;
          return;
        }

        try {
          const res = await fetchEnrichedYouTubeVideos(query, { isUserSearch: true });
          if (reqId !== activeRequestId.current) return;

          if (res.items.length > 0) {
            setCachedPool(query, res.items, res.nextToken);
            searchNextTokenRef.current = res.nextToken;
            sessionSeenIds.current.clear();
            res.items.forEach(it => sessionSeenIds.current.add(it.id));
            feedPoolRef.current = [...res.items];
            const initial = feedPoolRef.current.splice(0, 12);
            setVideos(initial);
            markIdsAsShown(initial.map(i => i.id));
            setLoading(false);
          } else {
            setLoading(false);
            setHasApiError(true);
          }
        } catch (e: any) {
          if (reqId !== activeRequestId.current) return;
          setLoading(false);
          setHasApiError(true);
        }
        return;
      }

      // 2. CATEGORY CHIP MODE (Non-All)
      if (activeCategory !== 'All') {
        const catQ = `${activeCategory} lecture` + (AUDIENCE_HINT ? ` ${AUDIENCE_HINT}` : '');
        try {
          const res = await fetchEnrichedYouTubeVideos(catQ);
          if (reqId !== activeRequestId.current) return;

          if (res.items.length > 0) {
            sessionSeenIds.current.clear();
            res.items.forEach(it => sessionSeenIds.current.add(it.id));
            feedPoolRef.current = [...res.items];
            const initial = feedPoolRef.current.splice(0, 12);
            setVideos(initial);
            markIdsAsShown(initial.map(i => i.id));
            setLoading(false);
          } else {
            setLoading(false);
            setHasApiError(true);
          }
        } catch {
          if (reqId !== activeRequestId.current) return;
          setLoading(false);
          setHasApiError(true);
        }
        return;
      }

      // 3. HOME ("All" chip): Pick 2 random topics avoiding last 6, fetch in parallel
      const [topic1, topic2] = pickRandomSeedTopics();
      activeSeedTopicsRef.current = [topic1, topic2];

      const seedQ1 = topic1 + (AUDIENCE_HINT ? ` ${AUDIENCE_HINT}` : '');
      const seedQ2 = topic2 + (AUDIENCE_HINT ? ` ${AUDIENCE_HINT}` : '');

      let stream1Done = false;
      let stream2Done = false;
      let stream1Items: VideoItem[] = [];
      let stream2Items: VideoItem[] = [];

      const handleStreamsReady = () => {
        if (reqId !== activeRequestId.current) return;
        const streams = [stream1Items, stream2Items].filter(s => s.length > 0);
        if (streams.length > 0) {
          const merged = interleaveAndFormatPool(streams, sessionSeenIds.current);

          // Deprioritize last 100 shown IDs
          const recentShown = getRecentShownIds();
          const fresh = merged.filter(it => !recentShown.has(it.id));
          const past = merged.filter(it => recentShown.has(it.id));
          const prioritized = [...fresh, ...past];

          feedPoolRef.current = prioritized;
          const initial = feedPoolRef.current.splice(0, 12);
          setVideos(initial);
          markIdsAsShown(initial.map(i => i.id));
          setLoading(false);
        } else {
          // If totally empty on initial launch, fallback so screen is never blank
          if (videos.length === 0) {
            setVideos(FALLBACK_VIDEOS);
          }
          setLoading(false);
          setHasApiError(true);
        }
      };

      // Fetch both in parallel; show first stream immediately if arrived
      fetchEnrichedYouTubeVideos(seedQ1).then(res1 => {
        stream1Items = res1.items;
        stream1Done = true;
        if (!stream2Done && stream1Items.length > 0 && reqId === activeRequestId.current) {
          // Instant first-arrival render
          const immediate = interleaveAndFormatPool([stream1Items], sessionSeenIds.current);
          feedPoolRef.current = immediate;
          const initial = feedPoolRef.current.splice(0, 12);
          setVideos(initial);
          markIdsAsShown(initial.map(i => i.id));
          setLoading(false);
        } else if (stream2Done) {
          handleStreamsReady();
        }
      }).catch(() => {
        stream1Done = true;
        if (stream2Done) handleStreamsReady();
      });

      fetchEnrichedYouTubeVideos(seedQ2).then(res2 => {
        stream2Items = res2.items;
        stream2Done = true;
        if (stream1Done) {
          handleStreamsReady();
        }
      }).catch(() => {
        stream2Done = true;
        if (stream1Done) handleStreamsReady();
      });
    },
    [searchQuery, activeCategory, fetchEnrichedYouTubeVideos, videos.length]
  );

  // Initial & Filter Load
  useEffect(() => {
    loadFeedData();
  }, [activeCategory, searchQuery]);

  // Section 4: IntersectionObserver sentinel for prefetching next bundle 1200px before end
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

  // Section 5: Full reload handler (Home icon tap, pull-to-refresh)
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

  // Handle Video Click -> Watch Screen & Section 6 Up Next recommendations
  const handleSelectVideo = (vid: VideoItem) => {
    setSelectedVideo(vid);
    setLikeCount(vid.likeCount || 0);
    setIsLiked(false);
    setIsDisliked(false);
    setIsSaved(false);
    setIsDescExpanded(false);
    setRecommendedVideos([]);
    recPoolRef.current = [];

    setComments([
      {
        id: 'c1',
        author: 'Rohan Kumar',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan',
        text: 'Sir explanation bahut clear tha, saare concepts samajh aa gaye.',
        time: '2 hours ago',
        likes: 45
      },
      {
        id: 'c2',
        author: 'Anjali Sharma',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anjali',
        text: 'Exam revision ke liye yeh video sach me best hai. Thank you!',
        time: '5 hours ago',
        likes: 28
      }
    ]);

    // Section 6: Up Next recommendations (Clean title first ~6 words, then channel videos)
    setLoadingRecommended(true);
    const cleanedTitleQuery = cleanTitleForRecommendations(vid.title);

    const q1 = cleanedTitleQuery;
    const q2 = vid.channelTitle ? vid.channelTitle : '';

    const recDedupe = new Set<string>([vid.id]);

    Promise.all([
      fetchEnrichedYouTubeVideos(q1),
      q2 ? fetchEnrichedYouTubeVideos(q2) : Promise.resolve({ items: [] as VideoItem[], nextToken: null })
    ]).then(([res1, res2]) => {
      const merged = interleaveAndFormatPool([res1.items, res2.items], recDedupe).filter(it => !isShortVideo(it));
      recPoolRef.current = merged;
      const initialRecs = recPoolRef.current.splice(0, 10);
      setRecommendedVideos(initialRecs);
      setLoadingRecommended(false);
    }).catch(() => {
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
      // Related queries from most frequent meaningful words in top rec titles
      const allRecTitles = recommendedVideos.map(v => v.title).join(' ');
      const words = tokenize(allRecTitles).filter(w => !STOP_WORDS.has(w) && w.length > 2);
      const freqMap: Record<string, number> = {};
      words.forEach(w => { freqMap[w] = (freqMap[w] || 0) + 1; });
      const currentQueryWords = new Set(tokenize(cleanTitleForRecommendations(selectedVideo.title)));
      const sortedWords = Object.keys(freqMap)
        .filter(w => !currentQueryWords.has(w))
        .sort((a, b) => freqMap[b] - freqMap[a]);

      const topRelated = sortedWords.slice(0, 2).join(' ');
      const baseCleaned = cleanTitleForRecommendations(selectedVideo.title);
      const relatedQ = topRelated ? `${baseCleaned} ${topRelated}` : baseCleaned;

      const res = await fetchEnrichedYouTubeVideos(relatedQ);
      const newUnseen = res.items.filter(it => !sessionSeenIds.current.has(it.id) && it.id !== selectedVideo.id && !isShortVideo(it));
      newUnseen.forEach(it => sessionSeenIds.current.add(it.id));
      recPoolRef.current.push(...newUnseen);
    } catch {
      // Ignore background rec error
    } finally {
      isReplenishingRecsRef.current = false;
    }
  }, [selectedVideo, recommendedVideos, fetchEnrichedYouTubeVideos]);

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

  // Add Comment
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const newComment: CommentItem = {
      id: `my-${Date.now()}`,
      author: 'You',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=You',
      text: newCommentText.trim(),
      time: 'Just now',
      likes: 0
    };
    setComments(prev => [newComment, ...prev]);
    setNewCommentText('');
    showToast('Comment posted successfully');
  };

  const handleToggleLike = () => {
    if (isLiked) {
      setIsLiked(false);
      setLikeCount(prev => Math.max(0, prev - 1));
    } else {
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
      setIsDisliked(false);
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
          <Check size={14} className="text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================= TOP HEADER / SEARCH BAR (YouTube Mobile Style) ================= */}
      {!selectedVideo ? (
        <header className="sticky top-0 z-50 bg-white dark:bg-[#0f0f0f] border-b border-neutral-100 dark:border-neutral-800/60 shadow-xs">
          {/* Status Bar Safe Area Spacer: Preserves top space for phone battery, clock, Wi-Fi */}
          <div 
            className="w-full h-[max(28px,env(safe-area-inset-top,28px))] shrink-0 pointer-events-none select-none bg-white/95 dark:bg-[#0f0f0f]/95 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Top Logo / Search Row: Starts strictly BELOW safe area */}
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
                /* Default YouTube Header Layout */
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
                      onClick={() => showToast('9+ new lectures uploaded today!')}
                      className="relative text-[#0f0f0f] dark:text-white p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full active:scale-95 transition-all"
                      aria-label="Notifications"
                    >
                      <Bell className="w-6 h-6" />
                      <span className="absolute -top-0.5 -right-0.5 bg-[#cc0000] text-white text-[10px] font-bold px-1 min-w-[17px] h-[17px] rounded-full flex items-center justify-center border-2 border-white dark:border-[#0f0f0f] leading-none">
                        9+
                      </span>
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

          {/* Category Filter Chips Row: Pins right under safe area when logo row slides up */}
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
            <div className="w-[1px] h-5 bg-neutral-200 dark:bg-neutral-800 shrink-0"></div>

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
        /* When video is playing: Safe area becomes BLACK (just like YouTube mobile!) */
        <div 
          className="w-full h-[max(12px,env(safe-area-inset-top,12px))] bg-black shrink-0 z-50"
          aria-hidden="true"
        />
      )}

      {/* ================= MAIN CONTAINER ================= */}
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
          /* ================= 1. VIDEO WATCH VIEW (PLAYER SCREEN - EXACT YOUTUBE STYLE) ================= */
          <div ref={playerTopRef} className="max-w-5xl mx-auto pb-16 animate-fade-in bg-white dark:bg-[#0f0f0f]">
            {/* Sticky Player on Mobile: Black background, sticky top */}
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
              {/* Video Title (Max 2 lines, tap opens full description) & 3-dots Menu */}
              <div className="flex items-start justify-between gap-3">
                <div 
                  onClick={() => setIsDescOpen(true)}
                  className="flex-1 cursor-pointer group"
                >
                  <h1 
                    className="text-[17px] sm:text-[19px] font-bold text-slate-900 dark:text-white leading-[1.32] line-clamp-2 tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
                    dangerouslySetInnerHTML={{ __html: selectedVideo.title }}
                  />
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[13px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    {selectedVideo.viewCount !== undefined && (
                      <span>{formatViews(selectedVideo.viewCount)}</span>
                    )}
                    <span>{timeAgo(selectedVideo.publishedAt)}</span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">#Physics</span>
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

              {/* Channel Profile Row & Follow Button */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2.5">
                  <img
                    src={selectedVideo.channelAvatar}
                    alt={selectedVideo.channelTitle}
                    className="w-10 h-10 rounded-full object-cover bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5 leading-tight">
                      <span>{selectedVideo.channelTitle}</span>
                      <Check size={13} className="text-blue-500 bg-blue-100 dark:bg-blue-950 rounded-full p-0.5" />
                    </h3>
                    <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                      1.2M subscribers
                    </p>
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

              {/* Secondary Action Cards (Save to Khazana, Notes, Download) */}
              <div className="grid grid-cols-3 gap-2 pt-0.5">
                <button
                  onClick={() => {
                    setIsSaved(!isSaved);
                    showToast(isSaved ? 'Removed from Khazana' : 'Saved to Khazana ✨');
                  }}
                  className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-slate-100 dark:bg-neutral-800/80 hover:bg-slate-200 dark:hover:bg-neutral-800 border border-slate-200/80 dark:border-neutral-700/60 transition-all active:scale-95"
                >
                  <span className="text-red-500 font-black text-base leading-none mb-1">+</span>
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 text-center leading-tight">
                    {isSaved ? 'Saved' : 'Save to Khazana'}
                  </span>
                </button>

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

              {/* Suggested Videos List - YouTube style with reduced gap and compact info */}
              <div className="space-y-1.5 pt-1">
                {displayedRecs.map((item, idx) => (
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
                        <h4 
                          className="text-[#0f0f0f] dark:text-[#f1f1f1] font-medium text-[12.5px] sm:text-[13.5px] leading-[1.25] line-clamp-2 break-words flex-1"
                          dangerouslySetInnerHTML={{ __html: item.title }}
                        />
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
          /* ================= 2. MAIN YOUTUBE HOME FEED ================= */
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

            {/* API Error Notification Card (Section 8) */}
            {hasApiError && videos.length > 0 && (
              <div className="mx-4 my-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0 text-amber-600" />
                  <span>Videos load nahi ho paaye - Retry</span>
                </div>
                <button
                  onClick={() => loadFeedData(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-white font-bold flex items-center gap-1 active:scale-95 transition-transform"
                >
                  <RotateCw size={12} />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* Video Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4.5 sm:gap-4 sm:p-4 pt-1.5">
              {loading && videos.length === 0 ? (
                /* Only show skeleton if pool is truly empty (Section 4) */
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col w-full animate-pulse">
                    <div className="px-3.5 sm:px-0">
                      <div className="w-full aspect-video bg-[#e5e5e5] dark:bg-neutral-800 rounded-[18px] sm:rounded-[22px]"></div>
                    </div>
                    <div className="flex items-start gap-3 pt-2.5 pb-5 px-3.5 sm:px-1">
                      <div className="w-9 h-9 rounded-full bg-[#e5e5e5] dark:bg-neutral-800 flex-shrink-0 mt-0.5"></div>
                      <div className="flex-1 min-w-0 space-y-2 pt-0.5">
                        <div className="h-4 bg-[#e5e5e5] dark:bg-neutral-800 rounded w-full"></div>
                        <div className="h-4 bg-[#e5e5e5] dark:bg-neutral-800 rounded w-3/4"></div>
                        <div className="h-3 bg-[#e5e5e5] dark:bg-neutral-800 rounded w-1/2 mt-1"></div>
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
                    {/* Balanced left and right gap (px-3.5) with rounded-[18px] rectangular container */}
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
                      <img
                        src={vid.channelAvatar}
                        alt={vid.channelTitle}
                        loading={idx < 3 ? 'eager' : 'lazy'}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5 bg-[#e5e5e5] dark:bg-neutral-800"
                      />

                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-[#0f0f0f] dark:text-[#f1f1f1] font-medium text-[14px] sm:text-[15px] leading-[1.35] tracking-[-0.01em] line-clamp-2 break-words"
                          dangerouslySetInnerHTML={{ __html: vid.title }}
                        />
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
                        className="p-1 -mr-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all text-[#0f0f0f] dark:text-neutral-300 flex-shrink-0 mt-0.5"
                        aria-label="More options"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-16 text-center text-slate-500">
                  <p className="text-sm font-semibold mb-2">No videos found.</p>
                  <button
                    onClick={() => loadFeedData(true)}
                    className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold shadow-sm"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>

            {/* Section 4: Sentinel element with 1200px prefetch margin */}
            <div ref={sentinelRef} className="h-10 w-full" />
          </div>
        )}
      </div>

      {/* ================= YOUTUBE STYLE DESCRIPTION BOTTOM SHEET ================= */}
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
              <h3 
                className="text-[16px] font-bold text-slate-900 dark:text-white leading-snug"
                dangerouslySetInnerHTML={{ __html: selectedVideo.title }}
              />

              {/* Stats Bar */}
              <div className="flex items-center justify-around py-3 px-2 bg-slate-50 dark:bg-neutral-900 rounded-2xl border border-slate-100 dark:border-neutral-800 text-center">
                <div>
                  <p className="text-[15px] font-black text-slate-900 dark:text-white">
                    {selectedVideo.viewCount !== undefined ? formatViews(selectedVideo.viewCount) : 'Popular'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">Views</p>
                </div>
                <div className="w-[1px] h-6 bg-slate-200 dark:bg-neutral-800" />
                <div>
                  <p className="text-[15px] font-black text-slate-900 dark:text-white">
                    {likeCount > 0 ? likeCount.toLocaleString() : 'Top'}
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

              {/* Channel Row */}
              <div className="flex items-center gap-3 py-1">
                <img
                  src={selectedVideo.channelAvatar}
                  alt={selectedVideo.channelTitle}
                  className="w-10 h-10 rounded-full object-cover bg-slate-200 dark:bg-slate-800"
                />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedVideo.channelTitle}</p>
                  <p className="text-xs text-slate-500">1.2M subscribers • Verified Educator</p>
                </div>
              </div>

              {/* Description Text */}
              <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {selectedVideo.description || 'Full chapter educational revision lecture series with detailed notes, formula sheets, and key exam questions.'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

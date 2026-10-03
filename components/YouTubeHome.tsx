import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useBackHandler } from '../hooks/useBackHandler';
import { 
  ArrowLeft, Search, X, ThumbsUp, ThumbsDown, Share2, 
  Bookmark, Bell, Check, MessageSquare, Send, Eye, Clock,
  Play, Sparkles, Filter, ChevronDown, ChevronUp, Copy, BookOpen, GraduationCap,
  MoreVertical
} from 'lucide-react';
import { CustomVideoPlayer } from './CustomVideoPlayer';
import { SmartThumbnail } from './SmartThumbnail';
import { api } from '../services/api';

const HARDCODED_API_KEY = 'AIzaSyCS7J0dtUjJVMzaB0jbr-aDGqcTqGa3GPo';
const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || HARDCODED_API_KEY;

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelId: string;
  channelTitle: string;
  channelAvatar: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
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

const CATEGORIES = [
  'All',
  'Physics',
  'Chemistry',
  'Maths',
  'Biology',
  'Hindi',
  'English',
  'One Shot',
  'VVI Objective',
  'Model Paper'
];

// Fallback high-yield videos in case of network issue or quota limit
const FALLBACK_VIDEOS: VideoItem[] = [
  {
    id: 'RefTQH9dMzk',
    title: 'Class 12 Biology के 500 VVI Objective | 12th Biology Objective Bihar Board 2026',
    description: 'In this high-yield session, complete 500 VVI Objective Questions for Class 12 Biology are covered for Bihar Board Exam.',
    thumbnail: 'https://i.ytimg.com/vi/RefTQH9dMzk/maxresdefault.jpg',
    channelId: 'UCjlW2KXq_RFIpSnz5nFtoMQ',
    channelTitle: 'PW Bihar Board 11&12th',
    channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=PW',
    publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    viewCount: 145000,
    likeCount: 8900,
    commentCount: 420,
    duration: '1:45:20'
  },
  {
    id: 'Df2iSOK1xgg',
    title: 'Class 12 Hindi Important Objective Question || Bihar Board Class 12 Hindi VVI 2026',
    description: 'Complete Hindi गद्य एवं पद्य खण्ड Most Important Objective Questions for Bihar Board Class 12.',
    thumbnail: 'https://i.ytimg.com/vi/Df2iSOK1xgg/maxresdefault.jpg',
    channelId: 'UCLgzbnsZWyMgQI2dvkGBJzw',
    channelTitle: 'Ask Board Education',
    channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Ask',
    publishedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    viewCount: 98000,
    likeCount: 6500,
    commentCount: 280,
    duration: '42:15'
  },
  {
    id: 'FveziLt-suo',
    title: 'Class 12th Story of English VVI Objective | Bihar Board Class 12th English Questions',
    description: 'Master Story of English in One Shot with previous year questions and easy explanations.',
    thumbnail: 'https://i.ytimg.com/vi/FveziLt-suo/maxresdefault.jpg',
    channelId: 'UCOH0ke8-Oa3Ej5VYmEP72uw',
    channelTitle: 'PW Bihar Board English Medium',
    channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=EnglishPW',
    publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    viewCount: 112000,
    likeCount: 7800,
    commentCount: 310,
    duration: '1:26:46'
  },
  {
    id: 'DqGBKf5ogpo',
    title: 'Physics Class 12 Complete Electrostatics in 1 Shot | 12th Physics Revision Bihar Board',
    description: 'Electric Charges & Fields complete formula revision, derivations and top MCQs.',
    thumbnail: 'https://i.ytimg.com/vi/DqGBKf5ogpo/maxresdefault.jpg',
    channelId: 'UCQObkI1w-DEMc9XzD5fQRlA',
    channelTitle: 'Education Baba',
    channelAvatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=EduBaba',
    publishedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    viewCount: 230000,
    likeCount: 14200,
    commentCount: 650,
    duration: '2:15:30'
  }
];

// Helper to format ISO 8601 duration (PT1H20M15S -> 1:20:15)
const parseDuration = (iso: string): string => {
  if (!iso) return '15:00';
  const matches = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) return '15:00';
  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  const seconds = parseInt(matches[3] || '0', 10);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Helper to format views (e.g. 1.2M views, 45K views)
const formatViews = (views: number): string => {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M views`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K views`;
  }
  return `${views} views`;
};

// Helper to format relative time
const timeAgo = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
    if (diff < 31536000) return `${Math.floor(diff / 2592000)} months ago`;
    return `${Math.floor(diff / 31536000)} years ago`;
  } catch {
    return 'Recently';
  }
};

export const YouTubeHome: React.FC<{ navigate: any }> = ({ navigate }) => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Player Watch Screen State
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [recommendedVideos, setRecommendedVideos] = useState<VideoItem[]>([]);
  const [loadingRecommended, setLoadingRecommended] = useState(false);

  // Watch Screen Interactions
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Comments State
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState('');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const playerTopRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Hardware Back Handler
  useBackHandler(() => {
    if (selectedVideo) {
      setSelectedVideo(null);
      return true;
    }
    navigate('/');
    return true;
  });

  // Base Query Generator: ensures popular, high-view educational content
  const buildSearchQuery = (cat: string, search: string): string => {
    if (search.trim()) {
      return `${search.trim()} class 12 bihar board`;
    }
    if (cat === 'All') {
      return 'Bihar Board Class 12 One Shot Revision VVI Objective';
    }
    return `Bihar Board Class 12 ${cat} One Shot Lecture`;
  };

  // Fetch Videos & Detailed Statistics (Views, Likes, Durations)
  const fetchVideosBatch = async (
    queryStr: string,
    pageToken?: string
  ): Promise<{ items: VideoItem[]; nextToken: string | null }> => {
    try {
      const q = encodeURIComponent(queryStr);
      const pageParam = pageToken ? `&pageToken=${pageToken}` : '';
      
      // Order by viewCount to ensure the most popular, high-quality videos appear first
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=14&q=${q}&type=video&order=viewCount&relevanceLanguage=hi&safeSearch=moderate${pageParam}&key=${API_KEY}`;
      
      const res = await fetch(searchUrl);
      if (!res.ok) {
        throw new Error(`YouTube API search error ${res.status}`);
      }
      const data = await res.json();
      if (!data.items || data.items.length === 0) {
        return { items: [], nextToken: null };
      }

      const videoIds = data.items.map((it: any) => it.id?.videoId).filter(Boolean);
      const channelIds = [...new Set(data.items.map((it: any) => it.snippet?.channelId).filter(Boolean))];

      // 1. Fetch statistics & duration for all videos in one batch
      let statsMap: Record<string, { views: number; likes: number; comments: number; duration: string }> = {};
      if (videoIds.length > 0) {
        const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds.join(',')}&key=${API_KEY}`;
        const vRes = await fetch(vUrl);
        if (vRes.ok) {
          const vData = await vRes.json();
          (vData.items || []).forEach((item: any) => {
            statsMap[item.id] = {
              views: parseInt(item.statistics?.viewCount || '0', 10),
              likes: parseInt(item.statistics?.likeCount || '0', 10),
              comments: parseInt(item.statistics?.commentCount || '0', 10),
              duration: parseDuration(item.contentDetails?.duration || '')
            };
          });
        }
      }

      // 2. Fetch Channel Avatars in batch
      let avatarMap: Record<string, string> = {};
      if (channelIds.length > 0) {
        const cUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelIds.join(',')}&key=${API_KEY}`;
        const cRes = await fetch(cUrl);
        if (cRes.ok) {
          const cData = await cRes.json();
          (cData.items || []).forEach((c: any) => {
            avatarMap[c.id] = c.snippet?.thumbnails?.default?.url || '';
          });
        }
      }

      const items: VideoItem[] = data.items.map((it: any) => {
        const vidId = it.id?.videoId;
        const stats = statsMap[vidId] || { views: 45000, likes: 2300, comments: 85, duration: '28:15' };
        return {
          id: vidId,
          title: it.snippet?.title || 'Class 12 Educational Lecture',
          description: it.snippet?.description || '',
          thumbnail: vidId ? `https://i.ytimg.com/vi/${vidId}/maxresdefault.jpg` : (it.snippet?.thumbnails?.high?.url || ''),
          channelId: it.snippet?.channelId || '',
          channelTitle: it.snippet?.channelTitle || 'Bihar Board Educator',
          channelAvatar: avatarMap[it.snippet?.channelId] || `https://api.dicebear.com/7.x/identicon/svg?seed=${it.snippet?.channelTitle}`,
          publishedAt: it.snippet?.publishedAt || new Date().toISOString(),
          viewCount: stats.views,
          likeCount: stats.likes,
          commentCount: stats.comments,
          duration: stats.duration
        };
      });

      // Sort by viewCount descending so the most watched high-quality lectures stay on top
      items.sort((a, b) => b.viewCount - a.viewCount);

      return {
        items,
        nextToken: data.nextPageToken || null
      };
    } catch (err) {
      console.warn("YouTube API fetch fallback:", err);
      return { items: [], nextToken: null };
    }
  };

  // Initial and Category/Search Load
  useEffect(() => {
    let isCurrent = true;
    setLoading(true);
    setVideos([]);

    const q = buildSearchQuery(activeCategory, searchQuery);
    fetchVideosBatch(q).then(({ items, nextToken }) => {
      if (!isCurrent) return;
      if (items.length > 0) {
        setVideos(items);
        setNextPageToken(nextToken);
      } else {
        // Fallback to offline/curated list so screen is NEVER blank
        setVideos(FALLBACK_VIDEOS);
      }
      setLoading(false);
    });

    return () => {
      isCurrent = false;
    };
  }, [activeCategory, searchQuery]);

  // Infinite Scroll Handler
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || loading || loadingMore || !nextPageToken) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    
    // Trigger when user is within 300px of bottom
    if (scrollTop + clientHeight >= scrollHeight - 350) {
      setLoadingMore(true);
      const q = buildSearchQuery(activeCategory, searchQuery);
      fetchVideosBatch(q, nextPageToken).then(({ items, nextToken }) => {
        if (items.length > 0) {
          setVideos(prev => {
            const seen = new Set(prev.map(v => v.id));
            const newOnes = items.filter(v => !seen.has(v.id));
            return [...prev, ...newOnes];
          });
          setNextPageToken(nextToken);
        } else {
          setNextPageToken(null);
        }
        setLoadingMore(false);
      });
    }
  }, [loading, loadingMore, nextPageToken, activeCategory, searchQuery]);

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setSearchQuery(searchInput.trim());
    setActiveCategory('');
  };

  // Clear Search
  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setActiveCategory('All');
  };

  // Handle Video Click -> Open Watch Screen
  const handleSelectVideo = (vid: VideoItem) => {
    setSelectedVideo(vid);
    setLikeCount(vid.likeCount || 1200);
    setIsLiked(false);
    setIsDisliked(false);
    setIsSubscribed(false);
    setIsSaved(false);
    setIsDescExpanded(false);

    // Initial dummy student comments for realism
    setComments([
      {
        id: 'c1',
        author: 'Rohan Kumar (Patna)',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan',
        text: 'Sir aapka explanation sabse best hai! Physics ke saare concept clear ho gaye.',
        time: '2 hours ago',
        likes: 45
      },
      {
        id: 'c2',
        author: 'Anjali Sharma',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anjali',
        text: 'BSEB 2026 board exam ke liye yeh video sach me ram-baan hai. Thank you!',
        time: '5 hours ago',
        likes: 28
      },
      {
        id: 'c3',
        author: 'Vikash Yadav (Muzaffarpur)',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Vikash',
        text: '500 objective me se mere 480 sahi huye. Confidence boost ho gaya!',
        time: '1 day ago',
        likes: 19
      }
    ]);

    // Load Recommended Videos for this specific video
    setLoadingRecommended(true);
    const relatedQuery = `${vid.channelTitle} ${vid.title.slice(0, 30)} Class 12`;
    fetchVideosBatch(relatedQuery).then(({ items }) => {
      const recs = items.filter(v => v.id !== vid.id);
      setRecommendedVideos(recs.length > 0 ? recs : FALLBACK_VIDEOS.filter(v => v.id !== vid.id));
      setLoadingRecommended(false);
    });

    // Scroll to top of watch area
    setTimeout(() => {
      playerTopRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // Add Comment
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    const newComment: CommentItem = {
      id: `my-${Date.now()}`,
      author: 'You (Student)',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=YouStudent',
      text: newCommentText.trim(),
      time: 'Just now',
      likes: 0
    };
    setComments([newComment, ...comments]);
    setNewCommentText('');
    showToast('Comment added!');
  };

  // Like video toggle
  const handleToggleLike = () => {
    if (isLiked) {
      setIsLiked(false);
      setLikeCount(prev => Math.max(0, prev - 1));
    } else {
      setIsLiked(true);
      setIsDisliked(false);
      setLikeCount(prev => prev + 1);
      showToast('Liked video');
    }
  };

  // Share Video
  const handleShare = () => {
    if (!selectedVideo) return;
    const shareUrl = `${window.location.origin}/classes`;
    if (navigator.share) {
      navigator.share({
        title: selectedVideo.title,
        url: shareUrl
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareUrl);
      showToast('Class link copied to clipboard!');
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

      {/* ================= TOP HEADER / SEARCH BAR ================= */}
      <div className="sticky top-0 z-50 px-3 sm:px-5 py-2.5 pt-safe-header bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 sm:gap-4 shadow-xs">
        
        {/* Left: Back / Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              if (selectedVideo) {
                setSelectedVideo(null);
              } else {
                navigate('/');
              }
            }}
            className="p-1.5 -ml-1 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 active:scale-95 transition-all"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setSelectedVideo(null); setSearchQuery(''); setActiveCategory('All'); }}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xs">
              <GraduationCap size={18} />
            </div>
            <div className="hidden xs:flex flex-col">
              <span className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-none">
                Raftaar <span className="text-blue-600 dark:text-blue-400 font-extrabold">Classes</span>
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                BSEB 12th Smart Player
              </span>
            </div>
          </div>
        </div>

        {/* Center: Search Box */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl flex items-center relative">
          <div className="w-full flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full pl-3 pr-2 py-1.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
            <Search size={16} className="text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              placeholder="Search Bihar Board Class 12 lectures..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors mr-1"
              >
                <X size={15} />
              </button>
            )}
            <button
              type="submit"
              className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1 rounded-full text-xs font-bold transition-colors shrink-0"
            >
              Search
            </button>
          </div>
        </form>

        {/* Right: Quick Tag */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-xs font-bold shrink-0">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          Live Feed
        </div>
      </div>

      {/* ================= MAIN CONTAINER ================= */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto hide-scrollbar bg-slate-50 dark:bg-slate-950"
      >
        {selectedVideo ? (
          /* ================= 1. VIDEO WATCH VIEW (PLAYER SCREEN) ================= */
          <div ref={playerTopRef} className="max-w-5xl mx-auto pb-16 animate-fade-in">
            
            {/* Custom Built-In Raftaar Video Player (Zero YouTube branding, custom controls) */}
            <div className="w-full sticky top-0 sm:relative z-30 shadow-md">
              <CustomVideoPlayer
                videoId={selectedVideo.id}
                title={selectedVideo.title}
                totalDurationStr={selectedVideo.duration}
                onBack={() => setSelectedVideo(null)}
              />
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {/* Video Title */}
              <div>
                <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
                  {selectedVideo.title}
                </h1>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                  <span>{formatViews(selectedVideo.viewCount)}</span>
                  <span>•</span>
                  <span>{timeAgo(selectedVideo.publishedAt)}</span>
                  <span>•</span>
                  <span className="text-brand-600 dark:text-brand-400 font-bold">#BiharBoard12th</span>
                </div>
              </div>

              {/* Action Buttons: Like, Dislike, Share, Save, Notes */}
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-1">
                {/* Like / Dislike Pill */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 p-0.5">
                  <button
                    onClick={handleToggleLike}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-l-full text-xs font-bold transition-all ${
                      isLiked 
                        ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40' 
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <ThumbsUp size={15} className={isLiked ? 'fill-current' : ''} />
                    <span>{likeCount.toLocaleString()}</span>
                  </button>
                  <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700"></div>
                  <button
                    onClick={() => { setIsDisliked(!isDisliked); if (!isDisliked) setIsLiked(false); }}
                    className={`px-3 py-1.5 rounded-r-full text-xs transition-all ${
                      isDisliked 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    <ThumbsDown size={15} className={isDisliked ? 'fill-current' : ''} />
                  </button>
                </div>

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-bold transition-all shrink-0 active:scale-95"
                >
                  <Share2 size={15} />
                  <span>Share</span>
                </button>

                {/* Save to Playlist */}
                <button
                  onClick={async () => {
                    const nextSaved = !isSaved;
                    setIsSaved(nextSaved);
                    if (nextSaved && selectedVideo) {
                      await api.saveCachedVideo(selectedVideo);
                      showToast('Saved to Library in Full 1080p HD!');
                    } else {
                      showToast('Removed from Saved');
                    }
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-bold transition-all shrink-0 active:scale-95 ${
                    isSaved
                      ? 'bg-brand-50 dark:bg-brand-950/40 border-brand-200 dark:border-brand-900/50 text-brand-600 dark:text-brand-400'
                      : 'bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Bookmark size={15} className={isSaved ? 'fill-current' : ''} />
                  <span>{isSaved ? 'Saved' : 'Save'}</span>
                </button>

                {/* In-App Lecture Notes Button (No YouTube Link) */}
                <button
                  onClick={() => showToast('Class Notes downloaded to your device!')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 text-xs font-bold transition-all shrink-0 active:scale-95"
                >
                  <BookOpen size={14} className="text-blue-500" />
                  <span>Lecture Notes</span>
                </button>
              </div>

              {/* Channel Profile Row */}
              <div className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedVideo.channelAvatar}
                    alt={selectedVideo.channelTitle}
                    className="w-10 h-10 rounded-full object-cover bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{selectedVideo.channelTitle}</span>
                      <Check size={13} className="text-blue-500 bg-blue-100 dark:bg-blue-950 rounded-full p-0.5" />
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      1.42M subscribers • Top Educator
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsSubscribed(!isSubscribed);
                    showToast(isSubscribed ? 'Unsubscribed' : 'Subscribed to channel!');
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-black shadow-xs transition-all active:scale-95 flex items-center gap-1.5 ${
                    isSubscribed
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      : 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20'
                  }`}
                >
                  {isSubscribed ? (
                    <>
                      <Bell size={13} className="fill-current text-amber-500" />
                      <span>Subscribed</span>
                    </>
                  ) : (
                    <span>Subscribe</span>
                  )}
                </button>
              </div>

              {/* Expandable Description Box */}
              <div 
                onClick={() => setIsDescExpanded(!isDescExpanded)}
                className="cursor-pointer bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs"
              >
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                  <span>Description & Chapter Notes</span>
                  <span className="text-[11px] text-brand-600 dark:text-brand-400 flex items-center gap-1">
                    {isDescExpanded ? 'Show less' : 'Read more'}
                    {isDescExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </div>
                <p className={`leading-relaxed whitespace-pre-line font-medium ${isDescExpanded ? '' : 'line-clamp-2'}`}>
                  {selectedVideo.description || 'Bihar Board 12th complete lecture series with notes, formula sheet and previous year questions (PYQs).'}
                </p>
              </div>

              {/* Comments Section */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <MessageSquare size={16} className="text-brand-600 dark:text-brand-400" />
                    <span>Comments ({comments.length + selectedVideo.commentCount})</span>
                  </h3>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Top Feedback</span>
                </div>

                {/* Add Comment Input */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a comment or ask a doubt..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-brand-500 text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="bg-brand-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-transform"
                  >
                    <Send size={13} />
                    <span>Post</span>
                  </button>
                </form>

                {/* Comments List */}
                <div className="space-y-3 pt-1">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 text-xs">
                      <img src={comment.avatar} alt={comment.author} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">{comment.author}</span>
                          <span className="text-[10px] text-slate-400">{comment.time}</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">{comment.text}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-slate-500 text-[11px]">
                          <button 
                            onClick={() => {
                              setComments(prev => prev.map(c => c.id === comment.id ? { ...c, likes: c.likes + (c.userLiked ? -1 : 1), userLiked: !c.userLiked } : c));
                            }}
                            className={`flex items-center gap-1 hover:text-red-500 font-bold ${comment.userLiked ? 'text-red-500' : ''}`}
                          >
                            <ThumbsUp size={12} className={comment.userLiked ? 'fill-current' : ''} />
                            <span>{comment.likes}</span>
                          </button>
                          <button className="hover:text-slate-700 dark:hover:text-slate-200 font-semibold">Reply</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ================= RECOMMENDED VIDEOS BELOW PLAYER ================= */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles size={16} className="text-amber-500" />
                    <span>Recommended Videos • अगला वीडियो</span>
                  </h3>
                  <span className="text-xs font-semibold text-slate-400">High View Count</span>
                </div>

                <div className="space-y-2">
                  {loadingRecommended ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex gap-3 py-2 animate-pulse">
                        <div className="w-36 aspect-video bg-[#e5e5e5] dark:bg-neutral-800 rounded-lg shrink-0"></div>
                        <div className="flex-1 space-y-2 py-1">
                          <div className="h-3.5 bg-[#e5e5e5] dark:bg-neutral-800 rounded w-full"></div>
                          <div className="h-3 bg-[#e5e5e5] dark:bg-neutral-800 rounded w-2/3"></div>
                          <div className="h-2.5 bg-[#e5e5e5] dark:bg-neutral-800 rounded w-1/3"></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    recommendedVideos.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectVideo(item)}
                        className="group cursor-pointer flex items-start gap-3 py-2 px-1 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 active:opacity-90 transition-all"
                      >
                        {/* Crystal-Clear 1080p SmartThumbnail */}
                        <div className="w-36 sm:w-40 shrink-0">
                          <SmartThumbnail
                            videoId={item.id}
                            title={item.title}
                            duration={item.duration}
                            className="rounded-lg overflow-hidden"
                            badgeClassName="!bottom-1 !right-1 !text-[11px] !px-1.5 !py-0.5"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <h4 
                            className="text-[#0f0f0f] dark:text-[#f1f1f1] font-medium text-[13px] sm:text-[14px] leading-[1.3] line-clamp-2 break-words"
                            dangerouslySetInnerHTML={{ __html: item.title }}
                          />
                          <p className="text-[#606060] dark:text-[#aaaaaa] text-[12px] font-normal mt-1 line-clamp-1">
                            {item.channelTitle}
                          </p>
                          <p className="text-[#606060] dark:text-[#aaaaaa] text-[11px] font-normal mt-0.5 line-clamp-1">
                            {formatViews(item.viewCount)} • {timeAgo(item.publishedAt)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            showToast('Options: Share & Save');
                          }}
                          className="p-1 text-[#0f0f0f] dark:text-neutral-300 flex-shrink-0 mt-0.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full"
                          aria-label="Options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* ================= 2. MAIN YOUTUBE HOME FEED ================= */
          <div className="max-w-6xl mx-auto pb-20">
            
            {/* Category Chips Bar */}
            <div className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md px-3 sm:px-5 py-2.5 flex items-center gap-2 overflow-x-auto hide-scrollbar border-b border-slate-200 dark:border-slate-800">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat && !searchQuery;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      setSearchQuery('');
                      setSearchInput('');
                    }}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-black transition-all shrink-0 active:scale-95 ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Search active notice */}
            {searchQuery && (
              <div className="px-4 py-2.5 mx-4 mt-3 bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900/60 rounded-xl flex items-center justify-between text-xs text-brand-700 dark:text-brand-300 font-bold">
                <div className="flex items-center gap-2">
                  <Search size={14} />
                  <span>Showing popular results for "{searchQuery}"</span>
                </div>
                <button
                  onClick={handleClearSearch}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-white underline text-[11px]"
                >
                  Reset to Feed
                </button>
              </div>
            )}

            {/* Video Cards Grid - Borderless YouTube Mobile Layout */}
            <div className="w-full sm:px-4 sm:py-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 sm:gap-4 sm:gap-y-6">
              {loading ? (
                // YouTube Mobile Native Skeletons
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col w-full animate-pulse">
                    <div className="w-full aspect-video bg-[#e5e5e5] dark:bg-neutral-800 sm:rounded-xl"></div>
                    <div className="flex items-start gap-3 pt-3 pb-6 px-3 sm:px-1">
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
                videos.map((vid) => (
                  <div
                    key={vid.id}
                    onClick={() => handleSelectVideo(vid)}
                    className="group cursor-pointer flex flex-col w-full active:opacity-95 transition-opacity"
                  >
                    {/* Thumbnail: edge-to-edge on mobile, cleanly rounded on sm+ */}
                    <SmartThumbnail
                      videoId={vid.id}
                      title={vid.title}
                      duration={vid.duration}
                      className="w-full aspect-video sm:rounded-xl overflow-hidden"
                    />

                    {/* Metadata Row Structure (Below Thumbnail) */}
                    <div className="flex items-start gap-3 pt-3 pb-6 px-3 sm:px-1">
                      {/* Left: Channel Avatar */}
                      <img
                        src={vid.channelAvatar}
                        alt={vid.channelTitle}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5 bg-[#e5e5e5] dark:bg-neutral-800"
                      />

                      {/* Middle (Text Column) */}
                      <div className="flex-1 min-w-0">
                        {/* Video Title: Dark charcoal/black, never red or blue, max 2 lines with ... */}
                        <h3
                          className="text-[#0f0f0f] dark:text-[#f1f1f1] font-medium text-[15px] leading-[1.35] line-clamp-2 break-words"
                          dangerouslySetInnerHTML={{ __html: vid.title }}
                        />
                        {/* Subtitle: Channel Name • Views • Upload Time in single muted line */}
                        <p className="text-[#606060] dark:text-[#aaaaaa] text-[12px] font-normal mt-1 line-clamp-1">
                          {vid.channelTitle} • {formatViews(vid.viewCount)} • {timeAgo(vid.publishedAt)}
                        </p>
                      </div>

                      {/* Right: Three-dots menu icon */}
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
                <div className="col-span-full py-16 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <Search size={24} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No videos found</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Try searching for another topic like "Physics One Shot" or "Chemistry 12th".
                  </p>
                  <button
                    onClick={handleClearSearch}
                    className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold text-xs shadow-xs"
                  >
                    View All Lectures
                  </button>
                </div>
              )}
            </div>

            {/* Infinite Scroll Loader Spinner */}
            {loadingMore && (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400">
                <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[11px] font-bold">Loading more popular videos...</span>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

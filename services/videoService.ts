import { supabase } from './supabase';

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
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  duration?: string;
  source?: 'supabase' | 'youtube';
}

export interface SupabaseVideoRow {
  video_id: string;
  title: string;
  view_count?: number;
  published_at?: string;
  duration_seconds?: number;
  channel_id?: string;
  tags?: string[];
  subject?: string;
  like_count?: number;
  created_at?: string;
}

// Helper: Format seconds (e.g. 360 -> "6:00", 3665 -> "1:01:05")
export const formatSecondsToDuration = (seconds?: number): string => {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds <= 0) return '';
  const total = Math.round(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Helper: Convert ISO 8601 duration (PT1H20M15S -> seconds)
export const parseIsoDurationToSeconds = (iso: string): number => {
  if (!iso) return 0;
  const matches = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) return 0;
  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  const seconds = parseInt(matches[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
};

// Helper: Parse ISO 8601 duration string (PT1H20M15S -> "1:20:15")
export const parseDuration = (iso: string): string => {
  if (!iso) return '';
  const secs = parseIsoDurationToSeconds(iso);
  return formatSecondsToDuration(secs);
};

// Helper: Check if video is short (< 65 seconds)
export const isShortVideo = (item: { duration?: string; duration_seconds?: number }): boolean => {
  if (typeof item.duration_seconds === 'number') {
    return item.duration_seconds <= 65;
  }
  if (!item.duration) return false;
  const parts = item.duration.split(':').map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    const totalSecs = parts[0] * 60 + parts[1];
    return totalSecs <= 65;
  } else if (parts.length === 1 && !isNaN(parts[0])) {
    return parts[0] <= 65;
  }
  return false;
};

// Normalization: Map Supabase database row -> unified VideoItem
export const normalizeSupabaseVideo = (row: any): VideoItem => {
  const vidId = row.video_id || row.id || '';
  const channelTitle =
    row.channel_title ||
    row.channel_name ||
    (row.subject ? `${row.subject} Faculty` : 'Raftaar Educator');
  const channelId = row.channel_id || 'raftaar_edu';

  let durationStr = '';
  if (typeof row.duration_seconds === 'number' && row.duration_seconds > 0) {
    durationStr = formatSecondsToDuration(row.duration_seconds);
  } else if (typeof row.duration === 'string') {
    durationStr = row.duration;
  }

  return {
    id: vidId,
    title: row.title || 'Educational Lecture',
    description: row.description || '',
    thumbnail: row.thumbnail_url || (vidId ? `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg` : ''),
    channelId,
    channelTitle,
    channelAvatar:
      row.channel_avatar ||
      `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(channelTitle || channelId)}`,
    publishedAt: row.published_at || row.created_at || new Date().toISOString(),
    viewCount:
      typeof row.view_count === 'number'
        ? row.view_count
        : row.views
        ? Number(row.views)
        : undefined,
    likeCount: typeof row.like_count === 'number' ? row.like_count : undefined,
    commentCount: typeof row.comment_count === 'number' ? row.comment_count : undefined,
    duration: durationStr || undefined,
    source: 'supabase'
  };
};

// Normalization: Map YouTube API result into the exact same unified structure
export const normalizeYouTubeVideo = (
  it: any,
  statsMap?: Record<string, { views?: number; likes?: number; comments?: number; duration?: string }>,
  avatarMap?: Record<string, string>
): VideoItem => {
  const vidId = it.id?.videoId || (typeof it.id === 'string' ? it.id : '');
  const stats = statsMap?.[vidId];
  const channelId = it.snippet?.channelId || '';
  const channelTitle = it.snippet?.channelTitle || 'Educator';

  return {
    id: vidId,
    title: it.snippet?.title || 'Educational Lecture',
    description: it.snippet?.description || '',
    thumbnail: vidId
      ? `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`
      : it.snippet?.thumbnails?.high?.url || '',
    channelId,
    channelTitle,
    channelAvatar:
      avatarMap?.[channelId] ||
      `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(channelTitle || 'Educator')}`,
    publishedAt: it.snippet?.publishedAt || new Date().toISOString(),
    viewCount: stats?.views,
    likeCount: stats?.likes,
    commentCount: stats?.comments,
    duration: stats?.duration,
    source: 'youtube'
  };
};

/**
 * 1. SMART SEARCH LOGIC (Supabase First -> Fallback to YT API):
 * - Step 1: When user searches, first query Supabase `youtube_videos` table where title or tags match query
 * - Step 2: If Supabase returns results (> 0), return these videos and DO NOT call YouTube API.
 * - Step 3: IF AND ONLY IF Supabase returns 0 results for that query, fallback to YouTube Data API.
 * - Step 4: Map YouTube API fallback results into the exact same unified object structure.
 */
export const searchVideos = async (
  query: string,
  options: {
    pageToken?: string;
    signal?: AbortSignal;
  } = {}
): Promise<{ items: VideoItem[]; source: 'supabase' | 'youtube'; nextToken: string | null }> => {
  const cleanQ = query.trim();
  if (!cleanQ) {
    return { items: [], source: 'supabase', nextToken: null };
  }

  // Step 1: Query Supabase database first
  try {
    // 1a. Search by title or subject using .ilike
    let { data: supabaseRows, error } = await supabase
      .from('youtube_videos')
      .select('*')
      .or(`title.ilike.%${cleanQ}%,subject.ilike.%${cleanQ}%`)
      .limit(50);

    // 1b. If no title/subject matches, check tags array with .contains
    if ((!supabaseRows || supabaseRows.length === 0) && !error) {
      const { data: tagRows } = await supabase
        .from('youtube_videos')
        .select('*')
        .contains('tags', [cleanQ.toLowerCase()])
        .limit(50);
      if (tagRows && tagRows.length > 0) {
        supabaseRows = tagRows;
      }
    }

    // Step 2: Check results. If Supabase returns results (> 0), return them.
    // DO NOT call the YouTube API!
    if (supabaseRows && supabaseRows.length > 0) {
      const mapped = supabaseRows
        .map(normalizeSupabaseVideo)
        .filter(it => !isShortVideo(it));

      if (mapped.length > 0) {
        return {
          items: mapped,
          source: 'supabase',
          nextToken: null
        };
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    console.warn('Supabase search check encountered error:', err);
  }

  // Step 3 (Fallback): IF AND ONLY IF Supabase returns 0 results, call YouTube Data API
  try {
    const ytResults = await fetchYouTubeApiSearch(cleanQ, options);
    return {
      items: ytResults.items,
      source: 'youtube',
      nextToken: ytResults.nextToken
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    console.warn('YouTube fallback search failed:', err);
    return { items: [], source: 'youtube', nextToken: null };
  }
};

/**
 * 2. HOME PAGE RECOMMENDATIONS (Supabase Only / Supabase First -> API fallback if needed):
 * - Do not call the YouTube API for the home page.
 * - Fetch recommended/latest videos directly from the Supabase `youtube_videos` table.
 * - If Supabase returns videos (> 0), return them immediately.
 * - If Supabase table is empty or 0 results found, gracefully fallback to YouTube API so app remains operational.
 */
export const fetchHomeVideos = async (
  category = 'All',
  options: { signal?: AbortSignal } = {}
): Promise<{ items: VideoItem[]; source: 'supabase' | 'youtube' }> => {
  try {
    let queryBuilder = supabase
      .from('youtube_videos')
      .select('*');

    if (category && category !== 'All') {
      queryBuilder = queryBuilder.or(`title.ilike.%${category}%,subject.ilike.%${category}%`);
    }

    // Order by latest created_at or published_at
    const { data: rows, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .limit(40);

    if (!error && rows && rows.length > 0) {
      const mapped = rows
        .map(normalizeSupabaseVideo)
        .filter(it => !isShortVideo(it));

      if (mapped.length > 0) {
        return { items: mapped, source: 'supabase' };
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    console.warn('Supabase home recommendations fetch warning:', err);
  }

  // Fallback to YouTube API if and only if Supabase returned 0 items
  const fallbackQuery =
    category && category !== 'All' ? `${category} lecture` : 'physics lecture';
  const ytResult = await fetchYouTubeApiSearch(fallbackQuery, options);
  return { items: ytResult.items, source: 'youtube' };
};

/**
 * 3. WATCH SCREEN RECOMMENDATIONS (Supabase First -> Fallback to YouTube API):
 * - Fetch related videos directly from Supabase `youtube_videos` matching topic / title.
 * - Fallback to YouTube API only if 0 results in Supabase.
 */
export const fetchRecommendedVideos = async (
  currentVideo: VideoItem,
  options: { signal?: AbortSignal } = {}
): Promise<{ items: VideoItem[]; source: 'supabase' | 'youtube' }> => {
  try {
    // Extract first 2-3 words for matching
    const titleWords = currentVideo.title
      .replace(/[^\w\s\u0900-\u097F]/gi, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 2);

    let queryBuilder = supabase
      .from('youtube_videos')
      .select('*')
      .neq('video_id', currentVideo.id);

    if (titleWords.length > 0) {
      const orFilter = titleWords
        .map(w => `title.ilike.%${w}%,subject.ilike.%${w}%`)
        .join(',');
      queryBuilder = queryBuilder.or(orFilter);
    }

    const { data: rows, error } = await queryBuilder.limit(25);

    if (!error && rows && rows.length > 0) {
      const mapped = rows
        .map(normalizeSupabaseVideo)
        .filter(it => it.id !== currentVideo.id && !isShortVideo(it));

      if (mapped.length > 0) {
        return { items: mapped, source: 'supabase' };
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    console.warn('Supabase recommendations warning:', err);
  }

  // Fallback: search YouTube API for related videos
  const cleanQ = currentVideo.title.split('|')[0].slice(0, 40);
  const ytResult = await fetchYouTubeApiSearch(cleanQ, options);
  const filtered = ytResult.items.filter(it => it.id !== currentVideo.id && !isShortVideo(it));
  return { items: filtered, source: 'youtube' };
};

/**
 * YouTube API Fetch Helper:
 * Performs search, statistics enrichment, and channel avatar batching.
 */
export const fetchYouTubeApiSearch = async (
  query: string,
  options: { pageToken?: string; signal?: AbortSignal } = {}
): Promise<{ items: VideoItem[]; nextToken: string | null }> => {
  const rawQ = query.trim();
  if (!rawQ) return { items: [], nextToken: null };

  const hasDevanagari = /[\u0900-\u097F]/.test(rawQ);
  const encodedQ = encodeURIComponent(rawQ);
  const pageParam = options.pageToken ? `&pageToken=${encodeURIComponent(options.pageToken)}` : '';
  const langParam = hasDevanagari ? '&relevanceLanguage=hi' : '';

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

  const items: VideoItem[] = data.items
    .map((it: any) => normalizeYouTubeVideo(it, statsMap, avatarMap))
    .filter((it: VideoItem) => Boolean(it.id) && !isShortVideo(it));

  return { items, nextToken: data.nextPageToken || null };
};

import { supabase } from './supabase';

export const VIDEO_SELECT = '*, youtube_channels(channel_title, channel_handle, channel_avatar, subscriber_count, channel_banner_url, description), youtube_playlists(title)';
export const SHOW_SHORTS = false;

export interface VideoItem {
  id: string; // video_id
  title: string;
  description: string; // description_short
  thumbnail: string;
  channelId: string;
  channelTitle: string;
  channelHandle?: string;
  channelAvatar: string;
  subscriberCount?: number;
  publishedAt: string;
  viewCount?: number;
  likeCount?: number;
  duration?: string;
  durationSeconds?: number;
  isShort?: boolean;
  playlistId?: string;
  playlistPosition?: number;
  playlistTitle?: string;
  subject?: string;
  classLevel?: string;
  tags?: string[];
  hashtags?: string[];
}

export interface RecCursor {
  tier: number; // 1 through 6
  offset: number;
}

export interface ChannelDetails {
  channelId: string;
  channelTitle: string;
  channelHandle?: string;
  channelAvatar?: string;
  channelBannerUrl?: string;
  subscriberCount?: number;
  videoCount?: number;
  description?: string;
}

export interface PlaylistDetails {
  playlistId: string;
  title: string;
  videoCount?: number;
  thumbnail?: string;
}

// Format seconds into duration string (e.g. 360 -> "6:00", 3665 -> "1:01:05")
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

// Normalization: Map Supabase database row -> unified VideoItem
export const normalizeSupabaseVideo = (row: any): VideoItem => {
  const vidId = row.video_id || row.id || '';
  const channel = Array.isArray(row.youtube_channels)
    ? row.youtube_channels[0]
    : row.youtube_channels;
  const playlist = Array.isArray(row.youtube_playlists)
    ? row.youtube_playlists[0]
    : row.youtube_playlists;

  const channelTitle = channel?.channel_title || '';
  const channelHandle = channel?.channel_handle || undefined;
  const channelAvatar = channel?.channel_avatar || '';
  const subscriberCount =
    typeof channel?.subscriber_count === 'number'
      ? channel.subscriber_count
      : undefined;

  const durationStr = formatSecondsToDuration(row.duration_seconds);

  return {
    id: vidId,
    title: row.title || '',
    description: row.description_short || '',
    thumbnail: vidId ? `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg` : '',
    channelId: row.channel_id || '',
    channelTitle,
    channelHandle,
    channelAvatar,
    subscriberCount,
    publishedAt: row.published_at || row.fetched_at || new Date().toISOString(),
    viewCount: typeof row.view_count === 'number' ? row.view_count : undefined,
    likeCount: typeof row.like_count === 'number' ? row.like_count : undefined,
    duration: durationStr || undefined,
    durationSeconds: typeof row.duration_seconds === 'number' ? row.duration_seconds : undefined,
    isShort: Boolean(row.is_short),
    playlistId: row.playlist_id || undefined,
    playlistPosition: typeof row.playlist_position === 'number' ? row.playlist_position : undefined,
    playlistTitle: playlist?.title || undefined,
    subject: row.subject || undefined,
    classLevel: row.class_level || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    hashtags: Array.isArray(row.hashtags) ? row.hashtags : []
  };
};

/**
 * Fallback search stub
 */
export const fetchSearchFallback = async (query: string): Promise<VideoItem[]> => {
  const url = import.meta.env.VITE_SYNC_API_URL;
  if (!url) return [];
  /* later: POST to `${url}/api/search` with the Supabase access token in the Authorization header */
  return [];
};

/**
 * Clean search query: lowercase, remove characters , ( ) % _ * " \
 * split on whitespace, drop 1-letter tokens, max 6 tokens.
 */
export const cleanSearchTokens = (query: string): { fullClean: string; tokens: string[] } => {
  const fullClean = query
    .toLowerCase()
    .replace(/[,()%\_*"\\\\]/g, ' ')
    .trim();
  const tokens = fullClean
    .split(/\s+/)
    .filter(t => t.length > 1)
    .slice(0, 6);
  return { fullClean, tokens };
};

/**
 * Client-side ranker:
 * full phrase in title = +100, plus 10 x matched tokens, tie-break by view_count.
 */
export const rankVideosByQuery = (
  items: VideoItem[],
  fullClean: string,
  tokens: string[]
): VideoItem[] => {
  return [...items].sort((a, b) => {
    const aTitle = (a.title || '').toLowerCase();
    const bTitle = (b.title || '').toLowerCase();

    let aScore = 0;
    let bScore = 0;

    if (fullClean && aTitle.includes(fullClean)) aScore += 100;
    if (fullClean && bTitle.includes(fullClean)) bScore += 100;

    for (const t of tokens) {
      if (aTitle.includes(t)) aScore += 10;
      if (bTitle.includes(t)) bScore += 10;
    }

    if (bScore !== aScore) {
      return bScore - aScore;
    }
    return (b.viewCount || 0) - (a.viewCount || 0);
  });
};

/**
 * 3. SEARCH (Supabase first, paginated)
 */
export const searchVideos = async (
  query: string,
  options: { offset?: number } = {}
): Promise<{ items: VideoItem[]; nextToken: string | null; error?: string }> => {
  const offset = options.offset || 0;
  const { fullClean, tokens } = cleanSearchTokens(query);

  if (!fullClean && tokens.length === 0) {
    return { items: [], nextToken: null };
  }

  try {
    let channelVideos: VideoItem[] = [];

    // Step A: on page 0, find channels whose channel_title or channel_handle ilike %fullQuery% (limit 3)
    if (offset === 0 && fullClean) {
      try {
        const { data: matchedChannels } = await supabase
          .from('youtube_channels')
          .select('channel_id')
          .or(`channel_title.ilike.%${fullClean}%,channel_handle.ilike.%${fullClean}%`)
          .limit(3);

        if (matchedChannels && matchedChannels.length > 0) {
          const chIds = matchedChannels.map(c => c.channel_id).filter(Boolean);
          if (chIds.length > 0) {
            let chVidsQuery = supabase
              .from('youtube_videos')
              .select(VIDEO_SELECT)
              .in('channel_id', chIds);

            if (!SHOW_SHORTS) {
              chVidsQuery = chVidsQuery.eq('is_short', false);
            }

            const { data: chVids } = await chVidsQuery
              .order('published_at', { ascending: false })
              .limit(10);

            if (chVids) {
              channelVideos = chVids.map(normalizeSupabaseVideo);
            }
          }
        }
      } catch (err) {
        console.warn('Channel search step error:', err);
      }
    }

    // Step B: videos where EVERY token matches:
    // chain one .or(`title.ilike.%t%,subject.ilike.%t%,description_short.ilike.%t%`) per token.
    let videoQuery = supabase
      .from('youtube_videos')
      .select(VIDEO_SELECT);

    if (!SHOW_SHORTS) {
      videoQuery = videoQuery.eq('is_short', false);
    }

    const searchTokens = tokens.length > 0 ? tokens : [fullClean];
    for (const t of searchTokens) {
      videoQuery = videoQuery.or(
        `title.ilike.%${t}%,subject.ilike.%${t}%,description_short.ilike.%${t}%`
      );
    }

    const { data: videoRows, error: videoError } = await videoQuery
      .order('published_at', { ascending: false })
      .range(offset, offset + 49);

    if (videoError) {
      return {
        items: channelVideos,
        nextToken: null,
        error: videoError.message
      };
    }

    let regularVideos: VideoItem[] = (videoRows || []).map(normalizeSupabaseVideo);

    // Client-side rank
    regularVideos = rankVideosByQuery(regularVideos, fullClean, searchTokens);

    // Merge channel videos at the top, deduping by id
    const seenIds = new Set<string>();
    const merged: VideoItem[] = [];

    for (const v of channelVideos) {
      if (v.id && !seenIds.has(v.id)) {
        seenIds.add(v.id);
        merged.push(v);
      }
    }
    for (const v of regularVideos) {
      if (v.id && !seenIds.has(v.id)) {
        seenIds.add(v.id);
        merged.push(v);
      }
    }

    // nextToken = String(offset + 50) when 50 rows came back, else null
    const nextToken = (videoRows && videoRows.length === 50) ? String(offset + 50) : null;

    // Only on the first page, if fewer than 5 results, call fetchSearchFallback(query)
    if (offset === 0 && merged.length < 5) {
      try {
        const fallbackResults = await fetchSearchFallback(query);
        for (const fb of fallbackResults) {
          if (fb.id && !seenIds.has(fb.id)) {
            seenIds.add(fb.id);
            merged.push(fb);
          }
        }
      } catch {}
    }

    return { items: merged, nextToken };
  } catch (err: any) {
    return { items: [], nextToken: null, error: err?.message || 'Search failed' };
  }
};

/**
 * Recent shown IDs manager (localStorage, max 100)
 */
const RECENT_SHOWN_KEY = 'raftaar_recent_shown_ids';
export const getRecentShownIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(RECENT_SHOWN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};

export const markIdsAsShown = (ids: string[]) => {
  try {
    const existing: string[] = JSON.parse(localStorage.getItem(RECENT_SHOWN_KEY) || '[]');
    const merged = [...ids, ...existing.filter(id => !ids.includes(id))].slice(0, 100);
    localStorage.setItem(RECENT_SHOWN_KEY, JSON.stringify(merged));
  } catch {}
};

/**
 * Interleave round-robin by channel, shuffle inside chunks of 6,
 * never more than 2 videos from the same channel in a row,
 * and avoid the last 100 shown ids.
 */
export const interleaveAndFormatCandidates = (
  candidates: VideoItem[],
  recentShown: Set<string>
): VideoItem[] => {
  // Separate fresh vs recently shown
  const fresh = candidates.filter(v => !recentShown.has(v.id));
  const past = candidates.filter(v => recentShown.has(v.id));
  const pool = [...fresh, ...past];

  // Group by channel_id for round-robin
  const channelBuckets: Record<string, VideoItem[]> = {};
  for (const v of pool) {
    const ch = v.channelId || 'unknown';
    if (!channelBuckets[ch]) channelBuckets[ch] = [];
    channelBuckets[ch].push(v);
  }

  const streams = Object.values(channelBuckets);
  const maxLen = Math.max(...streams.map(s => s.length), 0);
  const result: VideoItem[] = [];
  const dedupe = new Set<string>();

  for (let i = 0; i < maxLen; i++) {
    for (const stream of streams) {
      if (i < stream.length) {
        const item = stream[i];
        if (item && item.id && !dedupe.has(item.id)) {
          dedupe.add(item.id);
          result.push(item);
        }
      }
    }
  }

  // Shuffle inside chunks of 6
  for (let i = 0; i < result.length; i += 6) {
    const end = Math.min(i + 6, result.length);
    for (let j = end - 1; j > i; j--) {
      const r = i + Math.floor(Math.random() * (j - i + 1));
      const temp = result[j];
      result[j] = result[r];
      result[r] = temp;
    }
  }

  // Never more than 2 videos from the same channel in a row
  for (let i = 2; i < result.length; i++) {
    if (
      result[i].channelId &&
      result[i].channelId === result[i - 1].channelId &&
      result[i].channelId === result[i - 2].channelId
    ) {
      const swapIdx = result.findIndex(
        (it, idx) => idx > i && it.channelId !== result[i].channelId
      );
      if (swapIdx !== -1) {
        const temp = result[i];
        result[i] = result[swapIdx];
        result[swapIdx] = temp;
      }
    }
  }

  return result;
};

/**
 * 4. HOME (Supabase only, different for every refresh)
 */
export const fetchHomeVideos = async (
  category = 'All',
  options: { offset?: number; isRefresh?: boolean } = {}
): Promise<{ items: VideoItem[]; nextOffset: number | null; error?: string }> => {
  let offset = options.offset || 0;

  // On refresh/pull-to-refresh, randomly start from an offset in the first 300 rows
  if (options.isRefresh) {
    offset = Math.floor(Math.random() * 3) * 75; // e.g. 0, 75, or 150
  }

  try {
    let q1 = supabase
      .from('youtube_videos')
      .select(VIDEO_SELECT);

    let q2 = supabase
      .from('youtube_videos')
      .select(VIDEO_SELECT);

    if (!SHOW_SHORTS) {
      q1 = q1.eq('is_short', false);
      q2 = q2.eq('is_short', false);
    }

    if (category && category !== 'All') {
      const filter = `subject.ilike.%${category}%,title.ilike.%${category}%`;
      q1 = q1.or(filter);
      q2 = q2.or(filter);
    }

    // Stream 1: latest 75 (published_at desc)
    // Stream 2: most viewed 75 (view_count desc)
    const [res1, res2] = await Promise.all([
      q1.order('published_at', { ascending: false }).range(offset, offset + 74),
      q2.order('view_count', { ascending: false }).range(offset, offset + 74)
    ]);

    if (res1.error && res2.error) {
      return {
        items: [],
        nextOffset: null,
        error: res1.error.message || res2.error.message
      };
    }

    const rows1 = res1.data || [];
    const rows2 = res2.data || [];

    // Merge and dedupe
    const dedupeMap = new Map<string, VideoItem>();
    rows1.forEach(r => {
      const item = normalizeSupabaseVideo(r);
      if (item.id) dedupeMap.set(item.id, item);
    });
    rows2.forEach(r => {
      const item = normalizeSupabaseVideo(r);
      if (item.id && !dedupeMap.has(item.id)) dedupeMap.set(item.id, item);
    });

    const candidateList = Array.from(dedupeMap.values());
    const recentShown = getRecentShownIds();
    const formatted = interleaveAndFormatCandidates(candidateList, recentShown);

    const hasMore = (rows1.length === 75 || rows2.length === 75);
    const nextOffset = hasMore ? offset + 75 : null;

    return { items: formatted, nextOffset };
  } catch (err: any) {
    return { items: [], nextOffset: null, error: err?.message || 'Database fetch failed' };
  }
};

/**
 * D) UP NEXT must be unlimited (services/videoService.ts + YouTubeHome.tsx)
 * Tiers in order:
 * 1) same playlist, playlist_position greater than current, ascending;
 * 2) same channel and same subject;
 * 3) tags overlap with the current video's tags;
 * 4) same subject + class_level from other channels, view_count desc;
 * 5) same channel, anything, published_at desc;
 * 6) the whole library, published_at desc.
 * Move to next tier when a tier returns fewer than 20 rows. Skip Shorts and current video.
 */
export const fetchRecommendedVideos = async (
  currentVideo: VideoItem,
  options: { cursor?: RecCursor | null } = {}
): Promise<{ items: VideoItem[]; nextCursor: RecCursor | null; error?: string }> => {
  let currTier = options.cursor ? options.cursor.tier : 1;
  let currOffset = options.cursor ? options.cursor.offset : 0;
  const currId = currentVideo.id;

  const collected: VideoItem[] = [];

  try {
    while (collected.length < 20 && currTier <= 6) {
      let q = supabase.from('youtube_videos').select(VIDEO_SELECT);

      if (!SHOW_SHORTS) {
        q = q.eq('is_short', false);
      }
      if (currId) {
        q = q.neq('video_id', currId);
      }

      let canRunTier = true;

      switch (currTier) {
        case 1:
          if (currentVideo.playlistId && typeof currentVideo.playlistPosition === 'number') {
            q = q
              .eq('playlist_id', currentVideo.playlistId)
              .gt('playlist_position', currentVideo.playlistPosition)
              .order('playlist_position', { ascending: true });
          } else {
            canRunTier = false;
          }
          break;

        case 2:
          if (currentVideo.channelId && currentVideo.subject) {
            q = q
              .eq('channel_id', currentVideo.channelId)
              .eq('subject', currentVideo.subject)
              .order('published_at', { ascending: false });
          } else {
            canRunTier = false;
          }
          break;

        case 3:
          if (currentVideo.tags && currentVideo.tags.length > 0) {
            q = q
              .overlaps('tags', currentVideo.tags)
              .order('view_count', { ascending: false });
          } else {
            canRunTier = false;
          }
          break;

        case 4:
          if (currentVideo.subject) {
            if (currentVideo.channelId) {
              q = q.neq('channel_id', currentVideo.channelId);
            }
            q = q.eq('subject', currentVideo.subject);
            if (currentVideo.classLevel) {
              q = q.eq('class_level', currentVideo.classLevel);
            }
            q = q.order('view_count', { ascending: false });
          } else {
            canRunTier = false;
          }
          break;

        case 5:
          if (currentVideo.channelId) {
            q = q
              .eq('channel_id', currentVideo.channelId)
              .order('published_at', { ascending: false });
          } else {
            canRunTier = false;
          }
          break;

        case 6:
          q = q.order('published_at', { ascending: false });
          break;

        default:
          canRunTier = false;
          break;
      }

      if (!canRunTier) {
        currTier += 1;
        currOffset = 0;
        continue;
      }

      const { data: rows, error } = await q.range(currOffset, currOffset + 19);
      if (error) {
        console.warn(`Tier ${currTier} error:`, error.message);
        currTier += 1;
        currOffset = 0;
        continue;
      }

      const fetched = rows || [];
      for (const r of fetched) {
        const item = normalizeSupabaseVideo(r);
        if (item.id && !collected.some(c => c.id === item.id)) {
          collected.push(item);
        }
      }

      if (fetched.length < 20) {
        // Move to next tier when tier returns fewer than 20 rows
        currTier += 1;
        currOffset = 0;
      } else {
        // More rows in this tier
        currOffset += 20;
        break;
      }
    }

    const nextCursor: RecCursor | null =
      currTier <= 6 ? { tier: currTier, offset: currOffset } : null;

    return { items: collected, nextCursor };
  } catch (err: any) {
    return { items: [], nextCursor: null, error: err?.message || 'Error fetching recommendations' };
  }
};

/**
 * Fetch channel details and stats for Channel Page
 */
export const fetchChannelDetails = async (channelId: string): Promise<ChannelDetails | null> => {
  try {
    const { data: ch, error } = await supabase
      .from('youtube_channels')
      .select('*')
      .eq('channel_id', channelId)
      .maybeSingle();

    if (error || !ch) return null;

    // Optional: count videos
    const { count } = await supabase
      .from('youtube_videos')
      .select('video_id', { count: 'exact', head: true })
      .eq('channel_id', channelId);

    return {
      channelId: ch.channel_id,
      channelTitle: ch.channel_title || '',
      channelHandle: ch.channel_handle || undefined,
      channelAvatar: ch.channel_avatar || undefined,
      channelBannerUrl: ch.channel_banner_url || undefined,
      subscriberCount: typeof ch.subscriber_count === 'number' ? ch.subscriber_count : undefined,
      videoCount: count || undefined,
      description: ch.description || undefined
    };
  } catch {
    return null;
  }
};

/**
 * Fetch channel videos (with latest, popular, oldest sorting, and shorts)
 */
export const fetchChannelVideos = async (
  channelId: string,
  sort: 'latest' | 'popular' | 'oldest' = 'latest',
  options: { offset?: number; isShorts?: boolean } = {}
): Promise<{ items: VideoItem[]; nextOffset: number | null }> => {
  const offset = options.offset || 0;
  try {
    let q = supabase
      .from('youtube_videos')
      .select(VIDEO_SELECT)
      .eq('channel_id', channelId);

    if (options.isShorts) {
      q = q.eq('is_short', true);
    } else {
      q = q.eq('is_short', false);
    }

    if (sort === 'popular') {
      q = q.order('view_count', { ascending: false });
    } else if (sort === 'oldest') {
      q = q.order('published_at', { ascending: true });
    } else {
      q = q.order('published_at', { ascending: false });
    }

    const { data, error } = await q.range(offset, offset + 29);
    if (error || !data) return { items: [], nextOffset: null };
    const items = data.map(normalizeSupabaseVideo);
    return { items, nextOffset: data.length === 30 ? offset + 30 : null };
  } catch {
    return { items: [], nextOffset: null };
  }
};

/**
 * Fetch distinct playlists of a channel with video samples
 */
export const fetchChannelPlaylists = async (
  channelId: string
): Promise<{ playlists: PlaylistDetails[]; error?: string }> => {
  try {
    const { data: vids, error } = await supabase
      .from('youtube_videos')
      .select('playlist_id, youtube_playlists(title), video_id')
      .eq('channel_id', channelId)
      .not('playlist_id', 'is', null);

    if (error || !vids) return { playlists: [] };

    const map = new Map<string, { title: string; count: number; sampleVideoId: string }>();
    for (const v of vids) {
      if (v.playlist_id) {
        const pl = Array.isArray(v.youtube_playlists) ? v.youtube_playlists[0] : v.youtube_playlists;
        const title = pl?.title || 'Playlist';
        const existing = map.get(v.playlist_id);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(v.playlist_id, { title, count: 1, sampleVideoId: v.video_id });
        }
      }
    }

    const playlists: PlaylistDetails[] = Array.from(map.entries()).map(([playlistId, val]) => ({
      playlistId,
      title: val.title,
      videoCount: val.count,
      thumbnail: `https://i.ytimg.com/vi/${val.sampleVideoId}/hqdefault.jpg`
    }));

    return { playlists };
  } catch {
    return { playlists: [] };
  }
};

/**
 * Fetch all videos of a specific playlist in order
 */
export const fetchPlaylistVideos = async (
  playlistId: string
): Promise<{ playlistTitle?: string; items: VideoItem[] }> => {
  try {
    const { data: plData } = await supabase
      .from('youtube_playlists')
      .select('title')
      .eq('playlist_id', playlistId)
      .maybeSingle();

    const { data, error } = await supabase
      .from('youtube_videos')
      .select(VIDEO_SELECT)
      .eq('playlist_id', playlistId)
      .order('playlist_position', { ascending: true })
      .limit(100);

    if (error || !data) return { playlistTitle: plData?.title, items: [] };
    return {
      playlistTitle: plData?.title,
      items: data.map(normalizeSupabaseVideo)
    };
  } catch {
    return { items: [] };
  }
};

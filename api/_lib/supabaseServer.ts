import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ApiError, extractBearerToken, type ApiRequest } from './http.ts';
import { VIDEO_ID_RE } from './validators.ts';

// Public Supabase URL & anon key match services/supabase.ts unless overridden by server env vars
const DEFAULT_SUPABASE_URL = 'https://lmauqnfzcvhtxlznrwni.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtYXVxbmZ6Y3ZodHhsem5yd25pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMzgzODIsImV4cCI6MjA4MjYxNDM4Mn0.r6LQUTq9UBj0zK0KoYC6VGkNXF87iTnzIvtSVpjuPhk';

function readEnv(name: string): string {
  const direct = process.env[name];
  if (direct && direct.trim()) return direct.trim();
  for (const [k, v] of Object.entries(process.env)) {
    if (k.trim() === name && v && v.trim()) return v.trim();
  }
  return '';
}

export function getSupabaseUrl(): string {
  return readEnv('SUPABASE_URL') || readEnv('VITE_SUPABASE_URL') || DEFAULT_SUPABASE_URL;
}

export function getSupabaseAnonKey(): string {
  return readEnv('SUPABASE_ANON_KEY') || readEnv('VITE_SUPABASE_ANON_KEY') || DEFAULT_SUPABASE_ANON_KEY;
}

export function getSupabaseServiceRoleKey(): string {
  return readEnv('SUPABASE_SERVICE_ROLE_KEY');
}

export function hasSupabaseAdminConfigured(): boolean {
  return Boolean(getSupabaseServiceRoleKey());
}

export function getSupabaseAdminClient(): SupabaseClient {
  const serviceKey = getSupabaseServiceRoleKey();
  if (!serviceKey) {
    throw new ApiError(
      503,
      'SUPABASE_SERVICE_ROLE_KEY server par configured nahi hai. Vercel Environment Variables ya Settings > Secrets me add karein.'
    );
  }
  return createClient(getSupabaseUrl(), serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSupabaseUserClient(accessToken?: string): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    ...(accessToken
      ? {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        }
      : {}),
  });
}

export interface VerifiedRequestContext {
  userId: string;
  accessToken: string;
  video: {
    video_id: string;
    title: string;
    duration_seconds: number | null;
  };
}

export async function verifyBearerUser(req: ApiRequest): Promise<{ userId: string; accessToken: string }> {
  const token = extractBearerToken(req);
  if (!token) {
    throw new ApiError(401, 'Login session missing hai. Kripya login karein.');
  }

  const userClient = getSupabaseUserClient(token);
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data?.user?.id) {
    throw new ApiError(401, 'Session expire ya invalid hai. Kripya dubara login karein.');
  }

  return {
    userId: data.user.id,
    accessToken: token,
  };
}

export async function verifyVideoInCatalog(
  videoId: string,
  accessToken?: string
): Promise<{ video_id: string; title: string; duration_seconds: number | null }> {
  if (!VIDEO_ID_RE.test(videoId)) {
    throw new ApiError(400, 'Invalid YouTube video ID.');
  }

  const db = hasSupabaseAdminConfigured()
    ? getSupabaseAdminClient()
    : getSupabaseUserClient(accessToken);

  const { data, error } = await db
    .from('youtube_videos')
    .select('video_id, title, duration_seconds')
    .eq('video_id', videoId)
    .maybeSingle();

  if (error) {
    throw new ApiError(502, `Supabase youtube_videos verification failed: ${error.message}`);
  }
  if (!data) {
    throw new ApiError(
      403,
      'Yeh video app catalog (youtube_videos) me maujood nahi hai.'
    );
  }

  return {
    video_id: String(data.video_id),
    title: String(data.title || ''),
    duration_seconds:
      typeof data.duration_seconds === 'number' && Number.isFinite(data.duration_seconds)
        ? data.duration_seconds
        : null,
  };
}

export async function verifyUserAndCatalogVideo(
  req: ApiRequest,
  videoId: unknown
): Promise<VerifiedRequestContext> {
  const { userId, accessToken } = await verifyBearerUser(req);
  if (typeof videoId !== 'string' || !VIDEO_ID_RE.test(videoId)) {
    throw new ApiError(400, 'Invalid YouTube video ID.');
  }
  const video = await verifyVideoInCatalog(videoId, accessToken);
  return { userId, accessToken, video };
}

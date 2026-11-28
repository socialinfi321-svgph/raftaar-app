import crypto from 'node:crypto';
import {
  dedupeChapterMcqs,
  getServerGeminiKey,
  handleChapter,
  handleDigest,
  handleOutline,
  handleVisual,
  resolveLangFromMeta,
  selectBoardVisuals,
} from './aiNotesEngine.ts';
import {
  ApiError,
  resolveSelfOriginUrl,
  sanitizePublicMessage,
  type ApiRequest,
} from './http.ts';
import {
  getSupabaseAdminClient,
  getSupabaseServiceRoleKey,
  verifyUserAndCatalogVideo,
} from './supabaseServer.ts';
import {
  clamp,
  sanitizeSvg,
  type BoardItem,
  type Chapter,
  type ChapterContent,
  type ChapterMCQ,
  type LangMeta,
  type LangProfile,
  type Segment,
} from './validators.ts';

const WORKER_CONCURRENCY = 4;
const CHUNK_SEC = 600;
const LEASE_MS = 100_000;
const WORKER_SAFE_BUDGET_MS = 195_000; // Leaves ample margin before 300s Vercel maxDuration
const STORAGE_BUCKET = 'lecture-visuals';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const DEFAULT_META: LangMeta = {
  detected_medium: 'hinglish',
  detected_subject: 'General',
  detected_board: 'Unknown',
};

let ephemeralDevSecret = '';

export function getWorkerSecret(): string {
  const configured = (process.env.WORKER_SECRET || '').trim();
  if (configured) return configured;

  const seed = getServerGeminiKey() || getSupabaseServiceRoleKey();
  if (seed) {
    return crypto.createHmac('sha256', seed).update('raftaar-notes-worker-v1').digest('hex');
  }

  if (!ephemeralDevSecret) {
    ephemeralDevSecret = crypto.randomBytes(32).toString('hex');
  }
  return ephemeralDevSecret;
}

export function verifyWorkerSecretHeader(req: ApiRequest): boolean {
  const raw = req.headers['x-worker-secret'];
  const provided = Array.isArray(raw) ? raw[0] : raw;
  if (typeof provided !== 'string' || !provided.trim()) return false;

  const expected = getWorkerSecret();
  const a = Buffer.from(provided.trim(), 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function makeChunks(durationSec: number): { start: number; end: number }[] {
  const safeDur = Math.max(60, Math.round(durationSec));
  const out: { start: number; end: number }[] = [];
  for (let s = 0; s < safeDur; s += CHUNK_SEC) {
    out.push({ start: s, end: Math.min(s + CHUNK_SEC, safeDur) });
  }
  return out;
}

function sanitizeModeKey(raw: unknown): string {
  if (typeof raw !== 'string') return 'auto';
  const clean = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return clean.slice(0, 32) || 'auto';
}

function getDailyLimits(): { userLimit: number; appBudget: number } {
  const userRaw = Number(process.env.DAILY_USER_JOB_LIMIT);
  const appRaw = Number(process.env.DAILY_APP_JOB_BUDGET);
  return {
    userLimit: Number.isFinite(userRaw) && userRaw > 0 ? Math.floor(userRaw) : 10,
    appBudget: Number.isFinite(appRaw) && appRaw > 0 ? Math.floor(appRaw) : 150,
  };
}

async function checkAndConsumeDailyQuota(userId: string): Promise<void> {
  const db = getSupabaseAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { userLimit, appBudget } = getDailyLimits();
  const userScope = `user:${userId}`;

  const { data: rows, error } = await db
    .from('lecture_usage_daily')
    .select('scope, count')
    .eq('usage_date', today)
    .in('scope', ['app', userScope]);

  if (error) {
    throw new ApiError(502, `Quota check failed: ${error.message}`);
  }

  let appCount = 0;
  let userCount = 0;
  for (const r of rows || []) {
    if (r.scope === 'app') appCount = Number(r.count || 0);
    if (r.scope === userScope) userCount = Number(r.count || 0);
  }

  if (appCount >= appBudget) {
    throw new ApiError(
      429,
      'Aaj ka app-wide AI lecture notes daily budget poora ho gaya hai. Kal dubara try karein.',
      { 'Retry-After': '3600' }
    );
  }
  if (userCount >= userLimit) {
    throw new ApiError(
      429,
      `Aapki aaj ki daily limit (${userLimit} lectures) poori ho gayi hai. Kal dubara try karein.`,
      { 'Retry-After': '3600' }
    );
  }

  const nowIso = new Date().toISOString();
  const { error: upsertErr } = await db.from('lecture_usage_daily').upsert(
    [
      { usage_date: today, scope: 'app', count: appCount + 1, updated_at: nowIso },
      { usage_date: today, scope: userScope, count: userCount + 1, updated_at: nowIso },
    ],
    { onConflict: 'usage_date,scope' }
  );

  if (upsertErr) {
    throw new ApiError(502, `Usage tracking update failed: ${upsertErr.message}`);
  }
}

async function dispatchWorkerAsync(
  videoId: string,
  modeKey: string,
  req?: ApiRequest
): Promise<void> {
  // On Vercel serverless, dispatch HTTP POST /api/notes/work so worker runs in a fresh 300s invocation.
  // In single-process Node server (dev/local), run asynchronously via setImmediate in background.
  const isVercel = Boolean(process.env.VERCEL);
  const origin = resolveSelfOriginUrl(req);

  if (!isVercel || !origin) {
    setImmediate(() => {
      void executeNotesWorker({ videoId, modeKey }).catch((err) => {
        console.error('[notes-worker-bg]', sanitizePublicMessage((err as Error)?.message));
      });
    });
    return;
  }

  const workUrl = `${origin}/api/notes/work`;
  const fetchPromise = fetch(workUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-worker-secret': getWorkerSecret(),
    },
    body: JSON.stringify({ videoId, modeKey }),
  }).catch((err) => {
    console.warn('[notes-worker-dispatch]', sanitizePublicMessage((err as Error)?.message));
  });

  // Yield briefly so TLS/socket write completes before serverless response finishes
  await Promise.race([fetchPromise, sleep(450)]);
}

export interface ServerLectureBundle {
  videoId: string;
  title: string;
  updatedAt: number;
  lang: LangProfile;
  chapters: Array<
    ChapterContent &
      Chapter & {
        board_visuals: BoardItem[];
      }
  >;
  mcqs: ChapterMCQ[];
  visuals: Record<
    string,
    {
      kind: 'svg' | 'img';
      content: string;
      url?: string;
      caption: string;
    }
  >;
}

async function assembleBundleFromDb(
  videoId: string,
  modeKey: string,
  title: string,
  langProfileRaw: unknown
): Promise<ServerLectureBundle> {
  const db = getSupabaseAdminClient();
  const [{ data: chapRows }, { data: visRows }] = await Promise.all([
    db
      .from('lecture_chapters')
      .select('chapter_index, start_sec, end_sec, title, notes, mcqs, board_visuals, updated_at')
      .eq('video_id', videoId)
      .eq('mode_key', modeKey)
      .order('chapter_index', { ascending: true }),
    db
      .from('lecture_visuals')
      .select('visual_id, status, kind, image_url, caption')
      .eq('video_id', videoId)
      .eq('mode_key', modeKey),
  ]);

  const visuals: ServerLectureBundle['visuals'] = {};
  for (const v of visRows || []) {
    if (v.status === 'done' && v.image_url && (v.kind === 'svg' || v.kind === 'img')) {
      visuals[String(v.visual_id)] = {
        kind: v.kind,
        content: String(v.image_url),
        url: String(v.image_url),
        caption: String(v.caption || ''),
      };
    }
  }

  const chapterMcqs: ChapterMCQ[][] = [];
  const chapters: ServerLectureBundle['chapters'] = [];

  for (const row of chapRows || []) {
    const notes = (row.notes || {}) as ChapterContent;
    const mcqs = Array.isArray(row.mcqs) ? (row.mcqs as ChapterMCQ[]) : [];
    chapterMcqs.push(mcqs);
    chapters.push({
      title: String(row.title || ''),
      start_sec: Number(row.start_sec || 0),
      end_sec: Number(row.end_sec || 600),
      intro: notes.intro || '',
      sections: Array.isArray(notes.sections) ? notes.sections : [],
      terms: Array.isArray(notes.terms) ? notes.terms : [],
      important_points: Array.isArray(notes.important_points) ? notes.important_points : [],
      quick_revision: Array.isArray(notes.quick_revision) ? notes.quick_revision : [],
      mindmap: notes.mindmap,
      board_visuals: Array.isArray(row.board_visuals) ? (row.board_visuals as BoardItem[]) : [],
    });
  }

  const lang: LangProfile =
    langProfileRaw && typeof langProfileRaw === 'object'
      ? (langProfileRaw as LangProfile)
      : {
          medium: 'hinglish',
          pureEnglish: false,
          subject: 'General',
          board: 'Unknown',
          key: 'hinglish:general',
        };

  return {
    videoId,
    title,
    updatedAt: Date.now(),
    lang,
    chapters,
    mcqs: dedupeChapterMcqs(chapterMcqs),
    visuals,
  };
}

export async function handleNotesStart(body: Record<string, unknown>, req: ApiRequest) {
  const { userId, video } = await verifyUserAndCatalogVideo(req, body.videoId);
  const modeKey = sanitizeModeKey(body.modeKey);
  const forceRetry = Boolean(body.forceRetry);

  const rawTitle = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : video.title;
  const safeTitle = rawTitle.slice(0, 200) || 'Lecture';
  const rawDur = Number(body.durationSec || video.duration_seconds || 600);
  const durationSec = clamp(Math.round(Number.isFinite(rawDur) && rawDur > 0 ? rawDur : 600), 120, 28800);

  const db = getSupabaseAdminClient();
  const { data: existingJob, error: fetchErr } = await db
    .from('lecture_jobs')
    .select('*')
    .eq('video_id', video.video_id)
    .eq('mode_key', modeKey)
    .maybeSingle();

  if (fetchErr) {
    throw new ApiError(502, `Database lookup failed: ${fetchErr.message}`);
  }

  // Fast cache hit: shared across all users once generated
  if (existingJob && existingJob.status === 'completed' && !forceRetry) {
    const bundle = await assembleBundleFromDb(
      video.video_id,
      modeKey,
      safeTitle,
      existingJob.lang_profile
    );
    if (bundle.chapters.length > 0) {
      return {
        jobId: existingJob.id,
        status: 'completed',
        phase: 'completed',
        progress: 100,
        cached: true,
        bundle,
      };
    }
  }

  // If currently queued or actively running with a valid lease, return current progress + partial bundle
  if (existingJob && (existingJob.status === 'queued' || existingJob.status === 'running')) {
    const leaseExpired =
      !existingJob.lease_until || new Date(existingJob.lease_until).getTime() < Date.now() - 4000;
    if (leaseExpired) {
      await dispatchWorkerAsync(video.video_id, modeKey, req);
    }
    const bundle = await assembleBundleFromDb(
      video.video_id,
      modeKey,
      existingJob.video_title || safeTitle,
      existingJob.lang_profile
    );
    return {
      jobId: existingJob.id,
      status: existingJob.status,
      phase: existingJob.phase,
      progress: Number(existingJob.progress || 2),
      cached: false,
      bundle,
    };
  }

  // Enforce per-user daily limit & app-wide daily budget for new or failed-retry job runs
  await checkAndConsumeDailyQuota(userId);

  const totalChunks = makeChunks(durationSec).length;
  const nowIso = new Date().toISOString();
  const upsertPayload = {
    video_id: video.video_id,
    mode_key: modeKey,
    status: 'queued',
    phase: existingJob?.outline ? 'chapters' : 'digest',
    progress: existingJob?.completed_chapters ? clamp(Math.round(Number(existingJob.progress || 5)), 5, 95) : 3,
    duration_sec: durationSec,
    video_title: safeTitle,
    lease_until: null,
    error_status: null,
    error_message: null,
    total_chunks: totalChunks,
    created_by: userId,
    updated_at: nowIso,
  };

  const { data: savedJob, error: upsertErr } = await db
    .from('lecture_jobs')
    .upsert(upsertPayload, { onConflict: 'video_id,mode_key' })
    .select('*')
    .single();

  if (upsertErr || !savedJob) {
    throw new ApiError(502, `Could not create lecture job: ${upsertErr?.message || 'unknown'}`);
  }

  await dispatchWorkerAsync(video.video_id, modeKey, req);

  const bundle = await assembleBundleFromDb(
    video.video_id,
    modeKey,
    safeTitle,
    savedJob.lang_profile
  );

  return {
    jobId: savedJob.id,
    status: savedJob.status,
    phase: savedJob.phase,
    progress: Number(savedJob.progress || 3),
    cached: false,
    bundle,
  };
}

export async function handleNotesStatus(body: Record<string, unknown>, req: ApiRequest) {
  const { video } = await verifyUserAndCatalogVideo(req, body.videoId);
  const modeKey = sanitizeModeKey(body.modeKey);

  const db = getSupabaseAdminClient();
  const { data: job, error } = await db
    .from('lecture_jobs')
    .select('*')
    .eq('video_id', video.video_id)
    .eq('mode_key', modeKey)
    .maybeSingle();

  if (error) {
    throw new ApiError(502, `Job status lookup failed: ${error.message}`);
  }
  if (!job) {
    throw new ApiError(404, 'Is video ke liye koi active notes job nahi mila.');
  }

  // Auto-heal stalled jobs whose lease expired (or stuck queued > 4s)
  if (job.status === 'queued' || job.status === 'running') {
    const updatedMs = new Date(job.updated_at || 0).getTime();
    const leaseMs = job.lease_until ? new Date(job.lease_until).getTime() : 0;
    const isStaleQueued = job.status === 'queued' && Date.now() - updatedMs > 4000;
    const isExpiredLease = job.status === 'running' && leaseMs < Date.now() - 5000;
    if (isStaleQueued || isExpiredLease) {
      await dispatchWorkerAsync(video.video_id, modeKey, req);
    }
  }

  const bundle = await assembleBundleFromDb(
    video.video_id,
    modeKey,
    job.video_title || video.title || 'Lecture',
    job.lang_profile
  );

  return {
    jobId: job.id,
    status: job.status,
    phase: job.phase,
    progress: Number(job.progress || 0),
    completedChunks: Number(job.completed_chunks || 0),
    totalChunks: Number(job.total_chunks || 0),
    completedChapters: Number(job.completed_chapters || 0),
    totalChapters: Number(job.total_chapters || 0),
    errorStatus: job.error_status ?? null,
    error: job.error_message || null,
    bundle,
  };
}

async function runBoundedPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, idx: number) => Promise<void>,
  shouldStop: () => boolean
) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (!shouldStop()) {
      const idx = cursor++;
      if (idx >= items.length) return;
      await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
}

async function uploadSvgToStorage(
  videoId: string,
  modeKey: string,
  visualId: string,
  svgContent: string
): Promise<string> {
  const db = getSupabaseAdminClient();
  const objectPath = `${videoId}/${modeKey}/${visualId}.svg`;
  const bytes = Buffer.from(svgContent, 'utf8');

  const { error: uploadErr } = await db.storage.from(STORAGE_BUCKET).upload(objectPath, bytes, {
    contentType: 'image/svg+xml; charset=utf-8',
    cacheControl: 'public, max-age=31536000',
    upsert: true,
  });

  if (uploadErr) {
    throw new Error(`Storage upload failed: ${uploadErr.message}`);
  }

  const { data } = db.storage.from(STORAGE_BUCKET).getPublicUrl(objectPath);
  if (!data?.publicUrl) {
    throw new Error('Could not resolve public URL for uploaded visual.');
  }
  return data.publicUrl;
}

export async function handleNotesWork(body: Record<string, unknown>, req: ApiRequest) {
  if (!verifyWorkerSecretHeader(req)) {
    throw new ApiError(401, 'Unauthorized worker invocation.');
  }
  const videoId = typeof body.videoId === 'string' ? body.videoId.trim() : '';
  const modeKey = sanitizeModeKey(body.modeKey);
  if (!videoId) {
    throw new ApiError(400, 'videoId is required.');
  }
  return executeNotesWorker({ videoId, modeKey, req });
}

export async function executeNotesWorker(params: {
  videoId: string;
  modeKey: string;
  req?: ApiRequest;
}) {
  const { videoId, modeKey, req } = params;
  const db = getSupabaseAdminClient();
  const workerStartedAt = Date.now();
  const budgetExceeded = () => Date.now() - workerStartedAt >= WORKER_SAFE_BUDGET_MS;

  const { data: job, error: jobErr } = await db
    .from('lecture_jobs')
    .select('*')
    .eq('video_id', videoId)
    .eq('mode_key', modeKey)
    .maybeSingle();

  if (jobErr || !job) {
    return { ok: false, reason: 'Job not found' };
  }
  if (job.status === 'completed') {
    return { ok: true, alreadyCompleted: true };
  }

  const nowMs = Date.now();
  const activeLeaseMs = job.lease_until ? new Date(job.lease_until).getTime() : 0;
  if (job.status === 'running' && activeLeaseMs > nowMs) {
    return { ok: true, leasedByAnotherWorker: true };
  }

  const nextAttempt = Number(job.attempts || 0) + 1;
  const refreshLease = async (extra: Record<string, unknown> = {}) => {
    await db
      .from('lecture_jobs')
      .update({
        ...extra,
        lease_until: new Date(Date.now() + LEASE_MS).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);
  };

  await refreshLease({
    status: 'running',
    attempts: nextAttempt,
    error_status: null,
    error_message: null,
  });

  try {
    const durationSec = clamp(Number(job.duration_sec || 600), 120, 28800);
    const title = String(job.video_title || 'Lecture');
    const allChunks = makeChunks(durationSec);

    /* ---------- STAGE 1: DIGESTS (parallel, chunk-by-chunk persistence) ---------- */
    const { data: existingDigests } = await db
      .from('lecture_digests')
      .select('start_sec, end_sec, digest')
      .eq('video_id', videoId)
      .eq('mode_key', modeKey)
      .order('start_sec', { ascending: true });

    const digestMap = new Map<string, any>();
    for (const row of existingDigests || []) {
      digestMap.set(`${row.start_sec}-${row.end_sec}`, row.digest);
    }

    const missingChunks = allChunks.filter((c) => !digestMap.has(`${c.start}-${c.end}`));

    if (missingChunks.length > 0) {
      await refreshLease({ phase: 'digest', total_chunks: allChunks.length, completed_chunks: digestMap.size });

      const digestErrors: ApiError[] = [];
      let shouldYieldForHandoff = false;

      await runBoundedPool(
        missingChunks,
        WORKER_CONCURRENCY,
        async (chunk) => {
          if (budgetExceeded()) {
            shouldYieldForHandoff = true;
            return;
          }
          if (digestErrors.some((e) => e.status === 422 || e.status === 503 || e.status === 401)) {
            return;
          }
          const isFirst = chunk.start === 0;
          try {
            const digest = await handleDigest({
              videoId,
              start: chunk.start,
              end: chunk.end,
              title,
              withMeta: isFirst,
            });
            digestMap.set(`${chunk.start}-${chunk.end}`, digest);
            await db.from('lecture_digests').upsert(
              {
                video_id: videoId,
                mode_key: modeKey,
                start_sec: chunk.start,
                end_sec: chunk.end,
                digest,
                source: digest.source || 'youtube_video',
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'video_id,mode_key,start_sec,end_sec' }
            );
            const pct = clamp(Math.round(5 + (digestMap.size / allChunks.length) * 45), 5, 50);
            await refreshLease({ completed_chunks: digestMap.size, progress: pct });
          } catch (err) {
            const apiErr =
              err instanceof ApiError
                ? err
                : new ApiError(502, sanitizePublicMessage((err as Error)?.message, 'Chunk digest failed.'));
            digestErrors.push(apiErr);
          }
        },
        () => budgetExceeded()
      );

      // Save state and trigger self-continuation if wall-clock budget ran out cleanly
      if (shouldYieldForHandoff || (digestMap.size < allChunks.length && budgetExceeded())) {
        await db
          .from('lecture_jobs')
          .update({
            status: 'queued',
            phase: 'digest',
            lease_until: null,
            completed_chunks: digestMap.size,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);
        await dispatchWorkerAsync(videoId, modeKey, req);
        return { ok: true, continuing: true, phase: 'digest' };
      }

      // If no chunks succeeded at all, fail job cleanly with exact upstream status & safe message
      if (digestMap.size === 0 && digestErrors.length > 0) {
        throw digestErrors[0];
      }
      // If some chunks failed fatally (e.g. key invalid 502/503 or unavailable video 422), fail cleanly while keeping completed chunks
      if (digestMap.size < allChunks.length && digestErrors.length > 0) {
        throw digestErrors[0];
      }
    }

    const orderedDigests = allChunks
      .map((c) => digestMap.get(`${c.start}-${c.end}`))
      .filter(Boolean);

    const allSegs: Segment[] = orderedDigests
      .flatMap((d) => (Array.isArray(d?.segments) ? (d.segments as Segment[]) : []))
      .sort((a, b) => a.t - b.t);
    const allBoard: BoardItem[] = orderedDigests.flatMap((d) =>
      Array.isArray(d?.board) ? (d.board as BoardItem[]) : []
    );

    if (allSegs.length === 0) {
      throw new ApiError(422, 'Is video se notes content extract nahi ho paya.');
    }

    const selectedBoard = selectBoardVisuals(allBoard, 8);
    const firstMeta: LangMeta =
      orderedDigests.find((d) => d?.meta)?.meta ?? DEFAULT_META;
    const langProfile: LangProfile =
      (job.lang_profile as LangProfile) || resolveLangFromMeta(firstMeta);

    /* ---------- STAGE 2: OUTLINE ---------- */
    let outline: Chapter[] = Array.isArray(job.outline) ? (job.outline as Chapter[]) : [];
    if (outline.length === 0) {
      await refreshLease({ phase: 'outline', progress: 52, lang_profile: langProfile });
      const outlineRes = await handleOutline({
        segments: allSegs.slice(0, 250).map((s) => ({ t: s.t, title: s.title })),
        durationSec,
        lang: langProfile,
      });
      outline = outlineRes.chapters;
      await refreshLease({
        phase: 'chapters',
        progress: 56,
        outline,
        lang_profile: langProfile,
        total_chapters: outline.length,
      });
    }

    if (budgetExceeded()) {
      await db
        .from('lecture_jobs')
        .update({ status: 'queued', phase: 'chapters', lease_until: null, updated_at: new Date().toISOString() })
        .eq('id', job.id);
      await dispatchWorkerAsync(videoId, modeKey, req);
      return { ok: true, continuing: true, phase: 'outline' };
    }

    /* ---------- STAGE 3: CHAPTER NOTES + MCQs + VISUALS IN PARALLEL ---------- */
    const [{ data: existingChaps }, { data: existingVis }] = await Promise.all([
      db
        .from('lecture_chapters')
        .select('chapter_index')
        .eq('video_id', videoId)
        .eq('mode_key', modeKey),
      db
        .from('lecture_visuals')
        .select('visual_id')
        .eq('video_id', videoId)
        .eq('mode_key', modeKey),
    ]);

    const doneChapSet = new Set((existingChaps || []).map((r) => Number(r.chapter_index)));
    const doneVisSet = new Set((existingVis || []).map((r) => String(r.visual_id)));

    type WorkUnit =
      | { kind: 'chapter'; idx: number; ch: Chapter }
      | { kind: 'visual'; item: BoardItem };

    const workQueue: WorkUnit[] = [];
    outline.forEach((ch, idx) => {
      if (!doneChapSet.has(idx)) {
        workQueue.push({ kind: 'chapter', idx, ch });
      }
    });
    selectedBoard.forEach((item) => {
      if (!doneVisSet.has(item.id)) {
        workQueue.push({ kind: 'visual', item });
      }
    });

    const totalWorkUnits = outline.length + selectedBoard.length;
    const chapterErrors: ApiError[] = [];
    let yielded = false;

    if (workQueue.length > 0) {
      await runBoundedPool(
        workQueue,
        WORKER_CONCURRENCY,
        async (unit) => {
          if (budgetExceeded()) {
            yielded = true;
            return;
          }

          if (unit.kind === 'chapter') {
            try {
              const res = await handleChapter({
                chapter: unit.ch,
                segments: allSegs.filter((s) => s.t >= unit.ch.start_sec && s.t < unit.ch.end_sec),
                lang: langProfile,
              });
              const chBoard = selectedBoard.filter(
                (b) =>
                  b.best_t >= unit.ch.start_sec &&
                  b.best_t < unit.ch.end_sec + (unit.idx === outline.length - 1 ? 1 : 0)
              );
              await db.from('lecture_chapters').upsert(
                {
                  video_id: videoId,
                  mode_key: modeKey,
                  chapter_index: unit.idx,
                  start_sec: unit.ch.start_sec,
                  end_sec: unit.ch.end_sec,
                  title: unit.ch.title,
                  notes: res.notes,
                  mcqs: res.mcqs,
                  board_visuals: chBoard,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'video_id,mode_key,chapter_index' }
              );
              doneChapSet.add(unit.idx);
              const doneCount = doneChapSet.size + doneVisSet.size;
              const pct = clamp(Math.round(56 + (doneCount / Math.max(1, totalWorkUnits)) * 42), 56, 98);
              await refreshLease({
                completed_chapters: doneChapSet.size,
                total_chapters: outline.length,
                progress: pct,
              });
            } catch (err) {
              chapterErrors.push(
                err instanceof ApiError
                  ? err
                  : new ApiError(502, sanitizePublicMessage((err as Error)?.message, 'Chapter generation failed.'))
              );
            }
          } else {
            // Visual diagram generation -> upload SVG to Supabase Storage -> save URL only in lecture_visuals
            try {
              const nearbySegs = allSegs
                .filter((s) => s.t >= unit.item.t - 35 && s.t <= unit.item.best_t + 35)
                .slice(0, 3)
                .map((s) => `${s.title}: ${s.summary}`)
                .join('\n')
                .slice(0, 900);

              const visRes = await handleVisual({
                videoId,
                item: { ...unit.item, transcriptSnippet: nearbySegs },
                lang: langProfile,
              });

              if (visRes && 'kind' in visRes && visRes.content) {
                const safeSvg = sanitizeSvg(visRes.content);
                if (safeSvg) {
                  const publicUrl = await uploadSvgToStorage(videoId, modeKey, unit.item.id, safeSvg);
                  await db.from('lecture_visuals').upsert(
                    {
                      video_id: videoId,
                      mode_key: modeKey,
                      visual_id: unit.item.id,
                      status: 'done',
                      kind: 'svg',
                      image_url: publicUrl,
                      caption: String(visRes.caption || unit.item.description || ''),
                      updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'video_id,mode_key,visual_id' }
                  );
                  doneVisSet.add(unit.item.id);
                  return;
                }
              }

              await db.from('lecture_visuals').upsert(
                {
                  video_id: videoId,
                  mode_key: modeKey,
                  visual_id: unit.item.id,
                  status: 'skipped',
                  kind: 'skip',
                  image_url: null,
                  caption: null,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'video_id,mode_key,visual_id' }
              );
              doneVisSet.add(unit.item.id);
            } catch {
              // Individual diagram failure does not block chapter notes
            }
          }
        },
        () => budgetExceeded()
      );

      if (yielded || (doneChapSet.size < outline.length && budgetExceeded())) {
        await db
          .from('lecture_jobs')
          .update({
            status: 'queued',
            phase: 'chapters',
            lease_until: null,
            completed_chapters: doneChapSet.size,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);
        await dispatchWorkerAsync(videoId, modeKey, req);
        return { ok: true, continuing: true, phase: 'chapters' };
      }

      if (doneChapSet.size === 0 && chapterErrors.length > 0) {
        throw chapterErrors[0];
      }
    }

    await db
      .from('lecture_jobs')
      .update({
        status: 'completed',
        phase: 'completed',
        progress: 100,
        completed_chapters: doneChapSet.size,
        total_chapters: outline.length,
        lease_until: null,
        error_status: null,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    return { ok: true, status: 'completed' };
  } catch (err: unknown) {
    const apiErr =
      err instanceof ApiError
        ? err
        : new ApiError(502, sanitizePublicMessage((err as Error)?.message, 'Notes generation failed.'));

    await db
      .from('lecture_jobs')
      .update({
        status: 'failed',
        phase: 'failed',
        lease_until: null,
        error_status: apiErr.status,
        error_message: sanitizePublicMessage(apiErr.message),
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    return { ok: false, status: 'failed', errorStatus: apiErr.status, error: apiErr.message };
  }
}

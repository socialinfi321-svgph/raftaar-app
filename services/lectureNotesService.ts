export type Medium = 'english' | 'hindi' | 'hinglish';

export interface LangMeta {
  detected_medium: Medium;
  detected_subject: string;
  detected_board: string;
}

export interface LangProfile {
  medium: Medium;
  pureEnglish: boolean;
  subject: string;
  board: string;
  key: string;
}

export interface UILabels {
  mind: string;
  def: string;
  intu: string;
  ex: string;
  imp: string;
  terms: string;
  rev: string;
}

export interface Segment {
  t: number;
  title: string;
  summary: string;
  definition?: string;
  intuition?: string;
  examples?: string[];
  formulas?: string[];
  important?: string;
}

export interface BoardItem {
  id: string;
  t: number;
  best_t: number;
  title: string;
  kind: string;
  description: string;
  importance: number;
}

export interface ChunkDigest {
  segments: Segment[];
  board: BoardItem[];
  meta?: LangMeta;
  source?: 'transcript' | 'youtube_video';
}

export interface Chapter {
  title: string;
  start_sec: number;
  end_sec: number;
}

export interface NoteSection {
  heading: string;
  start_sec: number;
  definition?: string;
  intuition?: string;
  points: string[];
  examples?: string[];
  formulas?: string[];
  exam_tip?: string;
}

export interface Term {
  term: string;
  meaning: string;
}

export interface MindMapData {
  center: string;
  branches: { label: string; children: string[] }[];
}

export interface ChapterContent {
  intro?: string;
  sections: NoteSection[];
  terms: Term[];
  important_points: string[];
  quick_revision: string[];
  mindmap?: MindMapData;
}

export interface ChapterNotes extends ChapterContent, Chapter {
  board_visuals: BoardItem[];
}

export interface MCQ {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  timestamp_seconds: number;
  chapter: string;
}

export interface GeneratedVisual {
  kind: 'img' | 'svg';
  content: string;
  caption: string;
}

export type CachedVisual = GeneratedVisual | { skip: true };

export interface LectureNotesBundle {
  videoId: string;
  title: string;
  updatedAt: number;
  lang: LangProfile;
  chapters: ChapterNotes[];
  mcqs: MCQ[];
  visuals: Record<string, GeneratedVisual>;
  pipelineVersion?: string;
}

export interface GenerationProgress {
  percent: number;
  etaSeconds: number;
}

export const PIPELINE_CONFIG = {
  CHUNK_SEC: 600,
  MIN_CHUNK_SEC: 150,
  MAX_SPLIT_DEPTH: 2, // 600s -> 300s -> 150s
  MAX_RETRIES: 2,
  CONCURRENCY: 2,
  CHAPTER_CONCURRENCY: 2,
  IMAGE_CONCURRENCY: 2,
  MAX_VISUALS: 8,
  CACHE_V: 'raftaar:v9',
  SCHEMA_V: 's2',
  MAX_SVG_BYTES: 128 * 1024,
} as const;

const STORAGE_PREFIX = 'raftaar_ai_notes_';
const ANSWERS_PREFIX = 'raftaar_ai_mcq_ans_';
const INDEX_KEY = 'raftaar_ai_notes_index';
const MAX_LOCAL_VIDEOS = 8;

const DEFAULT_META: LangMeta = {
  detected_medium: 'hinglish',
  detected_subject: 'General',
  detected_board: 'Unknown',
};

export const UI_LABELS: Record<Medium, UILabels> = {
  english: {
    mind: 'Mind Map',
    def: 'Definition',
    intu: 'Understand it like this',
    ex: 'Example',
    imp: 'Teacher said: Remember this!',
    terms: 'Keywords',
    rev: 'Quick Revision',
  },
  hindi: {
    mind: 'माइंड मैप',
    def: 'परिभाषा',
    intu: 'ऐसे समझो',
    ex: 'उदाहरण',
    imp: 'शिक्षक ने कहा: याद रखो!',
    terms: 'मुख्य शब्द',
    rev: 'त्वरित दोहराव',
  },
  hinglish: {
    mind: 'Mind Map',
    def: 'Definition',
    intu: 'Aise samjho',
    ex: 'Example',
    imp: 'Teacher ne bola: Yaad rakho!',
    terms: 'Keywords',
    rev: 'Quick Revision',
  },
};

export class ApiHttpError extends Error {
  readonly status: number;
  readonly retryAfterSec?: number;

  constructor(status: number, message: string, retryAfterSec?: number) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = status;
    this.retryAfterSec = retryAfterSec;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? h + ':' : ''}${mm}:${String(r).padStart(2, '0')}`;
}

export function fmtEta(sec: number): string {
  const s = Math.max(1, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function parseDurationToSeconds(durationStr?: string, durationSeconds?: number): number {
  if (typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds > 30) {
    return Math.round(durationSeconds);
  }
  if (durationStr) {
    const parts = durationStr
      .trim()
      .split(':')
      .map((p) => parseInt(p, 10));
    if (parts.every((n) => !Number.isNaN(n))) {
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 1 && parts[0] > 0) return parts[0];
    }
  }
  return 0;
}

export function sectionIndexFor(ch: ChapterNotes, b: BoardItem): number {
  if (!ch.sections.length) return -1;
  let idx = 0;
  ch.sections.forEach((s, i) => {
    if (s.start_sec <= b.best_t + 5) idx = i;
  });
  return idx;
}

export function sanitizeSvgForImg(raw: string): string | null {
  let clean = (raw || '')
    .replace(/```svg|```html|```xml|```/gi, '')
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?>[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>[\s\S]*?<\/embed>/gi, '')
    .replace(/<embed[^>]*\/?>/gi, '')
    .replace(/<image[\s\S]*?>[\s\S]*?<\/image>/gi, '')
    .replace(/<image[^>]*\/?>/gi, '')
    .replace(/<feImage[\s\S]*?>[\s\S]*?<\/feImage>/gi, '')
    .replace(/<feImage[^>]*\/?>/gi, '')
    .replace(/<style[\s\S]*?>([\s\S]*?)<\/style>/gi, (_m, css) => {
      if (/@import|expression\s*\(|javascript:|url\s*\(\s*["']?\s*(?:https?:|data:|javascript:)/i.test(css)) {
        return '';
      }
      return `<style>${css}</style>`;
    })
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(?:href|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi, (m, dq, sq) => {
      const val = String(dq ?? sq ?? '').trim();
      if (val.startsWith('#')) return m;
      return '';
    })
    .trim();

  const match = clean.match(/<svg[\s\S]*<\/svg>/i);
  if (!match) return null;
  let svg = match[0];

  if (new Blob([svg]).size > PIPELINE_CONFIG.MAX_SVG_BYTES) {
    return null;
  }
  if (!/\bxmlns=/.test(svg)) {
    svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/* ---------------- LocalStorage Bundle Cache ---------------- */
export function getCachedLectureBundle(videoId: string): LectureNotesBundle | null {
  if (!videoId) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${videoId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LectureNotesBundle;
    if (
      parsed &&
      parsed.videoId === videoId &&
      parsed.pipelineVersion === `${PIPELINE_CONFIG.CACHE_V}:${PIPELINE_CONFIG.SCHEMA_V}` &&
      (parsed.chapters?.length > 0 || parsed.mcqs?.length > 0)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveLectureBundleToLocalStorage(bundle: LectureNotesBundle): void {
  const taggedBundle: LectureNotesBundle = {
    ...bundle,
    pipelineVersion: `${PIPELINE_CONFIG.CACHE_V}:${PIPELINE_CONFIG.SCHEMA_V}`,
  };
  try {
    const indexRaw = localStorage.getItem(INDEX_KEY);
    let idx: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    idx = [taggedBundle.videoId, ...idx.filter((id) => id !== taggedBundle.videoId)];

    while (idx.length > MAX_LOCAL_VIDEOS) {
      const oldest = idx.pop();
      if (oldest) {
        try {
          localStorage.removeItem(`${STORAGE_PREFIX}${oldest}`);
        } catch {}
      }
    }

    const serialized = JSON.stringify(taggedBundle);
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${taggedBundle.videoId}`, serialized);
      localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
    } catch {
      while (idx.length > 1) {
        const oldest = idx.pop();
        if (oldest && oldest !== taggedBundle.videoId) {
          try {
            localStorage.removeItem(`${STORAGE_PREFIX}${oldest}`);
          } catch {}
        }
      }
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${taggedBundle.videoId}`, serialized);
        localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
      } catch {
        const slim: LectureNotesBundle = { ...taggedBundle, visuals: {} };
        try {
          localStorage.setItem(`${STORAGE_PREFIX}${taggedBundle.videoId}`, JSON.stringify(slim));
          localStorage.setItem(INDEX_KEY, JSON.stringify([taggedBundle.videoId]));
        } catch {}
      }
    }
  } catch {}
}

export function getSavedMcqAnswers(videoId: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(`${ANSWERS_PREFIX}${videoId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveMcqAnswers(videoId: string, answers: Record<string, number>): void {
  try {
    localStorage.setItem(`${ANSWERS_PREFIX}${videoId}`, JSON.stringify(answers));
  } catch {}
}

/* ---------------- IndexedDB Intermediate Chunk Cache (Resumable + Versioned) ---------------- */
function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    if (!hasIndexedDb()) {
      rej(new Error('IndexedDB unavailable'));
      return;
    }
    const r = indexedDB.open('raftaar-cache', 2);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains('kv')) {
        r.result.createObjectStore('kv');
      }
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function cget<T>(k: string): Promise<T | null> {
  try {
    const db = await idbOpen();
    return await new Promise<T | null>((res) => {
      const q = db.transaction('kv').objectStore('kv').get(k);
      q.onsuccess = () => res((q.result as T) ?? null);
      q.onerror = () => res(null);
    });
  } catch {
    return null;
  }
}

async function cset(k: string, v: unknown): Promise<void> {
  try {
    const db = await idbOpen();
    await new Promise<void>((res) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(v, k);
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch {}
}

let legacyCleaned = false;
async function cleanupLegacyCacheEntries(): Promise<void> {
  if (legacyCleaned || !hasIndexedDb()) return;
  legacyCleaned = true;
  try {
    const db = await idbOpen();
    await new Promise<void>((res) => {
      const tx = db.transaction('kv', 'readwrite');
      const store = tx.objectStore('kv');
      const req = store.openKeyCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) return;
        const keyStr = String(cursor.key || '');
        if (keyStr.startsWith('raftaar:v7:') || keyStr.startsWith('raftaar:v8:')) {
          store.delete(cursor.key);
        }
        cursor.continue();
      };
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch {}
}

export async function clearLectureCache(videoId?: string): Promise<void> {
  try {
    if (videoId) {
      localStorage.removeItem(`${STORAGE_PREFIX}${videoId}`);
      localStorage.removeItem(`${ANSWERS_PREFIX}${videoId}`);
    }
  } catch {}
  if (!hasIndexedDb()) return;
  try {
    const db = await idbOpen();
    await new Promise<void>((res) => {
      const tx = db.transaction('kv', 'readwrite');
      const store = tx.objectStore('kv');
      if (!videoId) {
        store.clear();
      } else {
        const req = store.openKeyCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) return;
          if (String(cursor.key || '').includes(`:${videoId}:`)) {
            store.delete(cursor.key);
          }
          cursor.continue();
        };
      }
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch {}
}

/* ---------------- Pipeline Helpers ---------------- */
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'general';
}

function resolveLang(meta: LangMeta): LangProfile {
  const subject = meta.detected_subject || 'General';
  const pureEnglish = /english/i.test(subject) && !/hindi/i.test(subject);
  const medium: Medium = pureEnglish ? 'english' : meta.detected_medium || 'hinglish';
  return {
    medium,
    pureEnglish,
    subject,
    board: meta.detected_board || 'Unknown',
    key: `${medium}:${slug(subject)}`,
  };
}

export function makeChunks(durationSec: number, chunkSec: number = PIPELINE_CONFIG.CHUNK_SEC): { start: number; end: number }[] {
  const safeDur = Math.max(60, Math.round(durationSec));
  const out: { start: number; end: number }[] = [];
  for (let s = 0; s < safeDur; s += chunkSec) {
    out.push({ start: s, end: Math.min(s + chunkSec, safeDur) });
  }
  return out;
}

function selectBoard(all: BoardItem[]): BoardItem[] {
  const sorted = [...all].sort((a, b) => a.best_t - b.best_t);
  const kept: BoardItem[] = [];
  const seenId = new Set<string>();
  for (const b of sorted) {
    const dup = kept.some(
      (k) => k.title.trim().toLowerCase() === b.title.trim().toLowerCase() && Math.abs(k.best_t - b.best_t) < 90
    );
    if (dup || seenId.has(b.id)) continue;
    seenId.add(b.id);
    kept.push(b);
  }
  return kept
    .filter((b) => b.importance >= 2)
    .sort((a, b) => b.importance - a.importance || a.best_t - b.best_t)
    .slice(0, PIPELINE_CONFIG.MAX_VISUALS)
    .sort((a, b) => a.best_t - b.best_t);
}

function tokenSet(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1)
  );
}

function isSimilar(a: Set<string>, b: Set<string>): boolean {
  if (!a.size || !b.size) return false;
  let inter = 0;
  a.forEach((w) => {
    if (b.has(w)) inter++;
  });
  return inter / (a.size + b.size - inter) > 0.72;
}

export function dedupeMcqs(chapterMcqs: MCQ[][]): MCQ[] {
  const out: MCQ[] = [];
  const sets: Set<string>[] = [];
  for (const list of chapterMcqs) {
    for (const q of list || []) {
      const ts = tokenSet(q.question);
      if (sets.some((s) => isSimilar(s, ts))) continue;
      sets.push(ts);
      out.push(q);
    }
  }
  return out;
}

async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T, i: number) => Promise<void>,
  signal?: AbortSignal
) {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (!signal?.aborted) {
      const i = next++;
      if (i >= items.length) return;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}

let rateLimitPauseUntil = 0;

async function waitForSharedCooldown(signal?: AbortSignal): Promise<void> {
  const remaining = rateLimitPauseUntil - Date.now();
  if (remaining <= 0) return;
  const waitMs = Math.min(8000, remaining);
  if (signal?.aborted) throw new Error('CANCELLED');
  await sleep(waitMs);
  if (signal?.aborted) throw new Error('CANCELLED');
}

function isFatalConfigurationOrContentError(err: unknown): boolean {
  if (err instanceof ApiHttpError) {
    if (err.status === 400 || err.status === 404 || err.status === 422 || err.status === 503) {
      return true;
    }
    if (err.status === 502 && /API key valid nahi|permission nahi/i.test(err.message)) {
      return true;
    }
  }
  return false;
}

function isSplitEligibleError(err: unknown): boolean {
  if (isFatalConfigurationOrContentError(err)) return false;
  if (err instanceof ApiHttpError) {
    return err.status === 504 || err.status === 502 || err.status === 500 || err.status === 429;
  }
  return true; // Network/timeout failures can succeed when chunk window is smaller
}

async function postApi<T>(endpoint: string, body: unknown, signal?: AbortSignal): Promise<T> {
  await waitForSharedCooldown(signal);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const rawText = await res.text().catch(() => '');
  let json: any = {};
  if (rawText) {
    try {
      json = JSON.parse(rawText);
    } catch {
      json = {};
    }
  }
  if (!res.ok) {
    const retryAfterHdr = Number(res.headers.get('Retry-After'));
    const retryAfterSec =
      Number.isFinite(retryAfterHdr) && retryAfterHdr > 0 ? retryAfterHdr : undefined;
    if (res.status === 429) {
      const pauseMs = Math.max(2000, (retryAfterSec || 4) * 1000);
      rateLimitPauseUntil = Math.max(rateLimitPauseUntil, Date.now() + pauseMs);
    }
    const msg =
      json?.error ||
      (res.status === 404
        ? 'AI notes endpoint not found (404). Please verify API deployment.'
        : `Request failed (${res.status})`);
    throw new ApiHttpError(res.status, msg, retryAfterSec);
  }
  if (!rawText || typeof json !== 'object' || json === null) {
    throw new ApiHttpError(502, 'Invalid response received from AI server.');
  }
  return json as T;
}

async function postWithBackoff<T>(
  endpoint: string,
  body: unknown,
  signal?: AbortSignal,
  maxRetries: number = PIPELINE_CONFIG.MAX_RETRIES
): Promise<T> {
  const backoffs = [1500, 3500];
  let lastErr: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) throw new Error('CANCELLED');
    try {
      return await postApi<T>(endpoint, body, signal);
    } catch (err: any) {
      if (signal?.aborted || err?.name === 'AbortError' || err?.message === 'CANCELLED') {
        throw new Error('CANCELLED');
      }
      lastErr = err;
      if (isFatalConfigurationOrContentError(err) || attempt >= maxRetries) {
        throw err;
      }
      const retrySec = err instanceof ApiHttpError && err.retryAfterSec ? err.retryAfterSec * 1000 : 0;
      const delayMs = Math.max(retrySec, backoffs[attempt] || 3500) + Math.round(Math.random() * 500);
      if (err instanceof ApiHttpError && err.status === 429) {
        rateLimitPauseUntil = Math.max(rateLimitPauseUntil, Date.now() + delayMs);
      }
      await sleep(delayMs);
    }
  }
  throw lastErr;
}

export async function fetchChunkWithSplitAndRetry(params: {
  videoId: string;
  title: string;
  start: number;
  end: number;
  withMeta: boolean;
  cacheBase: string;
  signal?: AbortSignal;
  fetcher?: (body: Record<string, unknown>, signal?: AbortSignal) => Promise<ChunkDigest>;
  cacheGet?: <T>(key: string) => Promise<T | null>;
  cacheSet?: (key: string, val: unknown) => Promise<void>;
  depth?: number;
}): Promise<ChunkDigest> {
  const {
    videoId,
    title,
    start,
    end,
    withMeta,
    cacheBase,
    signal,
    depth = 0,
  } = params;
  const cacheGet = params.cacheGet ?? cget;
  const cacheSet = params.cacheSet ?? cset;
  const runFetch =
    params.fetcher ??
    ((body: Record<string, unknown>, sig?: AbortSignal) =>
      postWithBackoff<ChunkDigest>('/api/ai-notes/digest', body, sig));

  if (signal?.aborted) throw new Error('CANCELLED');

  const key = `${cacheBase}:dig:${start}-${end}`;
  const hit = await cacheGet<ChunkDigest>(key);
  if (hit && Array.isArray(hit.segments) && hit.segments.length > 0) {
    return hit;
  }

  try {
    const result = await runFetch({ videoId, start, end, title, withMeta }, signal);
    if (Array.isArray(result?.segments) && result.segments.length > 0) {
      await cacheSet(key, result);
      return result;
    }
    throw new ApiHttpError(502, 'Empty lecture chunk digest returned.');
  } catch (err: any) {
    if (signal?.aborted || err?.name === 'AbortError' || err?.message === 'CANCELLED') {
      throw new Error('CANCELLED');
    }

    const span = end - start;
    const canSplit =
      depth < PIPELINE_CONFIG.MAX_SPLIT_DEPTH &&
      span >= PIPELINE_CONFIG.MIN_CHUNK_SEC * 2 &&
      isSplitEligibleError(err);

    if (!canSplit) {
      throw err;
    }

    // Client-side chunk splitting fallback: 600s -> 300s -> 150s
    const mid = start + Math.floor(span / 2);
    const left = await fetchChunkWithSplitAndRetry({
      ...params,
      start,
      end: mid,
      withMeta,
      depth: depth + 1,
    });
    const right = await fetchChunkWithSplitAndRetry({
      ...params,
      start: mid,
      end,
      withMeta: false,
      depth: depth + 1,
    });

    return {
      meta: left.meta,
      segments: [...left.segments, ...right.segments].sort((a, b) => a.t - b.t),
      board: [...left.board, ...right.board],
      source: left.source || right.source,
    };
  }
}

/* ---------------- Main Auto Pipeline ---------------- */
export async function generateLectureNotesAndMcqs(params: {
  videoId: string;
  title: string;
  durationSec: number;
  signal?: AbortSignal;
  onProgress?: (progress: GenerationProgress) => void;
  onPartialUpdate?: (bundle: LectureNotesBundle) => void;
}): Promise<LectureNotesBundle> {
  const { videoId, title, signal, onProgress, onPartialUpdate } = params;
  const durationSec = Math.max(120, Math.round(params.durationSec || 600));
  const base = `${PIPELINE_CONFIG.CACHE_V}:${PIPELINE_CONFIG.SCHEMA_V}:${videoId}:${PIPELINE_CONFIG.CHUNK_SEC}`;
  const chunks = makeChunks(durationSec, PIPELINE_CONFIG.CHUNK_SEC);

  void cleanupLegacyCacheEntries();

  const estChapters = Math.max(2, Math.min(12, Math.ceil(durationSec / 720)));
  const initialAnalyzeSec = Math.ceil(chunks.length / PIPELINE_CONFIG.CONCURRENCY) * 22;
  const initialOutlineSec = 7;
  const initialChapterSec = Math.ceil(estChapters / PIPELINE_CONFIG.CHAPTER_CONCURRENCY) * 14;
  const initialVisualSec = 10;
  let totalEstSec = initialAnalyzeSec + initialOutlineSec + initialChapterSec + initialVisualSec;
  const startedAt = Date.now();

  const report = (pct: number, remainingHintSec?: number) => {
    const clampedPct = Math.max(1, Math.min(99, Math.round(pct)));
    const elapsed = (Date.now() - startedAt) / 1000;
    const computedEta =
      typeof remainingHintSec === 'number'
        ? Math.max(2, Math.round(remainingHintSec))
        : Math.max(2, Math.round(totalEstSec - elapsed));
    onProgress?.({ percent: clampedPct, etaSeconds: computedEta });
  };

  report(3, totalEstSec);

  /* ---- 1. ANALYZE CHUNKS (Concurrency-2 + Backoff + Client Splitting) ---- */
  const digests: (ChunkDigest | undefined)[] = new Array(chunks.length);
  const failures: Error[] = [];
  let fatalAbortErr: Error | null = null;
  let chunksCompleted = 0;

  await runPool(
    chunks,
    PIPELINE_CONFIG.CONCURRENCY,
    async (c, i) => {
      if (signal?.aborted || fatalAbortErr) return;
      try {
        digests[i] = await fetchChunkWithSplitAndRetry({
          videoId,
          title,
          start: c.start,
          end: c.end,
          withMeta: i === 0,
          cacheBase: base,
          signal,
        });
      } catch (e: any) {
        if (signal?.aborted || e?.name === 'AbortError' || e?.message === 'CANCELLED') {
          throw new Error('CANCELLED');
        }
        const errObj = e instanceof Error ? e : new Error(String(e || 'Chunk failed'));
        failures.push(errObj);
        if (isFatalConfigurationOrContentError(errObj)) {
          fatalAbortErr = errObj;
        }
      } finally {
        chunksCompleted++;
        const frac = chunksCompleted / chunks.length;
        const remChunks = chunks.length - chunksCompleted;
        const remSec =
          Math.ceil(remChunks / PIPELINE_CONFIG.CONCURRENCY) * 20 +
          initialOutlineSec +
          initialChapterSec +
          initialVisualSec;
        report(5 + frac * 45, remSec);
      }
    },
    signal
  );

  if (signal?.aborted) throw new Error('CANCELLED');
  if (fatalAbortErr && digests.every((d) => !d)) {
    throw fatalAbortErr;
  }
  if (failures.length === chunks.length) {
    throw failures[0] || new Error('Video analyze nahi ho paya.');
  }

  const allSegs = digests.flatMap((d) => d?.segments || []).sort((a, b) => a.t - b.t);
  const allBoard = digests.flatMap((d) => d?.board || []);
  if (allSegs.length === 0) {
    throw failures[0] || new Error('Is video se notes content detect nahi ho paya.');
  }

  const selectedBoard = selectBoard(allBoard);
  const firstMeta = digests.find((d) => d?.meta)?.meta ?? DEFAULT_META;
  const langP = resolveLang(firstMeta);

  /* ---- 2. OUTLINE ---- */
  report(52, initialOutlineSec + initialChapterSec + (selectedBoard.length ? initialVisualSec : 0));
  const outKey = `${base}:${langP.key}:outline:${durationSec}`;
  let outline = await cget<Chapter[]>(outKey);
  if (!outline || !Array.isArray(outline) || outline.length === 0) {
    const outlineSegments = allSegs.slice(0, 250).map((s) => ({ t: s.t, title: s.title }));
    const outRes = await postWithBackoff<{ chapters: Chapter[] }>(
      '/api/ai-notes/outline',
      { segments: outlineSegments, durationSec, lang: langP },
      signal
    );
    outline = outRes.chapters;
    if (Array.isArray(outline) && outline.length > 0) {
      await cset(outKey, outline);
    }
  }
  if (signal?.aborted) throw new Error('CANCELLED');
  if (!outline || outline.length === 0) {
    throw new Error('Lecture chapters outline nahi ban payi.');
  }

  /* ---- 3. NOTES + MCQs (Resumable per Chapter) ---- */
  const results: ({ notes: ChapterContent; mcqs: MCQ[] } | undefined)[] = new Array(outline.length);
  const visuals: Record<string, GeneratedVisual> = {};
  let chaptersDone = 0;

  const buildCurrentBundle = (): LectureNotesBundle => {
    const builtChapters: ChapterNotes[] = [];
    outline!.forEach((ch, i) => {
      const r = results[i];
      if (!r) return;
      builtChapters.push({
        ...ch,
        ...r.notes,
        board_visuals: selectedBoard.filter(
          (b) => b.best_t >= ch.start_sec && b.best_t < ch.end_sec + (i === outline!.length - 1 ? 1 : 0)
        ),
      });
    });
    return {
      videoId,
      title,
      updatedAt: Date.now(),
      lang: langP,
      chapters: builtChapters,
      mcqs: dedupeMcqs(results.map((r) => r?.mcqs || [])),
      visuals: { ...visuals },
      pipelineVersion: `${PIPELINE_CONFIG.CACHE_V}:${PIPELINE_CONFIG.SCHEMA_V}`,
    };
  };

  const chapterEtaBase = Math.ceil(outline.length / PIPELINE_CONFIG.CHAPTER_CONCURRENCY) * 14;
  const visualEtaBase = selectedBoard.length
    ? Math.ceil(selectedBoard.length / PIPELINE_CONFIG.IMAGE_CONCURRENCY) * 8
    : 0;
  totalEstSec = (Date.now() - startedAt) / 1000 + chapterEtaBase + visualEtaBase;
  report(56, chapterEtaBase + visualEtaBase);

  const chapterFailures: Error[] = [];
  await runPool(
    outline,
    PIPELINE_CONFIG.CHAPTER_CONCURRENCY,
    async (ch, i) => {
      if (signal?.aborted) throw new Error('CANCELLED');
      const key = `${base}:${langP.key}:ch:${ch.start_sec}-${ch.end_sec}`;
      let r = await cget<{ notes: ChapterContent; mcqs: MCQ[] }>(key);
      if (!r || !Array.isArray(r.notes?.sections) || r.notes.sections.length === 0) {
        const chapterSegments = allSegs.filter((s) => s.t >= ch.start_sec && s.t < ch.end_sec);
        try {
          r = await postWithBackoff<{ notes: ChapterContent; mcqs: MCQ[] }>(
            '/api/ai-notes/chapter',
            { chapter: ch, segments: chapterSegments, lang: langP },
            signal
          );
          if (r?.notes?.sections?.length) {
            await cset(key, r);
          }
        } catch (err: any) {
          if (signal?.aborted || err?.message === 'CANCELLED') throw new Error('CANCELLED');
          chapterFailures.push(err instanceof Error ? err : new Error(String(err || 'Chapter failed')));
          return;
        }
      }
      results[i] = r;
      chaptersDone++;
      const partial = buildCurrentBundle();
      onPartialUpdate?.(partial);
      const remCh = outline!.length - chaptersDone;
      const remSec = Math.ceil(remCh / PIPELINE_CONFIG.CHAPTER_CONCURRENCY) * 12 + visualEtaBase;
      report(56 + (chaptersDone / outline!.length) * 32, remSec);
    },
    signal
  );

  if (signal?.aborted) throw new Error('CANCELLED');
  if (chaptersDone === 0 && chapterFailures.length > 0) {
    throw chapterFailures[0];
  }

  /* ---- 4. BOARD VISUALS (Clip-aware plan + sanitized inline SVG) ---- */
  if (selectedBoard.length > 0) {
    let visDone = 0;
    await runPool(
      selectedBoard,
      PIPELINE_CONFIG.IMAGE_CONCURRENCY,
      async (item) => {
        if (signal?.aborted) throw new Error('CANCELLED');
        const key = `${base}:${langP.key}:vis:${item.id}`;
        try {
          const cached = await cget<CachedVisual>(key);
          if (cached) {
            if ('kind' in cached) {
              visuals[item.id] = cached;
            }
          } else {
            const nearbySegs = allSegs
              .filter((s) => s.t >= item.t - 35 && s.t <= item.best_t + 35)
              .slice(0, 3)
              .map((s) => `${s.title}: ${s.summary}`)
              .join('\n')
              .slice(0, 900);

            const visRes = await postWithBackoff<CachedVisual>(
              '/api/ai-notes/visual',
              {
                videoId,
                item: { ...item, transcriptSnippet: nearbySegs },
                lang: langP,
              },
              signal,
              1
            );
            await cset(key, visRes);
            if (visRes && 'kind' in visRes) {
              visuals[item.id] = visRes;
            }
          }
        } catch {
          // Graceful individual diagram skip without blocking lecture notes
        } finally {
          visDone++;
          const remV = selectedBoard.length - visDone;
          report(
            88 + (visDone / selectedBoard.length) * 11,
            Math.ceil(remV / PIPELINE_CONFIG.IMAGE_CONCURRENCY) * 7
          );
        }
      },
      signal
    );
  }

  if (signal?.aborted) throw new Error('CANCELLED');

  const finalBundle = buildCurrentBundle();
  saveLectureBundleToLocalStorage(finalBundle);
  onProgress?.({ percent: 100, etaSeconds: 0 });
  return finalBundle;
}

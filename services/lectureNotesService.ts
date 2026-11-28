import DOMPurify from 'dompurify';
import { supabase } from './supabase';

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
  content: string; // sanitized SVG markup or data URL or storage URL
  url?: string; // Supabase Storage URL when stored on server
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
  MAX_SPLIT_DEPTH: 2,
  MAX_RETRIES: 2,
  CONCURRENCY: 4,
  CHAPTER_CONCURRENCY: 4,
  IMAGE_CONCURRENCY: 4,
  MAX_VISUALS: 8,
  POLL_INTERVAL_MS: 2200,
  CACHE_V: 'raftaar:v10',
  SCHEMA_V: 's3',
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
  readonly rawMessage: string;
  readonly retryAfterSec?: number;

  constructor(status: number, message: string, retryAfterSec?: number) {
    const clean = message.replace(/^\[HTTP \d+\]\s*/i, '').trim();
    super(`[HTTP ${status}] ${clean}`);
    this.name = 'ApiHttpError';
    this.status = status;
    this.rawMessage = clean;
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

export function sanitizeSvgWithDomPurify(raw: string): string | null {
  const trimmed = (raw || '')
    .replace(/```svg|```html|```xml|```/gi, '')
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .trim();

  const svgMatch = trimmed.match(/<svg[\s\S]*<\/svg>/i);
  if (!svgMatch) return null;

  let cleanSvg = svgMatch[0];

  if (typeof window !== 'undefined' && typeof DOMPurify?.sanitize === 'function') {
    cleanSvg = DOMPurify.sanitize(cleanSvg, {
      USE_PROFILES: { svg: true, svgFilters: true },
      FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'object', 'embed', 'image', 'feImage'],
      FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onmouseenter'],
      ALLOW_DATA_ATTR: false,
    });
  } else {
    // Pure Node/SSR test fallback matching strict SVG rules
    cleanSvg = cleanSvg
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
      .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(?:href|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi, (m, dq, sq, uq) => {
        const val = String(dq ?? sq ?? uq ?? '').trim();
        return val.startsWith('#') ? m : '';
      });
  }

  // Enforce no external hrefs even after DOMPurify
  cleanSvg = cleanSvg
    .replace(/(?:href|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi, (m, dq, sq, uq) => {
      const val = String(dq ?? sq ?? uq ?? '').trim();
      return val.startsWith('#') ? m : '';
    })
    .trim();

  const finalMatch = cleanSvg.match(/<svg[\s\S]*<\/svg>/i);
  if (!finalMatch) return null;
  let finalSvg = finalMatch[0];

  const byteSize =
    typeof Blob !== 'undefined' ? new Blob([finalSvg]).size : Buffer.byteLength(finalSvg, 'utf8');
  if (byteSize > PIPELINE_CONFIG.MAX_SVG_BYTES) {
    return null;
  }

  if (!/\bxmlns=/.test(finalSvg)) {
    finalSvg = finalSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return finalSvg;
}

export function sanitizeSvgForImg(raw: string): string | null {
  if (!raw) return null;
  if (raw.startsWith('data:image/svg+xml')) {
    try {
      const comma = raw.indexOf(',');
      if (comma !== -1) {
        const decoded = decodeURIComponent(raw.slice(comma + 1));
        const clean = sanitizeSvgWithDomPurify(decoded);
        return clean ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(clean)}` : null;
      }
    } catch {
      return null;
    }
  }
  const clean = sanitizeSvgWithDomPurify(raw);
  return clean ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(clean)}` : null;
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

/* ---------------- IndexedDB Intermediate Cache ---------------- */
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

export function makeChunks(
  durationSec: number,
  chunkSec: number = PIPELINE_CONFIG.CHUNK_SEC
): { start: number; end: number }[] {
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
      (k) =>
        k.title.trim().toLowerCase() === b.title.trim().toLowerCase() &&
        Math.abs(k.best_t - b.best_t) < 90
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

async function getAuthToken(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) return token;
  } catch {}
  throw new ApiHttpError(401, 'Notes generate karne ke liye login zaroori hai.');
}

function isFatalConfigurationOrContentError(err: unknown): boolean {
  if (err instanceof ApiHttpError) {
    if (
      err.status === 400 ||
      err.status === 401 ||
      err.status === 403 ||
      err.status === 404 ||
      err.status === 422 ||
      err.status === 503
    ) {
      return true;
    }
    if (err.status === 502 && /API key valid nahi|permission nahi/i.test(err.rawMessage)) {
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
  return true;
}

async function postApi<T>(
  endpoint: string,
  body: unknown,
  signal?: AbortSignal,
  tokenOverride?: string
): Promise<T> {
  const token = tokenOverride ?? (await getAuthToken());
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
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
    const msg =
      json?.error ||
      (res.status === 404
        ? 'AI notes endpoint not found. Please verify API deployment.'
        : 'Request failed.');
    throw new ApiHttpError(res.status, msg, retryAfterSec);
  }
  if (!rawText || typeof json !== 'object' || json === null) {
    throw new ApiHttpError(502, 'Invalid response received from AI server.');
  }
  return json as T;
}

// Per-request backoff on 429/transient errors — NO global cross-request pause
async function postWithPerRequestBackoff<T>(
  endpoint: string,
  body: unknown,
  signal?: AbortSignal,
  maxRetries: number = PIPELINE_CONFIG.MAX_RETRIES,
  tokenOverride?: string
): Promise<T> {
  const backoffs = [1500, 3500];
  let lastErr: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) throw new Error('CANCELLED');
    try {
      return await postApi<T>(endpoint, body, signal, tokenOverride);
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
      postWithPerRequestBackoff<ChunkDigest>('/api/ai-notes/digest', body, sig));

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

async function hydrateStorageVisualsWithDomPurify(
  visuals: Record<string, GeneratedVisual>,
  signal?: AbortSignal
): Promise<Record<string, GeneratedVisual>> {
  const hydrated: Record<string, GeneratedVisual> = {};
  const entries = Object.entries(visuals || {});
  await Promise.all(
    entries.map(async ([id, vis]) => {
      if (!vis) return;
      if (vis.kind === 'img') {
        hydrated[id] = vis;
        return;
      }
      const rawContent = vis.url || vis.content || '';
      if (rawContent.startsWith('data:image/svg+xml')) {
        const sanitized = sanitizeSvgForImg(rawContent);
        if (sanitized) hydrated[id] = { ...vis, content: sanitized };
        return;
      }
      if (/^https?:\/\//i.test(rawContent)) {
        try {
          const res = await fetch(rawContent, { signal });
          if (!res.ok) return;
          const svgText = await res.text();
          const sanitizedDataUri = sanitizeSvgForImg(svgText);
          if (sanitizedDataUri) {
            hydrated[id] = {
              kind: 'svg',
              content: sanitizedDataUri,
              url: rawContent,
              caption: vis.caption,
            };
          }
        } catch {
          // ignore transient visual load failure
        }
        return;
      }
      const sanitized = sanitizeSvgForImg(rawContent);
      if (sanitized) {
        hydrated[id] = { ...vis, content: sanitized };
      }
    })
  );
  return hydrated;
}

interface StartOrStatusResponse {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  phase: string;
  progress: number;
  cached?: boolean;
  errorStatus?: number | null;
  error?: string | null;
  bundle: LectureNotesBundle;
}

async function runDirectClientFallbackPipeline(params: {
  videoId: string;
  title: string;
  durationSec: number;
  token: string;
  signal?: AbortSignal;
  onProgress?: (progress: GenerationProgress) => void;
  onPartialUpdate?: (bundle: LectureNotesBundle) => void;
}): Promise<LectureNotesBundle> {
  const { videoId, title, token, signal, onProgress, onPartialUpdate } = params;
  const durationSec = Math.max(120, Math.round(params.durationSec || 600));
  const base = `${PIPELINE_CONFIG.CACHE_V}:${PIPELINE_CONFIG.SCHEMA_V}:${videoId}:${PIPELINE_CONFIG.CHUNK_SEC}`;
  const chunks = makeChunks(durationSec, PIPELINE_CONFIG.CHUNK_SEC);

  const startedAt = Date.now();
  const initialAnalyzeSec = Math.ceil(chunks.length / PIPELINE_CONFIG.CONCURRENCY) * 18;
  const estChapters = Math.max(2, Math.min(12, Math.ceil(durationSec / 720)));
  const initialChapterSec = Math.ceil(estChapters / PIPELINE_CONFIG.CHAPTER_CONCURRENCY) * 12;
  const totalEstSec = initialAnalyzeSec + 7 + initialChapterSec + 8;

  const report = (pct: number, remHint?: number) => {
    const elapsed = (Date.now() - startedAt) / 1000;
    onProgress?.({
      percent: Math.max(1, Math.min(99, Math.round(pct))),
      etaSeconds: Math.max(2, Math.round(remHint ?? totalEstSec - elapsed)),
    });
  };

  report(3, totalEstSec);

  const digests: (ChunkDigest | undefined)[] = new Array(chunks.length);
  const failures: Error[] = [];
  let fatalErr: Error | null = null;
  let chunksCompleted = 0;

  await runPool(
    chunks,
    PIPELINE_CONFIG.CONCURRENCY,
    async (c, i) => {
      if (signal?.aborted || fatalErr) return;
      try {
        digests[i] = await fetchChunkWithSplitAndRetry({
          videoId,
          title,
          start: c.start,
          end: c.end,
          withMeta: i === 0,
          cacheBase: base,
          signal,
          fetcher: (b, sig) =>
            postWithPerRequestBackoff<ChunkDigest>('/api/ai-notes/digest', b, sig, 2, token),
        });
      } catch (e: any) {
        if (signal?.aborted || e?.name === 'AbortError' || e?.message === 'CANCELLED') {
          throw new Error('CANCELLED');
        }
        const errObj = e instanceof Error ? e : new Error(String(e || 'Chunk failed'));
        failures.push(errObj);
        if (isFatalConfigurationOrContentError(errObj)) {
          fatalErr = errObj;
        }
      } finally {
        chunksCompleted++;
        report(
          5 + (chunksCompleted / chunks.length) * 45,
          Math.ceil((chunks.length - chunksCompleted) / PIPELINE_CONFIG.CONCURRENCY) * 16 +
            initialChapterSec +
            10
        );
      }
    },
    signal
  );

  if (signal?.aborted) throw new Error('CANCELLED');
  if (fatalErr && digests.every((d) => !d)) throw fatalErr;
  if (failures.length === chunks.length) throw failures[0];

  const allSegs = digests.flatMap((d) => d?.segments || []).sort((a, b) => a.t - b.t);
  const allBoard = digests.flatMap((d) => d?.board || []);
  if (allSegs.length === 0) {
    throw failures[0] || new ApiHttpError(422, 'Is video se notes content detect nahi ho paya.');
  }

  const selectedBoard = selectBoard(allBoard);
  const langP = resolveLang(digests.find((d) => d?.meta)?.meta ?? DEFAULT_META);

  report(52, 7 + initialChapterSec + 8);
  const outKey = `${base}:${langP.key}:outline:${durationSec}`;
  let outline = await cget<Chapter[]>(outKey);
  if (!outline || !outline.length) {
    const outRes = await postWithPerRequestBackoff<{ chapters: Chapter[] }>(
      '/api/ai-notes/outline',
      { videoId, segments: allSegs.slice(0, 250).map((s) => ({ t: s.t, title: s.title })), durationSec, lang: langP },
      signal,
      2,
      token
    );
    outline = outRes.chapters;
    if (outline?.length) await cset(outKey, outline);
  }
  if (signal?.aborted) throw new Error('CANCELLED');
  if (!outline?.length) throw new ApiHttpError(502, 'Lecture chapters outline nahi ban payi.');

  const results: ({ notes: ChapterContent; mcqs: MCQ[] } | undefined)[] = new Array(outline.length);
  const visuals: Record<string, GeneratedVisual> = {};
  let chaptersDone = 0;

  const buildCurrent = (): LectureNotesBundle => ({
    videoId,
    title,
    updatedAt: Date.now(),
    lang: langP,
    chapters: outline!
      .map((ch, i) => {
        const r = results[i];
        if (!r) return null;
        return {
          ...ch,
          ...r.notes,
          board_visuals: selectedBoard.filter(
            (b) => b.best_t >= ch.start_sec && b.best_t < ch.end_sec + (i === outline!.length - 1 ? 1 : 0)
          ),
        };
      })
      .filter((x): x is ChapterNotes => Boolean(x)),
    mcqs: dedupeMcqs(results.map((r) => r?.mcqs || [])),
    visuals: { ...visuals },
    pipelineVersion: `${PIPELINE_CONFIG.CACHE_V}:${PIPELINE_CONFIG.SCHEMA_V}`,
  });

  await runPool(
    outline,
    PIPELINE_CONFIG.CHAPTER_CONCURRENCY,
    async (ch, i) => {
      if (signal?.aborted) throw new Error('CANCELLED');
      const key = `${base}:${langP.key}:ch:${ch.start_sec}-${ch.end_sec}`;
      let r = await cget<{ notes: ChapterContent; mcqs: MCQ[] }>(key);
      if (!r || !r.notes?.sections?.length) {
        r = await postWithPerRequestBackoff<{ notes: ChapterContent; mcqs: MCQ[] }>(
          '/api/ai-notes/chapter',
          { videoId, chapter: ch, segments: allSegs.filter((s) => s.t >= ch.start_sec && s.t < ch.end_sec), lang: langP },
          signal,
          2,
          token
        );
        if (r?.notes?.sections?.length) await cset(key, r);
      }
      results[i] = r;
      chaptersDone++;
      onPartialUpdate?.(buildCurrent());
      report(56 + (chaptersDone / outline!.length) * 32);
    },
    signal
  );

  if (signal?.aborted) throw new Error('CANCELLED');

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
              const sanitized = cached.kind === 'svg' ? sanitizeSvgForImg(cached.content) : cached.content;
              if (sanitized) visuals[item.id] = { ...cached, content: sanitized };
            }
          } else {
            const nearbySegs = allSegs
              .filter((s) => s.t >= item.t - 35 && s.t <= item.best_t + 35)
              .slice(0, 3)
              .map((s) => `${s.title}: ${s.summary}`)
              .join('\n')
              .slice(0, 900);
            const visRes = await postWithPerRequestBackoff<CachedVisual>(
              '/api/ai-notes/visual',
              { videoId, item: { ...item, transcriptSnippet: nearbySegs }, lang: langP },
              signal,
              1,
              token
            );
            await cset(key, visRes);
            if (visRes && 'kind' in visRes) {
              const sanitized = visRes.kind === 'svg' ? sanitizeSvgForImg(visRes.content) : visRes.content;
              if (sanitized) visuals[item.id] = { ...visRes, content: sanitized };
            }
          }
        } catch {
          // graceful skip
        } finally {
          visDone++;
          report(88 + (visDone / selectedBoard.length) * 11);
        }
      },
      signal
    );
  }

  const finalBundle = buildCurrent();
  saveLectureBundleToLocalStorage(finalBundle);
  onProgress?.({ percent: 100, etaSeconds: 0 });
  return finalBundle;
}

/* ---------------- Main Job-Backed Pipeline ---------------- */
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
  const token = await getAuthToken();

  const startedAt = Date.now();
  const estTotalSec = Math.max(25, Math.ceil(durationSec / PIPELINE_CONFIG.CHUNK_SEC) * 18);

  const report = (pct: number) => {
    const clampedPct = Math.max(2, Math.min(99, Math.round(pct)));
    const elapsed = (Date.now() - startedAt) / 1000;
    const estFromPct =
      clampedPct > 8 ? Math.max(2, Math.round((elapsed / clampedPct) * (100 - clampedPct))) : estTotalSec;
    onProgress?.({ percent: clampedPct, etaSeconds: estFromPct });
  };

  report(3);

  let startRes: StartOrStatusResponse;
  try {
    startRes = await postApi<StartOrStatusResponse>(
      '/api/notes/start',
      { videoId, title, durationSec, modeKey: 'auto' },
      signal,
      token
    );
  } catch (err: any) {
    if (signal?.aborted || err?.name === 'AbortError' || err?.message === 'CANCELLED') {
      throw new Error('CANCELLED');
    }
    // Fall back to direct authenticated /api/ai-notes/* pipeline ONLY if Supabase Service Role / migration tables are not configured yet
    const msg = String(err?.message || '');
    if (
      (err instanceof ApiHttpError &&
        err.status === 503 &&
        /SUPABASE_SERVICE_ROLE_KEY/i.test(msg)) ||
      /lecture_jobs|schema cache/i.test(msg)
    ) {
      return runDirectClientFallbackPipeline({
        videoId,
        title,
        durationSec,
        token,
        signal,
        onProgress,
        onPartialUpdate,
      });
    }
    throw err;
  }

  if (startRes.status === 'completed' && startRes.bundle?.chapters?.length > 0) {
    const hydratedVisuals = await hydrateStorageVisualsWithDomPurify(startRes.bundle.visuals || {}, signal);
    const doneBundle: LectureNotesBundle = {
      ...startRes.bundle,
      visuals: hydratedVisuals,
      pipelineVersion: `${PIPELINE_CONFIG.CACHE_V}:${PIPELINE_CONFIG.SCHEMA_V}`,
    };
    saveLectureBundleToLocalStorage(doneBundle);
    onProgress?.({ percent: 100, etaSeconds: 0 });
    return doneBundle;
  }

  let lastChaptersCount = startRes.bundle?.chapters?.length || 0;
  let lastVisualsCount = Object.keys(startRes.bundle?.visuals || {}).length;
  if (lastChaptersCount > 0) {
    const hydratedVisuals = await hydrateStorageVisualsWithDomPurify(startRes.bundle.visuals || {}, signal);
    onPartialUpdate?.({ ...startRes.bundle, visuals: hydratedVisuals });
  }
  report(startRes.progress || 4);

  // Poll status until job completes or fails (work runs persistently on server!)
  while (!signal?.aborted) {
    await sleep(PIPELINE_CONFIG.POLL_INTERVAL_MS);
    if (signal?.aborted) throw new Error('CANCELLED');

    const statusRes = await postWithPerRequestBackoff<StartOrStatusResponse>(
      '/api/notes/status',
      { videoId, modeKey: 'auto' },
      signal,
      2,
      token
    );

    const chapCount = statusRes.bundle?.chapters?.length || 0;
    const visCount = Object.keys(statusRes.bundle?.visuals || {}).length;

    if (chapCount > lastChaptersCount || visCount > lastVisualsCount) {
      lastChaptersCount = chapCount;
      lastVisualsCount = visCount;
      const hydratedVisuals = await hydrateStorageVisualsWithDomPurify(
        statusRes.bundle.visuals || {},
        signal
      );
      onPartialUpdate?.({
        ...statusRes.bundle,
        visuals: hydratedVisuals,
        pipelineVersion: `${PIPELINE_CONFIG.CACHE_V}:${PIPELINE_CONFIG.SCHEMA_V}`,
      });
    }

    report(statusRes.progress || 5);

    if (statusRes.status === 'completed') {
      const hydratedVisuals = await hydrateStorageVisualsWithDomPurify(
        statusRes.bundle.visuals || {},
        signal
      );
      const finalBundle: LectureNotesBundle = {
        ...statusRes.bundle,
        visuals: hydratedVisuals,
        pipelineVersion: `${PIPELINE_CONFIG.CACHE_V}:${PIPELINE_CONFIG.SCHEMA_V}`,
      };
      saveLectureBundleToLocalStorage(finalBundle);
      onProgress?.({ percent: 100, etaSeconds: 0 });
      return finalBundle;
    }

    if (statusRes.status === 'failed') {
      const errCode = statusRes.errorStatus || 502;
      const errMsg = statusRes.error || 'Notes generate nahi ho paye.';
      throw new ApiHttpError(errCode, errMsg);
    }
  }

  throw new Error('CANCELLED');
}

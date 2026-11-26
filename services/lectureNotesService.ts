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
}

export interface GenerationProgress {
  percent: number;
  etaSeconds: number;
}

const CONFIG = {
  CHUNK_SEC: 600,
  CONCURRENCY: 3,
  CHAPTER_CONCURRENCY: 3,
  IMAGE_CONCURRENCY: 2,
  MAX_VISUALS: 8,
  CACHE_V: 'raftaar:v7',
};

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
  const clean = (raw || '')
    .replace(/```svg|```html|```/gi, '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?>[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(?:href|xlink:href)\s*=\s*["']\s*javascript:[^"']*["']/gi, '')
    .trim();
  const match = clean.match(/<svg[\s\S]*<\/svg>/i);
  if (!match) return null;
  let svg = match[0];
  if (!/xmlns=/.test(svg)) {
    svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/* ---------------- Temporary LocalStorage Cache ---------------- */
export function getCachedLectureBundle(videoId: string): LectureNotesBundle | null {
  if (!videoId) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${videoId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LectureNotesBundle;
    if (parsed && parsed.videoId === videoId && (parsed.chapters?.length > 0 || parsed.mcqs?.length > 0)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveLectureBundleToLocalStorage(bundle: LectureNotesBundle): void {
  try {
    const indexRaw = localStorage.getItem(INDEX_KEY);
    let idx: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    idx = [bundle.videoId, ...idx.filter((id) => id !== bundle.videoId)];

    while (idx.length > MAX_LOCAL_VIDEOS) {
      const oldest = idx.pop();
      if (oldest) {
        try {
          localStorage.removeItem(`${STORAGE_PREFIX}${oldest}`);
        } catch {}
      }
    }

    const serialized = JSON.stringify(bundle);
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${bundle.videoId}`, serialized);
      localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
    } catch {
      // Quota exceeded: trim older videos or strip heavy visuals to guarantee text notes + MCQs persist
      while (idx.length > 1) {
        const oldest = idx.pop();
        if (oldest && oldest !== bundle.videoId) {
          try {
            localStorage.removeItem(`${STORAGE_PREFIX}${oldest}`);
          } catch {}
        }
      }
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${bundle.videoId}`, serialized);
        localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
      } catch {
        const slim: LectureNotesBundle = { ...bundle, visuals: {} };
        try {
          localStorage.setItem(`${STORAGE_PREFIX}${bundle.videoId}`, JSON.stringify(slim));
          localStorage.setItem(INDEX_KEY, JSON.stringify([bundle.videoId]));
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

/* ---------------- IndexedDB Intermediate Chunk Cache (for resume) ---------------- */
function idbOpen(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open('raftaar-cache', 1);
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

function makeChunks(durationSec: number): { start: number; end: number }[] {
  const safeDur = Math.max(60, Math.round(durationSec));
  const out: { start: number; end: number }[] = [];
  for (let s = 0; s < safeDur; s += CONFIG.CHUNK_SEC) {
    out.push({ start: s, end: Math.min(s + CONFIG.CHUNK_SEC, safeDur) });
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
    .slice(0, CONFIG.MAX_VISUALS)
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

function dedupeMcqs(chapterMcqs: MCQ[][]): MCQ[] {
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

async function postApi<T>(endpoint: string, body: unknown, signal?: AbortSignal): Promise<T> {
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
    throw new Error(
      json?.error ||
        (res.status === 404
          ? 'AI notes endpoint not found (404). Please verify API deployment.'
          : `Request failed (${res.status})`)
    );
  }
  if (!rawText || typeof json !== 'object' || json === null) {
    throw new Error('Invalid response received from AI server.');
  }
  return json as T;
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
  const base = `${CONFIG.CACHE_V}:${videoId}:${CONFIG.CHUNK_SEC}`;
  const chunks = makeChunks(durationSec);

  const estChapters = Math.max(2, Math.min(12, Math.ceil(durationSec / 720)));
  const initialAnalyzeSec = Math.ceil(chunks.length / CONFIG.CONCURRENCY) * 20;
  const initialOutlineSec = 7;
  const initialChapterSec = Math.ceil(estChapters / CONFIG.CHAPTER_CONCURRENCY) * 14;
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

  /* ---- 1. ANALYZE CHUNKS ---- */
  const digests: (ChunkDigest | undefined)[] = new Array(chunks.length);
  const failures: string[] = [];
  let chunksCompleted = 0;

  await runPool(
    chunks,
    CONFIG.CONCURRENCY,
    async (c, i) => {
      if (signal?.aborted) throw new Error('CANCELLED');
      const key = `${base}:dig:${c.start}-${c.end}`;
      const hit = await cget<ChunkDigest>(key);
      if (hit) {
        digests[i] = hit;
      } else {
        try {
          const d = await postApi<ChunkDigest>(
            '/api/ai-notes/digest',
            { videoId, start: c.start, end: c.end, title, withMeta: i === 0 },
            signal
          );
          digests[i] = d;
          await cset(key, d);
        } catch (e: any) {
          if (signal?.aborted || e?.name === 'AbortError') throw new Error('CANCELLED');
          failures.push(String(e?.message || 'Chunk failed'));
        }
      }
      chunksCompleted++;
      const frac = chunksCompleted / chunks.length;
      const remChunks = chunks.length - chunksCompleted;
      const remSec =
        Math.ceil(remChunks / CONFIG.CONCURRENCY) * 18 +
        initialOutlineSec +
        initialChapterSec +
        initialVisualSec;
      report(5 + frac * 45, remSec);
    },
    signal
  );

  if (signal?.aborted) throw new Error('CANCELLED');
  if (failures.length === chunks.length) {
    throw new Error(failures[0] || 'Video analyze nahi ho paya.');
  }

  const allSegs = digests.flatMap((d) => d?.segments || []).sort((a, b) => a.t - b.t);
  const allBoard = digests.flatMap((d) => d?.board || []);
  if (allSegs.length === 0) {
    throw new Error(failures[0] || 'Is video se notes content detect nahi ho paya.');
  }

  const selectedBoard = selectBoard(allBoard);
  const langP = resolveLang(digests[0]?.meta ?? DEFAULT_META);

  /* ---- 2. OUTLINE ---- */
  report(52, initialOutlineSec + initialChapterSec + (selectedBoard.length ? initialVisualSec : 0));
  const outKey = `${base}:${langP.key}:outline:${durationSec}`;
  let outline = await cget<Chapter[]>(outKey);
  if (!outline) {
    const outlineSegments = allSegs.slice(0, 250).map((s) => ({ t: s.t, title: s.title }));
    const outRes = await postApi<{ chapters: Chapter[] }>(
      '/api/ai-notes/outline',
      { segments: outlineSegments, durationSec, lang: langP },
      signal
    );
    outline = outRes.chapters;
    await cset(outKey, outline);
  }
  if (signal?.aborted) throw new Error('CANCELLED');

  /* ---- 3. NOTES + MCQs ---- */
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
    };
  };

  const chapterEtaBase = Math.ceil(outline.length / CONFIG.CHAPTER_CONCURRENCY) * 12;
  const visualEtaBase = selectedBoard.length ? Math.ceil(selectedBoard.length / CONFIG.IMAGE_CONCURRENCY) * 7 : 0;
  totalEstSec = (Date.now() - startedAt) / 1000 + chapterEtaBase + visualEtaBase;
  report(56, chapterEtaBase + visualEtaBase);

  await runPool(
    outline,
    CONFIG.CHAPTER_CONCURRENCY,
    async (ch, i) => {
      if (signal?.aborted) throw new Error('CANCELLED');
      const key = `${base}:${langP.key}:ch:${ch.start_sec}-${ch.end_sec}`;
      let r = await cget<{ notes: ChapterContent; mcqs: MCQ[] }>(key);
      if (!r) {
        const chapterSegments = allSegs.filter((s) => s.t >= ch.start_sec && s.t < ch.end_sec);
        r = await postApi<{ notes: ChapterContent; mcqs: MCQ[] }>(
          '/api/ai-notes/chapter',
          { chapter: ch, segments: chapterSegments, lang: langP },
          signal
        );
        await cset(key, r);
      }
      results[i] = r;
      chaptersDone++;
      const partial = buildCurrentBundle();
      onPartialUpdate?.(partial);
      const remCh = outline!.length - chaptersDone;
      const remSec = Math.ceil(remCh / CONFIG.CHAPTER_CONCURRENCY) * 11 + visualEtaBase;
      report(56 + (chaptersDone / outline!.length) * 32, remSec);
    },
    signal
  );

  if (signal?.aborted) throw new Error('CANCELLED');

  /* ---- 4. BOARD VISUALS (lightweight SVG diagrams) ---- */
  if (selectedBoard.length > 0) {
    let visDone = 0;
    await runPool(
      selectedBoard,
      CONFIG.IMAGE_CONCURRENCY,
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
            const visRes = await postApi<CachedVisual>(
              '/api/ai-notes/visual',
              { videoId, item, lang: langP },
              signal
            );
            await cset(key, visRes);
            if (visRes && 'kind' in visRes) {
              visuals[item.id] = visRes;
            }
          }
        } catch {
          /* skip individual diagram failure gracefully */
        } finally {
          visDone++;
          const remV = selectedBoard.length - visDone;
          report(88 + (visDone / selectedBoard.length) * 11, Math.ceil(remV / CONFIG.IMAGE_CONCURRENCY) * 6);
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

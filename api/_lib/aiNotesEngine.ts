import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { ApiError, sanitizePublicMessage } from './http.ts';

export const GEMINI_MODELS = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;
export const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

const PER_CALL_TIMEOUT_MS = 32_000;
const CALL_BUDGET_MS = 48_000;

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

export interface Chapter {
  title: string;
  start_sec: number;
  end_sec: number;
}

interface VisualPlan {
  needs_image: boolean;
  reason: string;
  image_prompt: string;
  labels: string[];
}

const MEDIUM_NAME: Record<Medium, string> = {
  english: 'English',
  hindi: 'Hindi (Devanagari)',
  hinglish: 'Hinglish',
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? h + ':' : ''}${mm}:${String(r).padStart(2, '0')}`;
}

function parseJson(text: string | undefined): any {
  const clean = (text || '').replace(/```json|```/gi, '').trim();
  return JSON.parse(clean);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sanitizeSvg(raw: string): string | null {
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
  // Reject unexpectedly huge SVGs to protect response size
  if (Buffer.byteLength(match[0], 'utf8') > 256 * 1024) {
    return null;
  }
  return match[0];
}

function findEnvKey(target: string): string {
  const direct = process.env[target];
  if (direct && direct.trim()) return direct.trim();
  for (const [k, v] of Object.entries(process.env)) {
    if (k.trim() === target && v && v.trim()) {
      return v.trim();
    }
  }
  return '';
}

function getAiClient(): GoogleGenAI {
  const rawKey = findEnvKey('GEMINI_API_KEY')
    .replace(/^['"]|['"]$/g, '')
    .replace(/^value\s*:\s*/i, '')
    .trim();
  if (!rawKey) {
    throw new ApiError(
      503,
      'GEMINI_API_KEY server par configured nahi hai. Vercel Environment Variables ya Settings > Secrets me GEMINI_API_KEY add karein aur redeploy karein.'
    );
  }
  const isVertexExpress = rawKey.startsWith('AQ.');
  return new GoogleGenAI({
    apiKey: rawKey,
    ...(isVertexExpress ? { vertexai: true } : {}),
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' },
      timeout: PER_CALL_TIMEOUT_MS,
    },
  });
}

interface ParsedUpstreamError {
  status?: number;
  reason: string;
  service: string;
  message: string;
  raw: string;
}

function parseUpstreamError(err: unknown): ParsedUpstreamError {
  const raw = String((err as { message?: unknown })?.message || err || '');
  const numericStatus = Number((err as { status?: unknown; statusCode?: unknown })?.status ?? (err as { statusCode?: unknown })?.statusCode);
  let status = Number.isFinite(numericStatus) ? numericStatus : undefined;
  let service = '';
  let reason = '';
  let message = '';

  try {
    const parsed = JSON.parse(raw);
    if (!status && Number.isFinite(Number(parsed?.error?.code))) {
      status = Number(parsed.error.code);
    }
    message = String(parsed?.error?.message || '');
    const details = Array.isArray(parsed?.error?.details) ? parsed.error.details : [];
    for (const d of details) {
      if (d?.reason) reason = String(d.reason);
      if (d?.metadata?.service) service = String(d.metadata.service);
    }
  } catch {
    // non-JSON error message
  }

  return { status, reason, service, message, raw };
}

export function toSafeApiError(err: unknown, fallback: string): ApiError {
  if (err instanceof ApiError) return err;
  const { status, reason, service, message, raw } = parseUpstreamError(err);

  if (
    /API_KEY_INVALID|API key not valid/i.test(raw) ||
    reason === 'API_KEY_INVALID'
  ) {
    const svcHint = service ? ` (${sanitizePublicMessage(service)})` : '';
    return new ApiError(
      502,
      `Gemini API key valid nahi hai${svcHint}. Kripya Vercel Environment Variables ya Settings > Secrets me valid GEMINI_API_KEY verify karein.`
    );
  }
  if (status === 401 || status === 403 || /PERMISSION_DENIED|UNAUTHENTICATED|\b403\b|\b401\b/i.test(raw)) {
    return new ApiError(
      502,
      'Gemini API key ko permission nahi hai. Kripya apni GEMINI_API_KEY configuration verify karein.'
    );
  }
  if (status === 429 || /RESOURCE_EXHAUSTED|\b429\b/i.test(raw)) {
    return new ApiError(
      429,
      'Gemini API rate limit reach ho gayi hai. Thodi der baad try karein.'
    );
  }
  if (status === 400 || /INVALID_ARGUMENT/i.test(raw)) {
    return new ApiError(
      502,
      sanitizePublicMessage(message || 'AI request parameters invalid the.', fallback)
    );
  }
  if (status === 404 || /NOT_FOUND/i.test(raw)) {
    return new ApiError(502, 'Configured AI model unavailable hai.');
  }
  if (/AbortError|TimeoutError|DEADLINE_EXCEEDED|timed out/i.test(raw)) {
    return new ApiError(504, 'AI request timeout ho gayi. Dobara try karein.');
  }

  const display = message
    ? `${message}${reason ? ` [${reason}]` : ''}`
    : raw || fallback;
  return new ApiError(502, sanitizePublicMessage(display, fallback));
}

function classifyGeminiFailure(err: unknown): 'model_not_found' | 'transient' | 'fatal' {
  const { status, reason, raw } = parseUpstreamError(err);

  // Never retry missing key, invalid key, auth/permission, or invalid argument errors
  if (
    /API_KEY_INVALID|API key not valid|PERMISSION_DENIED|UNAUTHENTICATED|INVALID_ARGUMENT/i.test(raw) ||
    reason === 'API_KEY_INVALID' ||
    status === 400 ||
    status === 401 ||
    status === 403
  ) {
    return 'fatal';
  }

  // Model unavailable / not found -> immediately try next model without sleeping
  if (status === 404 || /\b404\b|NOT_FOUND/i.test(raw)) {
    return 'model_not_found';
  }

  // Only retry genuine transient server/rate/network/timeout errors
  if (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    /429|RESOURCE_EXHAUSTED|500|INTERNAL|502|503|UNAVAILABLE|504|DEADLINE_EXCEEDED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|fetch failed/i.test(
      raw
    )
  ) {
    return 'transient';
  }

  return 'fatal';
}

let pauseUntil = 0;

async function callGemini(
  contents: any,
  config: Record<string, unknown>,
  models: readonly string[] = GEMINI_MODELS
) {
  const ai = getAiClient();
  const waits = [1000, 2500];
  const callStartedAt = Date.now();
  let lastError: unknown;

  for (const model of models) {
    for (let i = 0; i <= waits.length; i++) {
      const elapsed = Date.now() - callStartedAt;
      if (elapsed >= CALL_BUDGET_MS) {
        throw lastError || new ApiError(504, 'AI request timeout budget exceeded.');
      }

      const waitMs = Math.min(2000, pauseUntil - Date.now());
      if (waitMs > 0) await sleep(waitMs);

      const remainingBudget = Math.max(5000, CALL_BUDGET_MS - (Date.now() - callStartedAt));
      const attemptTimeout = Math.min(PER_CALL_TIMEOUT_MS, remainingBudget);

      try {
        return await ai.models.generateContent({
          model,
          contents,
          config: {
            ...config,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            abortSignal: AbortSignal.timeout(attemptTimeout),
          },
        });
      } catch (e: unknown) {
        lastError = e;
        const kind = classifyGeminiFailure(e);
        if (kind === 'fatal') {
          throw toSafeApiError(e, 'Gemini request failed.');
        }
        if (kind === 'model_not_found') {
          break;
        }
        if (i < waits.length && Date.now() - callStartedAt + waits[i] < CALL_BUDGET_MS) {
          const backoff = waits[i] + Math.random() * 500;
          pauseUntil = Math.max(pauseUntil, Date.now() + Math.min(2000, backoff));
          await sleep(backoff);
          continue;
        }
        break;
      }
    }
  }
  throw toSafeApiError(lastError, 'Gemini request failed.');
}

function languageRules(l: LangProfile): string {
  const base = `LANGUAGE RULES (very important):
- Subject: ${l.subject}. Board: ${l.board}. Language of the notes: ${l.medium.toUpperCase()}.
- Whatever definition, term or line the teacher said in a particular language, write it in that same language. If he said it in English, keep it in English - never convert it into Hinglish or Hindi.
- Keep formulas, symbols, units and numbers exactly as they are.`;
  if (l.pureEnglish) {
    return `${base}
- This is an English-language subject (grammar, prose, poetry, writing etc.). Write EVERYTHING in clear English: headings, definitions, points, intuition, examples, terms, mind map and MCQs (question, options, explanation). No Hindi, no Hinglish, no Devanagari.`;
  }
  if (l.medium === 'english') {
    return `${base}
- ENGLISH MEDIUM: headings, definitions, formulas, keywords, key points, mind map labels and ALL MCQ text (question, options, explanation) must be strictly in English.
- Only in "intuition" and "examples": if the teacher explained in simple Hinglish (Roman script), you may keep that casual Hinglish phrasing so it stays natural for the student, but the key terms stay in English. Never use Devanagari.`;
  }
  if (l.medium === 'hindi') {
    return `${base}
- HINDI MEDIUM: write in Hindi (Devanagari script) only - headings, definitions, points, intuition, examples and MCQs (question, options, explanation). No Roman-script Hindi.
- Whenever the teacher used an English term (e.g. Force, Velocity, Noun), keep it next to the Hindi word in brackets, like: बल (Force), so the student can connect both.
- If the teacher spoke a definition or sentence in English, write that sentence in English.`;
  }
  return `${base}
- HINGLISH: write simple Hindi in Roman script mixed with English technical words, the way the teacher speaks. Definitions or terms the teacher said in English stay in English. MCQs should also be in the same easy Hinglish, with technical terms in English.`;
}

function metaPrompt(): string {
  return `

LANGUAGE / SUBJECT DETECTION (sirf is pehle hisse ke liye, "meta" field mein):
- "detected_medium": teacher kis bhasha mein padha raha hai - "english" (zyadatar English), "hindi" (zyadatar Hindi, English terms kam) ya "hinglish" (Hindi + English ka mix).
- "detected_subject": subject ka naam 1-3 shabd mein (jaise English, Physics, Chemistry, Maths, History, Civics).
- "detected_board": "BSEB", "CBSE", "NCERT", "Other" ya "Unknown" - video, title, slides ya board ke hisaab se.`;
}

/* ============================== Schemas ============================== */
const S = Type.STRING;
const strArr = { type: Type.ARRAY, items: { type: S } };

const digestSchema = {
  type: Type.OBJECT,
  properties: {
    segments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          t: { type: Type.INTEGER },
          title: { type: S },
          summary: { type: S },
          definition: { type: S },
          intuition: { type: S },
          examples: strArr,
          formulas: strArr,
          important: { type: S },
        },
        required: ['t', 'title', 'summary'],
      },
    },
    board: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          t: { type: Type.INTEGER },
          best_t: { type: Type.INTEGER },
          title: { type: S },
          kind: { type: S },
          description: { type: S },
          importance: { type: Type.INTEGER },
        },
        required: ['t', 'best_t', 'title', 'description'],
      },
    },
  },
  required: ['segments', 'board'],
};

const metaSchema = {
  type: Type.OBJECT,
  properties: {
    detected_medium: { type: S, enum: ['english', 'hindi', 'hinglish'] },
    detected_subject: { type: S },
    detected_board: { type: S },
  },
  required: ['detected_medium', 'detected_subject', 'detected_board'],
};

const digestSchemaWithMeta = {
  ...digestSchema,
  properties: { ...digestSchema.properties, meta: metaSchema },
  required: [...digestSchema.required, 'meta'],
};

const outlineSchema = {
  type: Type.OBJECT,
  properties: {
    chapters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: S },
          start_sec: { type: Type.INTEGER },
          end_sec: { type: Type.INTEGER },
        },
        required: ['title', 'start_sec', 'end_sec'],
      },
    },
  },
  required: ['chapters'],
};

const chapterSchema = {
  type: Type.OBJECT,
  properties: {
    intro: { type: S },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          heading: { type: S },
          start_sec: { type: Type.INTEGER },
          definition: { type: S },
          intuition: { type: S },
          points: strArr,
          examples: strArr,
          formulas: strArr,
          exam_tip: { type: S },
        },
        required: ['heading', 'start_sec', 'points'],
      },
    },
    terms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { term: { type: S }, meaning: { type: S } },
        required: ['term', 'meaning'],
      },
    },
    important_points: strArr,
    quick_revision: strArr,
    mindmap: {
      type: Type.OBJECT,
      properties: {
        center: { type: S },
        branches: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { label: { type: S }, children: strArr },
            required: ['label', 'children'],
          },
        },
      },
      required: ['center', 'branches'],
    },
    mcqs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: S },
          options: strArr,
          correct_index: { type: Type.INTEGER },
          explanation: { type: S },
          timestamp_seconds: { type: Type.INTEGER },
        },
        required: ['question', 'options', 'correct_index', 'explanation'],
      },
    },
  },
  required: ['sections', 'mcqs'],
};

const planSchema = {
  type: Type.OBJECT,
  properties: {
    needs_image: { type: Type.BOOLEAN },
    reason: { type: S },
    image_prompt: { type: S },
    labels: strArr,
  },
  required: ['needs_image', 'reason', 'image_prompt', 'labels'],
};

function normalizeDigest(data: any, start: number, end: number) {
  const len = end - start;
  const m = data?.meta;
  const meta: LangMeta | undefined = m
    ? {
        detected_medium: (['english', 'hindi', 'hinglish'] as Medium[]).includes(m.detected_medium)
          ? m.detected_medium
          : 'hinglish',
        detected_subject: String(m.detected_subject || 'General'),
        detected_board: String(m.detected_board || 'Unknown'),
      }
    : undefined;
  const segs: Segment[] = (data?.segments || []).filter((s: Segment) => s && s.title && s.summary);
  const board: BoardItem[] = (data?.board || []).filter((b: BoardItem) => b && b.title);
  let maxT = 0;
  segs.forEach((s) => (maxT = Math.max(maxT, s.t || 0)));
  board.forEach((b) => (maxT = Math.max(maxT, b.t || 0, b.best_t || 0)));
  const off = start > 0 && maxT > len + 5 ? 0 : start;
  const fix = (v: number) => clamp(Math.round((v || 0) + off), start, end);
  return {
    meta,
    segments: segs.map((s) => ({ ...s, t: fix(s.t) })),
    board: board.map((b) => {
      const bt = fix(b.best_t || b.t);
      return {
        ...b,
        id: `b${bt}`,
        t: fix(b.t),
        best_t: bt,
        kind: b.kind || 'diagram',
        importance: clamp(Math.round(b.importance || 2), 1, 3),
      };
    }),
  };
}

function uniformOutline(durationSec: number): Chapter[] {
  const out: Chapter[] = [];
  for (let s = 0, i = 1; s < durationSec; s += 600, i++) {
    out.push({ title: `Part ${i}`, start_sec: s, end_sec: Math.min(s + 600, durationSec) });
  }
  return out;
}

function sanitizeSegmentList(raw: unknown, maxItems: number): Segment[] {
  if (!Array.isArray(raw)) {
    throw new ApiError(400, 'segments must be an array.');
  }
  if (raw.length > maxItems) {
    throw new ApiError(400, `Too many segments (maximum ${maxItems} allowed).`);
  }
  const out: Segment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const t = Number(rec.t);
    const title = typeof rec.title === 'string' ? rec.title.trim().slice(0, 160) : '';
    const summary = typeof rec.summary === 'string' ? rec.summary.trim().slice(0, 1200) : '';
    if (!Number.isFinite(t) || t < 0 || !title) continue;
    out.push({
      t: Math.floor(t),
      title,
      summary,
      definition: typeof rec.definition === 'string' ? rec.definition.slice(0, 600) : '',
      intuition: typeof rec.intuition === 'string' ? rec.intuition.slice(0, 600) : '',
      examples: Array.isArray(rec.examples)
        ? rec.examples.slice(0, 6).map((x) => String(x || '').slice(0, 240))
        : [],
      formulas: Array.isArray(rec.formulas)
        ? rec.formulas.slice(0, 8).map((x) => String(x || '').slice(0, 200))
        : [],
      important: typeof rec.important === 'string' ? rec.important.slice(0, 400) : '',
    });
  }
  return out;
}

function segmentsToText(segs: Segment[]): string {
  return segs
    .map((s) => {
      const lines = [`[${fmt(s.t)}]${s.important ? ' ★' : ''} ${s.title}`, `Saar: ${s.summary}`];
      if (s.definition) lines.push(`Teacher ki definition: ${s.definition}`);
      if (s.intuition) lines.push(`Teacher ne aise samjhaya: ${s.intuition}`);
      if (s.examples?.length) lines.push(`Examples: ${s.examples.join(' | ')}`);
      if (s.formulas?.length) lines.push(`Formulas: ${s.formulas.join(' | ')}`);
      if (s.important) lines.push(`Teacher ne bola (important): ${s.important}`);
      return lines.join('\n');
    })
    .join('\n\n');
}

function sanitizeLangProfile(raw: any): LangProfile {
  const medium: Medium = (['english', 'hindi', 'hinglish'] as Medium[]).includes(raw?.medium)
    ? raw.medium
    : 'hinglish';
  return {
    medium,
    pureEnglish: Boolean(raw?.pureEnglish),
    subject: String(raw?.subject || 'General').slice(0, 60),
    board: String(raw?.board || 'Unknown').slice(0, 40),
    key: String(raw?.key || `${medium}:general`).slice(0, 80),
  };
}

/* ==================== Endpoint Handlers ==================== */

export async function handleDigest(body: Record<string, unknown>) {
  const { videoId, start, end, title, withMeta } = body;
  if (typeof videoId !== 'string' || !VIDEO_ID_RE.test(videoId)) {
    throw new ApiError(400, 'Invalid YouTube video ID.');
  }
  const startSec = Number(start);
  const endSec = Number(end);
  if (
    !Number.isFinite(startSec) ||
    !Number.isFinite(endSec) ||
    startSec < 0 ||
    endSec <= startSec ||
    endSec - startSec > 1800 ||
    endSec > 28800
  ) {
    throw new ApiError(400, 'Invalid video chunk range.');
  }
  if (title !== undefined && title !== null && typeof title !== 'string') {
    throw new ApiError(400, 'Invalid lecture title.');
  }

  const safeTitle = typeof title === 'string' ? title.trim().slice(0, 200) : '';
  const floorStart = Math.floor(startSec);
  const ceilEnd = Math.ceil(endSec);

  const prompt = `Tum ek expert topper student aur tutor ho. YouTube video titled "${safeTitle || 'Lecture'}" (Video ID: ${videoId}) ke time interval ${fmt(floorStart)} se ${fmt(ceilEnd)} ke beech padhaye jane wale core concepts, definitions, derivations, formulas aur examples ke adhar par accurate student-style notes aur segments generate karo.

Is hisse ko concept-wise "segments" mein todo (har segment = ek topic/concept/example, lagbhag 1-3 minute). Har segment mein:
- "t": segment shuru hone ka time SECONDS mein, is clip ke shuru se (clip start = 0).
- "title": chhota topic naam.
- "summary": 3-5 vakya ka poora saar jo is time interval mein padhaya gaya ho.
- "definition": agar koi definition/meaning ho, ek saaf vakya mein. Nahi toh "".
- "intuition": aasaan bhasha mein samjhane ka tarika (analogy). Nahi hai toh "".
- "examples": chhote examples/numericals. Nahi hai toh [].
- "formulas": formula/equation. Nahi hai toh [].
- "important": agar koi important exam point ho. Warna "".

Board/screen diagrams ya key takeaways ke liye "board" array (title, kind, description, t, best_t, importance 1-3).
${withMeta ? metaPrompt() : ''}
Return valid JSON matching the schema.`;

  const res = await callGemini(
    [{ role: 'user', parts: [{ text: prompt }] }],
    {
      responseMimeType: 'application/json',
      responseSchema: withMeta ? digestSchemaWithMeta : digestSchema,
      maxOutputTokens: 12000,
    }
  );
  return normalizeDigest(parseJson(res?.text), floorStart, ceilEnd);
}

export async function handleOutline(body: Record<string, unknown>) {
  const { segments, durationSec, lang } = body;
  const rawDur = Number(durationSec);
  if (
    durationSec !== undefined &&
    (!Number.isFinite(rawDur) || rawDur <= 0 || rawDur > 43200)
  ) {
    throw new ApiError(400, 'Invalid durationSec.');
  }
  const dur = Math.max(60, Math.min(28800, Number.isFinite(rawDur) ? rawDur : 600));

  if (segments === undefined || segments === null) {
    return { chapters: uniformOutline(dur) };
  }
  const cleanSegments = sanitizeSegmentList(segments, 350);
  if (cleanSegments.length === 0) {
    return { chapters: uniformOutline(dur) };
  }

  const langP = sanitizeLangProfile(lang);
  const list = cleanSegments
    .slice(0, 250)
    .map((s) => `[${fmt(s.t)}] ${s.title.slice(0, 120)}`)
    .join('\n');
  const short = dur < 20 * 60;
  const prompt = `Neeche ek class lecture ke topics ki list hai (format: [mm:ss] topic). Inhe chapters mein baanto, jaise teacher board par heading likhta hai.
Rules:
- ${short ? '2 se 4 chapters' : 'Har chapter lagbhag 8-15 minute ka, kul 4 se 16 chapters'}.
- Pehle chapter ka start_sec = 0, har agle ka start_sec = pichle ka end_sec, aakhri ka end_sec = ${dur}.
- Ek concept ko beech se mat todo.
- Chapter titles ko neeche ke LANGUAGE RULES ke hisaab se likho.

${languageRules(langP)}

TOPICS:
${list}`;

  try {
    const result = await callGemini(
      [{ role: 'user', parts: [{ text: prompt }] }],
      {
        responseMimeType: 'application/json',
        responseSchema: outlineSchema,
        maxOutputTokens: 4096,
      }
    );
    let chapters: Chapter[] = (parseJson(result?.text).chapters || [])
      .filter((c: Chapter) => c && c.title)
      .sort((a: Chapter, b: Chapter) => a.start_sec - b.start_sec);
    if (chapters.length === 0) {
      return { chapters: uniformOutline(dur) };
    }
    chapters[0].start_sec = 0;
    for (let i = 0; i < chapters.length - 1; i++) {
      chapters[i].end_sec = chapters[i + 1].start_sec;
    }
    chapters[chapters.length - 1].end_sec = dur;
    chapters = chapters.filter((c) => c.end_sec > c.start_sec);
    return { chapters: chapters.length ? chapters : uniformOutline(dur) };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 503 || err.status === 502 || err.status === 429)) {
      throw err;
    }
    return { chapters: uniformOutline(dur) };
  }
}

export async function handleChapter(body: Record<string, unknown>) {
  const { chapter, segments, lang } = body;
  if (!chapter || typeof chapter !== 'object' || Array.isArray(chapter)) {
    throw new ApiError(400, 'Invalid chapter payload.');
  }
  const chRec = chapter as Record<string, unknown>;
  if (typeof chRec.title !== 'string' || !chRec.title.trim()) {
    throw new ApiError(400, 'Invalid chapter title.');
  }
  const startSec = Number(chRec.start_sec ?? 0);
  const endSec = Number(chRec.end_sec ?? 600);
  if (
    !Number.isFinite(startSec) ||
    !Number.isFinite(endSec) ||
    startSec < 0 ||
    endSec <= startSec ||
    endSec - startSec > 7200 ||
    endSec > 28800
  ) {
    throw new ApiError(400, 'Invalid chapter time bounds.');
  }

  const ch: Chapter = {
    title: chRec.title.trim().slice(0, 160),
    start_sec: Math.floor(startSec),
    end_sec: Math.ceil(endSec),
  };

  const allSegs = segments === undefined ? [] : sanitizeSegmentList(segments, 350);
  const segs = allSegs.filter((s) => s.t >= ch.start_sec && s.t < ch.end_sec);
  if (segs.length === 0) {
    return {
      notes: { sections: [], terms: [], important_points: [], quick_revision: [] },
      mcqs: [],
    };
  }

  const langP = sanitizeLangProfile(lang);
  const mins = (ch.end_sec - ch.start_sec) / 60;
  const mcqCount = clamp(Math.round(mins / 1.5), 5, 14);

  const prompt = `Tum ek topper student ho jo class ke baad apni notebook mein saaf, samajhdaar notes banata hai. Neeche chapter "${ch.title}" ke teacher-segments hain (★ = teacher ne khud important bola).

${languageRules(langP)}

A) NOTES (notebook style):
Har concept ke liye ek "section":
- "heading": jaise board par likhte hain.
- "start_sec": segment ka time (seconds, poore video ke hisaab se, jahan se ye concept shuru hua).
- "definition": clear, saaf vakya mein "X kya hai". Agar teacher ne definition aur explanation dono di hain, toh pehle definition yahan likho.
- "intuition": teacher ne use kaise aasaan bhasha mein samjhaya (analogy/roz ki misaal) - student ke samajhne ke liye. Dono ko naturally mila kar likho, bas teacher ke shabdon ki copy nahi.
- "points": 3-6 chhote, crisp points (max 12 shabd), keywords ke saath, jaise student shortcut mein likhta hai.
- "examples": teacher ke diye real-life examples / numericals.
- "formulas": "V = I × R  (matlab: ...)" is tarah, symbols ke saath.
- "exam_tip": sirf agar teacher ne exam/yaad rakhne ki baat boli ho.
Jo field teacher ne nahi di, usse "" ya [] rakho. Kuch bhi apni taraf se mat gadho.

Chapter-level:
- "intro": 1 line.
- "terms": important shabd + chhota matlab.
- "important_points": ★ wali baaton se, student ki tarah chhote vakya mein. Nahi hai toh [].
- "quick_revision": 4-7 one-line takeaways, exam se pehle padhne ke liye.
- "mindmap": center = chapter naam, 3-6 branches, har ek ke 2-4 children (1-3 shabd).

B) MCQs - exactly ${mcqCount}, exam-level aur concept-based (question, options aur explanation ki bhasha upar ke LANGUAGE RULES ke hisaab se):
- "Teacher ne kya kaha" type sawaal nahi, concept/application type. Har concept se alag sawaal, repeat nahi.
- 4 options, sirf 1 sahi (correct_index 0-3), galat options believable hon.
- "explanation": 1-2 line, kyun sahi hai.
- "timestamp_seconds": us concept ka time.

STRICT: sirf neeche diye segments ki jaankari use karo. Bahar ka kuch mat jodo.

SEGMENTS:
${segmentsToText(segs)}`;

  const result = await callGemini(
    [{ role: 'user', parts: [{ text: prompt }] }],
    {
      responseMimeType: 'application/json',
      responseSchema: chapterSchema,
      maxOutputTokens: 14000,
    }
  );

  const data = parseJson(result?.text);
  const sections = (data.sections || []).map((s: any) => ({
    ...s,
    start_sec: clamp(Math.round(s.start_sec || ch.start_sec), ch.start_sec, ch.end_sec),
    points: Array.isArray(s.points) ? s.points : [],
  }));

  const mcqs = (data.mcqs || [])
    .filter(
      (q: any) =>
        q?.question &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        Number.isInteger(q.correct_index) &&
        q.correct_index >= 0 &&
        q.correct_index < 4
    )
    .map((q: any, k: number) => {
      const correctText = q.options[q.correct_index];
      const opts = shuffle<string>(q.options);
      return {
        id: `${ch.start_sec}-${k}`,
        question: String(q.question),
        options: opts,
        correct_index: opts.indexOf(correctText),
        explanation: String(q.explanation || ''),
        timestamp_seconds: clamp(
          Math.round(q.timestamp_seconds || ch.start_sec),
          ch.start_sec,
          ch.end_sec
        ),
        chapter: ch.title,
      };
    });

  return {
    notes: {
      intro: data.intro || '',
      sections,
      terms: Array.isArray(data.terms) ? data.terms : [],
      important_points: Array.isArray(data.important_points) ? data.important_points : [],
      quick_revision: Array.isArray(data.quick_revision) ? data.quick_revision : [],
      mindmap: data.mindmap,
    },
    mcqs,
  };
}

export async function handleVisual(body: Record<string, unknown>) {
  const { videoId, item, lang } = body;
  if (typeof videoId !== 'string' || !VIDEO_ID_RE.test(videoId)) {
    throw new ApiError(400, 'Invalid visual request.');
  }
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new ApiError(400, 'Invalid visual item.');
  }
  const itemRec = item as Record<string, unknown>;
  if (typeof itemRec.title !== 'string' || !itemRec.title.trim()) {
    throw new ApiError(400, 'Invalid visual item title.');
  }

  const langP = sanitizeLangProfile(lang);
  const safeTitle = itemRec.title.trim().slice(0, 120);
  const safeKind = typeof itemRec.kind === 'string' ? itemRec.kind.slice(0, 40) : 'diagram';
  const safeDesc = typeof itemRec.description === 'string' ? itemRec.description.slice(0, 300) : '';

  const planPrompt = `YouTube video titled "${safeTitle}" mein board/screen par "${safeTitle}" (${safeKind}) ke liye ek educational diagram required hai. Context: ${safeDesc}

Decide karo:
- "needs_image" = true (agar ye topic diagram/circuit/graph/structure/flowchart maangta hai).
- "reason": 1 line caption (${MEDIUM_NAME[langP.medium]}).
- "labels": important labels/values.
- "image_prompt": ENGLISH mein detailed instruction for drawing: shapes, components, connections, labels.`;

  let planRes;
  try {
    planRes = await callGemini(
      [{ role: 'user', parts: [{ text: planPrompt }] }],
      {
        responseMimeType: 'application/json',
        responseSchema: planSchema,
        maxOutputTokens: 2048,
      }
    );
  } catch (err) {
    // Propagate configuration/auth/rate errors as clean JSON errors
    if (err instanceof ApiError && (err.status === 503 || err.status === 502 || err.status === 429 || err.status === 400)) {
      throw err;
    }
    return { skip: true };
  }

  let plan: VisualPlan;
  try {
    plan = parseJson(planRes?.text) as VisualPlan;
  } catch {
    return { skip: true };
  }

  if (!plan?.needs_image) {
    return { skip: true };
  }

  const labels = Array.isArray(plan.labels) ? plan.labels.slice(0, 20) : [];
  const labelsLine = labels.length
    ? `Write ONLY these labels, spelled exactly, nothing else: ${labels.join(' | ')}.`
    : '';

  try {
    const svgRes = await callGemini(
      [
        {
          role: 'user',
          parts: [
            {
              text: `Create a neat hand-drawn notebook-style educational diagram as clean inline <svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg"> on a plain white background (#ffffff) with dark blue/black pen strokes (#1e3a8a, #0f172a), red/green accents (#dc2626, #16a34a), and large readable labels.
Subject: ${safeTitle}
Details: ${String(plan.image_prompt || '').slice(0, 600)}
${labelsLine}
Return ONLY the <svg>...</svg> markup, no markdown fences, no scripts.`,
            },
          ],
        },
      ],
      { maxOutputTokens: 3500 }
    );

    const svg = sanitizeSvg(svgRes?.text || '');
    if (!svg) {
      return { skip: true };
    }

    return {
      kind: 'svg',
      content: svg,
      caption: plan.reason || safeDesc,
    };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 503 || err.status === 502 || err.status === 429)) {
      throw err;
    }
    return { skip: true };
  }
}

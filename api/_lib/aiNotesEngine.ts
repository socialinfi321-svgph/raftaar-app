import { GoogleGenAI, MediaResolution, ThinkingLevel, Type } from '@google/genai';
import { ApiError, sanitizePublicMessage } from './http.ts';
import { evaluateChunkTranscript, fetchVideoTranscript } from './transcriptService.ts';
import {
  clamp,
  sanitizeSvg,
  uniformOutline,
  validateChapterOutput,
  validateDigestOutput,
  validateOutlineOutput,
  validateVisualPlan,
  VIDEO_ID_RE,
  type BoardItem,
  type Chapter,
  type LangMeta,
  type LangProfile,
  type Medium,
  type Segment,
  type VisualPlan,
} from './validators.ts';

export const GEMINI_MODELS = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;
export { VIDEO_ID_RE, sanitizeSvg };

const PER_CALL_TIMEOUT_MS = 32_000;
const CALL_BUDGET_MS = 48_000;

const MEDIUM_NAME: Record<Medium, string> = {
  english: 'English',
  hindi: 'Hindi (Devanagari)',
  hinglish: 'Hinglish',
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fmt(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? h + ':' : ''}${mm}:${String(r).padStart(2, '0')}`;
}

function tryParseJson(text: string | undefined): { ok: true; data: unknown } | { ok: false; error: string } {
  const raw = (text || '').trim();
  if (!raw) return { ok: false, error: 'Empty response text.' };
  const clean = raw.replace(/```json|```/gi, '').trim();
  try {
    return { ok: true, data: JSON.parse(clean) };
  } catch {
    // Attempt extracting outermost JSON object if wrapped in commentary
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return { ok: true, data: JSON.parse(clean.slice(firstBrace, lastBrace + 1)) };
      } catch (innerErr: unknown) {
        return {
          ok: false,
          error: String((innerErr as { message?: unknown })?.message || 'Malformed JSON'),
        };
      }
    }
    return { ok: false, error: 'Malformed JSON output.' };
  }
}

function logDiagnostic(stage: string, details: Record<string, string | number | boolean | undefined>) {
  // Structured diagnostic log — never log API keys, tokens, or raw transcript/prompt payloads
  const safeFields: Record<string, string | number | boolean> = { stage };
  for (const [k, v] of Object.entries(details)) {
    if (v === undefined) continue;
    safeFields[k] = typeof v === 'string' ? sanitizePublicMessage(v, '') : v;
  }
  console.info('[ai-notes]', JSON.stringify(safeFields));
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

export function getServerGeminiKey(): string {
  const candidates = [
    findEnvKey('GEMINI_API_KEY'),
    findEnvKey('GOOGLE_API_KEY'),
    findEnvKey('GOOGLE_GENERATIVE_AI_API_KEY'),
  ];
  for (const candidate of candidates) {
    const cleaned = candidate
      .replace(/^['"]|['"]$/g, '')
      .replace(/^value\s*:\s*/i, '')
      .trim();
    if (cleaned) return cleaned;
  }
  return '';
}

function getAiClient(vertexai = false): GoogleGenAI {
  const rawKey = getServerGeminiKey();
  if (!rawKey) {
    throw new ApiError(
      503,
      'GEMINI_API_KEY server par configured nahi hai. Vercel Environment Variables ya Settings > Secrets me GEMINI_API_KEY add karein aur redeploy karein.'
    );
  }
  return new GoogleGenAI({
    apiKey: rawKey,
    ...(vertexai ? { vertexai: true } : {}),
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
  const numericStatus = Number(
    (err as { status?: unknown; statusCode?: unknown })?.status ??
      (err as { statusCode?: unknown })?.statusCode
  );
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

export function isVideoInaccessibleError(err: unknown): boolean {
  const { raw, message } = parseUpstreamError(err);
  const combined = `${message} ${raw}`;
  return /unable to fetch|cannot access youtube|private video|video unavailable|age[- ]restricted|copyright|members[- ]only|unsupported youtube|could not retrieve video|no captions|video not found/i.test(
    combined
  );
}

export function toSafeApiError(err: unknown, fallback: string): ApiError {
  if (err instanceof ApiError) return err;
  const { status, reason, service, message, raw } = parseUpstreamError(err);

  if (/API_KEY_INVALID|API key not valid/i.test(raw) || reason === 'API_KEY_INVALID') {
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
      'Gemini API rate limit reach ho gayi hai. Thodi der baad try karein.',
      { 'Retry-After': '5' }
    );
  }
  if (isVideoInaccessibleError(err)) {
    return new ApiError(
      422,
      'Is video ka transcript aur public YouTube video stream access nahi ho paya (private, restricted, ya captions unavailable).'
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
    return new ApiError(504, 'AI request timeout ho gayi. Chhote chunk ke saath dubara try karein.');
  }

  const display = message ? `${message}${reason ? ` [${reason}]` : ''}` : raw || fallback;
  return new ApiError(502, sanitizePublicMessage(display, fallback));
}

function classifyGeminiFailure(err: unknown): 'model_not_found' | 'transient' | 'fatal' {
  const { status, reason, raw } = parseUpstreamError(err);

  if (
    /API_KEY_INVALID|API key not valid|PERMISSION_DENIED|UNAUTHENTICATED|INVALID_ARGUMENT/i.test(raw) ||
    reason === 'API_KEY_INVALID' ||
    isVideoInaccessibleError(err) ||
    status === 400 ||
    status === 401 ||
    status === 403
  ) {
    return 'fatal';
  }

  if (status === 404 || /\b404\b|NOT_FOUND/i.test(raw)) {
    return 'model_not_found';
  }

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
  contents: unknown,
  config: Record<string, unknown>,
  metaLog: { stage: string; videoId?: string },
  models: readonly string[] = GEMINI_MODELS
) {
  const rawKey = getServerGeminiKey();
  if (!rawKey) {
    throw new ApiError(
      503,
      'GEMINI_API_KEY server par configured nahi hai. Vercel Environment Variables ya Settings > Secrets me GEMINI_API_KEY add karein aur redeploy karein.'
    );
  }

  const endpointModes = rawKey.startsWith('AQ.') ? [true, false] : [false];
  const waits = [1000, 2200];
  const callStartedAt = Date.now();
  let lastError: unknown;

  for (let modeIdx = 0; modeIdx < endpointModes.length; modeIdx++) {
    const ai = getAiClient(endpointModes[modeIdx]);
    let tryNextEndpointMode = false;

    for (const model of models) {
      for (let i = 0; i <= waits.length; i++) {
        const elapsed = Date.now() - callStartedAt;
        if (elapsed >= CALL_BUDGET_MS) {
          throw toSafeApiError(lastError, 'AI request timeout budget exceeded.');
        }

        const waitMs = Math.min(2000, pauseUntil - Date.now());
        if (waitMs > 0) await sleep(waitMs);

        const remainingBudget = Math.max(4000, CALL_BUDGET_MS - (Date.now() - callStartedAt));
        const attemptTimeout = Math.min(PER_CALL_TIMEOUT_MS, remainingBudget);

        try {
          const response = await ai.models.generateContent({
            model,
            contents: contents as any,
            config: {
              ...config,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              abortSignal: AbortSignal.timeout(attemptTimeout),
            } as any,
          });
          logDiagnostic(metaLog.stage, {
            videoId: metaLog.videoId,
            model,
            latencyMs: Date.now() - callStartedAt,
            ok: true,
          });
          return response;
        } catch (e: unknown) {
          lastError = e;
          const kind = classifyGeminiFailure(e);
          const parsed = parseUpstreamError(e);
          logDiagnostic(metaLog.stage, {
            videoId: metaLog.videoId,
            model,
            kind,
            status: parsed.status,
            reason: parsed.reason || parsed.message.slice(0, 80),
            latencyMs: Date.now() - callStartedAt,
          });

          if (kind === 'fatal') {
            const isKeyEndpointMismatch =
              modeIdx + 1 < endpointModes.length &&
              (/API_KEY_INVALID|API key not valid/i.test(parsed.raw) ||
                parsed.reason === 'API_KEY_INVALID');
            if (isKeyEndpointMismatch) {
              tryNextEndpointMode = true;
              break;
            }
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
      if (tryNextEndpointMode) break;
    }
    if (!tryNextEndpointMode) break;
  }
  throw toSafeApiError(lastError, 'Gemini request failed.');
}

async function repairJsonWithGemini(
  brokenText: string,
  schema: Record<string, unknown>,
  validationIssue: string,
  metaLog: { stage: string; videoId?: string }
): Promise<unknown> {
  const clipped = brokenText.slice(0, 14_000);
  const repairPrompt = `Fix the JSON below so it strictly matches the required schema and passes validation.
Validation issue: ${validationIssue}
Do NOT invent new factual content — preserve all facts, timestamps, definitions, and numbers already present, and only repair structure/missing required wrapper fields or syntax.

BROKEN OUTPUT:
${clipped}`;

  const res = await callGemini(
    [{ role: 'user', parts: [{ text: repairPrompt }] }],
    {
      responseMimeType: 'application/json',
      responseSchema: schema,
      maxOutputTokens: 12000,
    },
    { stage: `${metaLog.stage}-repair`, videoId: metaLog.videoId }
  );
  const parsed = tryParseJson(res?.text);
  if ('error' in parsed) {
    throw new ApiError(502, `AI output format invalid raha (${parsed.error}). Dobara try karein.`);
  }
  return parsed.data;
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
    const summary = typeof rec.summary === 'string' ? rec.summary.trim().slice(0, 1400) : '';
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
        ? rec.formulas.slice(0, 8).map((x) => String(x || '').slice(0, 220))
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

function buildTranscriptDigestPrompt(
  transcriptText: string,
  safeTitle: string,
  startSec: number,
  endSec: number,
  withMeta: boolean
): string {
  return `Tum ek dhyaan se padhne wale topper student ho. Neeche is lecture ke ${fmt(startSec)} se ${fmt(endSec)} wale hisse ka ASLI timestamped transcript hai.${safeTitle ? `\nVideo title (context ke liye): ${safeTitle}` : ''}

Is transcript ke aadhar par concept-wise "segments" banao (har segment = ek topic/concept/example, lagbhag 1-3 minute). Har segment mein:
- "t": segment shuru hone ka exact timestamp SECONDS mein (poore video ke hisaab se, jo transcript ke [mm:ss] timestamp se match kare).
- "title": chhota topic naam.
- "summary": teacher ne jo samjhaya uska 3-5 vakya ka poora saar. Koi important baat skip mat karo. Word-by-word copy mat karo, samajh kar likho.
- "definition": agar teacher ne koi definition/meaning boli, ek saaf vakya mein, usi bhasha mein jisme teacher ne boli (English boli toh English mein). Nahi boli toh "".
- "intuition": teacher ne use aasaan bhasha mein kaise samjhaya (analogy, kahani, roz ki misaal, tarkeeb). Nahi hai toh "".
- "examples": teacher ne jo examples/numericals karaye (chhote). Nahi hai toh [].
- "formulas": jo formula/equation bola ya likha (symbols ke saath). Nahi hai toh [].
- "important": SIRF tab, jab teacher khud kahe ki ye important hai / yaad rakho / likh lo / exam mein aata hai / dhyan do. Uski baat ek line mein. Warna "".

Agar transcript mein teacher kisi board diagram, circuit, graph, ray figure, flowchart ya table draw/explain kar raha hai, usse "board" mein daalo:
- "title", "kind" (diagram/circuit/graph/table/flowchart/figure), "description" (jo components/axes/labels teacher ne bataye)
- "t": jab shuru hua, "best_t": jab poora samjhaya gaya (seconds)
- "importance": 3 = concept samajhne ke liye zaroori, 2 = madadgaar, 1 = saadharan.
Agar koi drawing/figure explain nahi hua toh board [] rakho.

BHASHA: teacher jis bhasha mein bole usi mein likho - Hindi bole toh Devanagari Hindi, English bole toh English, mixed bole toh mixed. Technical terms aur definitions waise hi jaise teacher ne boli (English term English mein).
STRICT: SIRF neeche diye TRANSCRIPT mein jo hai wahi likho. Title se guess karke ya bahar ki jaankari mat jodo. Intro, "like subscribe", sponsors jaisi baatein chhod do.${withMeta ? metaPrompt() : ''}

TRANSCRIPT (${fmt(startSec)} - ${fmt(endSec)}):
${transcriptText}`;
}

function buildVideoDigestPrompt(
  safeTitle: string,
  startSec: number,
  endSec: number,
  withMeta: boolean
): string {
  return `Tum ek dhyaan se padhne wale topper student ho. Is lecture ke ${fmt(startSec)} se ${fmt(endSec)} wale hisse ko dhyan se SUNO aur DEKHO.${safeTitle ? `\nVideo title (hint): ${safeTitle}` : ''}

Is hisse ko concept-wise "segments" mein todo (har segment = ek topic/concept/example, lagbhag 1-3 minute). Har segment mein:
- "t": segment shuru hone ka time SECONDS mein, is clip ke shuru se (clip start = 0).
- "title": chhota topic naam.
- "summary": teacher ne jo samjhaya uska 3-5 vakya ka poora saar. Koi important baat skip mat karo. Word-by-word copy mat karo, samajh kar likho.
- "definition": agar teacher ne koi definition/meaning boli, ek saaf vakya mein, usi bhasha mein jisme teacher ne boli (English boli toh English mein). Nahi boli toh "".
- "intuition": teacher ne use aasaan bhasha mein kaise samjhaya (analogy, kahani, roz ki misaal, tarkeeb). Nahi hai toh "".
- "examples": teacher ne jo examples/numericals karaye (chhote). Nahi hai toh [].
- "formulas": jo formula/equation bola ya likha (symbols ke saath). Nahi hai toh [].
- "important": SIRF tab, jab teacher khud kahe ki ye important hai / yaad rakho / likh lo / exam mein aata hai / dhyan do. Uski baat ek line mein. Warna "".

Board/screen par jab koi asli drawing bane (circuit, diagram, graph, figure, flowchart, table), usse "board" mein daalo:
- "title", "kind" (diagram/circuit/graph/table/flowchart/figure), "description" (kya shape hai, kaun si labels/values hain, sirf jo dikh raha hai)
- "t": jab banana shuru kare, "best_t": jab POORA bana ho aur saari labels likhi hon (clip-relative seconds)
- "importance": 3 = concept samajhne ke liye zaroori, 2 = madadgaar, 1 = chhoti/saadharan cheez.
Sirf asli drawings daalo. Sirf text/heading ho toh board khali rakho.

BHASHA: teacher jis bhasha mein bole usi mein likho - Hindi bole toh Devanagari Hindi, English bole toh English, mixed bole toh mixed. Technical terms aur definitions waise hi jaise teacher ne boli (English term English mein).
STRICT: sirf video mein jo hai wahi likho, bahar ki jaankari mat jodo. Intro, advertisement, "like subscribe" jaisi cheezein chhod do.${withMeta ? metaPrompt() : ''}`;
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
  const expectMeta = Boolean(withMeta);
  const activeSchema = expectMeta ? digestSchemaWithMeta : digestSchema;

  // Step 1A: Best-effort stateless transcript retrieval first
  const transcriptResult = await fetchVideoTranscript(videoId);
  const transcriptSlice =
    transcriptResult.status === 'ok'
      ? evaluateChunkTranscript(transcriptResult.entries, floorStart, ceilEnd)
      : { sufficient: false, reason: transcriptResult.reason, lines: [], text: '', wordCount: 0, coveredSeconds: 0 };

  let sourceMode: 'transcript' | 'youtube_video' = 'youtube_video';
  let contents: unknown;
  let config: Record<string, unknown> = {
    responseMimeType: 'application/json',
    responseSchema: activeSchema,
    maxOutputTokens: 12000,
  };

  if (transcriptSlice.sufficient) {
    sourceMode = 'transcript';
    logDiagnostic('digest-source', {
      videoId,
      source: 'transcript',
      lang: transcriptResult.language,
      auto: transcriptResult.isAutoGenerated,
      words: transcriptSlice.wordCount,
    });
    const prompt = buildTranscriptDigestPrompt(
      transcriptSlice.text,
      safeTitle,
      floorStart,
      ceilEnd,
      expectMeta
    );
    contents = [{ role: 'user', parts: [{ text: prompt }] }];
  } else {
    // Step 1B: Multimodal Gemini YouTube URL fallback (never guess from title alone!)
    sourceMode = 'youtube_video';
    logDiagnostic('digest-source', {
      videoId,
      source: 'youtube_video',
      transcriptStatus: transcriptResult.status,
      reason: transcriptSlice.reason,
    });
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const prompt = buildVideoDigestPrompt(safeTitle, floorStart, ceilEnd, expectMeta);
    contents = [
      {
        role: 'user',
        parts: [
          {
            fileData: { fileUri: videoUrl, mimeType: 'video/*' },
            videoMetadata: { startOffset: `${floorStart}s`, endOffset: `${ceilEnd}s` },
          },
          { text: prompt },
        ],
      },
    ];
    config = {
      ...config,
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW,
    };
  }

  // Single bounded Gemini request on server (no recursive chunk splitting inside Vercel handler)
  const res = await callGemini(contents, config, { stage: 'digest', videoId });
  const rawText = res?.text || '';
  const parsed = tryParseJson(rawText);

  let validated =
    'data' in parsed
      ? validateDigestOutput(parsed.data, floorStart, ceilEnd, expectMeta)
      : { valid: false, reason: parsed.error, segments: [] as Segment[], board: [] as BoardItem[], meta: undefined as LangMeta | undefined };

  // At most 1 bounded repair attempt if JSON syntax or schema validation failed
  if (!validated.valid) {
    logDiagnostic('digest-repair-needed', { videoId, reason: validated.reason });
    const repaired = await repairJsonWithGemini(
      rawText,
      activeSchema,
      validated.reason || 'Schema mismatch',
      { stage: 'digest', videoId }
    );
    validated = validateDigestOutput(repaired, floorStart, ceilEnd, expectMeta);
  }

  if (!validated.valid || validated.segments.length === 0) {
    throw new ApiError(
      sourceMode === 'youtube_video' ? 422 : 502,
      validated.reason ||
        'AI is lecture chunk se grounded concepts extract nahi kar paya. Kripya dubara try karein.'
    );
  }

  return {
    meta: validated.meta,
    segments: validated.segments,
    board: validated.board,
    source: sourceMode,
  };
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
      },
      { stage: 'outline' }
    );
    const parsed = tryParseJson(result?.text);
    const validated = parsed.ok ? validateOutlineOutput(parsed.data, dur) : null;
    if (validated) {
      return { chapters: validated };
    }
    return { chapters: uniformOutline(dur) };
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.status === 503 || err.status === 502 || err.status === 429 || err.status === 504)
    ) {
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
  // Concept density aligned (~1 MCQ per 1.5m), capped sensibly by concept count so sparse segments aren't padded with filler
  const durationTarget = clamp(Math.round(mins / 1.5), 5, 14);
  const conceptTarget = clamp(segs.length * 3, 4, 14);
  const mcqCount = Math.max(4, Math.min(durationTarget, Math.max(5, conceptTarget)));

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

B) MCQs - ${mcqCount} high-quality exam-level questions (question, options aur explanation ki bhasha upar ke LANGUAGE RULES ke hisaab se):
- Mix of conceptual, factual, application, aur numerical/formula-based questions (sirf concept density ke hisaab se — repetitive filler mat jodo).
- "Teacher ne kya kaha" ya video meta-questions mat banao. Har concept se alag sawaal.
- 4 distinct believable options, sirf 1 sahi (correct_index 0-3).
- "explanation": 1-2 line, kyun sahi hai aur galat options kyun galat hain.
- "timestamp_seconds": us concept ka time (${ch.start_sec} se ${ch.end_sec} ke beech).

STRICT: sirf neeche diye segments ki jaankari use karo. Bahar ka kuch mat jodo.

SEGMENTS:
${segmentsToText(segs)}`;

  const result = await callGemini(
    [{ role: 'user', parts: [{ text: prompt }] }],
    {
      responseMimeType: 'application/json',
      responseSchema: chapterSchema,
      maxOutputTokens: 14000,
    },
    { stage: 'chapter' }
  );

  const rawText = result?.text || '';
  const parsed = tryParseJson(rawText);
  const minRequiredMcqs = Math.min(mcqCount, Math.max(2, segs.length));

  let validated: ReturnType<typeof validateChapterOutput> =
    'data' in parsed
      ? validateChapterOutput(parsed.data, ch, minRequiredMcqs)
      : { valid: false, reason: parsed.error };

  // At most 1 bounded repair attempt on malformed JSON or schema violation
  if (!validated.valid) {
    logDiagnostic('chapter-repair-needed', { reason: validated.reason });
    const repaired = await repairJsonWithGemini(
      rawText,
      chapterSchema,
      validated.reason || 'Invalid chapter schema',
      { stage: 'chapter' }
    );
    validated = validateChapterOutput(repaired, ch, minRequiredMcqs);
  }

  if (!validated.valid || !validated.notes || !validated.mcqs) {
    throw new ApiError(
      502,
      validated.reason || 'Chapter notes schema validation fail ho gayi. Dobara try karein.'
    );
  }

  return {
    notes: validated.notes,
    mcqs: validated.mcqs,
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
  const safeDesc = typeof itemRec.description === 'string' ? itemRec.description.trim().slice(0, 400) : '';
  const safeTranscriptSnippet =
    typeof itemRec.transcriptSnippet === 'string'
      ? itemRec.transcriptSnippet.trim().slice(0, 1000)
      : '';

  const tRaw = Number(itemRec.t);
  const bestTRaw = Number(itemRec.best_t);
  const anchorT = Number.isFinite(tRaw) && tRaw >= 0 ? Math.floor(tRaw) : 0;
  const bestT = Number.isFinite(bestTRaw) && bestTRaw >= 0 ? Math.floor(bestTRaw) : anchorT;

  // Dynamic clip window around drawing duration, clamped 12s..45s
  const clipStart = Math.max(0, Math.min(anchorT, bestT) - 4);
  const rawEnd = Math.max(bestT + 6, anchorT + 12);
  const clipEnd = Math.min(28800, Math.min(clipStart + 45, Math.max(clipStart + 12, rawEnd)));

  const clipPrompt = `Is clip (${fmt(clipStart)}-${fmt(clipEnd)}) mein teacher ne board/screen par "${safeTitle}" (${safeKind}) banaya hai.
Step 1 note: ${safeDesc || '(none)'}${safeTranscriptSnippet ? `\nRelevant lecture notes/transcript:\n${safeTranscriptSnippet}` : ''}

Clip ko dhyan se dekho aur decide karo:
- "needs_image" = true SIRF agar yahan asli drawing hai (circuit, diagram, graph, ray/geometry figure, structure, flowchart, table) jo concept samajhne ke liye educational diagram maangti hai. Sirf plain text heading ho ya evidence kam ho toh false.
- "reason": 1 line caption (${MEDIUM_NAME[langP.medium]}).
- "labels": board par jo exact labels/values/symbols dikh rahe hain (max 15).
- "image_prompt": ENGLISH mein accurate layout instruction (shapes, components, arrows, axes, labels, connections — sirf jo evidence mein hai).`;

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  let plan: VisualPlan | null = null;
  try {
    const clipRes = await callGemini(
      [
        {
          role: 'user',
          parts: [
            {
              fileData: { fileUri: videoUrl, mimeType: 'video/*' },
              videoMetadata: { startOffset: `${clipStart}s`, endOffset: `${clipEnd}s` },
            },
            { text: clipPrompt },
          ],
        },
      ],
      {
        responseMimeType: 'application/json',
        responseSchema: planSchema,
        mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH,
        maxOutputTokens: 2048,
      },
      { stage: 'visual-plan-clip', videoId }
    );
    const parsed = tryParseJson(clipRes?.text);
    plan = parsed.ok ? validateVisualPlan(parsed.data) : null;
  } catch (err) {
    if (
      err instanceof ApiError &&
      (err.status === 503 || err.status === 502 || err.status === 429) &&
      !isVideoInaccessibleError(err)
    ) {
      // Only propagate fatal key/rate errors if NOT simple video unavailability
      if (err.status === 503 || err.status === 429 || /key/i.test(err.message)) {
        throw err;
      }
    }
    // Fall back gracefully ONLY if Step 1 board description / transcript context has substantial real detail
    if (safeDesc.length >= 20 || safeTranscriptSnippet.length >= 30) {
      try {
        const textPlanPrompt = `Lecture segment "${safeTitle}" (${safeKind}) ke liye educational notebook diagram plan karo.
Verified lecture board description: ${safeDesc}
${safeTranscriptSnippet ? `Transcript/segment context:\n${safeTranscriptSnippet}` : ''}

Decide karo:
- "needs_image" = true sirf agar sufficient structural details hain diagram/circuit/graph/flowchart draw karne ke liye; warna false.
- "reason": 1 line caption (${MEDIUM_NAME[langP.medium]}).
- "labels": exact technical labels/symbols mentioned above.
- "image_prompt": ENGLISH detailed layout specification grounded strictly in the provided description.`;

        const fallbackRes = await callGemini(
          [{ role: 'user', parts: [{ text: textPlanPrompt }] }],
          {
            responseMimeType: 'application/json',
            responseSchema: planSchema,
            maxOutputTokens: 2048,
          },
          { stage: 'visual-plan-text', videoId }
        );
        const parsed = tryParseJson(fallbackRes?.text);
        plan = parsed.ok ? validateVisualPlan(parsed.data) : null;
      } catch (innerErr) {
        if (innerErr instanceof ApiError && (innerErr.status === 503 || innerErr.status === 429)) {
          throw innerErr;
        }
        return { skip: true };
      }
    } else {
      return { skip: true };
    }
  }

  if (!plan?.needs_image || !plan.image_prompt) {
    return { skip: true };
  }

  const labels = plan.labels.slice(0, 16);
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
              text: `Create a clean, hand-drawn student-notebook educational diagram as inline <svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg"> on a plain white background (#ffffff) with dark blue/black pen strokes (#1e3a8a, #0f172a), red/green accents (#dc2626, #16a34a), and crisp readable text labels.
Subject: ${safeTitle}
Details: ${plan.image_prompt.slice(0, 700)}
${labelsLine}
STRICT SECURITY & FORMAT: Return ONLY pure <svg>...</svg> markup with basic vector shapes (<rect>, <circle>, <ellipse>, <line>, <polyline>, <polygon>, <path>, <text>, <g>, <defs>, <marker>). NEVER include <script>, <foreignObject>, <iframe>, <image>, on* attributes, or external URLs.`,
            },
          ],
        },
      ],
      { maxOutputTokens: 3500 },
      { stage: 'visual-svg', videoId }
    );

    const svg = sanitizeSvg(svgRes?.text || '');
    if (!svg) {
      return { skip: true };
    }

    return {
      kind: 'svg',
      content: svg,
      caption: plan.reason || safeDesc || safeTitle,
    };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 503 || err.status === 429)) {
      throw err;
    }
    return { skip: true };
  }
}

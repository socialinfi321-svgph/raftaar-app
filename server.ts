import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const GEMINI_MODELS = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

type Medium = 'english' | 'hindi' | 'hinglish';

interface LangMeta {
  detected_medium: Medium;
  detected_subject: string;
  detected_board: string;
}

interface LangProfile {
  medium: Medium;
  pureEnglish: boolean;
  subject: string;
  board: string;
  key: string;
}

interface Segment {
  t: number;
  title: string;
  summary: string;
  definition?: string;
  intuition?: string;
  examples?: string[];
  formulas?: string[];
  important?: string;
}

interface BoardItem {
  id: string;
  t: number;
  best_t: number;
  title: string;
  kind: string;
  description: string;
  importance: number;
}

interface Chapter {
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

function sanitizeSvg(raw: string): string | null {
  const clean = (raw || '')
    .replace(/```svg|```html|```/gi, '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?>[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(?:href|xlink:href)\s*=\s*["']\s*javascript:[^"']*["']/gi, '')
    .trim();
  const match = clean.match(/<svg[\s\S]*<\/svg>/i);
  return match ? match[0] : null;
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

let pauseUntil = 0;

async function callGemini(contents: any, config: any, models: string[] = GEMINI_MODELS) {
  const ai = getAiClient();
  const waits = [2500, 7000, 14000];
  let lastError: any;

  for (const model of models) {
    for (let i = 0; i <= waits.length; i++) {
      const waitMs = pauseUntil - Date.now();
      if (waitMs > 0) await sleep(waitMs);
      try {
        return await ai.models.generateContent({ model, contents, config });
      } catch (e: any) {
        lastError = e;
        const msg = String(e?.message || '');
        if (/404|NOT_FOUND/.test(msg)) break;
        const retryable = /503|UNAVAILABLE|429|RESOURCE_EXHAUSTED|500|INTERNAL|fetch failed/i.test(msg);
        if (!retryable) throw e;
        if (i < waits.length) {
          const backoff = waits[i] + Math.random() * 1200;
          pauseUntil = Math.max(pauseUntil, Date.now() + backoff);
          continue;
        }
        break;
      }
    }
  }
  throw lastError || new Error('Gemini request failed');
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

async function runDigest(
  videoUrl: string,
  start: number,
  end: number,
  opts: { title: string; withMeta: boolean },
  depth = 0
): Promise<{ segments: Segment[]; board: BoardItem[]; meta?: LangMeta }> {
  const prompt = `Tum ek dhyaan se padhne wale topper student ho. Is lecture ke ${fmt(start)} se ${fmt(end)} wale hisse ko dhyan se SUNO aur DEKHO.${opts.title ? `\nVideo title (hint): ${opts.title}` : ''}

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

STRICT: sirf video mein jo hai wahi likho, bahar ki jaankari mat jodo. Intro, advertisement, "like subscribe" jaisi cheezein chhod do.${opts.withMeta ? metaPrompt() : ''}`;

  try {
    const res = await callGemini(
      [
        {
          role: 'user',
          parts: [
            {
              fileData: { fileUri: videoUrl },
              videoMetadata: { startOffset: `${start}s`, endOffset: `${end}s` },
            },
            { text: prompt },
          ],
        },
      ],
      {
        responseMimeType: 'application/json',
        responseSchema: opts.withMeta ? digestSchemaWithMeta : digestSchema,
        mediaResolution: 'MEDIA_RESOLUTION_LOW',
        maxOutputTokens: 12000,
      }
    );
    return normalizeDigest(parseJson(res?.text), start, end);
  } catch (e: any) {
    const msg = String(e?.message || '');
    if (/API key|PERMISSION_DENIED|INVALID_ARGUMENT|private|unsupported/i.test(msg)) throw e;
    if (depth < 1 && end - start >= 240) {
      const mid = start + Math.floor((end - start) / 2);
      const a = await runDigest(videoUrl, start, mid, opts, depth + 1);
      const b = await runDigest(videoUrl, mid, end, { ...opts, withMeta: false }, depth + 1);
      return {
        meta: a.meta,
        segments: [...a.segments, ...b.segments],
        board: [...a.board, ...b.board],
      };
    }
    throw e;
  }
}

function uniformOutline(durationSec: number): Chapter[] {
  const out: Chapter[] = [];
  for (let s = 0, i = 1; s < durationSec; s += 600, i++) {
    out.push({ title: `Part ${i}`, start_sec: s, end_sec: Math.min(s + 600, durationSec) });
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

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  /* ---------------- Existing YouTube Search Proxy ---------------- */
  app.get('/api/youtube-search', async (req, res) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 200) : '';
      if (!q) {
        res.json({ items: [] });
        return;
      }

      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'hi,en-US,en;q=0.9',
        },
      });

      if (!response.ok) {
        res.json({ items: [] });
        return;
      }

      const html = await response.text();
      const match =
        html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
        html.match(/ytInitialData = ({.*?});/s);
      if (!match) {
        res.json({ items: [] });
        return;
      }

      const data = JSON.parse(match[1]);

      const findVideos = (obj: any, results: any[] = []): any[] => {
        if (!obj || typeof obj !== 'object') return results;
        if (obj.videoRenderer && obj.videoRenderer.videoId) {
          results.push(obj.videoRenderer);
        }
        for (const key of Object.keys(obj)) {
          if (key !== 'reelShelfRenderer' && key !== 'shortsLockupViewModel') {
            findVideos(obj[key], results);
          }
        }
        return results;
      };

      const rawVideos = findVideos(data);
      const seenIds = new Set<string>();
      const items: any[] = [];

      for (const v of rawVideos) {
        const vidId = v.videoId;
        if (!vidId || seenIds.has(vidId)) continue;
        seenIds.add(vidId);

        const title =
          v.title?.runs?.map((r: any) => r.text).join('') || v.title?.simpleText || '';
        const duration = v.lengthText?.simpleText || '';
        const desc =
          v.detailedMetadataSnippets?.[0]?.snippetText?.runs
            ?.map((r: any) => r.text)
            .join('') || '';
        const channelTitle = v.ownerText?.runs?.[0]?.text || '';
        const channelId =
          v.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';
        const channelAvatar =
          v.channelThumbnailSupportedRendered?.channelThumbnailWithLinkRenderer?.thumbnail
            ?.thumbnails?.[0]?.url ||
          `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(
            channelTitle || 'Educator'
          )}`;

        const viewStr = v.viewCountText?.simpleText || '';
        let viewCount: number | undefined;
        if (viewStr) {
          const numMatch = viewStr.replace(/,/g, '').match(/\d+/);
          if (numMatch) viewCount = parseInt(numMatch[0], 10);
        }

        const lowerTitle = title.toLowerCase();
        let isShort =
          lowerTitle.includes('#shorts') ||
          lowerTitle.includes('#short') ||
          lowerTitle.includes('/shorts/');
        if (!isShort && duration) {
          const parts = duration.split(':').map(Number);
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            if (parts[0] * 60 + parts[1] <= 65) isShort = true;
          } else if (parts.length === 1 && !isNaN(parts[0])) {
            if (parts[0] <= 65) isShort = true;
          }
        }

        if (!isShort) {
          items.push({
            id: vidId,
            title,
            description: desc,
            thumbnail: `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
            channelId,
            channelTitle: channelTitle || 'Educator',
            channelAvatar,
            publishedAt: new Date().toISOString(),
            viewCount,
            duration,
          });
        }
      }

      res.json({ items: items.slice(0, 30) });
    } catch {
      res.json({ items: [] });
    }
  });

  /* ---------------- AI Lecture Notes & MCQs Routes ---------------- */
  app.post('/api/ai-notes/digest', async (req, res) => {
    try {
      const { videoId, start, end, title, withMeta } = req.body || {};
      if (typeof videoId !== 'string' || !VIDEO_ID_RE.test(videoId)) {
        res.status(400).json({ error: 'Invalid YouTube video ID.' });
        return;
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
        res.status(400).json({ error: 'Invalid video chunk range.' });
        return;
      }

      const safeTitle = typeof title === 'string' ? title.slice(0, 200) : '';
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const digest = await runDigest(videoUrl, Math.floor(startSec), Math.ceil(endSec), {
        title: safeTitle,
        withMeta: Boolean(withMeta),
      });
      res.json(digest);
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || 'Failed to analyze video chunk.') });
    }
  });

  app.post('/api/ai-notes/outline', async (req, res) => {
    try {
      const { segments, durationSec, lang } = req.body || {};
      const dur = Math.max(60, Math.min(28800, Number(durationSec) || 600));
      if (!Array.isArray(segments) || segments.length === 0) {
        res.json({ chapters: uniformOutline(dur) });
        return;
      }
      const langP = sanitizeLangProfile(lang);
      const list = segments
        .slice(0, 250)
        .map((s: Segment) => `[${fmt(Number(s.t) || 0)}] ${String(s.title || '').slice(0, 120)}`)
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
          res.json({ chapters: uniformOutline(dur) });
          return;
        }
        chapters[0].start_sec = 0;
        for (let i = 0; i < chapters.length - 1; i++) {
          chapters[i].end_sec = chapters[i + 1].start_sec;
        }
        chapters[chapters.length - 1].end_sec = dur;
        chapters = chapters.filter((c) => c.end_sec > c.start_sec);
        res.json({ chapters: chapters.length ? chapters : uniformOutline(dur) });
      } catch {
        res.json({ chapters: uniformOutline(dur) });
      }
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || 'Failed to build outline.') });
    }
  });

  app.post('/api/ai-notes/chapter', async (req, res) => {
    try {
      const { chapter, segments, lang } = req.body || {};
      if (!chapter || typeof chapter.title !== 'string') {
        res.status(400).json({ error: 'Invalid chapter payload.' });
        return;
      }
      const ch: Chapter = {
        title: String(chapter.title).slice(0, 160),
        start_sec: Math.max(0, Number(chapter.start_sec) || 0),
        end_sec: Math.max(1, Number(chapter.end_sec) || 600),
      };
      const allSegs: Segment[] = Array.isArray(segments) ? segments : [];
      const segs = allSegs.filter((s) => s && s.t >= ch.start_sec && s.t < ch.end_sec);
      if (segs.length === 0) {
        res.json({
          notes: { sections: [], terms: [], important_points: [], quick_revision: [] },
          mcqs: [],
        });
        return;
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

      res.json({
        notes: {
          intro: data.intro || '',
          sections,
          terms: Array.isArray(data.terms) ? data.terms : [],
          important_points: Array.isArray(data.important_points) ? data.important_points : [],
          quick_revision: Array.isArray(data.quick_revision) ? data.quick_revision : [],
          mindmap: data.mindmap,
        },
        mcqs,
      });
    } catch (e: any) {
      res.status(500).json({ error: String(e?.message || 'Failed to build chapter notes.') });
    }
  });

  app.post('/api/ai-notes/visual', async (req, res) => {
    try {
      const { videoId, item, lang } = req.body || {};
      if (typeof videoId !== 'string' || !VIDEO_ID_RE.test(videoId) || !item?.title) {
        res.status(400).json({ error: 'Invalid visual request.' });
        return;
      }

      const langP = sanitizeLangProfile(lang);
      const bestT = Math.max(0, Math.round(Number(item.best_t) || 0));
      const start = Math.max(0, bestT - 8);
      const end = bestT + 8;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      const planPrompt = `Is clip (${fmt(start)}-${fmt(end)}) mein teacher ne board/screen par "${String(item.title).slice(0, 120)}" (${String(item.kind || 'diagram').slice(0, 40)}) banaya hai. Pehle ka note: ${String(item.description || '').slice(0, 300)}

Clip ko dhyan se dekho aur decide karo:
- "needs_image" = true agar yahan asli drawing hai (circuit, diagram, graph, ray/geometry figure, structure, flowchart, table) jo samajhne ke liye visual maangti hai. Sirf heading/word/simple line ho toh false.
- "reason": 1 line mein, ye image kya dikhati hai (caption), language: ${MEDIUM_NAME[langP.medium]}.
- "labels": board par jo bhi text/labels/values/symbols dikh rahe hain. Labels waise hi likho jaise board par likhe hain.
- "image_prompt": ENGLISH mein bahut detailed instruction: kaun si shapes/components kahan hain (left/right/top/bottom), kaun kisse kaise juda hai, arrows ki direction, har label kis jagah hai, axes/values (graph ho toh curve ka shape). Sirf wahi jo video mein dikh raha hai.`;

      const planRes = await callGemini(
        [
          {
            role: 'user',
            parts: [
              {
                fileData: { fileUri: videoUrl },
                videoMetadata: { startOffset: `${start}s`, endOffset: `${end}s` },
              },
              { text: planPrompt },
            ],
          },
        ],
        {
          responseMimeType: 'application/json',
          responseSchema: planSchema,
          mediaResolution: 'MEDIA_RESOLUTION_HIGH',
          maxOutputTokens: 2048,
        }
      );

      const plan = parseJson(planRes?.text) as VisualPlan;
      if (!plan?.needs_image) {
        res.json({ skip: true });
        return;
      }

      const labels = Array.isArray(plan.labels) ? plan.labels : [];
      const labelsLine = labels.length
        ? `Write ONLY these labels, spelled exactly, nothing else: ${labels.join(' | ')}.`
        : '';

      const svgRes = await callGemini(
        [
          {
            role: 'user',
            parts: [
              {
                text: `Create a neat hand-drawn notebook-style educational diagram as clean inline <svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg"> on a plain white background (#ffffff) with dark blue/black pen strokes (#1e3a8a, #0f172a), red/green accents (#dc2626, #16a34a), and large readable labels.
Subject: ${String(item.title).slice(0, 120)}
Details: ${plan.image_prompt}
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
        res.json({ skip: true });
        return;
      }

      res.json({
        kind: 'svg',
        content: svg,
        caption: plan.reason || String(item.description || ''),
      });
    } catch {
      res.json({ skip: true });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Raftaar server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

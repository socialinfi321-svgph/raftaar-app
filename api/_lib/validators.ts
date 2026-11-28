export const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
export const MAX_SVG_BYTES = 128 * 1024; // 128 KB hard cap

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

export interface ChapterMCQ {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  timestamp_seconds: number;
  chapter: string;
}

export interface VisualPlan {
  needs_image: boolean;
  reason: string;
  image_prompt: string;
  labels: string[];
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sanitizeSvg(raw: string): string | null {
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
    .replace(/<applet[\s\S]*?>[\s\S]*?<\/applet>/gi, '')
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
    .replace(/(?:href|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi, (m, dq, sq, uq) => {
      const val = String(dq ?? sq ?? uq ?? '').trim();
      // Only allow same-document fragment refs (#id) inside inline educational SVG
      if (val.startsWith('#')) return m;
      return '';
    })
    .trim();

  const match = clean.match(/<svg[\s\S]*<\/svg>/i);
  if (!match) return null;
  let svg = match[0];

  // Block hidden external url(...) calls inside presentation attributes or style=""
  svg = svg.replace(
    /style\s*=\s*(?:"([^"]*)"|'([^']*)')/gi,
    (m, dq, sq) => {
      const val = String(dq ?? sq ?? '');
      if (/url\s*\(\s*["']?\s*(?!#)|expression\s*\(|javascript:/i.test(val)) return '';
      return m;
    }
  );

  // Guard size & complexity
  if (Buffer.byteLength(svg, 'utf8') > MAX_SVG_BYTES) {
    return null;
  }
  const tagCount = (svg.match(/<[a-zA-Z]/g) || []).length;
  if (tagCount < 2 || tagCount > 450) {
    return null;
  }
  if (!/\bxmlns=/.test(svg)) {
    svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!/\bviewBox=/i.test(svg)) {
    svg = svg.replace('<svg', '<svg viewBox="0 0 640 360"');
  }
  return svg;
}

const GENERIC_TITLES = new Set([
  'introduction',
  'intro',
  'overview',
  'summary',
  'topic 1',
  'concept 1',
  'part 1',
  'lecture',
  'untitled',
]);

export function validateDigestOutput(
  data: unknown,
  start: number,
  end: number,
  expectMeta: boolean
): {
  valid: boolean;
  reason?: string;
  meta?: LangMeta;
  segments: Segment[];
  board: BoardItem[];
} {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, reason: 'Digest output is not an object.', segments: [], board: [] };
  }
  const rec = data as Record<string, unknown>;
  const rawSegs = Array.isArray(rec.segments) ? rec.segments : [];
  const rawBoard = Array.isArray(rec.board) ? rec.board : [];

  const filteredSegs = rawSegs.filter((item): item is Record<string, unknown> => {
    if (!item || typeof item !== 'object') return false;
    const r = item as Record<string, unknown>;
    return (
      typeof r.title === 'string' &&
      r.title.trim().length >= 2 &&
      typeof r.summary === 'string' &&
      r.summary.trim().length >= 18
    );
  });

  if (filteredSegs.length === 0) {
    return { valid: false, reason: 'No valid concept segments found in digest.', segments: [], board: [] };
  }

  let maxT = 0;
  for (const s of filteredSegs) {
    const tVal = Number(s.t);
    if (Number.isFinite(tVal)) maxT = Math.max(maxT, tVal);
  }
  for (const b of rawBoard) {
    if (!b || typeof b !== 'object') continue;
    const br = b as Record<string, unknown>;
    maxT = Math.max(maxT, Number(br.t) || 0, Number(br.best_t) || 0);
  }

  const len = end - start;
  const off = start > 0 && maxT > len + 5 ? 0 : start;
  const fixT = (v: unknown, fallback: number) => {
    const num = Number(v);
    if (!Number.isFinite(num)) return clamp(fallback, start, end);
    return clamp(Math.round(num + off), start, end);
  };

  const segments: Segment[] = filteredSegs
    .map((s) => ({
      t: fixT(s.t, start),
      title: String(s.title).trim().slice(0, 160),
      summary: String(s.summary).trim().slice(0, 1400),
      definition: typeof s.definition === 'string' ? s.definition.trim().slice(0, 600) : '',
      intuition: typeof s.intuition === 'string' ? s.intuition.trim().slice(0, 600) : '',
      examples: Array.isArray(s.examples)
        ? s.examples.map((x) => String(x || '').trim().slice(0, 240)).filter(Boolean).slice(0, 6)
        : [],
      formulas: Array.isArray(s.formulas)
        ? s.formulas.map((x) => String(x || '').trim().slice(0, 220)).filter(Boolean).slice(0, 8)
        : [],
      important: typeof s.important === 'string' ? s.important.trim().slice(0, 400) : '',
    }))
    .sort((a, b) => a.t - b.t);

  // Reject generic or hallucinated single-line stubs
  const totalSummaryChars = segments.reduce((acc, s) => acc + s.summary.length, 0);
  const allGenericTitles = segments.every((s) => GENERIC_TITLES.has(s.title.toLowerCase()));
  if (totalSummaryChars < 45 || (segments.length === 1 && allGenericTitles && totalSummaryChars < 100)) {
    return {
      valid: false,
      reason: 'Digest segments were too sparse or generic.',
      segments: [],
      board: [],
    };
  }

  const board: BoardItem[] = rawBoard
    .filter((b): b is Record<string, unknown> => Boolean(b && typeof b === 'object' && typeof (b as Record<string, unknown>).title === 'string' && String((b as Record<string, unknown>).title).trim()))
    .map((b) => {
      const tVal = fixT(b.t, start);
      const bestT = fixT(b.best_t ?? b.t, tVal);
      return {
        id: `b${bestT}`,
        t: Math.min(tVal, bestT),
        best_t: bestT,
        title: String(b.title).trim().slice(0, 120),
        kind: typeof b.kind === 'string' && b.kind.trim() ? b.kind.trim().slice(0, 40) : 'diagram',
        description: typeof b.description === 'string' ? b.description.trim().slice(0, 400) : '',
        importance: clamp(Math.round(Number(b.importance) || 2), 1, 3),
      };
    })
    .filter((b) => b.description.length > 0);

  let meta: LangMeta | undefined;
  if (expectMeta) {
    const m = rec.meta as Record<string, unknown> | undefined;
    const rawMed = String(m?.detected_medium || '').toLowerCase();
    const detected_medium: Medium =
      rawMed === 'english' || rawMed === 'hindi' || rawMed === 'hinglish' ? rawMed : 'hinglish';
    meta = {
      detected_medium,
      detected_subject: String(m?.detected_subject || 'General').trim().slice(0, 60) || 'General',
      detected_board: String(m?.detected_board || 'Unknown').trim().slice(0, 40) || 'Unknown',
    };
  }

  return { valid: true, meta, segments, board };
}

export function uniformOutline(durationSec: number): Chapter[] {
  const out: Chapter[] = [];
  for (let s = 0, i = 1; s < durationSec; s += 600, i++) {
    out.push({ title: `Part ${i}`, start_sec: s, end_sec: Math.min(s + 600, durationSec) });
  }
  return out;
}

export function validateOutlineOutput(raw: unknown, durationSec: number): Chapter[] | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const list = (raw as { chapters?: unknown }).chapters;
  if (!Array.isArray(list) || list.length === 0) return null;

  let chapters: Chapter[] = list
    .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === 'object' && typeof (c as Record<string, unknown>).title === 'string' && String((c as Record<string, unknown>).title).trim()))
    .map((c) => ({
      title: String(c.title).trim().slice(0, 160),
      start_sec: clamp(Math.round(Number(c.start_sec) || 0), 0, durationSec - 1),
      end_sec: clamp(Math.round(Number(c.end_sec) || durationSec), 1, durationSec),
    }))
    .sort((a, b) => a.start_sec - b.start_sec);

  if (chapters.length === 0) return null;

  chapters[0].start_sec = 0;
  for (let i = 0; i < chapters.length - 1; i++) {
    if (chapters[i + 1].start_sec <= chapters[i].start_sec) {
      chapters[i + 1].start_sec = Math.min(durationSec, chapters[i].start_sec + 30);
    }
    chapters[i].end_sec = chapters[i + 1].start_sec;
  }
  chapters[chapters.length - 1].end_sec = durationSec;
  chapters = chapters.filter((c) => c.end_sec > c.start_sec);

  return chapters.length > 0 ? chapters : null;
}

function normQuestionKey(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function validateChapterOutput(
  raw: unknown,
  ch: Chapter,
  minExpectedMcqs: number
): {
  valid: boolean;
  reason?: string;
  notes?: ChapterContent;
  mcqs?: ChapterMCQ[];
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, reason: 'Chapter output is not a JSON object.' };
  }
  const rec = raw as Record<string, unknown>;
  const rawSections = Array.isArray(rec.sections) ? rec.sections : [];
  const sections: NoteSection[] = rawSections
    .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object' && typeof (s as Record<string, unknown>).heading === 'string' && String((s as Record<string, unknown>).heading).trim()))
    .map((s) => {
      const points = Array.isArray(s.points)
        ? s.points.map((p) => String(p || '').trim().slice(0, 220)).filter(Boolean).slice(0, 8)
        : [];
      return {
        heading: String(s.heading).trim().slice(0, 160),
        start_sec: clamp(Math.round(Number(s.start_sec) || ch.start_sec), ch.start_sec, ch.end_sec),
        definition: typeof s.definition === 'string' ? s.definition.trim().slice(0, 500) : '',
        intuition: typeof s.intuition === 'string' ? s.intuition.trim().slice(0, 600) : '',
        points,
        examples: Array.isArray(s.examples)
          ? s.examples.map((e) => String(e || '').trim().slice(0, 260)).filter(Boolean).slice(0, 6)
          : [],
        formulas: Array.isArray(s.formulas)
          ? s.formulas.map((f) => String(f || '').trim().slice(0, 220)).filter(Boolean).slice(0, 8)
          : [],
        exam_tip: typeof s.exam_tip === 'string' ? s.exam_tip.trim().slice(0, 320) : '',
      };
    })
    .filter((s) => s.points.length > 0 || Boolean(s.definition) || Boolean(s.intuition));

  if (sections.length === 0) {
    return { valid: false, reason: 'Chapter contains zero valid concept sections.' };
  }

  const terms: Term[] = Array.isArray(rec.terms)
    ? rec.terms
        .filter((t): t is Record<string, unknown> => Boolean(t && typeof t === 'object'))
        .map((t) => ({
          term: String(t.term || '').trim().slice(0, 100),
          meaning: String(t.meaning || '').trim().slice(0, 260),
        }))
        .filter((t) => t.term && t.meaning)
        .slice(0, 16)
    : [];

  const important_points = Array.isArray(rec.important_points)
    ? rec.important_points.map((p) => String(p || '').trim().slice(0, 240)).filter(Boolean).slice(0, 10)
    : [];

  const quick_revision = Array.isArray(rec.quick_revision)
    ? rec.quick_revision.map((p) => String(p || '').trim().slice(0, 240)).filter(Boolean).slice(0, 8)
    : [];

  let mindmap: MindMapData | undefined;
  if (rec.mindmap && typeof rec.mindmap === 'object' && !Array.isArray(rec.mindmap)) {
    const mm = rec.mindmap as Record<string, unknown>;
    const branches = Array.isArray(mm.branches)
      ? mm.branches
          .filter((b): b is Record<string, unknown> => Boolean(b && typeof b === 'object'))
          .map((b) => ({
            label: String(b.label || '').trim().slice(0, 60),
            children: Array.isArray(b.children)
              ? b.children.map((c) => String(c || '').trim().slice(0, 48)).filter(Boolean).slice(0, 4)
              : [],
          }))
          .filter((b) => b.label.length > 0)
          .slice(0, 6)
      : [];
    if (branches.length >= 2) {
      mindmap = {
        center: String(mm.center || ch.title).trim().slice(0, 80) || ch.title,
        branches,
      };
    }
  }

  // Validate MCQs strictly
  const rawMcqs = Array.isArray(rec.mcqs) ? rec.mcqs : [];
  const seenQuestions = new Set<string>();
  const mcqs: ChapterMCQ[] = [];

  for (let i = 0; i < rawMcqs.length; i++) {
    const q = rawMcqs[i];
    if (!q || typeof q !== 'object' || Array.isArray(q)) continue;
    const qr = q as Record<string, unknown>;
    const question = typeof qr.question === 'string' ? qr.question.trim().slice(0, 360) : '';
    const explanation = typeof qr.explanation === 'string' ? qr.explanation.trim().slice(0, 400) : '';
    const idx = qr.correct_index;

    if (!question || !explanation || !Number.isInteger(idx) || Number(idx) < 0 || Number(idx) > 3) {
      continue;
    }
    if (!Array.isArray(qr.options) || qr.options.length !== 4) {
      continue;
    }
    const cleanOpts = qr.options.map((o) => String(o || '').trim().slice(0, 180));
    if (cleanOpts.some((o) => !o)) continue;

    // Ensure 4 distinct options so answers cannot collapse onto identical choices
    const distinctOpts = new Set(cleanOpts.map((o) => o.toLowerCase()));
    if (distinctOpts.size < 4) continue;

    // Filter trivial recall/meta questions
    if (/teacher ne kya kaha|what did the teacher say|which minute of video/i.test(question)) {
      continue;
    }

    const qKey = normQuestionKey(question);
    if (!qKey || seenQuestions.has(qKey)) continue;
    seenQuestions.add(qKey);

    const correctText = cleanOpts[Number(idx)];
    const shuffled = shuffle(cleanOpts);
    mcqs.push({
      id: `${ch.start_sec}-${mcqs.length}`,
      question,
      options: shuffled,
      correct_index: shuffled.indexOf(correctText),
      explanation,
      timestamp_seconds: clamp(
        Math.round(Number(qr.timestamp_seconds) || ch.start_sec),
        ch.start_sec,
        ch.end_sec
      ),
      chapter: ch.title,
    });
  }

  const requiredMcqFloor = Math.max(1, Math.min(minExpectedMcqs, 3));
  if (mcqs.length < requiredMcqFloor) {
    return {
      valid: false,
      reason: `Only ${mcqs.length} valid MCQs generated (minimum ${requiredMcqFloor} required).`,
    };
  }

  return {
    valid: true,
    notes: {
      intro: typeof rec.intro === 'string' ? rec.intro.trim().slice(0, 280) : '',
      sections,
      terms,
      important_points,
      quick_revision,
      mindmap,
    },
    mcqs,
  };
}

export function validateVisualPlan(raw: unknown): VisualPlan | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.needs_image !== 'boolean') return null;
  return {
    needs_image: r.needs_image,
    reason: typeof r.reason === 'string' ? r.reason.trim().slice(0, 240) : '',
    image_prompt: typeof r.image_prompt === 'string' ? r.image_prompt.trim().slice(0, 700) : '',
    labels: Array.isArray(r.labels)
      ? r.labels.map((x) => String(x || '').trim().slice(0, 60)).filter(Boolean).slice(0, 20)
      : [],
  };
}

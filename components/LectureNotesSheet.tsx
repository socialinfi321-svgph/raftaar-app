import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, FileText, Play, Loader2, RefreshCw } from 'lucide-react';
import {
  BoardItem,
  ChapterNotes,
  GeneratedVisual,
  LectureNotesBundle,
  MindMapData,
  UI_LABELS,
  fmtEta,
  fmtTime,
  sanitizeSvgForImg,
  sectionIndexFor,
} from '../services/lectureNotesService';

interface LectureNotesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  bundle: LectureNotesBundle | null;
  videoTitle: string;
  isGenerating: boolean;
  etaSeconds: number;
  error: string | null;
  onRetry: () => void;
  onJumpToTime: (seconds: number) => void;
}

const MM_COLORS = ['#dc2626', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777'];

function wrapText(s: string, n: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > n) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

const MMNode: React.FC<{ x: number; y: number; text: string; color: string; big?: boolean }> = ({
  x,
  y,
  text,
  color,
  big,
}) => {
  const lines = wrapText(text, big ? 16 : 14);
  const fs = big ? 21 : 16;
  const w = Math.max(...lines.map((l) => l.length), 1) * fs * 0.62 + 20;
  const h = lines.length * (fs + 4) + 12;
  return (
    <g>
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={big ? 18 : 12}
        fill={big ? color : '#ffffff'}
        stroke={color}
        strokeWidth={2.5}
      />
      {lines.map((l, i) => (
        <text
          key={i}
          x={x}
          y={y - h / 2 + 8 + (i + 1) * (fs + 4) - 4}
          textAnchor="middle"
          fontSize={fs}
          fontWeight={big ? 700 : 400}
          fill={big ? '#fff' : color}
          style={{ fontFamily: "'Kalam', cursive" }}
        >
          {l}
        </text>
      ))}
    </g>
  );
};

const MindMapSvg: React.FC<{ data: MindMapData }> = ({ data }) => {
  const W = 900;
  const H = 560;
  const cx = W / 2;
  const cy = H / 2;
  const n = data.branches?.length || 0;
  if (n === 0) return null;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ background: '#fff', border: '2px solid #cbd5e1', borderRadius: 12 }}
    >
      {data.branches.map((b, i) => {
        const a = (2 * Math.PI * i) / n - Math.PI / 2;
        const color = MM_COLORS[i % MM_COLORS.length];
        const bx = cx + 190 * Math.cos(a);
        const by = cy + 125 * Math.sin(a);
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={bx} y2={by} stroke={color} strokeWidth={3} />
            {(b.children || []).slice(0, 4).map((c, k, arr) => {
              const ca = a + (k - (arr.length - 1) / 2) * 0.3;
              const kx = cx + 345 * Math.cos(ca);
              const ky = cy + 232 * Math.sin(ca);
              return (
                <g key={k}>
                  <line
                    x1={bx}
                    y1={by}
                    x2={kx}
                    y2={ky}
                    stroke={color}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                  />
                  <MMNode x={kx} y={ky} text={c} color={color} />
                </g>
              );
            })}
            <MMNode x={bx} y={by} text={b.label} color={color} />
          </g>
        );
      })}
      <MMNode x={cx} y={cy} text={data.center} color="#111827" big />
    </svg>
  );
};

const NotebookDocument: React.FC<{
  chapters: ChapterNotes[];
  visuals: Record<string, GeneratedVisual>;
  medium: 'english' | 'hindi' | 'hinglish';
  onJump?: (sec: number) => void;
}> = ({ chapters, visuals, medium, onJump }) => {
  const labels = UI_LABELS[medium] || UI_LABELS.hinglish;

  const JumpBtn = ({ s }: { s: number }) =>
    onJump ? (
      <button type="button" className="no-print nb-btn" onClick={() => onJump(s)}>
        <Play size={10} className="fill-current" />
        <span>{fmtTime(s)}</span>
      </button>
    ) : null;

  const renderFigure = (b: BoardItem) => {
    const vis = visuals[b.id];
    if (!vis) return null;
    const src = vis.kind === 'img' ? vis.content : sanitizeSvgForImg(vis.content);
    if (!src) return null;
    return (
      <figure key={b.id} className="nb-frame avoid-break">
        <img
          src={src}
          alt={b.title}
          className="w-full block rounded-lg"
          style={{ mixBlendMode: 'multiply' }}
        />
        <figcaption>
          ✏️ <b>{b.title}</b> - {vis.caption}
          <span className="ml-2">
            <JumpBtn s={b.best_t} />
          </span>
        </figcaption>
      </figure>
    );
  };

  return (
    <div className="notebook-paper shadow-sm">
      {chapters.map((ch, ci) => {
        const bySection: Record<number, BoardItem[]> = {};
        (ch.board_visuals || []).forEach((b) => {
          const si = sectionIndexFor(ch, b);
          (bySection[si] = bySection[si] || []).push(b);
        });

        return (
          <section key={ci} id={`lecture-note-ch-${ci}`} className="mb-10 last:mb-2">
            <h2 className="nb-title">
              <span>
                {ci + 1}. {ch.title}
              </span>
              <JumpBtn s={ch.start_sec} />
            </h2>
            {ch.intro && <p className="nb-intro">{ch.intro}</p>}

            {ch.mindmap && ch.mindmap.branches?.length > 0 && (
              <div className="avoid-break my-3">
                <h3 className="nb-h3">🧠 {labels.mind}</h3>
                <MindMapSvg data={ch.mindmap} />
              </div>
            )}

            {(ch.sections || []).map((s, si) => (
              <div key={si}>
                <div className="avoid-break">
                  <h3 className="nb-h3">
                    <span>
                      {ci + 1}.{si + 1} {s.heading}
                    </span>
                    <JumpBtn s={s.start_sec} />
                  </h3>

                  {s.definition && (
                    <div className="nb-def">
                      <b>📖 {labels.def}:</b> {s.definition}
                    </div>
                  )}

                  {s.intuition && (
                    <div className="nb-intu">
                      <b>💡 {labels.intu}:</b> {s.intuition}
                    </div>
                  )}

                  {s.points?.length > 0 && (
                    <ul className="nb-ul">
                      {s.points.map((p, pi) => (
                        <li key={pi}>{p}</li>
                      ))}
                    </ul>
                  )}

                  {s.formulas?.map((f, fi) => (
                    <div key={fi} className="nb-formula">
                      ✎ {f}
                    </div>
                  ))}

                  {s.examples?.map((e, ei) => (
                    <div key={ei} className="nb-example">
                      <b>🌍 {labels.ex}:</b> {e}
                    </div>
                  ))}

                  {s.exam_tip && (
                    <div className="nb-tip">
                      <span className="nb-hl">⭐ {s.exam_tip}</span>
                    </div>
                  )}
                </div>
                {(bySection[si] || []).map(renderFigure)}
              </div>
            ))}
            {(bySection[-1] || []).map(renderFigure)}

            {ch.important_points?.length > 0 && (
              <div className="nb-imp avoid-break">
                <div className="nb-imp-title">⭐ {labels.imp} ⭐</div>
                <ul className="nb-ul">
                  {ch.important_points.map((p, i) => (
                    <li key={i}>
                      <span className="nb-hl">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {ch.terms?.length > 0 && (
              <div className="avoid-break mt-3">
                <h3 className="nb-h3">📌 {labels.terms}</h3>
                <table className="nb-table">
                  <tbody>
                    {ch.terms.map((t, ti) => (
                      <tr key={ti}>
                        <td style={{ color: '#dc2626', fontWeight: 700, width: '34%' }}>{t.term}</td>
                        <td>{t.meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {ch.quick_revision?.length > 0 && (
              <div className="nb-rev avoid-break">
                <div className="nb-rev-title">⚡ {labels.rev}</div>
                <ul className="nb-ul">
                  {ch.quick_revision.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

export const LectureNotesSheet: React.FC<LectureNotesSheetProps> = ({
  isOpen,
  onClose,
  bundle,
  videoTitle,
  isGenerating,
  etaSeconds,
  error,
  onRetry,
  onJumpToTime,
}) => {
  const [isPrinting, setIsPrinting] = useState(false);

  const chapters = useMemo(() => bundle?.chapters || [], [bundle]);
  const visuals = useMemo(() => bundle?.visuals || {}, [bundle]);
  const medium = bundle?.lang?.medium || 'hinglish';

  const handleDownloadPdf = () => {
    if (!chapters.length) return;
    setIsPrinting(true);
    document.body.classList.add('printing-lecture-notes');
    setTimeout(() => {
      try {
        window.print();
      } finally {
        setTimeout(() => {
          document.body.classList.remove('printing-lecture-notes');
          setIsPrinting(false);
        }, 400);
      }
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-0 watch-sheet-backdrop z-[200] flex flex-col justify-end bg-black/40 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      >
        <div
          className="w-full h-full max-h-full bg-white dark:bg-[#181818] rounded-t-2xl shadow-2xl flex flex-col border-t border-neutral-200 dark:border-neutral-800 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Grabber handle */}
          <div className="w-12 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

          {/* Sheet Header */}
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <FileText size={16} />
              </div>
              <div className="min-w-0">
                <h2 className="text-[15px] font-bold text-[#0f0f0f] dark:text-white leading-tight truncate">
                  Notes PDF
                </h2>
                {isGenerating && (
                  <p className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold flex items-center gap-1">
                    <Loader2 size={11} className="animate-spin" />
                    <span>~{fmtEta(etaSeconds)}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {chapters.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                >
                  <Printer size={13} />
                  <span>Save PDF</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-neutral-500 hover:text-[#0f0f0f] dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Close notes"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Chapter quick jump strip */}
          {chapters.length > 1 && (
            <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-1.5 overflow-x-auto hide-scrollbar shrink-0 bg-neutral-50/70 dark:bg-neutral-900/50">
              {chapters.map((c, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    document
                      .getElementById(`lecture-note-ch-${idx}`)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 shrink-0 hover:border-brand-500 transition-colors"
                >
                  {idx + 1}. {c.title}
                </button>
              ))}
            </div>
          )}

          {/* Scrollable PDF Notebook Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 bg-neutral-100 dark:bg-neutral-950">
            {error && chapters.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-3">
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 max-w-xs">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-600 text-white text-xs font-bold shadow-xs"
                >
                  <RefreshCw size={13} />
                  <span>Try Again</span>
                </button>
              </div>
            ) : chapters.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-3">
                <div className="w-11 h-11 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
                <p className="text-sm font-bold text-[#0f0f0f] dark:text-white">
                  Notes ban rahe hain...
                </p>
                <span className="px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 text-xs font-mono font-bold">
                  ⏱ ~{fmtEta(etaSeconds)}
                </span>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                {/* PDF Header Card */}
                <div className="mb-3 px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">
                    {videoTitle}
                  </p>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 shrink-0">
                    PDF Notes
                  </span>
                </div>
                <NotebookDocument
                  chapters={chapters}
                  visuals={visuals}
                  medium={medium}
                  onJump={onJumpToTime}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print-only clean PDF Portal */}
      {isPrinting &&
        chapters.length > 0 &&
        createPortal(
          <div className="print-only-notes p-4 bg-white">
            <h1 className="text-xl font-bold text-slate-900 mb-3">{videoTitle}</h1>
            <NotebookDocument chapters={chapters} visuals={visuals} medium={medium} />
          </div>,
          document.body
        )}
    </>
  );
};

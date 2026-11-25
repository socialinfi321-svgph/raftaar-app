import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Clock, Play, RotateCcw, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
import {
  MCQ,
  fmtEta,
  fmtTime,
  getSavedMcqAnswers,
  saveMcqAnswers,
} from '../services/lectureNotesService';

interface LectureMcqSheetProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  mcqs: MCQ[];
  isGenerating: boolean;
  etaSeconds: number;
  error: string | null;
  onRetry: () => void;
  onJumpToTime: (seconds: number) => void;
}

export const LectureMcqSheet: React.FC<LectureMcqSheetProps> = ({
  isOpen,
  onClose,
  videoId,
  mcqs,
  isGenerating,
  etaSeconds,
  error,
  onRetry,
  onJumpToTime,
}) => {
  const [selectedChapter, setSelectedChapter] = useState<string>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>(() => getSavedMcqAnswers(videoId));
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const paletteRef = useRef<HTMLDivElement>(null);
  const questionScrollRef = useRef<HTMLDivElement>(null);

  // Sync saved answers when videoId changes
  useEffect(() => {
    setAnswers(getSavedMcqAnswers(videoId));
    setSelectedChapter('all');
    setCurrentIndex(0);
    setElapsedSec(0);
    setIsFinished(false);
  }, [videoId]);

  const chapters = useMemo(() => {
    return Array.from(new Set(mcqs.map((q) => q.chapter).filter(Boolean)));
  }, [mcqs]);

  const activeQuestions = useMemo(() => {
    if (selectedChapter === 'all') return mcqs;
    return mcqs.filter((q) => q.chapter === selectedChapter);
  }, [mcqs, selectedChapter]);

  // Clamp index if chapter filter changes
  useEffect(() => {
    if (currentIndex >= activeQuestions.length && activeQuestions.length > 0) {
      setCurrentIndex(0);
    }
  }, [activeQuestions.length, currentIndex]);

  // Session timer matching Practice/PYQ screen
  useEffect(() => {
    if (!isOpen || isFinished || activeQuestions.length === 0) return;
    const t = window.setInterval(() => setElapsedSec((prev) => prev + 1), 1000);
    return () => window.clearInterval(t);
  }, [isOpen, isFinished, activeQuestions.length]);

  // Scroll question body to top on question change
  useEffect(() => {
    if (questionScrollRef.current) {
      questionScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentIndex]);

  const stats = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    activeQuestions.forEach((q) => {
      const chosen = answers[q.id];
      if (chosen !== undefined) {
        if (chosen === q.correct_index) correct++;
        else wrong++;
      }
    });
    const answered = correct + wrong;
    return {
      correct,
      wrong,
      answered,
      left: Math.max(0, activeQuestions.length - answered),
    };
  }, [activeQuestions, answers]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const scrollPaletteTo = (idx: number) => {
    if (!paletteRef.current) return;
    const itemWidth = 44;
    const containerWidth = paletteRef.current.clientWidth;
    const pos = idx * itemWidth - containerWidth / 2 + itemWidth / 2;
    paletteRef.current.scrollTo({ left: Math.max(0, pos), behavior: 'smooth' });
  };

  const handleSelectOption = (q: MCQ, optIdx: number) => {
    if (answers[q.id] !== undefined) return;
    const next = { ...answers, [q.id]: optIdx };
    setAnswers(next);
    saveMcqAnswers(videoId, next);
  };

  const handleNext = () => {
    if (currentIndex < activeQuestions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      scrollPaletteTo(nextIdx);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      scrollPaletteTo(prevIdx);
    }
  };

  const handleReset = () => {
    setAnswers({});
    saveMcqAnswers(videoId, {});
    setCurrentIndex(0);
    setElapsedSec(0);
    setIsFinished(false);
  };

  if (!isOpen) return null;

  const currentQ = activeQuestions[currentIndex];
  const chosenOption = currentQ ? answers[currentQ.id] : undefined;
  const showSolution = chosenOption !== undefined;

  return (
    <div
      className="fixed inset-x-0 bottom-0 watch-sheet-backdrop z-[200] flex flex-col justify-end bg-black/40 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full h-full max-h-full bg-white dark:bg-slate-950 rounded-t-2xl shadow-2xl flex flex-col border-t border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grabber handle */}
        <div className="w-12 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2 mb-1 shrink-0" />

        {/* 1. Practice/PYQ Style Header */}
        <div className="px-4 py-2 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <h2 className="text-[15px] font-black text-slate-900 dark:text-white truncate">
              MCQs
            </h2>
            {activeQuestions.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 shrink-0">
                <Clock size={12} className="text-brand-600 dark:text-brand-400" />
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-xs">
                  {formatTimer(elapsedSec)}
                </span>
              </div>
            )}
            {isGenerating && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 dark:text-brand-400">
                <Loader2 size={11} className="animate-spin" />
                ~{fmtEta(etaSeconds)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {activeQuestions.length > 0 && !isFinished && (
              <button
                type="button"
                onClick={() => setIsFinished(true)}
                className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                Submit
              </button>
            )}
            {activeQuestions.length > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Reset quiz"
                aria-label="Reset quiz"
              >
                <RotateCcw size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close MCQs"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Empty / Error / Generating States */}
        {error && activeQuestions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
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
        ) : activeQuestions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-brand-600 border-t-transparent animate-spin" />
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              MCQs ban rahe hain...
            </p>
            <span className="px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 text-xs font-mono font-bold">
              ⏱ ~{fmtEta(etaSeconds)}
            </span>
          </div>
        ) : isFinished ? (
          /* Practice/PYQ Result Summary View */
          <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Practice Summary
              </h3>
              <span className="px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold font-mono">
                {formatTimer(elapsedSec)}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl flex justify-between items-center border border-slate-100 dark:border-slate-800">
                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Total Questions
                </span>
                <span className="text-xl font-black text-slate-900 dark:text-white">
                  {activeQuestions.length}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-lg font-black text-green-600 dark:text-green-400">
                    {stats.correct}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500">Correct</p>
                </div>
                <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-lg font-black text-red-500 dark:text-red-400">{stats.wrong}</p>
                  <p className="text-[11px] font-semibold text-slate-500">Wrong</p>
                </div>
                <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-lg font-black text-blue-600 dark:text-blue-400">
                    {stats.left}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500">Left</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  Accuracy
                </p>
                <p className="text-2xl font-black text-blue-900 dark:text-white">
                  {stats.answered > 0 ? Math.round((stats.correct / stats.answered) * 100) : 0}%
                </p>
              </div>
              <CheckCircle2 size={34} className="text-blue-600 dark:text-blue-400" />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsFinished(false)}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-900 border-2 border-brand-600 dark:border-brand-500"
              >
                Review
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-brand-600 hover:bg-brand-700 shadow-md"
              >
                Practice Again
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 2. Live Stats Strip (Matching TestInterface.tsx) */}
            <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 py-2 px-4 flex justify-between items-center text-[11px] font-bold text-slate-500 shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>{stats.correct} Correct</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>{stats.wrong} Wrong</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>{stats.left} Left</span>
              </div>
            </div>

            {/* Optional Chapter Filter Strip */}
            {chapters.length > 1 && (
              <div className="px-3 py-1.5 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto hide-scrollbar shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChapter('all');
                    setCurrentIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 transition-colors ${
                    selectedChapter === 'all'
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  All ({mcqs.length})
                </button>
                {chapters.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      setSelectedChapter(ch);
                      setCurrentIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 transition-colors ${
                      selectedChapter === ch
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            )}

            {/* 3. Horizontal Question Palette Strip (Matching TestInterface / InfinityTestScreen) */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-2.5 shrink-0 flex items-center gap-2 px-3">
              <div
                ref={paletteRef}
                className="flex-1 overflow-x-auto hide-scrollbar flex items-center gap-2 scroll-smooth"
              >
                {activeQuestions.map((q, i) => {
                  const ans = answers[q.id];
                  const isCorrect = ans !== undefined && ans === q.correct_index;
                  let bg =
                    'bg-slate-100 dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800';
                  if (ans !== undefined) {
                    bg = isCorrect
                      ? 'bg-green-600 text-white border-green-500'
                      : 'bg-red-600 text-white border-red-500';
                  } else if (i === currentIndex) {
                    bg =
                      'ring-1 ring-brand-500 border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20';
                  }
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIndex(i)}
                      className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold border transition-all ${bg}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800" />
              <div className="text-[11px] font-bold text-slate-400 shrink-0">
                {currentIndex + 1}/{activeQuestions.length}
              </div>
            </div>

            {/* 4. Scrollable Question Area (Exact Practice / PYQ Card Design) */}
            {currentQ && (
              <div
                ref={questionScrollRef}
                className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 pb-24 bg-white dark:bg-slate-950 hide-scrollbar"
              >
                <div className="flex justify-between items-center gap-2 mb-3">
                  <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800">
                    Question {currentIndex + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => onJumpToTime(currentQ.timestamp_seconds)}
                    className="inline-flex items-center gap-1 bg-brand-50 dark:bg-brand-900/30 px-2.5 py-1 rounded-full border border-brand-200 dark:border-brand-800 text-[11px] font-bold text-brand-700 dark:text-brand-300 active:scale-95 transition-transform"
                  >
                    <Play size={10} className="fill-current" />
                    <span>{fmtTime(currentQ.timestamp_seconds)}</span>
                  </button>
                </div>

                {/* Question Text */}
                <p className="text-[16px] sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed mb-3.5 font-serif break-words">
                  {currentQ.question}
                </p>

                {/* Marks & Chapter Chips */}
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  <span className="bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-bold px-2 py-0.5 rounded border border-green-500/20">
                    +1.0
                  </span>
                  <span className="bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/20">
                    -0.0
                  </span>
                  {currentQ.chapter && (
                    <span className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200/70 dark:border-amber-900/50 truncate max-w-[200px]">
                      {currentQ.chapter}
                    </span>
                  )}
                </div>

                {/* Options A / B / C / D */}
                <div className="space-y-3">
                  {currentQ.options.map((optText, oi) => {
                    const letter = String.fromCharCode(65 + oi);
                    const isSelected = chosenOption === oi;
                    const isCorrect = oi === currentQ.correct_index;

                    let cardClass =
                      'p-3.5 rounded-xl border-2 flex items-start gap-3.5 transition-all ';
                    let circleClass =
                      'w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-colors mt-0.5 ';

                    if (showSolution) {
                      if (isCorrect) {
                        cardClass += 'border-green-500 bg-green-50 dark:bg-green-950/30';
                        circleClass += 'bg-green-500 text-white border-green-500';
                      } else if (isSelected && !isCorrect) {
                        cardClass += 'border-red-500 bg-red-50 dark:bg-red-950/30';
                        circleClass += 'bg-red-500 text-white border-red-500';
                      } else {
                        cardClass +=
                          'border-slate-200 dark:border-slate-800 opacity-50 bg-slate-50 dark:bg-slate-900/50';
                        circleClass += 'border-slate-300 dark:border-slate-700 text-slate-400';
                      }
                    } else {
                      cardClass +=
                        'cursor-pointer active:scale-[0.98] border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-brand-500/60';
                      circleClass +=
                        'border-slate-300 dark:border-slate-700 text-slate-500 bg-white dark:bg-slate-950';
                    }

                    return (
                      <div
                        key={oi}
                        onClick={() => handleSelectOption(currentQ, oi)}
                        className={cardClass}
                      >
                        <div className={circleClass}>{letter}</div>
                        <div className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200 break-words leading-relaxed">
                          {optText}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Card (Exact TestInterface.tsx Blue Card) */}
                {showSolution && (
                  <div className="mt-5 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 animate-slide-up">
                    <div className="flex items-center gap-2 mb-1.5">
                      <i className="fa-solid fa-lightbulb text-blue-500 dark:text-blue-400" />
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">
                        Explanation
                      </p>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed break-words">
                      {currentQ.explanation || 'Is concept ka explanation video me diya gaya hai.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 5. Fixed Bottom Navigation Bar (Matching TestInterface / InfinityTestScreen) */}
            <div className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-3 pb-safe shrink-0 flex items-center gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="w-1/3 py-3 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm py-3 rounded-xl shadow-md transition-all active:scale-[0.98]"
              >
                {currentIndex === activeQuestions.length - 1 ? 'Finish' : 'Save & Next'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ZoomIn, ZoomOut, BookOpen, Hash, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { PYQQuestion, Language } from '../types';
import { api } from '../services/api';
import { useBackHandler } from '../hooks/useBackHandler';

interface PYQSubjectiveScreenProps {
  subject: string;
  year: number;
  onExit: () => void;
  defaultLanguage?: 'Hindi' | 'English';
}

// --- HELPER COMPONENT: Smart Text Formatter (Crash Proof) ---
const FormattedText = ({ text, style }: { text: string | null | undefined; style?: React.CSSProperties }) => {
  if (!text) return null;
  
  // SAFETY: Convert to string immediately to prevent crashes on bad data
  const safeText = String(text || ""); 
  const lines = safeText.split('\n');

  return (
    <div className="space-y-4 font-sans text-slate-700 dark:text-slate-300" style={style}>
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="h-2" />; // Spacer

        // 1. Detect Math/Formulas (Basic heuristic)
        const isMath = /[=≈→⇒∫∑√θπ]/.test(trimmed) && trimmed.length < 50;
        if (isMath) {
            return (
                <div key={index} className="flex justify-center my-4">
                    <span className="font-mono bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg text-slate-900 dark:text-white font-medium border border-slate-200 dark:border-slate-700 shadow-sm">
                        {trimmed}
                    </span>
                </div>
            );
        }

        // 2. Handle Headers (Ends with :)
        if (trimmed.endsWith(':')) {
            return (
                <h4 key={index} className="font-bold text-slate-900 dark:text-white mt-6 mb-2 text-lg underline decoration-brand-500/30 decoration-2 underline-offset-4">
                    {trimmed}
                </h4>
            );
        }

        // 3. Handle Bullet Points (Numbers, letters, bullets)
        const listMatch = trimmed.match(/^(\d+\.|[a-z]\)|\-|•|\*)\s+(.*)/);
        if (listMatch && listMatch[2]) {
          return (
            <div key={index} className="flex gap-3 mb-3">
               {/* Bullet/Number Marker */}
               <div className="shrink-0 mt-0.5 w-6 flex justify-center">
                    <span className="text-brand-600 dark:text-brand-400 font-bold text-sm bg-brand-50 dark:bg-brand-900/20 px-1.5 py-0.5 rounded border border-brand-100 dark:border-brand-900/30">
                        {listMatch[1].replace(/[•\-*]/, '•')}
                    </span>
               </div>
               {/* Content */}
               <p className="leading-relaxed text-justify flex-1">
                   {listMatch[2]}
               </p>
            </div>
          );
        }

        // 4. Standard Paragraph
        return (
            <p key={index} className="leading-relaxed text-justify mb-4">
                {line}
            </p>
        );
      })}
    </div>
  );
};

export const PYQSubjectiveScreen: React.FC<PYQSubjectiveScreenProps> = ({ 
    subject, 
    year, 
    onExit,
    defaultLanguage = 'English' 
}) => {
  const [questions, setQuestions] = useState<PYQQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // ✅ Initialize Language Safe Mode
  const [lang, setLang] = useState<Language>(() => {
    try {
        const saved = localStorage.getItem('raftaar-language');
        if (saved === 'Hindi' || saved === 'hi') return 'hi';
        return defaultLanguage === 'Hindi' ? 'hi' : 'en';
    } catch (e) {
        return 'en';
    }
  });

  const toggleLanguage = () => {
    setLang(prev => {
      const newLang = prev === 'en' ? 'hi' : 'en';
      localStorage.setItem('raftaar-language', newLang === 'hi' ? 'Hindi' : 'English');
      return newLang;
    });
  };

  const [fontSize, setFontSize] = useState(16);

  // Unified Back Handler
  useBackHandler(() => {
    onExit(); 
    return true;
  });

  const fetchQuestions = async () => {
      setLoading(true);
      setError(null);
      try {
          const data = await api.getPYQs(subject, year, 'subjective');
          if (Array.isArray(data) && data.length > 0) {
              setQuestions(data);
          } else {
              setQuestions([]);
          }
      } catch (e) {
          console.error("Failed to fetch subjective questions", e);
          setError("Failed to load questions. Please check your internet connection.");
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    if (subject && year) {
        fetchQuestions();
    }
  }, [subject, year]);

  // Scroll to top when question changes
  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
      }
  }, [currentIndex]);

  const currentQ = (questions && questions.length > 0) ? questions[currentIndex] : null;

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onExit();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Safe Text Getter
  const getTxt = (en?: string | null, hi?: string | null): string => {
      try {
          if (!en && !hi) return "";
          const txt = lang === 'hi' ? (hi || en || "") : (en || "");
          return String(txt);
      } catch (e) {
          return "";
      }
  };

  if (loading) {
      return (
        <div className="h-[100dvh] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-4 transition-colors">
            <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-800 border-t-brand-500 rounded-full animate-spin"></div>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Loading Notes...</p>
        </div>
      );
  }

  if (error) {
    return (
        <div className="h-[100dvh] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center transition-colors">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4 text-red-500 dark:text-red-400">
                <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Something went wrong</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">{error}</p>
            <div className="flex gap-4">
                <button onClick={onExit} className="px-6 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold">Cancel</button>
                <button onClick={fetchQuestions} className="px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold shadow-lg flex items-center gap-2">
                    <RefreshCw size={16} /> Retry
                </button>
            </div>
        </div>
    );
  }

  if (!currentQ) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors p-6 text-center">
        <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
            <BookOpen size={24} />
        </div>
        <p className="text-slate-500 dark:text-slate-400 font-medium mb-6">No subjective questions found for {subject} {year}.</p>
        <button onClick={onExit} className="px-6 py-3 bg-slate-900 dark:bg-white rounded-xl text-sm font-bold text-white dark:text-slate-900 shadow-lg hover:scale-105 transition-transform">Go Back</button>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-950 font-sans animate-fade-in text-slate-900 dark:text-white transition-colors duration-300">
      
      {/* Header */}
      <div className="px-4 pb-3 pt-safe-header bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center sticky top-0 z-50 transition-colors shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onExit} className="p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none">Subjective</h2>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase mt-1 tracking-wide">{subject} • {year}</p>
          </div>
        </div>

        <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 p-1">
          <button 
            onClick={() => setFontSize(s => Math.max(14, s - 2))}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all active:scale-90"
          >
            <ZoomOut size={16} />
          </button>
          <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 mx-1"></div>
          <button 
            onClick={() => setFontSize(s => Math.min(24, s + 2))}
            className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all active:scale-90"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-5 py-3 flex justify-between items-center bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors shrink-0">
        <div className="flex gap-1 overflow-x-auto hide-scrollbar max-w-[200px]" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {(questions || []).map((_, idx) => (
                <div 
                    key={idx} 
                    className={`h-1.5 rounded-full transition-all duration-300 shrink-0 ${idx === currentIndex ? 'w-6 bg-brand-600 dark:bg-brand-400' : 'w-1.5 bg-slate-300 dark:bg-slate-700'}`}
                />
            ))}
        </div>
        
        <button 
            onClick={toggleLanguage} 
            className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 shadow-sm shrink-0 active:scale-95 transition-transform"
        >
            <BookOpen size={12} />
            {lang === 'en' ? 'ENGLISH' : 'HINDI'}
        </button>
      </div>

      {/* Content Area - Scrollable */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto w-full bg-slate-50 dark:bg-slate-950 transition-colors pb-32 hide-scrollbar scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="max-w-2xl mx-auto p-5">
            
            {/* QUESTION CARD */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-900 dark:bg-slate-700"></div>
                <div className="flex items-center justify-between mb-4">
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-2">
                        <Hash size={12} /> Question {currentIndex + 1}
                    </span>
                    {currentQ?.marks && (
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded text-[10px] font-bold border border-slate-200 dark:border-slate-700">
                            {currentQ.marks} Marks
                        </span>
                    )}
                </div>
                
                <h1 
                    className="font-bold text-slate-900 dark:text-white leading-relaxed break-words font-serif"
                    style={{ fontSize: `${fontSize + 2}px` }}
                >
                    {getTxt(currentQ?.question_text_en, currentQ?.question_text_hi)}
                </h1>
            </div>

            {/* ANSWER CARD */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-500"></div>
                
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                        <CheckCircle size={14} />
                    </div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Model Answer</h3>
                </div>

                <div className="select-text">
                    <FormattedText 
                        text={getTxt(currentQ?.answer_text_en, currentQ?.answer_text_hi) || getTxt(currentQ?.solution_short_en, currentQ?.solution_short_hi) || "Detailed answer not available."} 
                        style={{ fontSize: `${fontSize}px` }}
                    />
                </div>
            </div>
            
            <div className="flex justify-center mt-8 opacity-30">
                <div className="w-12 h-1 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            </div>

        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 p-4 pb-safe z-30 flex gap-4 transition-colors shadow-[0_-5px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-5px_20px_rgba(0,0,0,0.2)]">
        <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex-1 py-3.5 rounded-xl font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-95 hover:bg-slate-200 dark:hover:bg-slate-800"
        >
            Previous
        </button>
        <button 
            onClick={handleNext}
            className="flex-1 py-3.5 rounded-xl font-bold text-white bg-slate-900 dark:bg-white dark:text-slate-950 shadow-lg hover:scale-[1.02] transition-transform active:scale-[0.98]"
        >
            {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>

    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ZoomIn, ZoomOut, CheckCircle, Sun, Moon } from 'lucide-react';
import { PYQQuestion, Language } from '../types';
import { api } from '../services/api';
import { useBackHandler } from '../hooks/useBackHandler';
import { useStatusBar } from '../hooks/useStatusBar';

interface PYQSubjectiveScreenProps {
  subject: string;
  year: number;
  onExit: () => void;
  defaultLanguage?: 'Hindi' | 'English';
}

export const PYQSubjectiveScreen: React.FC<PYQSubjectiveScreenProps> = ({ 
    subject, 
    year, 
    onExit,
    defaultLanguage = 'English'
}) => {
  const [questions, setQuestions] = useState<PYQQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
        return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  // Sync Status Bar
  useStatusBar(theme);

  const [lang, setLang] = useState<Language>('en');
  const [fontSize, setFontSize] = useState(16); // Base font size
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync mobile back button with app back action
  // Fixed: return true to ensure navigation is handled explicitly by onExit
  useBackHandler(() => {
      onExit();
      return true; 
  });

  useEffect(() => {
    const fetchQuestions = async () => {
        setLoading(true);
        const data = await api.getPYQs(subject, year, 'subjective');
        setQuestions(data);
        setLoading(false);
    };
    if (subject && year) {
        fetchQuestions();
    }
  }, [subject, year]);

  // Scroll to top on question change
  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
  }, [currentIndex]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);
    localStorage.setItem('raftaar-theme', newTheme);
  };

  const currentQ = questions[currentIndex];

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onExit(); // Finish
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const getTxt = (en?: string | null, hi?: string | null) => lang === 'hi' ? (hi || en) : en;

  // Render Loading
  if (loading) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-slate-950 gap-4 transition-colors">
            <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 dark:text-slate-400 font-medium text-sm animate-pulse">Loading Questions...</p>
        </div>
      );
  }

  // Render Empty
  if (!questions || questions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-slate-950 transition-colors">
        <p className="text-gray-500 dark:text-slate-400 font-medium">No subjective questions found for this year.</p>
        <button onClick={onExit} className="mt-4 px-6 py-2 bg-gray-100 dark:bg-slate-800 rounded-lg text-sm font-bold text-gray-700 dark:text-slate-300">Go Back</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950 font-sans animate-fade-in transition-colors">
      
      {/* 1. Header */}
      <div className="px-4 pb-3 pt-safe-header bg-white dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center sticky top-0 z-20 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <button onClick={onExit} className="p-2 -ml-2 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-900 rounded-full transition-colors">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white leading-none">Learn Subjective</h2>
            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mt-1">{subject} • {year}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button 
                onClick={toggleTheme}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors border border-gray-200 dark:border-slate-800"
            >
                {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Font Controls */}
            <div className="flex items-center bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-1">
            <button 
                onClick={() => setFontSize(s => Math.max(12, s - 2))}
                className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-brand-600 active:bg-white dark:active:bg-slate-800 rounded-md transition-all"
            >
                <ZoomOut size={16} />
            </button>
            <div className="w-[1px] h-4 bg-gray-200 dark:bg-slate-700 mx-1"></div>
            <button 
                onClick={() => setFontSize(s => Math.min(24, s + 2))}
                className="p-1.5 text-gray-500 dark:text-slate-400 hover:text-brand-600 active:bg-white dark:active:bg-slate-800 rounded-md transition-all"
            >
                <ZoomIn size={16} />
            </button>
            </div>
        </div>
      </div>

      {/* 2. Top Bar (Progress & Lang) */}
      <div className="px-5 py-3 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-800 transition-colors">
        <div className="flex gap-1 overflow-x-auto hide-scrollbar max-w-[200px]">
            {questions.map((_, idx) => (
                <div 
                    key={idx} 
                    className={`h-1.5 rounded-full transition-all duration-300 shrink-0 ${idx === currentIndex ? 'w-6 bg-brand-600 dark:bg-brand-500' : 'w-1.5 bg-gray-200 dark:bg-slate-700'}`}
                />
            ))}
        </div>
        <button onClick={() => setLang(l => l==='en'?'hi':'en')} className="flex items-center gap-1 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-gray-200 dark:border-slate-800 text-[10px] font-bold text-gray-600 dark:text-slate-300 shadow-sm shrink-0 active:scale-95 transition-transform">
            {lang === 'en' ? 'ENG' : 'HIN'}
        </button>
      </div>

      {/* 3. Content Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 pb-32 hide-scrollbar scroll-smooth">
        
        {/* Question Card */}
        <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Question {currentIndex + 1}</span>
                {currentQ.marks && (
                    <span className="bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 px-2 py-1 rounded text-[10px] font-bold border border-brand-100 dark:border-brand-900/30">
                        +{currentQ.marks} Marks
                    </span>
                )}
            </div>
            <h1 
                className="font-bold text-gray-900 dark:text-white leading-snug font-serif break-words"
                style={{ fontSize: `${fontSize + 4}px` }}
            >
                {getTxt(currentQ.question_text_en, currentQ.question_text_hi)}
            </h1>
        </div>

        {/* Answer Section */}
        <div className="relative pl-4 border-l-2 border-green-500 dark:border-green-600">
            <div className="absolute -left-[9px] -top-1 w-4 h-4 bg-green-500 dark:bg-green-600 rounded-full flex items-center justify-center text-white ring-4 ring-white dark:ring-slate-950 transition-colors">
                <CheckCircle size={10} strokeWidth={3} />
            </div>
            <h3 className="text-green-700 dark:text-green-400 font-bold text-sm uppercase mb-3 ml-2 tracking-wide">Solution</h3>
            <div 
                className="text-gray-700 dark:text-slate-300 leading-relaxed ml-2 font-serif whitespace-pre-line"
                style={{ fontSize: `${fontSize}px` }}
            >
                {getTxt(currentQ.answer_text_en, currentQ.answer_text_hi) || getTxt(currentQ.solution_short_en, currentQ.solution_short_hi) || "Detailed answer not available."}
            </div>
        </div>

      </div>

      {/* 4. Bottom Navigation - Fixed with Safe Area */}
      <div className="fixed bottom-0 w-full bg-white dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800 p-4 pb-safe z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-5px_20px_rgba(0,0,0,0.2)] flex gap-4 transition-colors">
        <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex-1 py-3.5 rounded-xl font-bold text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-gray-100 dark:hover:bg-slate-800"
        >
            Previous
        </button>
        <button 
            onClick={handleNext}
            className="flex-1 py-3.5 rounded-xl font-bold text-white bg-brand-600 shadow-lg shadow-brand-200 dark:shadow-brand-900/50 hover:bg-brand-700 transition-transform active:scale-[0.98]"
        >
            {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>

    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { ArrowLeft, ZoomIn, ZoomOut, CheckCircle } from 'lucide-react';
import { PYQQuestion, Language } from '../types';
import { api } from '../services/api';
import { useBackHandler } from '../hooks/useBackHandler';

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
  const [lang, setLang] = useState<Language>(defaultLanguage === 'Hindi' ? 'hi' : 'en');
  const [fontSize, setFontSize] = useState(16);

  useEffect(() => {
      setLang(defaultLanguage === 'Hindi' ? 'hi' : 'en');
  }, [defaultLanguage]);

  const handleAppBack = () => {
    onExit(); 
    return true;
  };

  useBackHandler(handleAppBack);

  useEffect(() => {
    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const data = await api.getPYQs(subject, year, 'subjective');
            setQuestions(data || []);
        } catch (e) {
            console.error("Error fetching subjective questions", e);
            setQuestions([]);
        } finally {
            setLoading(false);
        }
    };
    if (subject && year) {
        fetchQuestions();
    }
  }, [subject, year]);

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

  const getTxt = (en?: string | null, hi?: string | null) => lang === 'hi' ? (hi || en) : en;

  // CRASH FIX: Ensure we have a valid question before rendering
  const currentQ = questions.length > 0 ? questions[currentIndex] : null;

  if (loading) {
      return (
        <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-slate-950 gap-4 transition-colors">
            <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm animate-pulse">Loading Questions...</p>
        </div>
      );
  }

  if (!questions || questions.length === 0 || !currentQ) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white dark:bg-slate-950 transition-colors">
        <p className="text-slate-500 dark:text-slate-400 font-medium">No subjective questions found.</p>
        <button onClick={handleAppBack} className="mt-4 px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg text-sm font-bold">Go Back</button>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-white dark:bg-slate-950 font-sans animate-fade-in transition-colors duration-300">
      
      {/* 1. Header (Safe Area pt-safe-header) */}
      <div className="px-4 pb-3 pt-safe-header bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 z-50 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <button onClick={handleAppBack} className="p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white leading-none">Learn Subjective</h2>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-1">{subject} • {year}</p>
          </div>
        </div>

        <div className="flex items-center bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-1">
          <button 
            onClick={() => setFontSize(s => Math.max(12, s - 2))}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 active:bg-white dark:active:bg-slate-800 rounded-md transition-all"
          >
            <ZoomOut size={16} />
          </button>
          <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
          <button 
            onClick={() => setFontSize(s => Math.min(24, s + 2))}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 active:bg-white dark:active:bg-slate-800 rounded-md transition-all"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* 2. Top Bar */}
      <div className="px-5 py-3 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
        <div className="flex gap-1 overflow-x-auto hide-scrollbar max-w-[200px]">
            {questions.map((_, idx) => (
                <div 
                    key={idx} 
                    className={`h-1.5 rounded-full transition-all duration-300 shrink-0 ${idx === currentIndex ? 'w-6 bg-brand-600 dark:bg-brand-500' : 'w-1.5 bg-slate-200 dark:bg-slate-700'}`}
                />
            ))}
        </div>
        <button onClick={() => setLang(l => l==='en'?'hi':'en')} className="flex items-center gap-1 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 shadow-sm shrink-0 transition-colors">
            {lang === 'en' ? 'ENG' : 'HIN'}
        </button>
      </div>

      {/* 3. Content Area */}
      <div className="flex-1 overflow-y-auto p-6 pb-32 w-full">
        
        <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Question {currentIndex + 1}</span>
                {currentQ.marks && (
                    <span className="bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 px-2 py-1 rounded text-[10px] font-bold border border-brand-100 dark:border-brand-800">
                        +{currentQ.marks} Marks
                    </span>
                )}
            </div>
            <h1 
                className="font-bold text-slate-900 dark:text-white leading-snug font-serif break-words transition-colors"
                style={{ fontSize: `${fontSize + 4}px` }}
            >
                {getTxt(currentQ.question_text_en, currentQ.question_text_hi)}
            </h1>
        </div>

        <div className="relative pl-4 border-l-2 border-green-500 dark:border-green-600">
            <div className="absolute -left-[9px] -top-1 w-4 h-4 bg-green-500 dark:bg-green-600 rounded-full flex items-center justify-center text-white ring-4 ring-white dark:ring-slate-950">
                <CheckCircle size={10} strokeWidth={3} />
            </div>
            <h3 className="text-green-700 dark:text-green-400 font-bold text-sm uppercase mb-3 ml-2">Solution</h3>
            <div 
                className="text-slate-700 dark:text-slate-300 leading-relaxed ml-2 font-serif break-words transition-colors"
                style={{ fontSize: `${fontSize}px` }}
            >
                {getTxt(currentQ.answer_text_en, currentQ.answer_text_hi) || getTxt(currentQ.solution_short_en, currentQ.solution_short_hi) || "Detailed answer not available."}
            </div>
        </div>

      </div>

      {/* 4. Bottom Navigation - Fixed Safe Area */}
      <div className="fixed bottom-0 w-full bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 p-4 pb-safe z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] dark:shadow-none flex gap-4 transition-colors">
        <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
            Previous
        </button>
        <button 
            onClick={handleNext}
            className="flex-1 py-3.5 rounded-xl font-bold text-white bg-brand-600 dark:bg-brand-500 shadow-lg shadow-brand-200 dark:shadow-brand-900/50 hover:bg-brand-700 dark:hover:bg-brand-600 transition-transform active:scale-[0.98]"
        >
            {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>

    </div>
  );
};

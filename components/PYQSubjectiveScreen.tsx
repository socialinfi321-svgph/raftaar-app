
import React, { useState, useEffect } from 'react';
import { ArrowLeft, ZoomIn, ZoomOut, CheckCircle } from 'lucide-react';
import { PYQQuestion, Language } from '../types';
import { api } from '../services/api';

interface PYQSubjectiveScreenProps {
  subject: string;
  year: number;
  onExit: () => void;
}

export const PYQSubjectiveScreen: React.FC<PYQSubjectiveScreenProps> = ({ subject, year, onExit }) => {
  const [questions, setQuestions] = useState<PYQQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lang, setLang] = useState<Language>('en');
  const [fontSize, setFontSize] = useState(16); // Base font size

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
        <div className="h-full flex flex-col items-center justify-center bg-white gap-4">
            <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 font-medium text-sm animate-pulse">Loading Questions...</p>
        </div>
      );
  }

  // Render Empty
  if (!questions || questions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white">
        <p className="text-gray-500 font-medium">No subjective questions found for this year.</p>
        <button onClick={onExit} className="mt-4 px-6 py-2 bg-gray-100 rounded-lg text-sm font-bold">Go Back</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white font-sans animate-fade-in">
      
      {/* 1. Header (Safe Area pt-12) */}
      <div className="px-4 pt-12 pb-3 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onExit} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h2 className="text-lg font-black text-gray-900 leading-none">Learn Subjective</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">{subject} • {year}</p>
          </div>
        </div>

        {/* Font Controls */}
        <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 p-1">
          <button 
            onClick={() => setFontSize(s => Math.max(12, s - 2))}
            className="p-1.5 text-gray-500 hover:text-brand-600 active:bg-white rounded-md transition-all"
          >
            <ZoomOut size={16} />
          </button>
          <div className="w-[1px] h-4 bg-gray-200 mx-1"></div>
          <button 
            onClick={() => setFontSize(s => Math.min(24, s + 2))}
            className="p-1.5 text-gray-500 hover:text-brand-600 active:bg-white rounded-md transition-all"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* 2. Top Bar (Progress & Lang) */}
      <div className="px-5 py-3 flex justify-between items-center bg-gray-50/50">
        <div className="flex gap-1 overflow-x-auto hide-scrollbar max-w-[200px]">
            {questions.map((_, idx) => (
                <div 
                    key={idx} 
                    className={`h-1.5 rounded-full transition-all duration-300 shrink-0 ${idx === currentIndex ? 'w-6 bg-brand-600' : 'w-1.5 bg-gray-200'}`}
                />
            ))}
        </div>
        <button onClick={() => setLang(l => l==='en'?'hi':'en')} className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-gray-200 text-[10px] font-bold text-gray-600 shadow-sm shrink-0">
            {lang === 'en' ? 'ENG' : 'HIN'}
        </button>
      </div>

      {/* 3. Content Area */}
      <div className="flex-1 overflow-y-auto p-6 pb-32">
        
        {/* Question Card */}
        <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Question {currentIndex + 1}</span>
                {currentQ.marks && (
                    <span className="bg-brand-50 text-brand-700 px-2 py-1 rounded text-[10px] font-bold border border-brand-100">
                        +{currentQ.marks} Marks
                    </span>
                )}
            </div>
            <h1 
                className="font-bold text-gray-900 leading-snug font-serif"
                style={{ fontSize: `${fontSize + 4}px` }}
            >
                {getTxt(currentQ.question_text_en, currentQ.question_text_hi)}
            </h1>
        </div>

        {/* Answer Section */}
        <div className="relative pl-4 border-l-2 border-green-500">
            <div className="absolute -left-[9px] -top-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white ring-4 ring-white">
                <CheckCircle size={10} strokeWidth={3} />
            </div>
            <h3 className="text-green-700 font-bold text-sm uppercase mb-3 ml-2">Solution</h3>
            <div 
                className="text-gray-700 leading-relaxed ml-2 font-serif"
                style={{ fontSize: `${fontSize}px` }}
            >
                {getTxt(currentQ.answer_text_en, currentQ.answer_text_hi) || getTxt(currentQ.solution_short_en, currentQ.solution_short_hi) || "Detailed answer not available."}
            </div>
        </div>

      </div>

      {/* 4. Bottom Navigation */}
      <div className="fixed bottom-0 w-full bg-white border-t border-gray-100 p-4 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] flex gap-4">
        <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex-1 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-50 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
            Previous
        </button>
        <button 
            onClick={handleNext}
            className="flex-1 py-3.5 rounded-xl font-bold text-white bg-brand-600 shadow-lg shadow-brand-200 hover:bg-brand-700 transition-transform active:scale-[0.98]"
        >
            {currentIndex === questions.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>

    </div>
  );
};

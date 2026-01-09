
import React, { useState, useEffect, useRef } from 'react';
import { Question, Language } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock } from 'lucide-react';
import { useBackHandler } from '../hooks/useBackHandler';

interface TestInterfaceProps {
  questions: Question[];
  subjectName?: string;
  userId: string;
  onComplete: (stats: { correct: number, wrong: number, skipped: number, totalTime: number }) => void;
  onExit: () => void;
  onAnswerSubmit: (qId: number, option: string, isCorrect: boolean, timeTaken: number) => void;
  defaultLanguage?: 'Hindi' | 'English'; 
}

export const TestInterface: React.FC<TestInterfaceProps> = ({ 
    questions, 
    subjectName, 
    userId, 
    onComplete, 
    onExit, 
    onAnswerSubmit,
    defaultLanguage = 'English'
}) => {
  const [lang, setLang] = useState<Language>(defaultLanguage === 'Hindi' ? 'hi' : 'en');
  
  useEffect(() => {
      setLang(defaultLanguage === 'Hindi' ? 'hi' : 'en');
  }, [defaultLanguage]);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [grid, setGrid] = useState<Record<number, { status: string, answer: string | null }>>({});
  const [timer, setTimer] = useState(0); 
  const [showSolution, setShowSolution] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, answered: 0 });
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [submitting, setSubmitting] = useState(false);
  
  // Exit Modal State
  const [showExitModal, setShowExitModal] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Centralized Logic for Back Action
  const handleNavigationBack = () => {
     if (showExitModal) {
         setShowExitModal(false); // Close Modal if open
         return true; 
     }
     if (!submitting) {
         setShowExitModal(true); // Open Modal
         return true;
     }
     return true; // Trap if submitting
  };

  // Sync Hardware Back Button
  useBackHandler(() => {
    return handleNavigationBack();
  }, !submitting); 

  // Initialize Grid
  useEffect(() => {
    const initialGrid: any = {};
    questions.forEach((_, i) => {
        initialGrid[i] = { status: 'not-visited', answer: null };
    });
    if(initialGrid[0]) initialGrid[0].status = 'not-answered';
    setGrid(initialGrid);
    setQuestionStartTime(Date.now()); 
  }, [questions]);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setTimer(time => time + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const currentQ = questions[currentIndex];
  if (!currentQ) return <div className="p-10 text-center flex flex-col items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div><p className="mt-4 text-gray-500 font-bold">Loading Test...</p></div>;

  const currentStatus = grid[currentIndex] || { status: 'not-visited', answer: null };

  const handleOptionSelect = (option: string) => {
    if (showSolution) return; 

    const isCorrect = option === currentQ.correct_option;
    const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000); 
    
    const newGrid = { ...grid };
    newGrid[currentIndex] = {
        answer: option,
        status: isCorrect ? 'answered' : 'not-answered', 
    };
    setGrid(newGrid);
    setShowSolution(true);
    
    setStats(s => ({
        ...s,
        answered: s.answered + 1,
        correct: isCorrect ? s.correct + 1 : s.correct,
        wrong: !isCorrect ? s.wrong + 1 : s.wrong
    }));

    onAnswerSubmit(currentQ.id, option, isCorrect, timeTaken);
  };

  const finishTest = async () => {
    if (submitting) return;
    setSubmitting(true);

    let correct = 0, wrong = 0, skipped = 0;
    Object.values(grid).forEach((g: any, i) => {
        const q = questions[i];
        if (g.answer) {
            if (g.answer === q.correct_option) correct++;
            else wrong++;
        } else {
            skipped++;
        }
    });

    onComplete({ correct, wrong, skipped, totalTime: timer });
  };

  const handleNext = () => {
    setShowSolution(false);
    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      const newGrid = { ...grid };
      if (newGrid[nextIndex].status === 'not-visited') {
          newGrid[nextIndex].status = 'not-answered';
      }
      setGrid(newGrid);
      setCurrentIndex(nextIndex);
      setQuestionStartTime(Date.now());
      
      // Auto Scroll Palette
      if (scrollRef.current) {
          const itemWidth = 40; 
          const containerWidth = scrollRef.current.clientWidth;
          const scrollPos = (nextIndex * itemWidth) - (containerWidth / 2) + (itemWidth / 2);
          scrollRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
      }
    } else {
        finishTest();
    }
  };

  const handlePrev = () => {
      setShowSolution(false);
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
        setQuestionStartTime(Date.now());
      }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getText = (field: string) => {
    const en = currentQ[`${field}_en` as keyof Question] as string;
    const hi = currentQ[`${field}_hi` as keyof Question] as string;
    return lang === 'hi' ? (hi || en) : en;
  };

  const questionsLeft = questions.length - stats.answered;

  return (
    <div className="flex flex-col h-[100dvh] bg-white relative font-sans animate-fade-in overflow-hidden">
        
        {/* --- HEADER (Fixed with Safe Area) --- */}
        <div className="px-4 pb-3 pt-safe-header bg-white border-b border-gray-100 flex justify-between items-center z-50 sticky top-0 shadow-sm shrink-0">
             <div className="flex items-center gap-3">
                 {/* UI Back Button */}
                 <button onClick={handleNavigationBack} className="text-gray-500 hover:text-gray-700 p-1 -ml-1 rounded-full active:bg-gray-100">
                    <ArrowLeft size={20} />
                 </button>
                 
                 <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                    <Clock size={14} className="text-gray-500" />
                    <span className="font-mono font-bold text-gray-700 text-sm tracking-wider">{formatTime(timer)}</span>
                 </div>
            </div>
            
            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider truncate max-w-[120px]">{subjectName || 'Test'}</div>

            <button 
                onClick={finishTest} 
                disabled={submitting}
                className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold border border-red-100 hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
                {submitting && <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>}
                {submitting ? 'Saving...' : 'Submit'}
            </button>
        </div>

        {/* --- LIVE STATS GRID --- */}
        <div className="bg-gray-50 border-b border-gray-100 py-2 px-4 flex justify-between items-center text-[10px] font-bold text-gray-500 shrink-0">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> {stats.correct} Correct</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div> {stats.wrong} Wrong</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500"></div> {questionsLeft} Left</div>
        </div>

        {/* --- HORIZONTAL PALETTE STRIP --- */}
        <div className="bg-white border-b border-gray-100 py-3 shrink-0">
            <div ref={scrollRef} className="flex overflow-x-auto px-4 gap-2 hide-scrollbar snap-x scroll-smooth">
                {questions.map((_, i) => {
                    const isCorrect = grid[i]?.answer && grid[i]?.answer === questions[i].correct_option;
                    let bg = 'bg-white text-gray-400 border-gray-200';

                    if (grid[i]?.answer) {
                        if (isCorrect) bg = 'bg-green-500 text-white border-green-500';
                        else bg = 'bg-red-500 text-white border-red-500';
                    } else if (i === currentIndex) {
                        bg = 'ring-2 ring-offset-1 ring-brand-500 border-brand-500 text-brand-600 bg-brand-50';
                    }

                    return (
                        <div key={i} onClick={() => { 
                            setCurrentIndex(i); 
                            setShowSolution(!!grid[i]?.answer);
                            setQuestionStartTime(Date.now());
                        }} className={`snap-center shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold border transition-all cursor-pointer relative ${bg}`}>
                            {i + 1}
                        </div>
                    )
                })}
            </div>
        </div>

        {/* --- QUESTION AREA (Scrollable) --- */}
        <div className="flex-1 overflow-y-auto p-5 pb-32 hide-scrollbar w-full">
            <div className="flex justify-between items-start mb-4">
                 <span className="font-bold text-gray-400 text-[10px] uppercase tracking-wider bg-gray-100 px-2 py-1 rounded">Question {currentIndex + 1}</span>
                 <button onClick={() => setLang(l => l==='en'?'hi':'en')} className="flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-gray-200 text-[10px] font-bold text-gray-600 active:scale-95 transition-transform shadow-sm">
                    <i className="fa-solid fa-language"></i> {lang === 'en' ? 'ENG' : 'HIN'}
                </button>
            </div>

            {/* Question Text with Word Break */}
            <p className="text-lg font-bold text-gray-900 leading-relaxed mb-4 font-serif break-words">
                {getText('question_text')}
            </p>

            <div className="flex items-center gap-2 mb-6">
                <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-1 rounded border border-green-100">
                    +1.0
                </span>
                <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-1 rounded border border-red-100">
                    -0.0
                </span>
            </div>

            <div className="space-y-4">
                {['A','B','C','D'].map((opt) => {
                    const optText = getText(`option_${opt.toLowerCase()}`);
                    const isSelected = currentStatus.answer === opt;
                    const isCorrect = opt === currentQ.correct_option;

                    let cardClass = "p-4 rounded-xl border-2 cursor-pointer flex items-start gap-4 transition-all active:scale-[0.98] ";
                    let circleClass = "w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0 transition-colors mt-0.5 ";
                    
                    if (showSolution) {
                        if(isCorrect) {
                            cardClass += "border-green-500 bg-green-50";
                            circleClass += "bg-green-500 text-white border-green-500";
                        } else if (isSelected && !isCorrect) {
                            cardClass += "border-red-500 bg-red-50";
                            circleClass += "bg-red-500 text-white border-red-500";
                        } else {
                            cardClass += "border-gray-100 opacity-50";
                            circleClass += "border-gray-200 text-gray-400";
                        }
                    } else {
                        cardClass += "border-gray-200 bg-white hover:border-brand-300";
                        circleClass += "border-gray-200 text-gray-400";
                    }

                    return (
                        <div key={opt} onClick={() => handleOptionSelect(opt)} className={cardClass}>
                            <div className={circleClass}>{opt}</div>
                            <div className="flex-1 text-sm font-medium text-gray-700 break-words leading-relaxed">
                                {optText}
                            </div>
                        </div>
                    )
                })}
            </div>

            {showSolution && (
                <div className="mt-6 p-5 rounded-xl bg-blue-50 border border-blue-100 animate-slide-up">
                    <div className="flex items-center gap-2 mb-2">
                        <i className="fa-solid fa-lightbulb text-blue-600"></i>
                        <p className="text-xs font-bold text-blue-700 uppercase">Explanation</p>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed break-words">{getText('solution_short') || "No detailed explanation available for this question."}</p>
                </div>
            )}
        </div>

        {/* --- BOTTOM BAR (Fixed & Safe Area) --- */}
        <div className="absolute bottom-0 w-full bg-white border-t border-gray-100 p-4 pb-safe shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-30 flex items-center gap-4">
            <div className="w-full flex gap-4 pb-2">
                <button onClick={handlePrev} disabled={currentIndex === 0} className="w-1/3 py-3.5 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 disabled:opacity-50 hover:bg-gray-50 transition-colors">
                    Previous
                </button>
                
                <button onClick={handleNext} className="flex-1 bg-brand-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 transition-colors flex items-center justify-center gap-2 active:scale-[0.98]">
                    {currentIndex === questions.length - 1 ? 'Finish' : 'Save & Next'}
                </button>
            </div>
        </div>

        {/* --- EXIT CONFIRMATION MODAL --- */}
        <AnimatePresence>
          {showExitModal && (
              <>
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
                    onClick={() => setShowExitModal(false)}
                    className="fixed inset-0 bg-black z-40"
                />
                <motion.div
                    initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2rem] z-50 p-6 pb-safe shadow-2xl"
                >
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 mt-2"></div>
                    
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                            <i className="fa-solid fa-arrow-right-from-bracket text-2xl text-red-500"></i>
                        </div>
                        <p className="text-gray-800 font-bold text-lg">Exit Test?</p>
                        <p className="text-gray-500 text-sm mt-1 max-w-xs leading-relaxed">
                            Your current progress will be lost if you exit without submitting.
                        </p>
                    </div>

                    <div className="flex gap-4 pb-4">
                        <button 
                            onClick={onExit} 
                            className="flex-1 py-3.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                        >
                            Exit
                        </button>
                        <button 
                            onClick={() => setShowExitModal(false)} 
                            className="flex-1 py-3.5 rounded-xl bg-brand-600 text-white font-bold shadow-lg shadow-brand-200 hover:bg-brand-700 transition-colors"
                        >
                            Continue
                        </button>
                    </div>
                </motion.div>
              </>
          )}
      </AnimatePresence>
    </div>
  );
};

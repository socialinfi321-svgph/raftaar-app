
import React, { useState, useEffect, useRef } from 'react';
import { Clock, ArrowLeft, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Question, Language, TestSubmission } from '../types';
import { api } from '../services/api';
import { useBackHandler } from '../hooks/useBackHandler';

interface InfinityTestScreenProps {
  userId: string;
  selectedChapters?: string[];
  subject: string;
  isPYQ?: boolean;
  pyqYear?: number;
  onExit: () => void;
  defaultLanguage?: 'Hindi' | 'English';
}

const shuffleArray = (array: Question[]) => {
  return array.map(value => ({ value, sort: Math.random() }))
              .sort((a, b) => a.sort - b.sort)
              .map(({ value }) => value);
};

export const InfinityTestScreen: React.FC<InfinityTestScreenProps> = ({ 
    userId, 
    selectedChapters, 
    subject, 
    onExit,
    isPYQ = false,
    pyqYear,
    defaultLanguage = 'English'
}) => {
  // ✅ 1. Initialize State from Local Storage
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('raftaar-language');
    if (saved === 'Hindi' || saved === 'hi') return 'hi';
    if (saved === 'English' || saved === 'en') return 'en';
    return defaultLanguage === 'Hindi' ? 'hi' : 'en';
  });

  // ✅ 2. Toggle Handler
  const toggleLanguage = () => {
    setLang(prev => {
      const newLang = prev === 'en' ? 'hi' : 'en';
      localStorage.setItem('raftaar-language', newLang === 'hi' ? 'Hindi' : 'English');
      return newLang;
    });
  };

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [isTestFinished, setIsTestFinished] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [roundCycle, setRoundCycle] = useState<1 | 2 | 3>(1);
  const seenIdsRef = useRef<Set<number>>(new Set()); 
  const hasFetchedNextRound = useRef<boolean>(false);
  const allQuestionsExhausted = useRef<boolean>(false);
  const questionStartTimeRef = useRef<number>(Date.now());
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null); // For scrolling Question Area

  const [answers, setAnswers] = useState<Record<number, string>>({}); 
  const [visitedIndices, setVisitedIndices] = useState<Set<number>>(new Set([0]));
  const [elapsedTime, setElapsedTime] = useState(0); 
  
  const handleAppBack = () => {
    if (showExitModal) {
      setShowExitModal(false);
      return true;
    }
    if (isTestFinished) {
      onExit();
      return true;
    }
    if (isSubmitting) {
      return true; 
    }
    setShowExitModal(true);
    return true;
  };

  useBackHandler(handleAppBack, true);

  const getQuantityForRound = (cycle: number) => {
      const N = selectedChapters?.length || 1;
      if (cycle === 1) return Math.max(1, N - 1);
      if (cycle === 2) return N;
      return N + 1; 
  };

  useEffect(() => {
    const initData = async () => {
        setLoading(true);
        try {
            if (isPYQ && pyqYear) {
                const data = await api.getPYQs(subject, pyqYear, 'objective');
                if (data.length > 0) {
                    setQuestions(data);
                    allQuestionsExhausted.current = true;
                } else {
                    setFetchError(`No objective questions found for ${subject} ${pyqYear}.`);
                }
            } else if (selectedChapters && selectedChapters.length > 0) {
                const quantity = getQuantityForRound(1);
                const newQuestions = await api.fetchInfinityBatch(selectedChapters, [], quantity);
                
                if (newQuestions.length > 0) {
                    const randomizedQuestions = shuffleArray(newQuestions);
                    setQuestions(randomizedQuestions);
                    randomizedQuestions.forEach(q => seenIdsRef.current.add(q.id));
                    setRoundCycle(2); 
                } else {
                    setFetchError("No questions found for these chapters.");
                }
            } else {
                setFetchError("Invalid configuration.");
            }
        } catch (err) {
            console.error(err);
            setFetchError("Failed to load questions.");
        } finally {
            setLoading(false);
        }
    };

    initData();
  }, [selectedChapters, userId, isPYQ, subject, pyqYear]);

  useEffect(() => {
    if (isPYQ) return;
    if (loading || loadingMore || isTestFinished || allQuestionsExhausted.current) return;
    
    if (currentIndex >= questions.length - 3 && !hasFetchedNextRound.current) {
        loadNextRound();
    }
  }, [currentIndex, questions.length, loading, loadingMore, isTestFinished, isPYQ]);

  // Auto Scroll Top on Question Change
  useEffect(() => {
    if (mainContentRef.current) {
        mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentIndex]);

  const loadNextRound = async () => {
      if (!selectedChapters) return;
      hasFetchedNextRound.current = true;
      setLoadingMore(true);
      try {
          const quantity = getQuantityForRound(roundCycle);
          const currentSeenIds = Array.from(seenIdsRef.current) as number[];
          const newBatch = await api.fetchInfinityBatch(selectedChapters, currentSeenIds, quantity);

          if (newBatch.length > 0) {
              const randomizedBatch = shuffleArray(newBatch);
              setQuestions(prev => [...prev, ...randomizedBatch]);
              randomizedBatch.forEach(q => seenIdsRef.current.add(q.id));
              setRoundCycle(prev => (prev === 3 ? 1 : prev + 1) as 1 | 2 | 3);
              hasFetchedNextRound.current = false;
          } else {
              allQuestionsExhausted.current = true;
              hasFetchedNextRound.current = true;
          }
      } catch (err) {
          hasFetchedNextRound.current = false;
      } finally {
          setLoadingMore(false);
      }
  };

  useEffect(() => {
    if (loading || isTestFinished) return;
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, isTestFinished]);

  const handleOptionSelect = (option: string) => {
    const currentQ = questions[currentIndex];
    if (!currentQ || answers[currentQ.id]) return;

    setAnswers(prev => ({ ...prev, [currentQ.id]: option }));

    const timeTaken = Math.floor((Date.now() - questionStartTimeRef.current) / 1000); 
    const isCorrect = option === currentQ.correct_option;
    
    api.submitAnswer(userId, currentQ.id, option, isCorrect, timeTaken);
  };

  const updateVisited = (index: number) => {
      setVisitedIndices(prev => new Set(prev).add(index));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      updateVisited(nextIdx);
      questionStartTimeRef.current = Date.now();
      
      if (scrollRef.current) {
          const itemWidth = 44; 
          const containerWidth = scrollRef.current.clientWidth;
          const scrollPos = (nextIdx * itemWidth) - (containerWidth / 2) + (itemWidth / 2);
          scrollRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
      }
    } else {
       if (allQuestionsExhausted.current || isPYQ) {
           handleFinishTest();
       } else if (loadingMore) {
           alert("Fetching more questions...");
       }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      updateVisited(prevIdx);
      questionStartTimeRef.current = Date.now();
    }
  };

  const handleFinishTest = async () => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      
      const totalQ = questions.length;
      const correctCount = questions.filter(q => answers[q.id] === q.correct_option).length;
      const attemptedCount = Object.keys(answers).length;
      const wrongCount = attemptedCount - correctCount;
      const skippedCount = totalQ - attemptedCount;
      
      const submissionData: TestSubmission = {
          userId: userId,
          subject: subject,
          testType: isPYQ ? 'PYQ' : 'Infinity',
          totalQuestions: totalQ,
          correct: correctCount,
          wrong: wrongCount,
          skipped: skippedCount,
          timeTaken: elapsedTime, 
          date: new Date().toISOString()
      };

      if (userId) {
          await api.submitTestResult(submissionData);
      }

      setIsTestFinished(true);
      setIsSubmitting(false);
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getTxt = (en: string | null, hi: string | null) => lang === 'hi' ? (hi || en) : en;

  if (isTestFinished) {
      const totalQuestions = questions.length;
      const attemptedCount = Object.keys(answers).length;
      const correctCount = questions.filter(q => answers[q.id] === q.correct_option).length;
      const wrongCount = attemptedCount - correctCount;
      const visitedCount = visitedIndices.size;
      const notVisitedCount = totalQuestions - visitedCount;
      const notAnsweredCount = visitedCount - attemptedCount; 
      const score = correctCount; 

      return (
          <div className="h-[100dvh] flex flex-col bg-white dark:bg-slate-950 overflow-y-auto font-sans animate-fade-in transition-colors hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {/* Analytics Header - Safe Area Fixed */}
              <div className="bg-white dark:bg-slate-950 px-5 pb-4 pt-safe-header border-b border-gray-100 dark:border-slate-800 sticky top-0 z-50 flex justify-between items-center shadow-sm">
                  <h2 className="text-lg font-black text-gray-900 dark:text-white">{isPYQ ? `Result - ${pyqYear}` : 'Objective Test'}</h2>
                  <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-xs font-bold font-mono">
                      {formatTime(elapsedTime)}
                  </div>
              </div>

              <div className="p-6 pb-24 space-y-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Test Summary</h3>
                  <div className="bg-gray-50 dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
                      <div className="bg-white dark:bg-slate-950 p-4 rounded-xl flex justify-between items-center shadow-sm border border-gray-100 dark:border-slate-800">
                          <span className="text-gray-600 dark:text-slate-400 font-medium">Total Questions</span>
                          <span className="text-2xl font-black text-gray-900 dark:text-white">{totalQuestions}</span>
                      </div>
                      <div className="space-y-3">
                          <div className="flex items-center justify-between bg-white dark:bg-slate-950 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                              <div className="flex items-center gap-3">
                                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                  <span className="text-gray-600 dark:text-slate-400 font-medium text-sm">Answered</span>
                              </div>
                              <span className="text-lg font-bold text-gray-900 dark:text-white">{attemptedCount}</span>
                          </div>
                          <div className="flex items-center justify-between bg-white dark:bg-slate-950 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                              <div className="flex items-center gap-3">
                                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                  <span className="text-gray-600 dark:text-slate-400 font-medium text-sm">Not Answered</span>
                              </div>
                              <span className="text-lg font-bold text-gray-900 dark:text-white">{notAnsweredCount}</span>
                          </div>
                      </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 border border-blue-100 dark:border-blue-900/30">
                      <div className="flex justify-between items-center mb-4">
                          <span className="text-blue-800 dark:text-blue-300 font-bold text-sm uppercase tracking-wider">Evaluation</span>
                          <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200 px-2 py-1 rounded text-xs font-bold">Marks: +1 / 0</span>
                      </div>
                      <div className="flex gap-4">
                          <div className="flex-1 bg-white dark:bg-slate-950 p-3 rounded-xl flex flex-col items-center justify-center border border-blue-100 dark:border-blue-900/30">
                              <span className="text-2xl font-black text-green-600 dark:text-green-500">{correctCount}</span>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">Correct</span>
                          </div>
                          <div className="flex-1 bg-white dark:bg-slate-950 p-3 rounded-xl flex flex-col items-center justify-center border border-blue-100 dark:border-blue-900/30">
                              <span className="text-2xl font-black text-red-500 dark:text-red-400">{wrongCount}</span>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">Wrong</span>
                          </div>
                          <div className="flex-1 bg-white dark:bg-slate-950 p-3 rounded-xl flex flex-col items-center justify-center border border-blue-100 dark:border-blue-900/30">
                              <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{score}</span>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">Score</span>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="fixed bottom-0 w-full bg-white dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800 p-4 pb-safe z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-5px_20px_rgba(0,0,0,0.2)]">
                  <button onClick={onExit} className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:scale-[1.01] transition-transform">
                      Return to Dashboard
                  </button>
              </div>
          </div>
      )
  }

  if (loading) {
      return (
          <div className="h-screen flex items-center justify-center bg-white dark:bg-slate-950 flex-col gap-4">
              <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 dark:text-slate-400 font-medium text-sm animate-pulse">Preparing Session...</p>
          </div>
      );
  }

  if (fetchError) {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 gap-6 p-6 text-center">
              <p className="text-red-500 dark:text-red-400 font-medium">{fetchError}</p>
              <button onClick={onExit} className="px-6 py-2 bg-gray-100 dark:bg-slate-800 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300">Back</button>
          </div>
      )
  }

  const currentQ = questions[currentIndex];
  if (!currentQ) return null;

  const currentAnswer = answers[currentQ.id];

  return (
    <div className="flex flex-col h-[100dvh] bg-white dark:bg-slate-950 relative font-sans text-gray-900 dark:text-white overflow-hidden transition-colors">
      
      {/* 1. Header - Fixed Safe Area */}
      <div className="px-4 pb-2 pt-safe-header bg-white dark:bg-slate-950 flex justify-between items-center shrink-0 shadow-sm border-b border-gray-100 dark:border-slate-800 z-10 sticky top-0 transition-colors">
          <div className="flex items-center gap-3">
              <button onClick={handleAppBack} className="p-2 -ml-2 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">
                  <ArrowLeft size={20} />
              </button>
              <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{subject} {isPYQ && `• ${pyqYear}`}</span>
                  <div className="flex items-center gap-1.5 text-gray-800 dark:text-white font-medium leading-none">
                      <Clock size={14} className="text-brand-600 dark:text-brand-400" />
                      <span className="font-mono text-sm">{formatTime(elapsedTime)}</span>
                  </div>
              </div>
          </div>

          <button onClick={handleFinishTest} disabled={isSubmitting} className="text-white text-xs font-bold bg-brand-600 px-5 py-2 rounded-lg shadow-md shadow-brand-200 dark:shadow-brand-900 hover:bg-brand-700 transition-colors disabled:opacity-70">
              {isSubmitting ? 'Saving...' : 'Submit'}
          </button>
      </div>

      {/* 2. Top Palette - Below Header */}
      <div className="bg-gray-50/50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 py-2 shrink-0 flex items-center gap-2 px-3 transition-colors">
          <div ref={scrollRef} className="flex-1 overflow-x-auto hide-scrollbar flex items-center gap-2.5 scroll-smooth">
              {questions.map((q, i) => {
                  const isActive = i === currentIndex;
                  const ans = answers[q.id];
                  const isCorrect = ans && ans === q.correct_option;
                  
                  let styleClass = "bg-white dark:bg-slate-950 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400"; 

                  if (ans) {
                      styleClass = isCorrect 
                        ? "bg-green-100 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-400" 
                        : "bg-blue-100 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400";
                  } else if (isActive) {
                      styleClass = "border-brand-600 text-brand-600 dark:text-brand-400 ring-1 ring-brand-100 dark:ring-brand-900/50";
                  }

                  return (
                    <button 
                        key={i} 
                        onClick={() => { setCurrentIndex(i); updateVisited(i); }}
                        className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold border transition-all ${styleClass}`}
                    >
                        {i + 1}
                    </button>
                  )
              })}
              {loadingMore && <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin shrink-0"></div>}
          </div>
          <div className="h-6 w-[1px] bg-gray-200 dark:bg-slate-800 mx-1"></div>
          <div className="text-[10px] font-bold text-gray-400 dark:text-slate-500">{currentIndex + 1}/{questions.length}</div>
      </div>

      {/* 3. Question Area - Scrollable */}
      <div 
        ref={mainContentRef}
        className="flex-1 overflow-y-auto p-5 pb-32 bg-white dark:bg-slate-950 w-full transition-colors hide-scrollbar scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
          
          <div className="flex justify-between items-start mb-4">
              <span className="font-bold text-gray-400 dark:text-slate-500 text-[10px] uppercase tracking-wider bg-gray-100 dark:bg-slate-900 px-2 py-1 rounded">Question {currentIndex + 1}</span>
              
              <button 
                  onClick={toggleLanguage}
                  className="flex items-center gap-1 bg-brand-50 dark:bg-brand-900/20 px-3 py-1 rounded-full border border-brand-100 dark:border-brand-900/50 text-[10px] font-bold text-brand-700 dark:text-brand-400"
              >
                  {lang === 'en' ? 'ENG' : 'HIN'}
              </button>
          </div>

          {/* Question Text - Break Words for Mobile */}
          <div className="mb-4">
              <p className="text-lg font-bold text-gray-900 dark:text-white leading-relaxed font-serif break-words">
                  {getTxt(currentQ.question_text_en, currentQ.question_text_hi)}
              </p>
          </div>

          <div className="flex items-center gap-2 mb-6">
              <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-900 text-[9px] font-bold text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-800 w-fit">
                  +1.0 Marks
              </span>
              {currentQ.exam_year && (
                  <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-[9px] font-bold text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 w-fit flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> {currentQ.exam_year}
                  </span>
              )}
          </div>

          {/* Options */}
          <div className="space-y-4">
              {['A', 'B', 'C', 'D'].map((opt) => {
                  const optionText = getTxt(
                      currentQ[`option_${opt.toLowerCase()}_en` as keyof Question] as string,
                      currentQ[`option_${opt.toLowerCase()}_hi` as keyof Question] as string
                  );
                  
                  const isSelected = currentAnswer === opt;
                  const isCorrectAnswer = currentQ.correct_option === opt;
                  
                  let cardClass = "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-700";
                  let circleClass = "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-700";

                  if (currentAnswer) {
                      if (isCorrectAnswer) {
                          cardClass = "bg-green-50 dark:bg-green-900/30 border-green-500 text-green-800 dark:text-green-300";
                          circleClass = "bg-green-500 text-white border-green-500";
                      } else if (isSelected && !isCorrectAnswer) {
                          cardClass = "bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-800 dark:text-blue-300";
                          circleClass = "bg-blue-500 text-white border-blue-500";
                      } else {
                          cardClass = "opacity-50 border-gray-100 dark:border-slate-800";
                      }
                  }

                  return (
                      <div 
                        key={opt} 
                        onClick={() => handleOptionSelect(opt)}
                        className={`p-4 rounded-xl border-2 flex items-start gap-4 cursor-pointer transition-all active:scale-[0.98] ${cardClass}`}
                      >
                          <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 transition-colors ${circleClass}`}>
                              {opt}
                          </div>
                          <div className="text-sm font-medium leading-snug break-words flex-1">
                              {optionText}
                          </div>
                      </div>
                  )
              })}
          </div>

      </div>

      {/* 4. Footer Buttons - Fixed Safe Area */}
      <div className="absolute bottom-0 w-full bg-white dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800 p-4 pb-safe z-20 flex items-center justify-between gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)] transition-colors">
          <div className="w-full flex gap-4 pb-2">
            <button 
                onClick={handlePrev} 
                disabled={currentIndex === 0}
                className="px-6 py-3 rounded-xl font-bold text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-900 border-2 border-brand-600 dark:border-brand-500 disabled:opacity-50 disabled:border-gray-200 dark:disabled:border-slate-800 disabled:text-gray-400 dark:disabled:text-slate-600 transition-colors w-1/3 text-sm"
            >
                Prev
            </button>
            
            <button 
                onClick={handleNext}
                className="px-6 py-3 rounded-xl font-bold text-white bg-brand-600 shadow-lg shadow-brand-200 dark:shadow-brand-900 hover:bg-brand-700 transition-transform active:scale-95 w-2/3 text-sm"
            >
                {currentIndex === questions.length - 1 && (allQuestionsExhausted.current || isPYQ) ? 'Finish' : 'Next'}
            </button>
          </div>
      </div>

      {/* --- EXIT MODAL --- */}
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
                    className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-[2rem] z-50 p-6 pb-safe shadow-2xl border-t border-slate-100 dark:border-slate-800"
                >
                    <div className="w-12 h-1 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto mb-6 mt-2"></div>
                    
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle className="text-red-500 dark:text-red-400" size={32} />
                        </div>
                        <p className="text-gray-800 dark:text-white font-bold text-lg">Exit Test?</p>
                        <p className="text-gray-500 dark:text-slate-400 text-sm mt-1 max-w-xs leading-relaxed">
                            Your progress will be saved, but the test session will end.
                        </p>
                    </div>

                    <div className="flex gap-4 pb-4">
                        <button 
                            onClick={onExit} 
                            className="flex-1 py-3.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 font-bold hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            Exit
                        </button>
                        <button 
                            onClick={() => setShowExitModal(false)} 
                            className="flex-1 py-3.5 rounded-xl bg-brand-600 text-white font-bold shadow-lg shadow-brand-200 dark:shadow-brand-900 hover:bg-brand-700 transition-colors"
                        >
                            Resume
                        </button>
                    </div>
                </motion.div>
              </>
          )}
      </AnimatePresence>

    </div>
  );
};

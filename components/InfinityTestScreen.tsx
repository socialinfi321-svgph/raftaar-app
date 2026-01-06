
import React, { useState, useEffect, useRef } from 'react';
import { Clock, ArrowLeft, AlertTriangle, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Question, Language, TestSubmission } from '../types';
import { api } from '../services/api';
import { useBackHandler } from '../hooks/useBackHandler';

interface InfinityTestScreenProps {
  userId: string;
  // Infinity Mode Props
  selectedChapters?: string[];
  subject: string;
  // PYQ Mode Props
  isPYQ?: boolean;
  pyqYear?: number;
  // Common
  onExit: () => void;
  defaultLanguage?: 'Hindi' | 'English';
}

// Helper Function: Shuffle Array (Randomize Order)
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
  // --- States ---
  
  // Test Data
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Flow Control
  const [isTestFinished, setIsTestFinished] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Logic Cycle (Only for Infinity)
  const [roundCycle, setRoundCycle] = useState<1 | 2 | 3>(1);
  
  // Refs
  const seenIdsRef = useRef<Set<number>>(new Set()); 
  const hasFetchedNextRound = useRef<boolean>(false);
  const allQuestionsExhausted = useRef<boolean>(false);
  const questionStartTimeRef = useRef<number>(Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Interaction State
  const [answers, setAnswers] = useState<Record<number, string>>({}); 
  const [visitedIndices, setVisitedIndices] = useState<Set<number>>(new Set([0]));
  const [elapsedTime, setElapsedTime] = useState(0); 
  const [lang, setLang] = useState<Language>(defaultLanguage === 'Hindi' ? 'hi' : 'en');
  
  // --- UNIFIED BACK LOGIC ---
  const handleAppBack = () => {
    // 1. If Exit Modal is Open -> Close it (Resume)
    if (showExitModal) {
      setShowExitModal(false);
      return true; // Trap
    }
    // 2. If Test Finished -> Trigger Exit (Go Home/Dashboard)
    if (isTestFinished) {
      onExit();
      return true; // Trap (onExit handles nav)
    }
    // 3. If Submitting -> Do nothing (Trap)
    if (isSubmitting) {
      return true; 
    }
    // 4. Default: Show Exit Confirmation
    setShowExitModal(true);
    return true; // Trap
  };

  // Sync Hardware Button
  useBackHandler(handleAppBack, true);

  useEffect(() => {
    setLang(defaultLanguage === 'Hindi' ? 'hi' : 'en');
  }, [defaultLanguage]);

  // --- Logic: Round Calculation (Infinity Only) ---
  const getQuantityForRound = (cycle: number) => {
      const N = selectedChapters?.length || 1;
      if (cycle === 1) return Math.max(1, N - 1);
      if (cycle === 2) return N;
      return N + 1; 
  };

  // --- 1. Initial Data Fetch ---
  useEffect(() => {
    const initData = async () => {
        setLoading(true);
        try {
            if (isPYQ && pyqYear) {
                // PYQ MODE: Fetch all questions for that year at once (No Shuffle usually, to keep paper order)
                const data = await api.getPYQs(subject, pyqYear, 'objective');
                if (data.length > 0) {
                    setQuestions(data);
                    allQuestionsExhausted.current = true; // No more questions to fetch in PYQ
                } else {
                    setFetchError(`No objective questions found for ${subject} ${pyqYear}.`);
                }
            } else if (selectedChapters && selectedChapters.length > 0) {
                // INFINITY MODE: Fetch first batch
                const quantity = getQuantityForRound(1);
                const newQuestions = await api.fetchInfinityBatch(selectedChapters, [], quantity);
                
                if (newQuestions.length > 0) {
                    // Randomize the batch so chapters are mixed
                    const randomizedQuestions = shuffleArray(newQuestions);
                    
                    setQuestions(randomizedQuestions);
                    
                    // Track IDs to prevent duplicates (Temporary Memory)
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

  // --- 2. Background Fetching (Infinity Mode Only) ---
  useEffect(() => {
    if (isPYQ) return; // Disable background fetch for PYQ
    if (loading || loadingMore || isTestFinished || allQuestionsExhausted.current) return;
    
    if (currentIndex >= questions.length - 3 && !hasFetchedNextRound.current) {
        loadNextRound();
    }
  }, [currentIndex, questions.length, loading, loadingMore, isTestFinished, isPYQ]);

  const loadNextRound = async () => {
      if (!selectedChapters) return;
      hasFetchedNextRound.current = true;
      setLoadingMore(true);
      try {
          const quantity = getQuantityForRound(roundCycle);
          const currentSeenIds = Array.from(seenIdsRef.current) as number[];
          const newBatch = await api.fetchInfinityBatch(selectedChapters, currentSeenIds, quantity);

          if (newBatch.length > 0) {
              // Randomize the new batch before adding to list
              const randomizedBatch = shuffleArray(newBatch);

              setQuestions(prev => [...prev, ...randomizedBatch]);
              
              // Add to Temporary Memory
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

  // --- 3. Timer ---
  useEffect(() => {
    if (loading || isTestFinished) return;
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, isTestFinished]);

  // --- Handlers ---

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
      
      // 1. Calculate Results
      const totalQ = questions.length;
      const correctCount = questions.filter(q => answers[q.id] === q.correct_option).length;
      const attemptedCount = Object.keys(answers).length;
      const wrongCount = attemptedCount - correctCount;
      const skippedCount = totalQ - attemptedCount;
      
      // 3. Prepare Submission Data
      const submissionData: TestSubmission = {
          userId: userId,
          subject: subject,
          testType: isPYQ ? 'PYQ' : 'Infinity',
          totalQuestions: totalQ,
          correct: correctCount,
          wrong: wrongCount,
          skipped: skippedCount,
          timeTaken: elapsedTime, // Total seconds
          date: new Date().toISOString()
      };

      if (userId) {
          // 4. Save to Test History (New Table)
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

  // --- RENDER: Analytics / Finish Screen ---
  if (isTestFinished) {
      const totalQuestions = questions.length;
      const attemptedCount = Object.keys(answers).length;
      const correctCount = questions.filter(q => answers[q.id] === q.correct_option).length;
      const wrongCount = attemptedCount - correctCount;
      const visitedCount = visitedIndices.size;
      const notVisitedCount = totalQuestions - visitedCount;
      const notAnsweredCount = visitedCount - attemptedCount; 
      
      const score = correctCount; // +1 per correct

      return (
          <div className="h-screen flex flex-col bg-white overflow-y-auto font-sans animate-fade-in">
              {/* Analytics Header */}
              <div className="bg-white p-5 border-b border-gray-100 sticky top-0 z-20 flex justify-between items-center shadow-sm">
                  <h2 className="text-lg font-black text-gray-900">{isPYQ ? `Result - ${pyqYear}` : 'Objective Test - Result'}</h2>
                  <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold font-mono">
                      {formatTime(elapsedTime)}
                  </div>
              </div>

              <div className="p-6 pb-24 space-y-6">
                  
                  <h3 className="text-lg font-bold text-gray-900">Test Summary</h3>

                  {/* Summary Card */}
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                      
                      {/* Total Questions Row */}
                      <div className="bg-white p-4 rounded-xl flex justify-between items-center shadow-sm border border-gray-100">
                          <span className="text-gray-600 font-medium">Total Questions</span>
                          <span className="text-2xl font-black text-gray-900">{totalQuestions}</span>
                      </div>

                      {/* Stats Grid */}
                      <div className="space-y-3">
                          {/* Answered */}
                          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100">
                              <div className="flex items-center gap-3">
                                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                  <span className="text-gray-600 font-medium text-sm">Answered</span>
                              </div>
                              <span className="text-lg font-bold text-gray-900">{attemptedCount}</span>
                          </div>

                          {/* Not Answered */}
                          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100">
                              <div className="flex items-center gap-3">
                                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                  <span className="text-gray-600 font-medium text-sm">Not Answered</span>
                              </div>
                              <span className="text-lg font-bold text-gray-900">{notAnsweredCount}</span>
                          </div>

                          {/* Not Visited */}
                          <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100">
                              <div className="flex items-center gap-3">
                                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                                  <span className="text-gray-600 font-medium text-sm">Not Visited</span>
                              </div>
                              <span className="text-lg font-bold text-gray-900">{notVisitedCount}</span>
                          </div>
                      </div>
                  </div>

                  {/* Score Evaluation */}
                  <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                      <div className="flex justify-between items-center mb-4">
                          <span className="text-blue-800 font-bold text-sm uppercase tracking-wider">Evaluation</span>
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Marks: +1 / 0</span>
                      </div>
                      <div className="flex gap-4">
                          <div className="flex-1 bg-white p-3 rounded-xl flex flex-col items-center justify-center border border-blue-100">
                              <span className="text-2xl font-black text-green-600">{correctCount}</span>
                              <span className="text-[10px] text-gray-400 font-bold uppercase">Correct</span>
                          </div>
                          <div className="flex-1 bg-white p-3 rounded-xl flex flex-col items-center justify-center border border-blue-100">
                              <span className="text-2xl font-black text-red-500">{wrongCount}</span>
                              <span className="text-[10px] text-gray-400 font-bold uppercase">Wrong</span>
                          </div>
                          <div className="flex-1 bg-white p-3 rounded-xl flex flex-col items-center justify-center border border-blue-100">
                              <span className="text-2xl font-black text-blue-600">{score}</span>
                              <span className="text-[10px] text-gray-400 font-bold uppercase">Score</span>
                          </div>
                      </div>
                  </div>

              </div>

              {/* Footer */}
              <div className="fixed bottom-0 w-full bg-white border-t border-gray-100 p-4 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                  <button onClick={onExit} className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:scale-[1.01] transition-transform">
                      Return to Dashboard
                  </button>
              </div>
          </div>
      )
  }

  // --- RENDER: Loading/Error ---
  if (loading) {
      return (
          <div className="h-screen flex items-center justify-center bg-white flex-col gap-4">
              <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 font-medium text-sm animate-pulse">Preparing Session...</p>
          </div>
      );
  }

  if (fetchError) {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-white gap-6 p-6 text-center">
              <p className="text-red-500 font-medium">{fetchError}</p>
              <button onClick={onExit} className="px-6 py-2 bg-gray-100 rounded-lg text-sm font-bold">Back</button>
          </div>
      )
  }

  const currentQ = questions[currentIndex];
  if (!currentQ) return null;

  const currentAnswer = answers[currentQ.id];

  return (
    <div className="flex flex-col h-screen bg-white relative font-sans text-gray-900">
      
      {/* 1. Header */}
      <div className="px-4 py-2 bg-white flex justify-between items-center h-14 shrink-0 shadow-sm border-b border-gray-100 z-10">
          <div className="flex items-center gap-3">
              {/* UI Back Button triggers same logic as hardware back */}
              <button onClick={handleAppBack} className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full">
                  <ArrowLeft size={20} />
              </button>
              <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{subject} {isPYQ && `• ${pyqYear}`}</span>
                  <div className="flex items-center gap-1.5 text-gray-800 font-medium leading-none">
                      <Clock size={14} className="text-brand-600" />
                      <span className="font-mono text-sm">{formatTime(elapsedTime)}</span>
                  </div>
              </div>
          </div>

          <button onClick={handleFinishTest} disabled={isSubmitting} className="text-white text-xs font-bold bg-brand-600 px-5 py-2 rounded-lg shadow-md shadow-brand-200 hover:bg-brand-700 transition-colors disabled:opacity-70">
              {isSubmitting ? 'Saving...' : 'Submit'}
          </button>
      </div>

      {/* 2. Top Palette */}
      <div className="bg-gray-50/50 border-b border-gray-100 py-2 shrink-0 flex items-center gap-2 px-3">
          <div ref={scrollRef} className="flex-1 overflow-x-auto hide-scrollbar flex items-center gap-2.5 scroll-smooth">
              {questions.map((q, i) => {
                  const isActive = i === currentIndex;
                  const ans = answers[q.id];
                  const isCorrect = ans && ans === q.correct_option;
                  
                  let styleClass = "bg-white border-gray-200 text-gray-500"; 

                  if (ans) {
                      // Correct = Green (Soft), Wrong = Blue (Soft) as requested
                      styleClass = isCorrect 
                        ? "bg-green-100 border-green-500 text-green-700" 
                        : "bg-blue-100 border-blue-500 text-blue-700";
                  } else if (isActive) {
                      styleClass = "border-brand-600 text-brand-600 ring-1 ring-brand-100";
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
          <div className="h-6 w-[1px] bg-gray-200 mx-1"></div>
          <div className="text-[10px] font-bold text-gray-400">{currentIndex + 1}/{questions.length}</div>
      </div>

      {/* 3. Question Area */}
      <div className="flex-1 overflow-y-auto p-5 pb-32 bg-white">
          
          <div className="flex justify-between items-start mb-4">
              <span className="font-bold text-gray-400 text-[10px] uppercase tracking-wider bg-gray-100 px-2 py-1 rounded">Question {currentIndex + 1}</span>
              <button onClick={() => setLang(l => l==='en'?'hi':'en')} className="flex items-center gap-1 bg-brand-50 px-3 py-1 rounded-full border border-brand-100 text-[10px] font-bold text-brand-700">
                  {lang === 'en' ? 'ENG' : 'HIN'}
              </button>
          </div>

          {/* Question Text */}
          <div className="mb-4">
              <p className="text-lg font-bold text-gray-900 leading-relaxed font-serif">
                  {getTxt(currentQ.question_text_en, currentQ.question_text_hi)}
              </p>
          </div>

          {/* Metadata Row (Moved Below Question) */}
          <div className="flex items-center gap-2 mb-6">
              <span className="px-2 py-0.5 rounded bg-gray-100 text-[9px] font-bold text-gray-500 border border-gray-200 w-fit">
                  +1.0 Marks
              </span>
              {currentQ.exam_year && (
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-[9px] font-bold text-amber-700 border border-amber-100 w-fit flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> {currentQ.exam_year}
                  </span>
              )}
          </div>

          {/* Options */}
          <div className="space-y-3">
              {['A', 'B', 'C', 'D'].map((opt) => {
                  const optionText = getTxt(
                      currentQ[`option_${opt.toLowerCase()}_en` as keyof Question] as string,
                      currentQ[`option_${opt.toLowerCase()}_hi` as keyof Question] as string
                  );
                  
                  const isSelected = currentAnswer === opt;
                  const isCorrectAnswer = currentQ.correct_option === opt;
                  
                  let cardClass = "bg-white border-gray-200 text-gray-600 hover:border-gray-300";
                  let circleClass = "bg-gray-100 text-gray-500 border-gray-200";

                  if (currentAnswer) {
                      if (isCorrectAnswer) {
                          // Correct = Soft Green
                          cardClass = "bg-green-50 border-green-500 text-green-800";
                          circleClass = "bg-green-500 text-white border-green-500";
                      } else if (isSelected && !isCorrectAnswer) {
                          // Wrong = Soft Blue (As requested)
                          cardClass = "bg-blue-50 border-blue-500 text-blue-800";
                          circleClass = "bg-blue-500 text-white border-blue-500";
                      } else {
                          cardClass = "opacity-50 border-gray-100";
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
                          <div className="text-sm font-medium leading-snug">
                              {optionText}
                          </div>
                      </div>
                  )
              })}
          </div>

      </div>

      {/* 4. Footer Buttons */}
      <div className="absolute bottom-0 w-full bg-white border-t border-gray-100 p-4 z-20 flex items-center justify-between gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button 
            onClick={handlePrev} 
            disabled={currentIndex === 0}
            className="px-6 py-3 rounded-xl font-bold text-brand-600 bg-white border-2 border-brand-600 disabled:opacity-50 disabled:border-gray-200 disabled:text-gray-400 transition-colors w-1/3 text-sm"
          >
              Prev
          </button>
          
          <button 
            onClick={handleNext}
            className="px-6 py-3 rounded-xl font-bold text-white bg-brand-600 shadow-lg shadow-brand-200 hover:bg-brand-700 transition-transform active:scale-95 w-1/3 text-sm"
          >
              {currentIndex === questions.length - 1 && (allQuestionsExhausted.current || isPYQ) ? 'Finish' : 'Next'}
          </button>
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
                    className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2rem] z-50 p-6 pb-10 shadow-2xl"
                >
                    <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6"></div>
                    
                    <div className="flex flex-col items-center text-center mb-8">
                        
                        <p className="text-gray-800 font-bold text-lg mt-2">Exit Test?</p>
                        <p className="text-gray-500 text-sm mt-1 max-w-xs leading-relaxed">
                            Your progress will be saved, but the test session will end.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button 
                            onClick={onExit} 
                            className="flex-1 py-3.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                        >
                            Exit Test
                        </button>
                        <button 
                            onClick={() => setShowExitModal(false)} 
                            className="flex-1 py-3.5 rounded-xl bg-brand-600 text-white font-bold shadow-lg shadow-brand-200 hover:bg-brand-700 transition-colors"
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

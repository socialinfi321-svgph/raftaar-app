
import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { api } from '../services/api';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';

interface ShortsScreenProps {
  profile: any;
  session: any;
  navigate: (path: string) => void;
  onInteractionSubmit: (questionId: number, isCorrect: boolean, isLiked: boolean, timeSpentSeconds: number) => Promise<void>;
}

export const ShortsScreen: React.FC<ShortsScreenProps> = ({ profile, session, navigate, onInteractionSubmit }) => {
  const [questionPool, setQuestionPool] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [stats, setStats] = useState({ correct: 0, wrong: 0, total: 0 });

  useEffect(() => {
    loadPool();
  }, []);

  const loadPool = async () => {
    setLoading(true);
    // Algorithm: Fetch a bulk pool of questions from all subjects and shuffle them locally 
    // using the Fisher-Yates algorithm. This guarantees O(1) random fetching without 
    // requesting the DB for every question and totally avoids duplicates for the duration of the pool.
    const pool = await api.getShortsQuestionPool(500); 
    
    // Fisher-Yates Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    
    setQuestionPool(pool);
    setCurrentIndex(0);
    setLoading(false);
    setQuestionStartTime(Date.now());
    setSelectedOption(null);
    setIsAnswered(false);
  };

  const handleNextQuestion = (liked: boolean = false, disliked: boolean = false) => {
    const currentQ = questionPool[currentIndex];
    if (currentQ) {
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
      const wasCorrect = selectedOption === currentQ.correct_option;
      // Background submission
      onInteractionSubmit(currentQ.id, wasCorrect, liked, timeSpent).catch(console.error);
    }

    if (currentIndex >= questionPool.length - 1) {
      loadPool(); 
      return;
    }

    setSelectedOption(null);
    setIsAnswered(false);
    setCurrentIndex(prev => prev + 1);
    setQuestionStartTime(Date.now());
  };

  const handleSwipe = (e: any, info: PanInfo) => {
    if (info.offset.y < -50) {
      // Swiped UP - Next question
      handleNextQuestion();
    }
  };

  const handleOptionSelect = (optionKey: string) => {
    if (isAnswered) return;
    const currentQ = questionPool[currentIndex];
    if (!currentQ) return;
    
    setSelectedOption(optionKey);
    setIsAnswered(true);
    
    const isCorrectAns = optionKey === currentQ.correct_option;
    setStats(prev => ({
      ...prev,
      total: prev.total + 1,
      correct: prev.correct + (isCorrectAns ? 1 : 0),
      wrong: prev.wrong + (!isCorrectAns ? 1 : 0),
    }));
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-2 border-brand-500 rounded-full animate-spin border-t-transparent"></div>
      </div>
    );
  }

  if (questionPool.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <p className="text-slate-500 dark:text-slate-400 text-center">No questions available</p>
        <button 
          onClick={() => navigate('/')} 
          className="mt-4 bg-brand-600 text-white px-6 py-2 rounded-xl font-bold"
        >
          Go Home
        </button>
      </div>
    );
  }

  const currentQuestion = questionPool[currentIndex];

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-30 px-5 py-3 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex justify-between items-center border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1 as any)} className="w-8 h-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors rounded-full">
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div className="flex flex-col">
            <h2 className="text-lg font-black leading-tight text-slate-900 dark:text-white">Shorts</h2>
            <div className="flex items-center gap-2 text-[10px] font-bold">
               <span className="text-green-600 dark:text-green-400"><i className="fa-solid fa-check mr-0.5"></i>{stats.correct}</span>
               <span className="text-red-500 dark:text-red-400"><i className="fa-solid fa-times mr-0.5"></i>{stats.wrong}</span>
               <span className="text-slate-500 dark:text-slate-400 ml-1">Total: {stats.total}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 p-0.5 border border-slate-300 dark:border-slate-700 cursor-pointer shadow-sm" onClick={() => navigate('/profile')}>
            <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session?.user?.email || 'user'}`} className="w-full h-full rounded-full" alt="User" />
          </div>
        </div>
      </div>

      {/* Reel Area */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="popLayout">
            <motion.div 
               key={currentQuestion.id}
               drag="y"
               dragConstraints={{ top: 0, bottom: 0 }}
               onDragEnd={handleSwipe}
               initial={{ opacity: 0, y: 50 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -50 }}
               transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
               className="absolute inset-0 flex flex-col justify-center p-6 h-full w-full"
            >
              <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center">
                <div className="mb-4 text-center">
                  <span className="text-xs text-brand-600 dark:text-brand-400 bg-brand-100 dark:bg-brand-900/30 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider border border-brand-200 dark:border-brand-900/50">
                    {currentQuestion.subject}
                  </span>
                </div>
                
                <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white mb-8 leading-relaxed text-center">
                  {currentQuestion.question_text_en}
                </h3>
                
                {/* Options Display */}
                <div className="space-y-3 w-full mb-8">
                   {['a', 'b', 'c', 'd'].map((opt) => {
                      const optValue = (currentQuestion as any)[`option_${opt}_en`];
                      if (!optValue) return null;
                      
                      const isSelected = selectedOption === opt;
                      const isCorrectAnswer = currentQuestion.correct_option === opt;
                      
                      let btnClass = "p-4 border-2 rounded-xl text-sm sm:text-base font-semibold w-full text-left transition-all active:scale-[0.98] ";
                      
                      if (!isAnswered) {
                         btnClass += "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-brand-300 dark:hover:border-slate-600";
                      } else {
                         if (isCorrectAnswer) {
                            btnClass += "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300";
                         } else if (isSelected && !isCorrectAnswer) {
                            btnClass += "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300";
                         } else {
                            btnClass += "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 opacity-50";
                         }
                      }

                      return (
                         <button 
                            key={opt}
                            onClick={() => handleOptionSelect(opt)}
                            disabled={isAnswered}
                            className={btnClass}
                         >
                            <span className="uppercase mr-3 opacity-60 font-bold">{opt}.</span> {optValue}
                         </button>
                      );
                   })}
                </div>
                
                {/* Feedback & Actions */}
                <div className="mt-auto pt-6 flex flex-col items-center gap-6">
                   {isAnswered && (
                      <motion.div 
                         initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                         className={`text-sm font-bold px-4 py-2 rounded-full ${selectedOption === currentQuestion.correct_option ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}
                      >
                         {selectedOption === currentQuestion.correct_option ? 'Awesome! Correct Answer 🎯' : 'Oops! Incorrect Answer 😅'}
                      </motion.div>
                   )}
                   
                   <div className="flex gap-4 items-center justify-center">
                     <button
                       onClick={() => handleNextQuestion(false, true)}
                       className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                       title="Dislike"
                     >
                       <i className="fa-solid fa-thumbs-down text-sm"></i>
                     </button>
                     
                     <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">Swipe Up for Next <i className="fa-solid fa-arrow-up ml-1 animate-bounce"></i></div>
                     
                     <button
                       onClick={() => handleNextQuestion(true, false)}
                       className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-green-500 dark:hover:text-green-400 flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                       title="Like"
                     >
                       <i className="fa-solid fa-thumbs-up text-sm"></i>
                     </button>
                   </div>
                </div>
              </div>
            </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};


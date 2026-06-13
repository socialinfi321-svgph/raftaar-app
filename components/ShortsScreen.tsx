
import React, { useState, useEffect, useCallback } from 'react';
import { Question } from '../types';
import { api } from '../services/api';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Heart, ThumbsDown, Share2, ArrowLeft, CheckCircle2, XCircle, MoreVertical } from 'lucide-react';

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
  
  const [answeredState, setAnsweredState] = useState<Record<number, { selected: string, isCorrect: boolean }>>({});
  const [direction, setDirection] = useState(1);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [interactions, setInteractions] = useState<Record<number, { liked: boolean, disliked: boolean }>>({});
  
  // Animation overlay trigger for correct/wrong
  const [showFeedback, setShowFeedback] = useState<'correct' | 'wrong' | null>(null);

  useEffect(() => {
    loadPool();
  }, []);

  const loadPool = async () => {
    setLoading(true);
    const pool = await api.getShortsQuestionPool(1000); 
    
    // Group and mix round-robin to ensure subjects are very randomized
    const grouped: Record<string, Question[]> = {};
    pool.forEach(q => {
       const sub = q.subject || 'General';
       if (!grouped[sub]) grouped[sub] = [];
       grouped[sub].push(q);
    });

    const keys = Object.keys(grouped);
    // Shuffle arrays inside to randomize
    keys.forEach(k => {
       grouped[k].sort(() => Math.random() - 0.5);
    });

    const mixedPool: Question[] = [];
    let hasMore = true;
    while(hasMore) {
       hasMore = false;
       for (const k of keys) {
          if (grouped[k].length > 0) {
             const q = grouped[k].shift();
             if (q) mixedPool.push(q);
             hasMore = true;
          }
       }
    }
    
    setQuestionPool(mixedPool);
    setCurrentIndex(0);
    setLoading(false);
    setQuestionStartTime(Date.now());
  };

  const handleNextQuestion = useCallback(() => {
    // Background submit current question if not yet answered but swiped
    const currentQ = questionPool[currentIndex];
    const ans = answeredState[currentIndex];
    const inter = interactions[currentIndex];
    if (currentQ && !ans) {
       const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
       onInteractionSubmit(currentQ.id, false, inter?.liked || false, timeSpent).catch(console.error);
    }

    if (currentIndex >= questionPool.length - 1) {
      loadPool(); 
      return;
    }
    setDirection(1);
    setCurrentIndex(prev => prev + 1);
    setQuestionStartTime(Date.now());
  }, [currentIndex, questionPool, answeredState, interactions, questionStartTime, onInteractionSubmit]);

  const handlePrevQuestion = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(prev => prev - 1);
      setQuestionStartTime(Date.now());
    }
  }, [currentIndex]);

  const handleDragEnd = (e: any, info: PanInfo) => {
    const swipeThreshold = 50;
    const velocityThreshold = 500;
    
    if (info.offset.y < -swipeThreshold || info.velocity.y < -velocityThreshold) {
      handleNextQuestion();
    } else if (info.offset.y > swipeThreshold || info.velocity.y > velocityThreshold) {
      handlePrevQuestion();
    }
  };

  const handleOptionSelect = (optionKey: string) => {
    if (answeredState[currentIndex]) return;
    
    const question = questionPool[currentIndex];
    const isCorrectAns = optionKey === question.correct_option;
    
    setAnsweredState(prev => ({
       ...prev,
       [currentIndex]: { selected: optionKey, isCorrect: isCorrectAns }
    }));
    
    // Feedback overlay flash
    setShowFeedback(isCorrectAns ? 'correct' : 'wrong');
    setTimeout(() => setShowFeedback(null), 1200);

    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const hasLiked = interactions[currentIndex]?.liked || false;
    onInteractionSubmit(question.id, isCorrectAns, hasLiked, timeSpent).catch(console.error);
  };

  const toggleInteraction = (type: 'like' | 'dislike') => {
     setInteractions(prev => {
        const current = prev[currentIndex] || { liked: false, disliked: false };
        if (type === 'like') {
           return { ...prev, [currentIndex]: { liked: !current.liked, disliked: false } };
        } else {
           return { ...prev, [currentIndex]: { liked: false, disliked: !current.disliked } };
        }
     });
  };

  const shareQuestion = () => {
      // Dummy share for UX
      if (navigator.share) {
          navigator.share({
             title: 'Check out this quiz question!',
             text: questionPool[currentIndex]?.question_text_en
          }).catch(console.error);
      }
  };

  const variants = {
    enter: (direction: number) => ({
      y: direction > 0 ? '100%' : '-100%',
      opacity: 1,
      scale: 1,
      zIndex: 1,
    }),
    center: {
      y: 0,
      opacity: 1,
      scale: 1,
      zIndex: 2,
    },
    exit: (direction: number) => ({
      y: direction < 0 ? '100%' : '-100%',
      opacity: 1,
      scale: 1,
      zIndex: 1,
    }),
  };

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-slate-950">
        <div className="w-10 h-10 border-4 border-brand-500 rounded-full animate-spin border-t-transparent"></div>
      </div>
    );
  }

  if (questionPool.length === 0) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center p-6 bg-slate-950 text-white">
        <p className="text-slate-400 text-center mb-6">No questions available</p>
        <button onClick={() => navigate('/')} className="bg-brand-600 text-white px-6 py-3 rounded-full font-bold">Go Home</button>
      </div>
    );
  }

  const currentQ = questionPool[currentIndex];
  const currentState = answeredState[currentIndex];
  const isAnswered = !!currentState;
  const currentInteractions = interactions[currentIndex] || { liked: false, disliked: false };

  return (
    <div className="h-[100dvh] w-full bg-[#0a0a0a] text-white relative overflow-hidden flex flex-col select-none">
      {/* Header Overlay */}
      <div className="absolute top-0 w-full z-30 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-6 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center pointer-events-none">
         <div className="flex items-center gap-4 pointer-events-auto">
            <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform border border-white/10 shadow-lg">
                <ArrowLeft size={20} strokeWidth={2.5} />
            </button>
            <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-md">Shorts</h1>
         </div>
      </div>

      {/* Reel Area */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 1 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={1}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 w-full h-full flex flex-col justify-center px-5 sm:px-8 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-[calc(5rem+env(safe-area-inset-top))]"
          >
             {/* Question Card Content Container */}
             <div className="w-full max-w-lg mx-auto flex flex-col h-full justify-center pr-14 relative z-10">
                 
                 {/* Subject Tag */}
                 <div className="inline-flex self-start mb-6 pointer-events-none">
                    <span className="bg-brand-600/90 backdrop-blur-sm text-white text-[11px] sm:text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-md shadow-md border border-brand-400/30">
                        {currentQ.subject || 'General'}
                    </span>
                 </div>

                 {/* Question Text */}
                 <h2 className="text-[1.35rem] sm:text-2xl font-semibold leading-snug tracking-tight mb-8 drop-shadow-md text-white/95 pointer-events-none">
                    {currentQ.question_text_en}
                 </h2>

                 {/* Options Stack */}
                 <div className="flex flex-col gap-3.5 sm:gap-4 w-full">
                    {['a', 'b', 'c', 'd'].map((opt) => {
                       const optValue = (currentQ as any)[`option_${opt}_en`];
                       if (!optValue) return null;
                       
                       const isCorrectOption = currentQ.correct_option === opt;
                       const isSelectedOption = currentState?.selected === opt;
                       
                       let bgClass = "bg-white/10 backdrop-blur-md border border-white/20";
                       let textClass = "text-white/90";
                       let icon = null;

                       if (isAnswered) {
                           if (isCorrectOption) {
                               bgClass = "bg-emerald-500/90 border border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]";
                               textClass = "text-white font-bold";
                               icon = <CheckCircle2 size={20} className="text-white drop-shadow-sm shrink-0" />;
                           } else if (isSelectedOption && !isCorrectOption) {
                               bgClass = "bg-rose-500/90 border border-rose-400";
                               textClass = "text-white font-bold";
                               icon = <XCircle size={20} className="text-white drop-shadow-sm shrink-0" />;
                           } else {
                               bgClass = "bg-white/5 border border-white/10 opacity-60";
                               textClass = "text-white/60";
                           }
                       }

                       return (
                          <button 
                             key={opt}
                             onClick={(e) => { e.stopPropagation(); handleOptionSelect(opt); }}
                             disabled={isAnswered}
                             className={`w-full text-left p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-4 transition-all duration-300 ${bgClass}`}
                          >
                             <div className="flex items-start gap-4 flex-1">
                                <span className={`uppercase font-bold text-sm mt-[2px] opacity-70 ${textClass}`}>{opt}</span>
                                <span className={`text-[0.95rem] sm:text-base leading-relaxed ${textClass}`}>{optValue}</span>
                             </div>
                             {icon}
                          </button>
                       );
                    })}
                 </div>

             </div>
          </motion.div>
        </AnimatePresence>

        {/* Floating Right Action Bar (Overlayed) */}
        <div className="absolute right-3 sm:right-5 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 flex flex-col items-center gap-7 pointer-events-auto drop-shadow-lg">
            
            <div className="w-11 h-11 rounded-full bg-white p-[2px] shadow-lg mb-2 cursor-pointer active:scale-95 transition-transform" onClick={() => navigate('/profile')}>
                <div className="w-full h-full rounded-full bg-slate-200 overflow-hidden">
                    <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session?.user?.email || 'user'}`} className="w-full h-full object-cover" alt="User" />
                </div>
            </div>

            <button onClick={() => toggleInteraction('like')} className="flex flex-col items-center gap-1 active:scale-90 transition-transform group">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 bg-black/30 backdrop-blur-md border border-white/10 group-hover:bg-black/50 transition-colors ${currentInteractions.liked ? 'bg-pink-500/20' : ''}`}>
                    <Heart size={26} className={`transition-colors drop-shadow-md ${currentInteractions.liked ? 'fill-pink-500 text-pink-500' : 'text-white'}`} />
                </div>
            </button>

            <button onClick={() => toggleInteraction('dislike')} className="flex flex-col items-center gap-1 active:scale-90 transition-transform group">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 bg-black/30 backdrop-blur-md border border-white/10 group-hover:bg-black/50 transition-colors ${currentInteractions.disliked ? 'bg-indigo-500/20' : ''}`}>
                    <ThumbsDown size={24} className={`transition-colors drop-shadow-md ${currentInteractions.disliked ? 'fill-indigo-500 text-indigo-500' : 'text-white'}`} />
                </div>
            </button>

            <button onClick={shareQuestion} className="flex flex-col items-center gap-1 active:scale-90 transition-transform group mt-1">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-1 bg-black/30 backdrop-blur-md border border-white/10 group-hover:bg-black/50 transition-colors">
                    <Share2 size={24} className="text-white drop-shadow-md" />
                </div>
            </button>

            <button className="flex flex-col items-center gap-1 active:scale-90 transition-transform group mt-4 opacity-80">
                <MoreVertical size={24} className="text-white drop-shadow-md" />
            </button>
        </div>

        {/* Global Feedback Animation Overlay (Correct / Wrong Burst) */}
        <AnimatePresence>
            {showFeedback && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.5, y: '-50%', x: '-50%' }}
                    animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
                    exit={{ opacity: 0, scale: 1.5 }}
                    transition={{ type: 'spring', damping: 15 }}
                    className="absolute top-1/2 left-1/2 z-50 pointer-events-none drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                >
                    {showFeedback === 'correct' ? (
                        <div className="bg-emerald-500 rounded-full p-6 text-white shadow-2xl border-4 border-white/20">
                            <CheckCircle2 size={80} strokeWidth={3} />
                        </div>
                    ) : (
                        <div className="bg-rose-500 rounded-full p-6 text-white shadow-2xl border-4 border-white/20">
                            <XCircle size={80} strokeWidth={3} />
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>

      </div>
    </div>
  );
};



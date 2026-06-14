
import React, { useState, useEffect, useCallback } from 'react';
import { Question } from '../types';
import { api } from '../services/api';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Heart, ThumbsUp, ThumbsDown, Share, ArrowLeft, CheckCircle2, XCircle, Zap, BadgeCheck, Bookmark, Plus } from 'lucide-react';

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
  const [offset, setOffset] = useState(0);
  const loadingMoreRef = React.useRef(false);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [seenIds, setSeenIds] = useState<number[]>([]);

  const currentQ = questionPool[currentIndex];
  
  const randomCounts = React.useMemo(() => {
    if (!currentQ) return { likes: '12.4K', shares: '1.2K' };
    const hash = String(currentQ.id).split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
    const likeCount = (Math.abs(hash % 900) + 10) / 10;
    const shareCount = (Math.abs(hash % 200) + 5) / 10;
    return { likes: likeCount.toFixed(1) + 'K', shares: shareCount.toFixed(1) + 'K' };
  }, [currentIndex, currentQ]);

  useEffect(() => {
    loadPool();
  }, []);

  const loadPool = async () => {
    setLoading(true);
    let initialSeenIds: number[] = [];
    if (session?.user?.id) {
       initialSeenIds = await api.getSeenQuestionIds(session.user.id);
       setSeenIds(initialSeenIds);
    }

    const pool = await api.getShortsQuestionPool(0, 5, initialSeenIds); 
    
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    
    setQuestionPool(shuffled);
    setCurrentIndex(0);
    setLoading(false);
    setQuestionStartTime(Date.now());
    setOffset(5);
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
    
    if (currentQ) {
       setSeenIds(prev => Array.from(new Set([...prev, currentQ.id])));
    }

    if (currentIndex === questionPool.length - 3 && !loadingMoreRef.current) {
       loadingMoreRef.current = true;
       api.getShortsQuestionPool(offset, 5, seenIds).then(newQuestions => {
          if (newQuestions.length > 0) {
             const shuffled = [...newQuestions].sort(() => Math.random() - 0.5);
             setQuestionPool(prev => [...prev, ...shuffled]);
             setOffset(prev => prev + 5);
          }
          loadingMoreRef.current = false;
       }).catch(() => {
          loadingMoreRef.current = false;
       });
    }

    if (currentIndex >= questionPool.length - 1) {
      if (!loadingMoreRef.current) {
        // Fallback if we completely run out
        loadPool(); 
      }
      return;
    }
    setDirection(1);
    setCurrentIndex(prev => prev + 1);
    setQuestionStartTime(Date.now());
  }, [currentIndex, questionPool, answeredState, interactions, questionStartTime, onInteractionSubmit, offset, seenIds, session?.user?.id]);

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
    // Case-insensitive comparison
    const isCorrectAns = String(optionKey).toUpperCase() === String(question.correct_option).toUpperCase();
    
    setAnsweredState(prev => ({
       ...prev,
       [currentIndex]: { selected: optionKey, isCorrect: isCorrectAns }
    }));
    
    setSeenIds(prev => Array.from(new Set([...prev, question.id])));
    
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

  const currentState = answeredState[currentIndex];
  const isAnswered = !!currentState;
  const currentInteractions = interactions[currentIndex] || { liked: false, disliked: false };

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-[#070b19] font-sans text-slate-900 dark:text-white relative overflow-hidden flex flex-col select-none transition-colors duration-300">
      {/* Top Navigation - Fixed Global */}
      <div className="absolute top-0 w-full z-40 px-4 pt-safe-header pb-2 bg-white/0 dark:bg-black/0 flex justify-between items-center pointer-events-none transition-colors duration-300">
         <div className="flex items-center gap-3 pointer-events-auto">
            <button onClick={() => navigate('/')} className="p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-full transition-colors active:scale-95 z-50">
                <ArrowLeft size={20} />
            </button>
            <div className="flex gap-4">
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white drop-shadow-sm pb-1 mt-1 border-b-2 border-brand-600">For You</span>
            </div>
         </div>
      </div>

      {/* Reel Area */}
      <div className="flex-1 relative w-full h-full overflow-hidden bg-slate-50 dark:bg-[#070b19] transition-colors duration-300">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={1}
            onDragEnd={handleDragEnd}
            style={{ touchAction: 'none' }}
            className="absolute inset-0 w-full h-full flex flex-col pt-[calc(max(env(safe-area-inset-top),3.5rem)+1.5rem)] pb-[calc(5rem+env(safe-area-inset-bottom))] bg-slate-50 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-[#111a3a] dark:via-[#070b19] dark:to-[#070b19]"
          >
             {/* Sub-Header Area Inside Reel */}
             <div className="flex justify-between items-center px-4 sm:px-6 w-full mb-6">
                <div className="flex gap-2">
                    <div className="flex items-center bg-[rgba(240,240,245,0.8)] dark:bg-[#1a1f35]/80 backdrop-blur-md text-[#505080] dark:text-blue-100 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
                        {currentQ.subject || 'Physics'}
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setLanguage(l => l === 'en' ? 'hi' : 'en'); }} 
                        className="bg-slate-200/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center justify-center min-w-[40px]"
                    >
                        {language === 'en' ? 'EN' : 'हि'}
                    </button>
                </div>
             </div>

             {/* Question Card Content Container */}
             <div className="flex flex-col flex-1 w-full max-w-lg mx-auto pr-16 sm:pr-20 pl-4 sm:pl-6 relative z-10 hide-scrollbar overflow-hidden">
                 {/* Question Text */}
                 <div className="flex-1 flex flex-col justify-center mb-4 min-h-0 relative">
                     <div className="overflow-y-auto hide-scrollbar max-h-full">
                         <h2 className="text-[clamp(1.1rem,4dvh,1.5rem)] md:text-[clamp(1.2rem,4dvh,1.7rem)] font-semibold leading-snug tracking-tight drop-shadow-sm text-slate-900 dark:text-white/95 pb-2 py-4">
                            {language === 'hi' && currentQ.question_text_hi ? currentQ.question_text_hi : currentQ.question_text_en}
                         </h2>
                     </div>
                 </div>

                 {/* Options Stack */}
                 <div className="flex flex-col gap-3 sm:gap-3.5 w-full pb-20 sm:pb-24 relative shrink-0">
                    {/* Action Buttons - Absolute positioned relative to options stack */}
                    <div className="absolute -right-14 sm:-right-16 -top-[100px] z-30 flex flex-col items-center gap-5 pointer-events-auto drop-shadow-lg">
                        <button className="flex flex-col items-center gap-1 active:scale-90 transition-transform group mb-2">
                            <div className="w-[46px] h-[46px] rounded-full bg-slate-900 border border-slate-200 dark:border-slate-800 p-0 shadow-lg relative flex items-center justify-center font-serif mb-0.5">
                                <span className="text-white font-extrabold text-[18px] tracking-tighter">PW</span>
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[22px] h-[22px] bg-indigo-600 rounded-full flex items-center justify-center border-2 border-slate-50 dark:border-[#070b19]">
                                    <Plus size={14} className="text-white stroke-[4]" />
                                </div>
                            </div>
                        </button>

                        <button onClick={() => toggleInteraction('like')} className="flex flex-col items-center gap-1 active:scale-90 transition-transform group">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center">
                                <Heart size={32} className={`transition-colors drop-shadow-md ${currentInteractions.liked ? 'fill-indigo-600 text-indigo-600' : 'text-indigo-600 dark:text-indigo-500 fill-indigo-600 dark:fill-indigo-500'}`} />
                            </div>
                            <span className="text-[12px] font-bold text-slate-800 dark:text-white/90 font-sans tracking-wide">{randomCounts.likes}</span>
                        </button>

                        <button onClick={() => toggleInteraction('dislike')} className="flex flex-col items-center gap-1 active:scale-90 transition-transform group">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center">
                                <ThumbsDown size={32} className={`transition-colors drop-shadow-md ${currentInteractions.disliked ? 'fill-indigo-600 text-indigo-600' : 'text-slate-800 dark:text-white/90 group-hover:text-indigo-600'}`} />
                            </div>
                            <span className="text-[12px] font-bold text-slate-800 dark:text-white/90 font-sans tracking-wide">Dislike</span>
                        </button>

                        <button onClick={shareQuestion} className="flex flex-col items-center gap-1 active:scale-90 transition-transform group">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center">
                                <Share size={30} className="text-slate-800 dark:text-white/90 drop-shadow-md group-hover:text-blue-500 transition-colors" />
                            </div>
                            <span className="text-[12px] font-bold text-slate-800 dark:text-white/90 font-sans tracking-wide">{randomCounts.shares}</span>
                        </button>

                        <button className="flex flex-col items-center gap-1 active:scale-90 transition-transform group">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center">
                                <Bookmark size={30} className="text-slate-800 dark:text-white/90 drop-shadow-md group-hover:text-yellow-500 transition-colors" />
                            </div>
                            <span className="text-[12px] font-bold text-slate-800 dark:text-white/90 font-sans tracking-wide">Save</span>
                        </button>

                        <div className="flex flex-col items-center gap-1 mt-1 opacity-80 cursor-pointer hover:opacity-100">
                           <span className="text-2xl tracking-widest text-slate-800 dark:text-white/90 w-10 text-center font-bold px-1 pb-2">...</span>
                        </div>
                    </div>

                    {['a', 'b', 'c', 'd'].map((opt) => {
                       const optValue = language === 'hi' && (currentQ as any)[`option_${opt}_hi`] ? (currentQ as any)[`option_${opt}_hi`] : (currentQ as any)[`option_${opt}_en`];
                       if (!optValue) return null;
                       
                       const isCorrectOption = String(currentQ.correct_option).toUpperCase() === String(opt).toUpperCase();
                       const isSelectedOption = String(currentState?.selected).toUpperCase() === String(opt).toUpperCase();
                       
                       let bgClass = "bg-white dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/50 shadow-sm";
                       let textClass = "text-slate-800 dark:text-white/90";

                       if (isAnswered) {
                           if (isCorrectOption) {
                               bgClass = "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50";
                               textClass = "text-emerald-700 dark:text-emerald-400 font-bold";
                           } else if (isSelectedOption && !isCorrectOption) {
                               bgClass = "bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/50";
                               textClass = "text-rose-700 dark:text-rose-400 font-bold";
                           } else {
                               bgClass = "bg-slate-50 dark:bg-slate-900/10 border border-slate-200 dark:border-slate-800/30 opacity-60";
                               textClass = "text-slate-500 dark:text-white/60";
                           }
                       }

                       return (
                          <button 
                             key={opt}
                             onClick={(e) => { e.stopPropagation(); handleOptionSelect(opt); }}
                             disabled={isAnswered}
                             className={`w-full text-left p-3.5 sm:p-4 rounded-xl flex items-center justify-between gap-4 transition-all duration-300 ${bgClass}`}
                          >
                             <div className="flex items-center gap-3.5 flex-1 w-full overflow-hidden">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border text-sm transition-colors ${
                                    isAnswered ? 'border-white/30 text-white bg-white/20' : 'border-slate-300 dark:border-white/20 text-slate-500 dark:text-white/70 bg-slate-100 dark:bg-white/5'
                                } font-bold`}>
                                     {opt.toUpperCase()}
                                </div>
                                <span className={`text-[0.95rem] sm:text-base leading-relaxed break-words break-all ${textClass}`}>{optValue}</span>
                             </div>
                          </button>
                       );
                    })}

                 </div>
             </div>

             {/* Absolute Bottom Elements inside Motion Container */}
             <div className="absolute left-4 sm:left-6 bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-16 z-30 flex flex-col gap-1.5 pointer-events-none">
                 <div className="flex items-center gap-2 mb-1">
                     <div className="w-10 h-10 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 shadow-sm shrink-0">
                         <Zap size={22} className="text-yellow-400 fill-yellow-400 dark:text-indigo-600 dark:fill-indigo-600" />
                     </div>
                     <span className="font-bold text-slate-900 dark:text-white text-base font-sans tracking-wide">Raftaar</span>
                     <BadgeCheck size={18} className="text-blue-500 fill-blue-500/20 shrink-0" />
                     <button className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 py-1.5 rounded ml-1 transition-colors shrink-0 pointer-events-auto">
                         Follow
                     </button>
                 </div>
                 
                 <div className="text-[13px] text-slate-600 dark:text-slate-300 font-medium mt-1 drop-shadow-sm">
                     Class 12 • {currentQ.chapter_name_en || "General"}
                 </div>
                 
                 <div className="text-[13px] font-bold text-slate-800 dark:text-white leading-relaxed line-clamp-2 pr-4 drop-shadow-sm break-words font-sans">
                     #{currentQ.subject?.replace(/\s+/g, '') || 'Physics'} #{currentQ.chapter_name_en?.replace(/\s+/g, '') || 'Speed'} #Question {language === 'hi' ? '#Hindi' : ''}
                 </div>
             </div>

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};



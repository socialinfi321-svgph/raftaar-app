
import React, { useState, useEffect, useCallback } from 'react';
import { Question } from '../types';
import { api } from '../services/api';
import { Heart, ThumbsUp, ThumbsDown, Share, ArrowLeft, CheckCircle2, XCircle, Zap, BadgeCheck, Bookmark, Plus, Search } from 'lucide-react';
import { useBackHandler } from '../hooks/useBackHandler';

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
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [seenIds, setSeenIds] = useState<number[]>([]);

  useBackHandler(() => {
    navigate('/');
    return true;
  });

  const getRandomCounts = (q: Question) => {
    if (!q) return { likes: '12.4K', shares: '1.2K' };
    const hash = String(q.id).split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
    const likeCount = (Math.abs(hash % 900) + 10) / 10;
    const shareCount = (Math.abs(hash % 200) + 5) / 10;
    return { likes: likeCount.toFixed(1) + 'K', shares: shareCount.toFixed(1) + 'K' };
  };

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

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const index = Math.round(container.scrollTop / container.clientHeight);
    
    if (index !== currentIndex && index >= 0 && index < questionPool.length) {
      // Swiped down to next
      if (index > currentIndex) {
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
      }
      
      setCurrentIndex(index);
      setQuestionStartTime(Date.now());
      
      if (index >= questionPool.length - 3 && !loadingMoreRef.current) {
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
    }
  }, [currentIndex, questionPool, answeredState, interactions, questionStartTime, onInteractionSubmit, offset, seenIds, session?.user?.id]);

  const handleOptionSelect = (optionKey: string, idx: number) => {
    if (answeredState[idx]) return;
    
    const question = questionPool[idx];
    // Case-insensitive comparison
    const isCorrectAns = String(optionKey).toUpperCase() === String(question.correct_option).toUpperCase();
    
    setAnsweredState(prev => ({
       ...prev,
       [idx]: { selected: optionKey, isCorrect: isCorrectAns }
    }));
    
    setSeenIds(prev => Array.from(new Set([...prev, question.id])));
    
    const timeSpent = idx === currentIndex ? Math.floor((Date.now() - questionStartTime) / 1000) : 5;
    const hasLiked = interactions[idx]?.liked || false;
    onInteractionSubmit(question.id, isCorrectAns, hasLiked, timeSpent).catch(console.error);
  };

  const toggleInteraction = (type: 'like' | 'dislike', idx: number) => {
     setInteractions(prev => {
        const current = prev[idx] || { liked: false, disliked: false };
        if (type === 'like') {
           return { ...prev, [idx]: { liked: !current.liked, disliked: false } };
        } else {
           return { ...prev, [idx]: { liked: false, disliked: !current.disliked } };
        }
     });
  };

  const shareQuestion = (idx: number) => {
      // Dummy share for UX
      if (navigator.share) {
          navigator.share({
             title: 'Check out this quiz question!',
             text: questionPool[idx]?.question_text_en
          }).catch(console.error);
      }
  };

  if (loading) {
    return (
      <div className="h-[100dvh] w-full bg-slate-50 dark:bg-black overflow-hidden flex flex-col relative pt-[max(env(safe-area-inset-top),3.5rem)]">
         <div className="flex justify-start px-4 sm:px-6 w-full mb-6 mt-4">
            <div className="w-24 h-8 bg-slate-200 dark:bg-[#111] rounded-full animate-pulse"></div>
         </div>
         <div className="flex flex-col flex-1 w-full max-w-lg mx-auto pr-14 sm:pr-16 relative z-10 pt-4">
             <div className="px-4 sm:px-6 mb-8 w-full space-y-3">
                 <div className="h-6 bg-slate-200 dark:bg-[#111] rounded animate-pulse w-full"></div>
                 <div className="h-6 bg-slate-200 dark:bg-[#111] rounded animate-pulse w-5/6"></div>
                 <div className="h-6 bg-slate-200 dark:bg-[#111] rounded animate-pulse w-4/6"></div>
             </div>
             <div className="flex flex-col gap-3.5 w-full pb-20 relative px-4 sm:px-6">
                 <div className="absolute right-0 top-0 z-30 flex flex-col items-center gap-6">
                     <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-[#111] animate-pulse"></div>
                     <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#111] animate-pulse"></div>
                     <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#111] animate-pulse"></div>
                     <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#111] animate-pulse"></div>
                 </div>
                 {[1,2,3,4].map(i => (
                     <div key={i} className="h-14 w-[85%] bg-slate-200 dark:bg-[#111] rounded-2xl animate-pulse"></div>
                 ))}
             </div>
         </div>
         <div className="absolute left-4 sm:left-6 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-30 flex flex-col gap-2">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-[#111] animate-pulse"></div>
                <div className="w-32 h-5 bg-slate-200 dark:bg-[#111] rounded animate-pulse"></div>
             </div>
         </div>
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

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-black font-sans text-slate-900 dark:text-white relative overflow-hidden flex flex-col select-none transition-colors duration-300">
      {/* Top Navigation - Fixed Global */}
      <div className="absolute top-0 w-full z-40 px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-2 bg-transparent flex justify-between items-center pointer-events-none transition-colors duration-300">
         <div className="flex items-center gap-5 pointer-events-auto w-full justify-between">
            <div className="flex gap-5 flex-1 items-center">
                <div className="flex flex-col items-center">
                    <span className="text-[17px] font-bold text-slate-900 dark:text-white">For You</span>
                    <div className="w-5 h-[3px] bg-indigo-600 rounded-full mt-1"></div>
                </div>
            </div>
            <button className="p-2 -mr-2 text-slate-900 dark:text-white active:scale-95 z-50">
                <Search size={24} className="stroke-[2.5]" />
            </button>
         </div>
      </div>

      {/* Reel Area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 w-full h-full overflow-y-auto snap-y snap-mandatory hide-scrollbar bg-slate-50 dark:bg-black transition-colors duration-300 pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
      >
        {questionPool.map((q, idx) => {
           const isCurrent = idx === currentIndex;
           const currentState = answeredState[idx];
           const isAnswered = !!currentState;
           const currentInteractions = interactions[idx] || { liked: false, disliked: false };
           const randomCounts = getRandomCounts(q);
           
           const questionText = language === 'hi' && q.question_text_hi ? q.question_text_hi : q.question_text_en;
           const questionLength = questionText.length;
           
           let textSizeClass = "text-[1.05rem] sm:text-[1.15rem]";
           if (questionLength > 200) {
               textSizeClass = "text-[0.875rem] sm:text-[0.925rem]";
           } else if (questionLength > 120) {
               textSizeClass = "text-[0.95rem] sm:text-[1rem]";
           }

           return (
              <div 
                key={`${q.id}-${idx}`} 
                className="w-full h-full relative snap-start snap-always flex-shrink-0 flex flex-col pt-[calc(max(env(safe-area-inset-top),3.5rem)+0.5rem)] pb-[calc(4rem+env(safe-area-inset-bottom))] bg-slate-50 dark:bg-black"
              >
                 {/* Background Gradient */}
                 <div className="absolute inset-0 w-full h-full pointer-events-none bg-slate-50 dark:bg-black"></div>

                 {/* Sub-Header Area Inside Reel */}
                 <div className="flex justify-start items-center px-4 sm:px-6 w-full mb-3 mt-4 relative z-10">
                    <div className="flex gap-2">
                        <div className="flex items-center bg-indigo-50/70 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 px-4 py-1.5 rounded-full text-[13px] font-bold">
                            {q.subject || 'Physics'}
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setLanguage(l => l === 'en' ? 'hi' : 'en'); }} 
                            className="bg-orange-50/70 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300 px-4 py-1.5 rounded-full text-[13px] font-bold transition-colors cursor-pointer flex items-center justify-center min-w-[40px]"
                        >
                            {language === 'en' ? 'EN' : 'हि'}
                        </button>
                    </div>
                 </div>

                 {/* Question Card Content Container */}
                 <div className="flex flex-col flex-1 w-full max-w-lg mx-auto pr-12 sm:pr-14 relative z-10 hide-scrollbar">
                     {/* Question Text */}
                     <div className="flex-1 flex flex-col justify-end mb-4 relative pt-0 px-4 sm:px-6 overflow-hidden">
                         <div className="overflow-y-auto hide-scrollbar snap-y snap-mandatory select-text relative">
                             <h2 className={`font-bold leading-relaxed tracking-tight text-slate-900 dark:text-white py-1 ${textSizeClass}`}>
                                {questionText}
                             </h2>
                         </div>
                     </div>

                     {/* Options Stack */}
                     <div className="flex flex-col gap-3 sm:gap-3.5 w-full pb-10 sm:pb-12 relative shrink-0">
                        {/* Action Buttons - Absolute positioned relative to options stack */}
                        <div className="absolute -right-10 sm:-right-12 bottom-4 z-30 flex flex-col items-center gap-5 pointer-events-auto drop-shadow-sm">

                            <button onClick={() => toggleInteraction('like', idx)} className="flex flex-col items-center gap-1 active:scale-90 transition-transform group">
                                <div className="w-8 h-8 flex items-center justify-center">
                                    <Heart size={24} className={`transition-colors drop-shadow-sm ${currentInteractions.liked ? 'fill-indigo-500 text-indigo-500' : 'text-slate-700 dark:text-slate-300'}`} />
                                </div>
                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 font-sans">{randomCounts.likes}</span>
                            </button>

                            <button onClick={() => toggleInteraction('dislike', idx)} className="flex flex-col items-center gap-1 active:scale-90 transition-transform group">
                                <div className="w-8 h-8 flex items-center justify-center">
                                    <ThumbsDown size={24} className={`transition-colors drop-shadow-sm ${currentInteractions.disliked ? 'fill-indigo-500 text-indigo-500' : 'text-slate-700 dark:text-slate-300 group-hover:text-indigo-500'}`} />
                                </div>
                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 font-sans">Dislike</span>
                            </button>

                            <button onClick={() => shareQuestion(idx)} className="flex flex-col items-center gap-1 active:scale-90 transition-transform group">
                                <div className="w-8 h-8 flex items-center justify-center">
                                    <Share size={24} className="text-slate-700 dark:text-slate-300 drop-shadow-sm group-hover:text-blue-500 transition-colors" />
                                </div>
                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 font-sans">{randomCounts.shares}</span>
                            </button>

                            <button className="flex flex-col items-center gap-1 active:scale-90 transition-transform group">
                                <div className="w-8 h-8 flex items-center justify-center">
                                    <Bookmark size={24} className="text-slate-700 dark:text-slate-300 drop-shadow-sm group-hover:text-yellow-500 transition-colors" />
                                </div>
                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 font-sans">Save</span>
                            </button>

                            <div className="flex flex-col items-center gap-1 mt-0 opacity-80 cursor-pointer hover:opacity-100">
                               <span className="text-xl tracking-widest text-slate-800 dark:text-slate-300 w-8 text-center font-bold px-1 mb-1 leading-none">...</span>
                            </div>
                        </div>

                        {['a', 'b', 'c', 'd'].map((opt) => {
                           const optValue = language === 'hi' && (q as any)[`option_${opt}_hi`] ? (q as any)[`option_${opt}_hi`] : (q as any)[`option_${opt}_en`];
                           if (!optValue) return null;
                           
                           const isCorrectOption = String(q.correct_option).toUpperCase() === String(opt).toUpperCase();
                           const isSelectedOption = String(currentState?.selected).toUpperCase() === String(opt).toUpperCase();
                           
                           let bgClass = "bg-white/90 dark:bg-[#111] border border-slate-100 dark:border-[#222] rounded-2xl pl-4 sm:pl-6 ml-4 sm:ml-6";
                           let textClass = "text-slate-800 dark:text-white/90";
                           let labelClass = "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 shadow-sm";

                           if (isAnswered) {
                               if (isCorrectOption) {
                                   bgClass = "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl pl-4 sm:pl-6 ml-4 sm:ml-6";
                                   textClass = "text-emerald-700 dark:text-emerald-400 font-bold";
                                   labelClass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 shadow-sm";
                               } else if (isSelectedOption && !isCorrectOption) {
                                   bgClass = "bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 rounded-2xl pl-4 sm:pl-6 ml-4 sm:ml-6";
                                   textClass = "text-rose-700 dark:text-rose-400 font-bold";
                                   labelClass = "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 shadow-sm";
                               } else {
                                   bgClass = "bg-slate-50/50 dark:bg-[#0a0a0a]/50 border border-slate-100 dark:border-[#1a1a1a] rounded-2xl pl-4 sm:pl-6 ml-4 sm:ml-6 opacity-60";
                                   textClass = "text-slate-500 dark:text-white/50";
                                   labelClass = "bg-slate-100 text-slate-400 dark:bg-[#222] dark:text-white/30 shadow-sm";
                               }
                           }

                           return (
                              <button 
                                 key={opt}
                                 onClick={(e) => { e.stopPropagation(); handleOptionSelect(opt, idx); }}
                                 disabled={isAnswered}
                                 className={`w-[calc(100%-0.5rem)] sm:w-[calc(100%-1rem)] text-left py-3 sm:py-3.5 pr-2 flex items-center justify-between gap-4 transition-all duration-300 overflow-hidden ${bgClass}`}
                                 style={{ 
                                     WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)', 
                                     maskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
                                     borderRight: 'none'
                                 }}
                              >
                                 <div className="flex items-center gap-3.5 flex-1 w-full overflow-hidden">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold transition-colors ${labelClass}`}>
                                         {opt.toUpperCase()}
                                    </div>
                                    <span className={`text-[0.95rem] leading-relaxed break-words break-all truncate whitespace-normal line-clamp-3 ${textClass}`}>{optValue}</span>
                                 </div>
                              </button>
                           );
                        })}

                     </div>
                 </div>

                 {/* Absolute Bottom Elements inside Motion Container */}
                 <div className="absolute left-4 sm:left-6 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-30 flex flex-col gap-1.5 pointer-events-none">
                     <div className="flex items-center gap-3 mb-1">
                         <div className="w-9 h-9 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center shadow-sm shrink-0">
                             <span className="font-sans font-bold text-white dark:text-slate-900 text-sm">R</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white text-[15px]">Raftaar</span>
                         </div>
                         <button onClick={(e) => { e.stopPropagation(); alert('Follow feature incoming!'); }} className="bg-indigo-500 hover:bg-indigo-600 text-white text-[13px] font-bold px-3.5 py-1 rounded-full ml-1 transition-transform active:scale-95 shrink-0 pointer-events-auto shadow-sm">
                             Follow
                         </button>
                     </div>
                     
                     <div className="text-[13.5px] text-slate-700 dark:text-slate-300 font-medium">
                         Class 12 • {q.chapter_name_en || "General"}
                     </div>
                     
                     <div className="text-[12.5px] text-slate-400/80 dark:text-slate-500/80 font-medium pb-1">
                         #Question #{q.subject?.replace(/\s+/g, '') || 'Physics'}
                     </div>
                 </div>
              </div>
           );
        })}
      </div>
    </div>
  );
};



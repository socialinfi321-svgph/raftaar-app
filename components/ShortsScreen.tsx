
import React, { useState, useEffect, useCallback } from 'react';
import { Question } from '../types';
import { api } from '../services/api';
import { Heart, ThumbsUp, ThumbsDown, Share, ArrowLeft, CheckCircle2, XCircle, Zap, BadgeCheck, Bookmark, Plus, SlidersHorizontal } from 'lucide-react';
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
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [interactions, setInteractions] = useState<Record<number, { liked: boolean, disliked: boolean }>>({});
  const loadingMoreRef = React.useRef(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  
  // New States for Features
  const [filterSubjects, setFilterSubjects] = useState<string[]>(profile?.reels_subject_filter || []);
  const [mode, setMode] = useState<'practice' | 'test'>('practice');
  const [testFinished, setTestFinished] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

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
    api.getSubjects().then(setAvailableSubjects);
    loadPool();
  }, [filterSubjects]);

  const loadPool = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    
    // We fetch a batch size of 8
    const pool = await api.getShortsQuestionPool(session.user.id, filterSubjects, 8); 
    
    setQuestionPool(pool);
    setCurrentIndex(0);
    setLoading(false);
    setQuestionStartTime(Date.now());
    
    // Reset test state if we reload the pool
    setAnsweredState({});
    setTestFinished(false);
  };

  const loadMore = async () => {
    if (!session?.user?.id || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    try {
        const newQuestions = await api.getShortsQuestionPool(session.user.id, filterSubjects, 8);
        if (newQuestions.length > 0) {
            setQuestionPool(prev => {
                // Filter out questions that are already in the *recent* tail of the pool to avoid immediate back-to-back dupes
                const recentIds = new Set(prev.slice(-10).map(q => q.id));
                const uniqueNew = newQuestions.filter(q => !recentIds.has(q.id));
                
                // If DB is very small and everything was in recent tail, just append them anyway to keep infinite scrolling alive
                const questionsToAdd = uniqueNew.length > 0 ? uniqueNew : newQuestions;
                
                return [...prev, ...questionsToAdd];
            });
        }
    } catch(err) {
        console.error("Error loading more questions:", err);
    } finally {
        loadingMoreRef.current = false;
    }
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const index = Math.round(container.scrollTop / container.clientHeight);
    
    if (index !== currentIndex && index >= 0 && index < questionPool.length) {
      if (index > currentIndex) {
        const currentQ = questionPool[currentIndex];
        const ans = answeredState[currentIndex];
        const inter = interactions[currentIndex];
        // If they scrolled past without answering in practice mode, log it as a skip (wrong = false)
        if (currentQ && !ans && mode === 'practice') {
           const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
           onInteractionSubmit(currentQ.id, false, inter?.liked || false, timeSpent).catch(console.error);
        }
      }
      
      setCurrentIndex(index);
      setQuestionStartTime(Date.now());
      
      if (index >= questionPool.length - 3) {
         loadMore();
      }
    }
  }, [currentIndex, questionPool, answeredState, interactions, questionStartTime, onInteractionSubmit, mode, filterSubjects, session?.user?.id]);

  const handleOptionSelect = (optionKey: string, idx: number) => {
    if (answeredState[idx] || testFinished) return;
    
    const question = questionPool[idx];
    const isCorrectAns = String(optionKey).toUpperCase() === String(question.correct_option).toUpperCase();
    
    setAnsweredState(prev => ({
       ...prev,
       [idx]: { selected: optionKey, isCorrect: isCorrectAns }
    }));
    
    const timeSpent = idx === currentIndex ? Math.floor((Date.now() - questionStartTime) / 1000) : 5;
    const hasLiked = interactions[idx]?.liked || false;
    
    if (mode === 'practice') {
        onInteractionSubmit(question.id, isCorrectAns, hasLiked, timeSpent).catch(console.error);
    }
  };

  const toggleInteraction = (type: 'like' | 'dislike', idx: number) => {
     setInteractions(prev => {
        const current = prev[idx] || { liked: false, disliked: false };
        let newLike = current.liked;
        let newDislike = current.disliked;
        
        if (type === 'like') {
            newLike = !current.liked;
            newDislike = false;
        } else {
            newLike = false;
            newDislike = !current.disliked;
        }
        
        // Persist interaction immediately
        if (session?.user?.id && questionPool[idx]) {
             onInteractionSubmit(questionPool[idx].id, false, newLike, 0).catch(console.error);
        }

        return { ...prev, [idx]: { liked: newLike, disliked: newDislike } };
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

    const finishTest = async () => {
        if (!session?.user?.id) return;
        setTestFinished(true);
        
        let correct = 0;
        let wrong = 0;
        let skipped = 0;
        
        // Only count up to currentIndex or questions we've rendered/interacted with
        for (let i = 0; i <= currentIndex; i++) {
            const state = answeredState[i];
            if (state) {
                if (state.isCorrect) correct++;
                else wrong++;
            } else {
                skipped++;
            }
        }
        
        const timeTaken = Math.floor((Date.now() - questionStartTime) / 1000); // Rough approximation
        await api.submitTestResult({
            userId: session.user.id,
            subject: 'Mixed Shorts',
            testType: 'Practice',
            totalQuestions: currentIndex + 1,
            correct,
            wrong,
            skipped,
            timeTaken,
            date: new Date().toISOString()
        });
    };

    if (testFinished) {
        let correct = 0;
        let wrong = 0;
        for (let i = 0; i <= currentIndex; i++) {
            const state = answeredState[i];
            if (state) {
                if (state.isCorrect) correct++;
                else wrong++;
            }
        }
        return (
            <div className="h-[100dvh] w-full bg-slate-50 dark:bg-black font-sans text-slate-900 dark:text-white flex flex-col items-center justify-center p-6">
                <div className="bg-slate-100 dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full text-center shadow-sm">
                    <BadgeCheck className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Test Complete!</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">Here's your quick summary.</p>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-white dark:bg-black p-4 rounded-2xl">
                            <div className="text-2xl font-bold text-green-500">{correct}</div>
                            <div className="text-sm text-slate-500 font-medium">Correct</div>
                        </div>
                        <div className="bg-white dark:bg-black p-4 rounded-2xl">
                            <div className="text-2xl font-bold text-red-500">{wrong}</div>
                            <div className="text-sm text-slate-500 font-medium">Wrong</div>
                        </div>
                    </div>
                    <button onClick={() => { setTestFinished(false); loadPool(); }} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-full active:scale-95 transition-transform">
                        Start New Session
                    </button>
                    <button onClick={() => navigate('/')} className="w-full bg-transparent text-slate-500 font-bold py-3.5 mt-2 rounded-full active:scale-95 transition-transform">
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-black font-sans text-slate-900 dark:text-white relative overflow-hidden flex flex-col select-none transition-colors duration-300">
      {/* Top Navigation - Fixed Global */}
      <div className="absolute top-0 w-full z-40 px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-2 bg-transparent flex justify-between items-center pointer-events-none transition-colors duration-300">
         <div className="flex items-center gap-5 pointer-events-auto w-full justify-between">
            <div className="flex gap-5 items-center">
                <div 
                    className="flex flex-col items-center cursor-pointer"
                    onClick={() => setMode('practice')}
                >
                    <span className={`text-[15px] font-bold ${mode === 'practice' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Practice</span>
                    {mode === 'practice' && <div className="w-4 h-[3px] bg-indigo-600 rounded-full mt-1"></div>}
                </div>
                <div 
                    className="flex flex-col items-center cursor-pointer"
                    onClick={() => setMode('test')}
                >
                    <span className={`text-[15px] font-bold ${mode === 'test' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Test</span>
                    {mode === 'test' && <div className="w-4 h-[3px] bg-indigo-600 rounded-full mt-1"></div>}
                </div>
            </div>
            
            <div className="flex items-center gap-4">
               {mode === 'test' && (
                 <button onClick={finishTest} className="bg-indigo-600 text-white text-[13px] font-bold px-4 py-1.5 rounded-full z-50 shadow-sm active:scale-95 transition-transform">
                     End Test
                 </button>
               )}
               <button onClick={() => setShowFilters(!showFilters)} className="p-2 -mr-2 text-slate-900 dark:text-white active:scale-95 z-50">
                  <div className="relative">
                      <SlidersHorizontal size={22} className="stroke-[2.5]" />
                      {filterSubjects.length > 0 && (
                          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-slate-50 dark:border-black"></div>
                      )}
                  </div>
               </button>
            </div>
         </div>
      </div>
      
      {/* Subject Filters Dropdown */}
      {showFilters && (
          <>
            <div className="absolute inset-0 z-40" onClick={() => setShowFilters(false)}></div>
            <div className="absolute top-[4.5rem] right-4 z-50 bg-white dark:bg-slate-900 w-48 rounded-2xl p-3 shadow-lg border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-3 px-1">
                   <h3 className="text-sm font-bold text-slate-800 dark:text-white">Subjects</h3>
                </div>
                
                <div className="flex flex-col gap-1 max-h-64 overflow-y-auto hide-scrollbar">
                   {availableSubjects.map((sub) => {
                       const isSelected = filterSubjects.includes(sub);
                       return (
                           <button 
                               key={sub}
                               onClick={() => {
                                   let newFilters;
                                   if (isSelected) newFilters = filterSubjects.filter(s => s !== sub);
                                   else newFilters = [...filterSubjects, sub];
                                   setFilterSubjects(newFilters);
                                   if (session?.user?.id) {
                                       api.updateReelsFilter(session.user.id, newFilters);
                                   }
                               }}
                               className={`w-full text-left px-3 py-2 rounded-xl text-[13px] font-bold transition-colors flex items-center justify-between ${isSelected ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                           >
                               {sub}
                               {isSelected && <CheckCircle2 size={16} className={isSelected ? 'text-indigo-600 dark:text-indigo-400' : ''} />}
                           </button>
                       );
                   })}
                </div>
            </div>
          </>
      )}

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
                 <div className="flex flex-col flex-1 w-full max-w-lg mx-auto relative z-10 hide-scrollbar justify-between">
                     {/* Question Text */}
                     <div className="flex flex-col justify-start mt-2 mb-auto shrink-1 min-h-0 relative px-4 sm:px-6 overflow-hidden">
                         <div className="overflow-y-auto hide-scrollbar select-text relative w-full">
                             <h2 className={`font-bold leading-relaxed tracking-tight text-slate-900 dark:text-white py-1 ${textSizeClass}`}>
                                {questionText}
                             </h2>
                         </div>
                     </div>

                     {/* Options Stack */}
                     <div className="flex flex-col gap-3 sm:gap-3.5 w-full mb-20 sm:mb-24 relative shrink-0 pr-14 sm:pr-16 mt-2">
                        {/* Action Buttons - Absolute positioned relative to options stack */}
                        <div className="absolute right-0 sm:-right-2 bottom-6 z-30 flex flex-col items-center gap-5 pointer-events-auto drop-shadow-sm pr-2 sm:pr-3">

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
                           
                           let borderClass = "border-slate-100 dark:border-[#222]";
                           let gradientBgClass = "bg-gradient-to-r from-white from-60% to-transparent dark:from-[#111] dark:to-transparent";
                           let textClass = "text-slate-800 dark:text-white/90";
                           let labelClass = "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 shadow-sm";

                           // In Test mode, just highlight selected neutrally
                           if (isAnswered && mode === 'test' && !testFinished) {
                               if (isSelectedOption) {
                                   borderClass = "border-indigo-200 dark:border-indigo-900/50";
                                   gradientBgClass = "bg-gradient-to-r from-indigo-50 from-60% to-transparent dark:from-indigo-950/50 dark:to-transparent opacity-90";
                                   textClass = "text-indigo-700 dark:text-indigo-400 font-bold";
                                   labelClass = "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 shadow-sm";
                               } else {
                                   borderClass = "border-slate-100 dark:border-[#1a1a1a]";
                                   gradientBgClass = "bg-gradient-to-r from-slate-50/50 from-60% to-transparent dark:from-[#0a0a0a]/50 dark:to-transparent opacity-60";
                                   textClass = "text-slate-500 dark:text-white/50";
                                   labelClass = "bg-slate-100 text-slate-400 dark:bg-[#222] dark:text-white/30 shadow-sm";
                               }
                           } else if (isAnswered) {
                               // Practice mode feedback
                               if (isCorrectOption) {
                                   borderClass = "border-emerald-200 dark:border-emerald-900/50";
                                   gradientBgClass = "bg-gradient-to-r from-emerald-50 from-60% to-transparent dark:from-emerald-950/50 dark:to-transparent opacity-90";
                                   textClass = "text-emerald-700 dark:text-emerald-400 font-bold";
                                   labelClass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 shadow-sm";
                               } else if (isSelectedOption && !isCorrectOption) {
                                   borderClass = "border-rose-200 dark:border-rose-900/50";
                                   gradientBgClass = "bg-gradient-to-r from-rose-50 from-60% to-transparent dark:from-rose-950/50 dark:to-transparent opacity-90";
                                   textClass = "text-rose-700 dark:text-rose-400 font-bold";
                                   labelClass = "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 shadow-sm";
                               } else {
                                   borderClass = "border-slate-100 dark:border-[#1a1a1a]";
                                   gradientBgClass = "bg-gradient-to-r from-slate-50/50 from-60% to-transparent dark:from-[#0a0a0a]/50 dark:to-transparent opacity-60";
                                   textClass = "text-slate-400 dark:text-white/40";
                                   labelClass = "bg-slate-100 text-slate-400 dark:bg-[#222] dark:text-white/30 shadow-sm";
                               }
                           }

                           // Dynamic option text scaling based on length
                           const optLength = optValue.length;
                           let optTextSizeClass = "text-[0.95rem]"; // standard medium
                           if (optLength > 60) {
                               optTextSizeClass = "text-[12px] sm:text-[13px] leading-snug";
                           } else if (optLength < 25) {
                               optTextSizeClass = "text-[15px] sm:text-[1rem]";
                           }

                           return (
                              <button 
                                 key={opt}
                                 onClick={(e) => { e.stopPropagation(); handleOptionSelect(opt, idx); }}
                                 disabled={isAnswered}
                                 className={`w-[calc(100%-0.5rem)] sm:w-[calc(100%-1rem)] text-left py-3 sm:py-3.5 pr-2 flex items-center justify-between gap-4 transition-all duration-300 relative border ${borderClass} rounded-2xl ml-4 sm:ml-6 mb-0 group`}
                              >
                                 <div className={`absolute inset-0 rounded-2xl ${gradientBgClass} pointer-events-none -z-10`} />
                                 <div className="flex items-center gap-3.5 flex-1 w-full z-10 px-4 sm:px-6" style={{ paddingLeft: 0, paddingRight: 0, marginLeft: '1rem' }}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold transition-colors ${labelClass}`}>
                                         {opt.toUpperCase()}
                                    </div>
                                    <span className={`break-words whitespace-normal line-clamp-3 w-full pr-2 ${textClass} ${optTextSizeClass}`}>{optValue}</span>
                                 </div>
                              </button>
                           );
                        })}

                     </div>
                 </div>

                 {/* Absolute Bottom Elements inside Motion Container */}
                 <div className="absolute left-4 sm:left-6 bottom-4 sm:bottom-6 z-30 flex flex-col gap-1.5 pointer-events-none mb-[env(safe-area-inset-bottom)]">
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



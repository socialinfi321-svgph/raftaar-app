
import React, { useState, useEffect, useRef } from 'react';
import { Profile } from '../types';

interface HomeScreenProps {
  profile: Profile | null;
  setComingSoonTitle: (t: string) => void;
  onOpenInfinity: () => void;
  onOpenPYQ: () => void;
  onOpenDashboard: () => void;
  onOpenAchievements: () => void;
  navigate: (path: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ 
  profile, 
  setComingSoonTitle, 
  onOpenInfinity, 
  onOpenPYQ, 
  onOpenDashboard, 
  onOpenAchievements, 
  navigate 
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Swipe Logic State
  const [touchStart, setTouchStart] = useState<number>(0);
  const [touchCurrent, setTouchCurrent] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);

  const autoSlideInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Slide data
  const slides = [
    {
      id: 'brand',
      isHero: true,
      bg: 'bg-slate-900', 
      btn: 'Start Practice',
      action: () => navigate('/practice'),
      overlay: 'bg-gradient-to-br from-slate-900 via-slate-800 to-black'
    },
    {
      id: 'mission_2026',
      bg: 'bg-indigo-950',
      image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800',
      title: 'Dream 450+ Marks',
      subtitle: 'BSEB 2026 • Starts 2 Feb',
      desc: '25,000+ Objectives.',
      btn: 'Start Journey',
      action: () => navigate('/practice'),
      overlay: 'bg-gradient-to-t from-black via-black/60 to-transparent'
    },
    {
      id: 'builder',
      bg: 'bg-brand-700',
      image: 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?auto=format&fit=crop&q=80&w=800', 
      profileImg: 'https://raw.githubusercontent.com/socialinfi321-svgph/superkar-reviews/main/IMG_20260106_085046.jpg', 
      title: 'Prem Kashyap',
      subtitle: 'Builder of Raftaar',
      desc: 'Coding the future of education.',
      btn: 'Donate',
      link: 'https://socialinfi321-svgph.github.io/komal-caterers/',
      overlay: 'bg-gradient-to-t from-black via-black/80 to-transparent'
    },
    {
      id: 'telegram',
      bg: 'bg-blue-600',
      image: null,
      isTelegram: true,
      title: 'Join Telegram',
      subtitle: 'Daily Quizzes',
      desc: 'Get exclusive notes and daily quizzes.',
      btn: 'Join Channel',
      link: 'https://t.me/raftartestseries',
      overlay: 'bg-gradient-to-r from-blue-700/95 to-cyan-600/95'
    }
  ];

  // Auto Slider Logic
  useEffect(() => {
    if (isPaused || isDragging) return;

    autoSlideInterval.current = setInterval(() => {
        setActiveSlide(prev => (prev + 1) % slides.length);
    }, 5000);

    return () => {
        if (autoSlideInterval.current) clearInterval(autoSlideInterval.current);
    };
  }, [slides.length, isPaused, isDragging]);

  // Touch Handlers for Manual Swipe with Drag Visualization
  const onTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    setIsDragging(true);
    setTouchStart(e.targetTouches[0].clientX);
    setTouchCurrent(e.targetTouches[0].clientX);
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchCurrent(e.targetTouches[0].clientX);
  }

  const onTouchEnd = () => {
    setIsDragging(false);
    const diff = touchStart - touchCurrent;
    const threshold = 50; // Minimum px distance to trigger slide change

    if (Math.abs(diff) > threshold) {
        if (diff > 0) {
           // Swipe Left -> Next Slide
           setActiveSlide(prev => (prev + 1) % slides.length);
        } else {
           // Swipe Right -> Prev Slide
           setActiveSlide(prev => (prev - 1 + slides.length) % slides.length);
        }
    }

    // Reset Drag State
    setTouchStart(0);
    setTouchCurrent(0);

    // Resume auto-slide after interaction
    setTimeout(() => setIsPaused(false), 5000);
  }

  // Calculate transform with visual drag offset
  const dragOffset = isDragging ? touchCurrent - touchStart : 0;

  return (
    <div className="space-y-6 pb-24 pt-4 animate-fade-in bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        
        {/* Rounded Premium Slider */}
        <div className="px-5">
            <div 
                className="rounded-3xl overflow-hidden shadow-xl shadow-brand-900/10 relative h-[185px] touch-pan-y border border-slate-200 dark:border-slate-800"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Slider Track */}
                <div 
                    className="flex h-full" 
                    style={{ 
                        transform: `translateX(calc(-${activeSlide * 100}% + ${dragOffset}px))`,
                        transition: isDragging ? 'none' : 'transform 0.5s ease-out'
                    }}
                >
                    {slides.map((slide, idx) => (
                        <div key={idx} className="min-w-full relative h-full flex flex-col justify-end p-5 overflow-hidden select-none">
                            {/* Background & Overlay */}
                            <div className="absolute inset-0 z-0 pointer-events-none">
                                {slide.image ? (
                                    <img src={slide.image} className="w-full h-full object-cover opacity-80" alt="slide" />
                                ) : (
                                    <div className={`w-full h-full ${slide.bg}`}></div>
                                )}
                                <div className={`absolute inset-0 z-10 ${slide.overlay}`}></div>
                                
                                {/* Telegram Pattern */}
                                {slide.isTelegram && (
                                    <div className="absolute inset-0 opacity-10 grid grid-cols-6 gap-4 p-4 transform -rotate-12">
                                        {[...Array(24)].map((_, i) => (
                                            <i key={i} className="fa-brands fa-telegram text-4xl text-white"></i>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {/* Top Right Profile Image (For Builder Slide) */}
                            {/* Using "as any" to access profileImg because not all slides have it */}
                            {(slide as any).profileImg && (
                                <div className="absolute top-4 right-4 z-20 flex flex-col items-end animate-fade-in">
                                    <div className="w-[110px] h-[110px] rounded-full border-4 border-white/20 shadow-2xl overflow-hidden bg-white/5 backdrop-blur-md">
                                        <img src={(slide as any).profileImg} className="w-full h-full object-cover" alt="Profile" />
                                    </div>
                                </div>
                            )}
                            
                            {/* Content */}
                            {slide.isHero ? (
                                <div className="relative z-20 flex flex-col items-center justify-center h-full text-center">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center shadow-lg transform -rotate-6 border border-slate-700">
                                            <span className="text-white font-black text-xl font-sans">R</span>
                                        </div>
                                        <h2 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-blue-200 drop-shadow-sm">RAFTAAR</h2>
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-2 text-[8px] font-bold text-slate-300 uppercase tracking-widest mb-4">
                                        <span className="bg-slate-800/80 px-2 py-1 rounded border border-slate-700">Infinity Practice</span>
                                        <span className="bg-slate-800/80 px-2 py-1 rounded border border-slate-700">Live Mock Test</span>
                                    </div>
                                    <button onClick={slide.action} className="bg-white text-slate-950 px-6 py-2 rounded-full text-[10px] font-black shadow-lg hover:scale-105 transition-transform uppercase tracking-wider">Start Now</button>
                                </div>
                            ) : (
                                <div className="relative z-20 text-white">
                                    <h2 className="text-xl font-black mb-1 tracking-tight drop-shadow-md">{slide.title}</h2>
                                    <div className="inline-block bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest mb-2 border border-white/10">
                                        {slide.subtitle}
                                    </div>
                                    <p className="text-xs opacity-90 leading-relaxed mb-3 max-w-[90%] font-medium text-slate-200 line-clamp-2">{slide.desc}</p>
                                    
                                    {slide.link ? (
                                        <a href={slide.link} target="_blank" rel="noreferrer" className="inline-block bg-white text-slate-900 px-4 py-2 rounded-lg text-[10px] font-bold shadow-md hover:scale-105 transition-transform">
                                            {slide.btn}
                                        </a>
                                    ) : (
                                        <button onClick={slide.action} className="bg-white text-slate-900 px-4 py-2 rounded-lg text-[10px] font-bold shadow-md hover:scale-105 transition-transform">
                                            {slide.btn}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Dots Indicator */}
                <div className="absolute bottom-4 right-4 z-30 flex gap-1.5">
                    {slides.map((_, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => { setActiveSlide(idx); setIsPaused(true); setTimeout(() => setIsPaused(false), 5000); }}
                            className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${activeSlide === idx ? 'w-4 bg-white' : 'w-1 bg-white/30'}`}
                        ></div>
                    ))}
                </div>
            </div>
        </div>

        {/* 4-Grid Menu */}
        <div className="px-5">
            <h3 className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-3 ml-1">Quick Access</h3>
            <div className="grid grid-cols-2 gap-3">
                {/* Infinity Practice - Purple/Violet Gradient */}
                <div onClick={onOpenInfinity} className="bg-gradient-to-br from-violet-600 to-purple-700 p-4 rounded-3xl shadow-lg shadow-purple-900/10 active:scale-95 transition-transform flex flex-col items-center justify-center text-center h-[130px] cursor-pointer relative overflow-hidden group border border-transparent">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl -mr-5 -mt-5"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full blur-xl -ml-5 -mb-5"></div>
                    
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-2 text-white border border-white/20">
                        <i className="fa-solid fa-infinity text-xl"></i>
                    </div>
                    <span className="text-xs font-bold text-white tracking-wide">Infinity Practice</span>
                </div>

                {/* PYQ - Green/Teal Gradient */}
                <div onClick={onOpenPYQ} className="bg-gradient-to-br from-emerald-500 to-teal-600 p-4 rounded-3xl shadow-lg shadow-emerald-900/10 active:scale-95 transition-transform flex flex-col items-center justify-center text-center h-[130px] cursor-pointer relative overflow-hidden group border border-transparent">
                     <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full blur-xl -ml-5 -mb-5"></div>
                     <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full blur-xl -mr-5 -mt-5"></div>
                     
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-2 text-white border border-white/20">
                        <i className="fa-solid fa-file-circle-question text-xl"></i>
                    </div>
                    <span className="text-xs font-bold text-white tracking-wide">PYQ</span>
                </div>

                {/* Achievements - Orange/Amber Gradient */}
                <div onClick={onOpenAchievements} className="bg-gradient-to-br from-amber-400 to-orange-500 p-4 rounded-3xl shadow-lg shadow-orange-900/10 active:scale-95 transition-transform flex flex-col items-center justify-center text-center h-[130px] cursor-pointer relative overflow-hidden group border border-transparent">
                     <div className="absolute bottom-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl -mr-5 -mb-5"></div>
                     <div className="absolute top-0 left-0 w-16 h-16 bg-white/5 rounded-full blur-xl -ml-5 -mt-5"></div>
                     
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-2 text-white border border-white/20">
                        <i className="fa-solid fa-medal text-xl"></i>
                    </div>
                    <span className="text-xs font-bold text-white tracking-wide">Achievements</span>
                </div>

                {/* Dashboard - Blue Gradient */}
                <div onClick={onOpenDashboard} className="bg-gradient-to-br from-blue-500 to-blue-700 p-4 rounded-3xl shadow-lg shadow-blue-900/10 active:scale-95 transition-transform flex flex-col items-center justify-center text-center h-[130px] cursor-pointer relative overflow-hidden group border border-transparent">
                     <div className="absolute top-0 left-0 w-20 h-20 bg-white/10 rounded-full blur-xl -ml-5 -mt-5"></div>
                     <div className="absolute bottom-0 right-0 w-16 h-16 bg-white/5 rounded-full blur-xl -mr-5 -mb-5"></div>
                     
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-2 text-white border border-white/20">
                        <i className="fa-solid fa-chart-pie text-xl"></i>
                    </div>
                    <span className="text-xs font-bold text-white tracking-wide">My Dashboard</span>
                </div>
            </div>
        </div>
        
        {/* Featured Series */}
        <div className="px-5">
            <h3 className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-3 ml-1">Featured Series</h3>
            <div onClick={() => setComingSoonTitle('Wave Optics Series')} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition group">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl flex items-center justify-center text-indigo-500 dark:text-indigo-400 font-black text-xl group-hover:scale-110 transition-transform border border-indigo-100 dark:border-indigo-900/30">W</div>
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">Wave Optics</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Physics • High Yield</p>
                    </div>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 border border-slate-200 dark:border-slate-700">
                    Locked <i className="fa-solid fa-lock text-[10px]"></i>
                </div>
            </div>
        </div>
    </div>
  );
};

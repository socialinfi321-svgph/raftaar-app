
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
  const sliderRef = useRef<HTMLDivElement>(null);

  // Slide data
  const slides = [
    {
      id: 'mock_test',
      bg: 'bg-[#15202b]', 
      title: 'BSEB 12th Mega Mock Test',
      subtitle: 'Dynamic graphics!',
      tag: 'LIVE NOW!',
      btn: 'Join Now',
      action: () => setComingSoonTitle('BSEB Mega Mock'),
    },
    {
      id: 'batch',
      bg: 'bg-[#0f172a]',
      title: 'Patna Vidya Hub - Join Topper Batch!',
      subtitle: 'Premium Series',
      tag: 'NEW',
      btn: 'Join Now',
      action: () => setComingSoonTitle('Topper Batch'),
    },
    {
      id: 'mission_2026',
      bg: 'bg-indigo-900',
      title: 'Dream 450+ Marks',
      subtitle: '25,000+ Objectives.',
      tag: '2026',
      btn: 'Start',
      action: () => navigate('/practice'),
    }
  ];

  // Auto Slider Logic
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
        setActiveSlide(prev => {
            const next = (prev + 1) % slides.length;
            if (sliderRef.current) {
                // Determine width of one slide which is container width
                const slideWidth = sliderRef.current.offsetWidth;
                sliderRef.current.scrollTo({
                    left: next * slideWidth,
                    behavior: 'smooth'
                });
            }
            return next;
        });
    }, 4000);
    return () => clearInterval(interval);
  }, [slides.length, isPaused]);

  const handleScroll = () => {
    if (sliderRef.current) {
        const scrollLeft = sliderRef.current.scrollLeft;
        const slideWidth = sliderRef.current.offsetWidth;
        // avoid divide by zero or NaN
        if(slideWidth > 0) {
            const newIndex = Math.round(scrollLeft / slideWidth);
            if (newIndex !== activeSlide && newIndex < slides.length) {
                setActiveSlide(newIndex);
            }
        }
    }
  };

  const nameParts = (profile?.full_name || 'Aman').split(' ');
  const firstName = nameParts[0];
  const xp = profile?.weekly_xp || 0;
  const avatar = profile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=dev';

  return (
    <div className="bg-slate-50 dark:bg-slate-950 pb-24 transition-colors duration-300 min-h-[100dvh]">
        
        {/* Header block without heavy curve */}
        <div className="bg-[#0f2133] px-4 pt-safe-header pb-4 relative shadow-sm">
            {/* Top Row: Menu, Logo, Icons */}
            <div className="flex justify-between items-center mb-4 mt-2">
                <div className="flex items-center gap-3">
                    <button className="text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors">
                        <i className="fa-solid fa-bars text-xl"></i>
                    </button>
                    
                    <div className="flex items-center gap-1 select-none shrink-0">
                      <div className="relative flex items-center justify-center">
                          <div className="italic font-black text-white text-2xl" style={{ fontFamily: 'sans-serif' }}>R</div>
                          <i className="fa-solid fa-bolt text-yellow-500 absolute -left-1 opacity-90 text-xl transform -rotate-12"></i>
                      </div>
                      <div className="font-bold text-lg tracking-wide shrink-0 text-white">
                          RAFTAAR
                      </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 text-white">
                    <button onClick={onOpenAchievements} className="hover:text-blue-200 transition-colors relative p-1">
                        <i className="fa-regular fa-bell text-lg"></i>
                        <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-[#0f2133]"></span>
                    </button>
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-white/20">
                        <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                </div>
            </div>

            {/* Greeting */}
            <div>
                <h1 className="text-white text-[15px] font-medium tracking-wide">
                    Namaste, <span className="text-yellow-500 font-bold">{firstName}!</span>
                </h1>
            </div>
        </div>

        {/* Banners */}
        <div className="px-4 mt-4">
            <div 
                ref={sliderRef}
                className="flex overflow-x-auto hide-scrollbar gap-0 snap-x snap-mandatory rounded-xl shadow-sm"
                onScroll={handleScroll}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
            >
                {slides.map((slide, idx) => (
                    <div key={idx} className="snap-center min-w-full w-full h-[150px] relative overflow-hidden flex-shrink-0 bg-[#0c1622] rounded-xl border border-slate-700/50">
                        <div className={`absolute inset-0 ${slide.bg} opacity-50`}></div>
                        
                        <div className="relative z-10 p-4 h-full flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div className="w-3/4">
                                    <h3 className="text-white font-bold text-base leading-tight drop-shadow-sm">{slide.title}</h3>
                                    <p className="text-slate-300 text-[11px] mt-1">{slide.subtitle}</p>
                                </div>
                                <div className="absolute right-[-10px] top-[-10px] opacity-80 pointer-events-none transform -rotate-12">
                                  {/* Custom lightning bolt graphic for banner */}
                                  <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full blur-xl opacity-20"></div>
                                  <i className="fa-solid fa-bolt text-7xl text-gradient bg-clip-text text-transparent bg-gradient-to-b from-yellow-300 to-orange-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></i>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-end">
                                {slide.id === 'mock_test' ? (
                                    <div className="flex gap-1 items-center bg-black/40 px-2 py-1 rounded-md border border-slate-700/50">
                                        <span className="bg-[#b3261e] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-[inset_0px_1px_rgba(255,255,255,0.3)]">01</span>
                                        <span className="text-white font-bold text-[10px]">:</span>
                                        <span className="bg-[#b3261e] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-[inset_0px_1px_rgba(255,255,255,0.3)]">03</span>
                                        <span className="text-white font-bold text-[10px]">:</span>
                                        <span className="bg-[#b3261e] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-[inset_0px_1px_rgba(255,255,255,0.3)]">35</span>
                                    </div>
                                ) : (
                                    <span className="text-amber-500 text-[10px] font-black uppercase tracking-wider">{slide.tag}</span>
                                )}

                                <button onClick={slide.action} className="bg-gradient-to-b from-amber-400 to-orange-500 text-white font-bold text-xs px-4 py-1.5 rounded-full shadow-[inset_0px_1px_rgba(255,255,255,0.4),0px_2px_4px_rgba(0,0,0,0.3)] active:scale-95 transition-transform z-20">
                                    {slide.btn}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Dots */}
            <div className="flex justify-center gap-1.5 mt-2.5">
                {slides.map((_, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => {
                            setActiveSlide(idx);
                            if (sliderRef.current) {
                                sliderRef.current.scrollTo({
                                    left: idx * sliderRef.current.offsetWidth,
                                    behavior: 'smooth'
                                });
                            }
                        }}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${activeSlide === idx ? 'w-5 bg-amber-500' : 'w-1.5 bg-slate-300 dark:bg-slate-700'}`}
                    ></div>
                ))}
            </div>
        </div>

        <div className="px-5 space-y-7 mt-6">
            
            {/* Quick Icons - Row 1 (Image Icons) */}
            <div className="grid grid-cols-5 gap-2 w-full justify-items-center">
                <GradientIconBtn 
                    icon="fa-solid fa-stopwatch" 
                    label="Mock Tests" 
                    gradient="bg-gradient-to-br from-[#ff4d79] to-[#ff004d]"
                    shadow="shadow-[0_4px_12px_rgba(255,0,77,0.3)]"
                    onClick={() => setComingSoonTitle('Mock Tests')} 
                />
                <GradientIconBtn 
                    icon="fa-solid fa-play" 
                    label="All Classes" 
                    gradient="bg-gradient-to-br from-[#4facfe] to-[#00f2fe]"
                    shadow="shadow-[0_4px_12px_rgba(0,242,254,0.3)]"
                    onClick={() => setComingSoonTitle('All Classes')} 
                />
                <GradientIconBtn 
                    icon="fa-solid fa-brain" 
                    label="Practice Zone" 
                    gradient="bg-gradient-to-br from-[#43e97b] to-[#38f9d7]"
                    shadow="shadow-[0_4px_12px_rgba(67,233,123,0.3)]"
                    onClick={() => navigate('/practice')} 
                />
                <GradientIconBtn 
                    icon="fa-solid fa-users" 
                    label="My Batch" 
                    gradient="bg-gradient-to-br from-[#a18cd1] to-[#fbc2eb]"
                    shadow="shadow-[0_4px_12px_rgba(161,140,209,0.3)]"
                    onClick={() => setComingSoonTitle('My Batch')} 
                />
                <GradientIconBtn 
                    icon="fa-solid fa-file-pdf" 
                    label="PDF Notes" 
                    gradient="bg-gradient-to-br from-[#f6d365] to-[#fda085]"
                    shadow="shadow-[0_4px_12px_rgba(253,160,133,0.3)]"
                    onClick={() => setComingSoonTitle('PDF Notes')} 
                />
            </div>

        </div>

        {/* Feature Cards (Practice Zone Style) */}
        <div className="mt-7 pl-4">
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white mb-3">My Study Zone</h2>
            <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2 pr-4">
                
                {/* Infinity Practice */}
                <FeatureCard 
                    title="Infinity" 
                    subtitle="Practice Math" 
                    icon="fa-solid fa-infinity" 
                    iconColor="text-purple-600 dark:text-purple-400" 
                    bgTintColor="bg-purple-100 dark:bg-purple-900" 
                    arrowColor="bg-purple-600"
                    onClick={onOpenInfinity} 
                />
                
                {/* PYQ */}
                <FeatureCard 
                    title="PYQ" 
                    subtitle="Previous Papers" 
                    icon="fa-solid fa-file-circle-question" 
                    iconColor="text-teal-600 dark:text-teal-400" 
                    bgTintColor="bg-teal-100 dark:bg-teal-900" 
                    arrowColor="bg-teal-600"
                    onClick={onOpenPYQ} 
                />

                {/* Achievements */}
                <FeatureCard 
                    title="Achievement" 
                    subtitle="Your Medals" 
                    icon="fa-solid fa-medal" 
                    iconColor="text-orange-600 dark:text-orange-400" 
                    bgTintColor="bg-orange-100 dark:bg-orange-900" 
                    arrowColor="bg-orange-600"
                    onClick={onOpenAchievements} 
                />

                {/* Dashboard */}
                <FeatureCard 
                    title="Dashboard" 
                    subtitle="Your Stats" 
                    icon="fa-solid fa-chart-pie" 
                    iconColor="text-blue-600 dark:text-blue-400" 
                    bgTintColor="bg-blue-100 dark:bg-blue-900" 
                    arrowColor="bg-blue-600"
                    onClick={onOpenDashboard} 
                />
            </div>
        </div>

        {/* Explore Coaching Marketplace */}
        <div className="mt-7 pl-4">
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white mb-3">Explore Coaching Marketplace</h2>
            <div className="flex overflow-x-auto hide-scrollbar gap-4 pb-4 pr-4">
                
                {/* Coaching Card 1 */}
                <div className="min-w-[260px] w-[260px] bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm flex-shrink-0 flex flex-col">
                    <div className="h-28 bg-[#1e293b] relative p-3 flex flex-col justify-end">
                       <div className="absolute inset-0 opacity-40">
                           <img src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover" alt="" />
                       </div>
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                       <div className="relative z-10">
                           <h3 className="text-white font-bold text-[13px] leading-snug w-5/6">Patna Vidya Hub - Complete BSEB 12th Science Series</h3>
                           <div className="mt-2 flex items-center gap-1.5 text-slate-300 text-[9px] font-medium">
                               <i className="fa-solid fa-user-group"></i> 12K students
                           </div>
                       </div>
                    </div>
                    <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex-1 flex flex-col">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">Patna Vidya Hub - Complete BSEB 12th</h4>
                        <p className="text-slate-500 text-[10px] mt-0.5">Institute Vidya Hub</p>
                        <p className="text-slate-400 text-[10px] mt-1 mb-3">Course Info : 1 Series</p>
                        
                        <div className="flex gap-2 mt-auto">
                            <button className="flex-1 border border-amber-500 text-amber-500 font-bold text-[11px] py-1.5 rounded-[10px] hover:bg-amber-50 active:scale-95 transition-all">View Details</button>
                            <button className="flex-1 bg-amber-500 text-white font-bold text-[11px] py-1.5 rounded-[10px] hover:bg-amber-600 active:scale-95 transition-all">Enroll Now</button>
                        </div>
                    </div>
                </div>

                {/* Coaching Card 2 */}
                <div className="min-w-[260px] w-[260px] bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm flex-shrink-0 flex flex-col">
                    <div className="h-28 bg-[#0f172a] relative p-3 flex flex-col justify-end">
                       <div className="absolute inset-0 opacity-40">
                           <img src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover" alt="" />
                       </div>
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                       <div className="relative z-10">
                           <h3 className="text-white font-bold text-[13px] leading-snug w-5/6 uppercase">DARBHANGA ACHIEVERS</h3>
                           <p className="text-slate-300 text-[9px] font-medium mt-1">Subjective Notes & PYQ</p>
                       </div>
                    </div>
                    <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex-1 flex flex-col">
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">Darbhanga Achievers - Subjective Notes</h4>
                        <p className="text-slate-500 text-[10px] mt-0.5">Darbhanga Achievers</p>
                        <p className="text-slate-400 text-[10px] mt-1 mb-3">Course Info : Subjective Notes</p>
                        
                        <div className="flex gap-2 mt-auto">
                            <button className="flex-1 border border-amber-500 text-amber-500 font-bold text-[11px] py-1.5 rounded-[10px] hover:bg-amber-50 active:scale-95 transition-all">View Details</button>
                            <button className="flex-1 bg-amber-500 text-white font-bold text-[11px] py-1.5 rounded-[10px] hover:bg-amber-600 active:scale-95 transition-all">Enroll Now</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Top Featured Institutes */}
        <div className="mt-2 px-4 pb-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Top Featured Institutes</h2>
                <span className="text-[10px] text-slate-400 font-medium cursor-pointer uppercase">View All</span>
            </div>
            <div className="flex items-start gap-5 overflow-x-auto hide-scrollbar pb-2">
                {/* Institute 1 */}
                <div className="flex flex-col items-center gap-1.5 min-w-[65px]">
                    <div className="w-14 h-14 rounded-full border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                        <i className="fa-solid fa-graduation-cap text-[22px] text-blue-800 dark:text-blue-400"></i>
                    </div>
                    <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 text-center leading-tight">Gaya Excellence</span>
                </div>
                
                {/* Institute 2 */}
                <div className="flex flex-col items-center gap-1.5 min-w-[65px]">
                    <div className="w-14 h-14 rounded-full border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden shadow-sm p-1">
                        <div className="w-full h-full rounded-full border border-red-800 flex items-center justify-center overflow-hidden">
                           <img src="https://images.unsplash.com/photo-1544717297-fa95b6ee9643?auto=format&fit=crop&w=100&q=80" alt="Muzaffarpur" className="w-full h-full object-cover" />
                        </div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 text-center leading-tight">Muzaffarpur Toppers</span>
                </div>

                {/* Institute 3 */}
                <div className="flex flex-col items-center gap-1.5 min-w-[65px]">
                     <div className="w-14 h-14 rounded-full border border-slate-100 dark:border-slate-700 bg-yellow-50 flex items-center justify-center overflow-hidden shadow-sm p-0.5">
                        <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" alt="Logo" className="w-full h-full object-cover rounded-full" />
                    </div>
                     <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 text-center leading-tight">Muzaffarpur Toppers</span>
                </div>

                {/* Institute 4 */}
                <div className="flex flex-col items-center gap-1.5 min-w-[65px]">
                     <div className="w-14 h-14 rounded-full border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden shadow-sm">
                        <div className="w-full h-full rounded-full border border-slate-300 bg-slate-100 flex items-center justify-center overflow-hidden">
                            <i className="fa-solid fa-user text-slate-400"></i>
                        </div>
                    </div>
                     <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 text-center leading-tight">Hind Scholar</span>
                </div>
            </div>
        </div>

    </div>
  );
};

const GradientIconBtn = ({ icon, label, gradient, shadow, onClick }: { icon: string, label: string, gradient: string, shadow: string, onClick: () => void }) => (
    <div onClick={onClick} className="flex flex-col items-center justify-start gap-2 cursor-pointer group w-full max-w-[70px]">
        <div className={`w-[90%] aspect-square rounded-[18px] ${gradient} ${shadow} flex items-center justify-center group-hover:scale-105 transition-transform duration-300`}>
            <i className={`${icon} text-white text-[24px]`}></i>
        </div>
        <span className="text-[10px] font-medium text-slate-800 dark:text-slate-200 text-center leading-tight break-words w-full">
            {label}
        </span>
    </div>
);

const FeatureCard = ({ title, subtitle, icon, iconColor, bgTintColor, arrowColor, onClick }: any) => (
    <div onClick={onClick} className={`min-w-[110px] w-[110px] h-[130px] rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 flex flex-col justify-between cursor-pointer flex-shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow relative overflow-hidden group`}>
        {/* Subtle background glow from top left */}
        <div className={`absolute -top-6 -left-6 w-20 h-20 ${bgTintColor} blur-2xl rounded-full opacity-40 dark:opacity-20`}></div>
        
        <div className="relative z-10 w-8 h-8 rounded-lg flex items-center justify-center">
            <i className={`${icon} ${iconColor} text-[22px]`}></i>
        </div>
        
        <div className="relative z-10 mt-auto mb-1">
            <h3 className="font-bold text-slate-800 dark:text-white text-[11px] leading-tight mb-0.5">{title}</h3>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">{subtitle}</p>
        </div>
        
        <div className="absolute bottom-3 right-3 z-10">
            <div className={`w-5 h-5 rounded-full inline-flex items-center justify-center ${arrowColor} text-white group-hover:scale-110 transition-transform`}>
                <i className="fa-solid fa-arrow-right text-[9px]"></i>
            </div>
        </div>
    </div>
);

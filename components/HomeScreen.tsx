
import React, { useState, useEffect, useRef } from 'react';
import { Profile } from '../types';

interface HomeScreenProps {
  profile: Profile | null;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  setComingSoonTitle: (t: string) => void;
  onOpenInfinity: () => void;
  onOpenPYQ: () => void;
  onOpenDashboard: () => void;
  onOpenAchievements: () => void;
  navigate: (path: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ 
  profile, 
  theme,
  setTheme,
  setComingSoonTitle, 
  onOpenInfinity, 
  onOpenPYQ, 
  onOpenDashboard, 
  onOpenAchievements, 
  navigate 
}) => {
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isBoardDropdownOpen, setBoardDropdownOpen] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState('Board');
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
                    <button onClick={() => setDrawerOpen(true)} className="relative mr-2 flex-shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-full">
                        <div className="w-10 h-10 rounded-full bg-[#00897b] flex items-center justify-center text-white text-[22px] font-normal uppercase shadow-sm ring-2 ring-white/10">
                            {firstName.charAt(0)}
                        </div>
                        <div className="absolute -bottom-1 -right-1.5 w-[22px] h-[22px] bg-white rounded-full shadow-md flex flex-col items-center justify-center gap-[3px]">
                            <div className="w-3 cursor-pointer h-[1.5px] bg-slate-900 rounded-full"></div>
                            <div className="w-3 cursor-pointer h-[1.5px] bg-slate-900 rounded-full"></div>
                            <div className="w-3 cursor-pointer h-[1.5px] bg-slate-900 rounded-full"></div>
                        </div>
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

        <div className="px-4 mt-4 relative z-20">
            {/* Quick Icons Container */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-[24px] shadow-sm flex justify-between items-start w-full">
                <GradientIconBtn 
                    icon="fa-solid fa-stopwatch" 
                    label="All Tests" 
                    gradient="bg-gradient-to-br from-[#ff4d79] to-[#ff004d]"
                    onClick={() => setComingSoonTitle('All Tests')} 
                />
                <GradientIconBtn 
                    icon="fa-solid fa-play" 
                    label="All Classes" 
                    gradient="bg-gradient-to-br from-[#4facfe] to-[#00f2fe]"
                    onClick={() => setComingSoonTitle('All Classes')} 
                />
                <GradientIconBtn 
                    icon="fa-solid fa-brain" 
                    label="Practice Zone" 
                    gradient="bg-gradient-to-br from-[#43e97b] to-[#38f9d7]"
                    onClick={() => navigate('/practice')} 
                />
                <GradientIconBtn 
                    icon="fa-solid fa-users" 
                    label="My Batch" 
                    gradient="bg-gradient-to-br from-[#a18cd1] to-[#fbc2eb]"
                    onClick={() => setComingSoonTitle('My Batch')} 
                />
                <GradientIconBtn 
                    icon="fa-solid fa-file-pdf" 
                    label="PDF Notes" 
                    gradient="bg-gradient-to-br from-[#f6d365] to-[#fda085]"
                    onClick={() => setComingSoonTitle('PDF Notes')} 
                />
            </div>
        </div>

        {/* My Study Zone */}
        <div className="mt-8 px-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-[16px] font-bold text-slate-900 dark:text-white">My Study Zone</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <StudyZoneCard 
                    title="My Batches" 
                    icon="fa-solid fa-graduation-cap" 
                    iconColor="text-indigo-600 dark:text-indigo-400" 
                    onClick={() => setComingSoonTitle('My Batches')} 
                />

                <StudyZoneCard 
                    title="Infinity" 
                    icon="fa-solid fa-infinity" 
                    iconColor="text-purple-600 dark:text-purple-400" 
                    onClick={onOpenInfinity} 
                />
                
                <StudyZoneCard 
                    title="PYQ" 
                    icon="fa-solid fa-file-circle-question" 
                    iconColor="text-pink-600 dark:text-pink-400" 
                    onClick={onOpenPYQ} 
                />

                <StudyZoneCard 
                    title="Achievement" 
                    icon="fa-solid fa-medal" 
                    iconColor="text-amber-500 dark:text-amber-400" 
                    onClick={onOpenAchievements} 
                />

                <StudyZoneCard 
                    title="Dashboard" 
                    icon="fa-solid fa-chart-pie" 
                    iconColor="text-emerald-600 dark:text-emerald-400" 
                    onClick={onOpenDashboard} 
                />

                <StudyZoneCard 
                    title="Bookmarks" 
                    icon="fa-solid fa-bookmark" 
                    iconColor="text-blue-600 dark:text-blue-400" 
                    onClick={() => setComingSoonTitle('Bookmarks')} 
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
        
        {/* ---- SIDE DRAWER COMPONENT ---- */}
        {/* Drawer Overlay */}
        <div 
            className={`fixed inset-0 bg-black/60 z-[998] transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setDrawerOpen(false)}
        ></div>

        {/* Drawer Panel */}
        <div 
            className={`fixed top-0 left-0 h-[100dvh] w-[85%] max-w-[320px] bg-white dark:bg-slate-900 z-[999] shadow-2xl transition-transform duration-300 ease-in-out transform flex flex-col ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
            {/* Drawer Header */}
            <div className="pt-safe-top px-6 pt-12 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4 mb-5">
                    <div className="w-16 h-16 rounded-full bg-[#00897b] flex items-center justify-center text-white text-3xl font-normal uppercase shadow">
                        {firstName.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white capitalize">{firstName}</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Class 12 • 2027</p>
                    </div>
                </div>

                <div className="relative">
                    <button 
                        onClick={() => setBoardDropdownOpen(!isBoardDropdownOpen)}
                        className="w-full bg-[#e8f1fd] dark:bg-[#1e2a40] text-[#1a73e8] dark:text-[#669df6] py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#d4e4fc] dark:hover:bg-[#162133] transition-colors focus:outline-none"
                    >
                        {selectedBoard} <i className={`fa-solid fa-chevron-down text-sm transition-transform ${isBoardDropdownOpen ? 'rotate-180' : ''}`}></i>
                    </button>
                    {isBoardDropdownOpen && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden z-10">
                            <button 
                                onClick={() => { setSelectedBoard('Board Class 10'); setBoardDropdownOpen(false); }}
                                className="w-full text-left px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors"
                            >
                                Board Class 10
                            </button>
                            <button 
                                onClick={() => { setSelectedBoard('Board Class 12'); setBoardDropdownOpen(false); }}
                                className="w-full text-left px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors border-t border-slate-100 dark:border-slate-700"
                            >
                                Board Class 12
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Menu Items */}
            <div className="flex-1 py-4 flex flex-col gap-1 px-3">
                <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300">
                        <i className="fa-regular fa-bell text-lg w-5 text-center"></i>
                        <span className="text-[17px] font-medium">Notification</span>
                    </div>
                    <i className="fa-solid fa-caret-right text-slate-400 text-sm"></i>
                </button>

                <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300">
                        <i className="fa-solid fa-gear text-lg w-5 text-center"></i>
                        <span className="text-[17px] font-medium">Settings</span>
                    </div>
                    <i className="fa-solid fa-caret-right text-slate-400 text-sm"></i>
                </button>

                <div className="w-full flex items-center justify-between p-3 rounded-lg">
                    <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300">
                        <i className="fa-regular fa-moon text-lg w-5 text-center"></i>
                        <span className="text-[17px] font-medium">Dark theme</span>
                    </div>
                    <button 
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className={`w-12 h-6 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-[#34c759]' : 'bg-slate-300'}`}
                    >
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-[26px]' : 'translate-x-[2px]'}`}></div>
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className="pb-6 pt-4 px-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1 select-none">
                    <div className="relative flex items-center justify-center bg-slate-800 rounded-md w-6 h-6 mr-1">
                        <div className="italic font-black text-white text-[14px]" style={{ fontFamily: 'sans-serif' }}>R</div>
                        <i className="fa-solid fa-bolt text-yellow-500 absolute -left-0.5 opacity-90 text-[10px] transform -rotate-12"></i>
                    </div>
                    <div className="font-bold text-[15px] tracking-wide text-slate-800 dark:text-slate-200">
                        RAFTAAR
                    </div>
                </div>
                <div className="text-[11px] text-slate-400 font-medium tracking-wide">
                    v2.0.5.1 (Beta)
                </div>
            </div>
        </div>

    </div>
  );
};

const GradientIconBtn = ({ icon, label, gradient, onClick }: { icon: string, label: string, gradient: string, onClick: () => void }) => (
    <div onClick={onClick} className="flex flex-col items-center justify-start gap-1.5 cursor-pointer group flex-1">
        <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl ${gradient} flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-sm`}>
            <i className={`${icon} text-white text-[22px]`}></i>
        </div>
        <span className="text-[9px] sm:text-[10px] font-medium text-slate-800 dark:text-slate-200 text-center leading-tight whitespace-nowrap inline-block w-full overflow-visible">
            {label}
        </span>
    </div>
);

const StudyZoneCard = ({ title, icon, iconColor, onClick }: any) => (
    <div onClick={onClick} className="rounded-[16px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 py-5 flex flex-col justify-center items-center cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-md active:scale-95 transition-all w-full text-center group">
        <div className="relative mb-3">
            <i className={`${icon} ${iconColor} text-[32px] group-hover:scale-110 transition-transform duration-300`}></i>
        </div>
        <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-[12px] leading-tight select-none">
            {title}
        </h3>
    </div>
);

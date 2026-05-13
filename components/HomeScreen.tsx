
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
      id: 'first_image',
      customLayout: 'first_image',
      action: () => setComingSoonTitle('Banner 1'),
    },
    {
      id: 'raftaar_banner',
      customLayout: 'raftaar_banner',
      action: () => setComingSoonTitle('BSEB Mega Mock'),
    },
    {
      id: 'mission_2026',
      customLayout: 'mission_2026',
      action: () => navigate('/practice'),
    },
    {
      id: 'telegram',
      customLayout: 'telegram',
      action: () => window.open('https://t.me/your_telegram_link', '_blank'),
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
    }, 10000);
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
        
        {/* Fixed Top Nav (Sticky) */}
        <div className="sticky top-0 z-50 bg-[#0f2133] px-4 pt-safe-header pb-2">
            {/* Top Row: Menu, Logo, Icons */}
            <div className="flex justify-between items-center mt-2">
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
        </div>

        {/* Scrollable Content starts here */}
        {/* Greeting with same background to create seamless look */}
        <div className="bg-[#0f2133] px-4 pb-5 pt-2 relative">
            <div className="pb-4">
                <h1 className="text-white text-[15px] font-medium tracking-wide">
                    Namaste, <span className="text-yellow-500 font-bold">{firstName}!</span>
                </h1>
            </div>
        </div>

        {/* Banners */}
        <div className="px-4 mt-3 relative z-20">
            <div 
                ref={sliderRef}
                className="flex overflow-x-auto hide-scrollbar gap-0 snap-x snap-mandatory rounded-[20px] shadow-sm"
                onScroll={handleScroll}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
            >
                {slides.map((slide, idx) => {
                    if (slide.customLayout === 'first_image') {
                        return (
                            <div key={idx} className="snap-center min-w-full w-full h-[140px] relative overflow-hidden flex-shrink-0 rounded-[20px] shadow-sm border border-slate-700/50 bg-[#041024]">
                                <img 
                                    src="https://lmauqnfzcvhtxlznrwni.supabase.co/storage/v1/object/public/banner/banner%20no%201.png" 
                                    className="absolute inset-0 w-full h-full object-cover object-center" 
                                    alt="First Banner" 
                                />
                                <div className="absolute inset-0 z-10 w-full h-full cursor-pointer" onClick={slide.action}></div>
                            </div>
                        );
                    }

                    if (slide.customLayout === 'raftaar_banner') {
                        return (
                            <div key={idx} className="snap-center min-w-full w-full h-[140px] relative overflow-hidden flex-shrink-0 rounded-[20px] shadow-sm border border-slate-700/50 bg-[#041024]">
                                <img 
                                    src="https://lmauqnfzcvhtxlznrwni.supabase.co/storage/v1/object/public/banner/ChatGPT%20Image%20May%2012,%202026,%2003_36_40%20PM.png" 
                                    className="absolute inset-0 w-full h-full object-cover object-[85%_center] transform scale-[1.3]" 
                                    alt="Second Banner" 
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-[#041024] via-[#041024]/95 to-transparent w-[85%] z-0"></div>
                                
                                <div className="relative z-10 p-4 h-full flex flex-col justify-between w-[90%]">
                                    <div>
                                        <h2 className="text-white font-extrabold text-[19px] leading-[1.15] tracking-wide drop-shadow-md">
                                            Accelerate with <br/><span className="text-[#82bdf9] font-black text-[22px]">Raftaar</span>
                                        </h2>
                                        <p className="text-slate-300 mt-1.5 text-[10px] font-medium leading-[1.3] drop-shadow max-w-[75%]">
                                            Master Your Exam with Daily Live Mocks & PYQs.
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-end mt-auto pt-[2px]">
                                        <button onClick={slide.action} className="bg-gradient-to-b from-[#8ebaf5] to-[#2480fb] text-[#020b14] font-extrabold text-[10.5px] px-3.5 py-1.5 rounded-full shadow-[0_0_15px_rgba(36,128,251,0.5)] active:scale-95 transition-transform flex items-center gap-1.5 z-20">
                                            Start Practicing Now <i className="fa-solid fa-arrow-right text-[10px]"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    if (slide.customLayout === 'mission_2026') {
                        return (
                            <div key={idx} className="snap-center min-w-full w-full h-[140px] relative overflow-hidden flex-shrink-0 bg-indigo-900 rounded-[20px] shadow-sm border border-slate-700/50">
                                <img 
                                    src="https://lmauqnfzcvhtxlznrwni.supabase.co/storage/v1/object/public/banner/450banner%20image%20.png" 
                                    className="absolute inset-0 w-[104%] h-[104%] -top-[2%] -left-[2%] object-cover object-center" 
                                    alt="Mission 2026 Banner" 
                                />
                                <div className="absolute inset-0 z-10 w-full h-full cursor-pointer" onClick={slide.action}></div>
                            </div>
                        );
                    }

                    if (slide.customLayout === 'telegram') {
                         return (
                            <div key={idx} className="snap-center min-w-full w-full h-[140px] relative overflow-hidden flex-shrink-0 rounded-[20px] shadow-sm border border-[#1e95d4] bg-[#0088cc]">
                                <div className="absolute top-[-20%] right-[-10%] w-[150px] h-[150px] bg-white opacity-10 rounded-full blur-2xl"></div>
                                <i className="fa-brands fa-telegram text-white/20 text-[120px] absolute -right-4 -bottom-4 transform -rotate-12"></i>
                                
                                <div className="relative z-10 p-4 h-full flex flex-col justify-between">
                                    <div>
                                        <h2 className="text-white font-black text-[20px] leading-[1.1] tracking-wide drop-shadow-sm">
                                            Join our<br/>Telegram Channel
                                        </h2>
                                        <p className="text-white/90 mt-1 text-[11px] font-medium leading-snug max-w-[70%]">
                                            Get daily PDF notes & quiz updates free.
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-end mt-auto pt-[2px]">
                                        <button onClick={slide.action} className="bg-white text-[#0088cc] font-extrabold text-[10px] px-4 py-1.5 rounded-full shadow-md active:scale-95 transition-transform z-20 flex items-center gap-1.5">
                                            Join Telegram <i className="fa-solid fa-arrow-right text-[9px]"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                         );
                    }
                    
                    return null;
                })}
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
                    subtitle="Enrolled Courses"
                    icon="fa-solid fa-graduation-cap" 
                    iconColor="text-indigo-600 dark:text-indigo-400" 
                    bgClass="bg-indigo-300"
                    arrowColor="bg-indigo-600"
                    onClick={() => setComingSoonTitle('My Batches')} 
                />

                <StudyZoneCard 
                    title="Infinity" 
                    subtitle="Practice Math"
                    icon="fa-solid fa-infinity" 
                    iconColor="text-purple-600 dark:text-purple-400" 
                    bgClass="bg-purple-300"
                    arrowColor="bg-purple-600"
                    onClick={onOpenInfinity} 
                />
                
                <StudyZoneCard 
                    title="PYQs" 
                    subtitle="Previous year questions"
                    icon="fa-solid fa-file-circle-question" 
                    iconColor="text-pink-600 dark:text-pink-400" 
                    bgClass="bg-pink-300"
                    arrowColor="bg-pink-600"
                    onClick={onOpenPYQ} 
                />

                <StudyZoneCard 
                    title="Achievement" 
                    subtitle="View your medals"
                    icon="fa-solid fa-medal" 
                    iconColor="text-amber-500 dark:text-amber-400" 
                    bgClass="bg-amber-300"
                    arrowColor="bg-amber-500"
                    onClick={onOpenAchievements} 
                />

                <StudyZoneCard 
                    title="Dashboard" 
                    subtitle="Your Analytics"
                    icon="fa-solid fa-chart-pie" 
                    iconColor="text-emerald-600 dark:text-emerald-400" 
                    bgClass="bg-emerald-300"
                    arrowColor="bg-emerald-600"
                    onClick={onOpenDashboard} 
                />

                <StudyZoneCard 
                    title="Bookmarks" 
                    subtitle="Saved Content"
                    icon="fa-solid fa-bookmark" 
                    iconColor="text-blue-600 dark:text-blue-400" 
                    bgClass="bg-blue-300"
                    arrowColor="bg-blue-600"
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

const StudyZoneCard = ({ title, subtitle, icon, iconColor, bgClass, arrowColor, onClick }: any) => (
    <div onClick={onClick} className="rounded-[16px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 pb-2 flex flex-col items-start cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-md active:scale-95 transition-all w-full group relative min-h-[105px] overflow-hidden">
        {bgClass && <div className={`absolute -top-4 -left-4 w-16 h-16 ${bgClass} blur-2xl rounded-full opacity-30 dark:opacity-20`}></div>}
        <div className="relative mb-2 ml-1 mt-1">
            <i className={`${icon} ${iconColor} text-[28px] group-hover:scale-110 transition-transform duration-300 drop-shadow-sm`}></i>
        </div>
        <div className="relative mt-auto w-full pr-6 text-left">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-[11px] leading-tight select-none truncate">
                {title}
            </h3>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 leading-[1.2] select-none line-clamp-2 pr-1">
                {subtitle}
            </p>
        </div>
        <div className={`absolute bottom-2 right-2 w-[22px] h-[22px] rounded-full flex items-center justify-center text-white ${arrowColor} group-hover:scale-110 transition-transform`}>
            <i className="fa-solid fa-arrow-right text-[10px]"></i>
        </div>
    </div>
);

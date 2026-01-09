
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from './services/supabase';
import { api } from './services/api';
import { Profile, Question, TestSubmission } from './types';
import { TestInterface } from './components/TestInterface';
import { ShortsScreen } from './components/ShortsScreen';
import { InfinityPracticeModal } from './components/InfinityPracticeModal';
import { InfinityTestScreen } from './components/InfinityTestScreen'; 
import { PYQDashboard } from './components/PYQDashboard'; 
import { PYQSubjectiveScreen } from './components/PYQSubjectiveScreen'; 
import { LoginScreen } from './components/LoginScreen';
import { DashboardModal } from './components/DashboardModal';
import { AchievementsModal } from './components/AchievementsModal';
import { RewardsScreen } from './components/RewardsScreen';
import { HomeScreen } from './components/HomeScreen';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Sun, Moon } from 'lucide-react';
import { useBackHandler } from './hooks/useBackHandler';
import { useStatusBar } from './hooks/useStatusBar';
import { useTheme } from './hooks/useTheme';

const RaftaarLogo = () => (
  <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shadow-lg transform -rotate-3 border border-slate-800 dark:bg-slate-800 dark:border-slate-700">
          <span className="text-white font-black text-xl font-sans">R</span>
      </div>
      <div className="font-black text-xl tracking-tighter text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:via-slate-200 dark:to-slate-400">
          RAFTAAR
      </div>
  </div>
);

// Splash Screen
const SplashScreen = () => (
  <div className="h-[100dvh] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 animate-fade-in">
    <div className="scale-150 mb-8 animate-bounce">
      <RaftaarLogo />
    </div>
    <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-slate-500 dark:text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-6 animate-pulse">Initializing...</p>
  </div>
);

// Full Page Coming Soon
const FullPageComingSoon = ({ onClose, title, profile }: { onClose: () => void, title: string, profile: Profile | null }) => {
  return (
  <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 font-sans animate-fade-in">
    <div className="sticky top-0 z-50 px-5 pb-3 pt-safe-header bg-white dark:bg-slate-950 flex justify-between items-center border-b border-slate-100 dark:border-slate-800 shadow-sm transition-all">
        <div className="flex items-center gap-3">
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors -ml-1 active:scale-95">
                <ChevronLeft size={24} />
            </button>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate max-w-[200px]">{title}</h2>
        </div>
        <div className="flex items-center gap-1 text-brand-600 dark:text-brand-400 font-black">
             <i className="fa-solid fa-bolt text-xs"></i>
             <span>{profile?.weekly_xp || 0}</span>
        </div>
    </div>
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
        <div className="w-32 h-32 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 animate-bounce shadow-xl border border-slate-200 dark:border-slate-800">
            <i className="fa-solid fa-rocket text-6xl text-brand-500"></i>
        </div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Coming Soon</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-10 leading-relaxed font-medium">
            We are crafting the <strong>{title}</strong> module for the Class of 2026. Excellence takes time.
        </p>
        <button onClick={onClose} className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 px-8 py-4 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform w-full max-w-xs">
            Go Back
        </button>
    </div>
  </div>
)};

// Subject Icon Helper
const SubjectIcon = ({ subject }: { subject: string }) => {
  const map: any = {
    'Physics': { icon: 'fa-atom', color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    'Chemistry': { icon: 'fa-flask', color: 'text-teal-500 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/30' },
    'Maths': { icon: 'fa-calculator', color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
    'Biology': { icon: 'fa-dna', color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30' },
    'Hindi': { icon: 'fa-om', color: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30' },
    'English': { icon: 'fa-font', color: 'text-violet-500 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30' },
  };
  const style = map[subject] || { icon: 'fa-book', color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-900' };
  return (
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${style.bg} mb-2 shadow-sm border border-slate-200 dark:border-slate-800`}>
        <i className={`fa-solid ${style.icon} text-2xl ${style.color}`}></i>
    </div>
  );
};

// Exam Screen
const ExamScreen = ({ showCS, profile, navigate }: { showCS: () => void, profile: Profile | null, navigate: any }) => {
    // Navigates HOME on back press
    useBackHandler(() => {
        navigate('/');
        return true;
    });

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            <div className="sticky top-0 z-50 px-5 pb-3 pt-safe-header bg-white dark:bg-slate-950 flex justify-between items-center border-b border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/')} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors -ml-1 active:scale-95">
                        <ChevronLeft size={24} />
                    </button>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Live Exam</h2>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                    <div className="flex items-center gap-1 text-brand-600 dark:text-brand-400 font-black">
                        <i className="fa-solid fa-bolt text-xs"></i>
                        <span>{profile?.weekly_xp || 0}</span>
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 pb-24 animate-slide-up">
                <div onClick={showCS} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-l-4 border-l-purple-500 cursor-pointer shadow-sm dark:shadow-none hover:shadow-md transition relative overflow-hidden mb-4 border border-slate-100 dark:border-slate-800 group">
                    <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <i className="fa-solid fa-clock text-6xl text-purple-600 dark:text-purple-400"></i>
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                            <span className="bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-purple-100 dark:border-purple-500/20">Scheduled</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">BSEB Physics Mega Mock</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mb-4">Full Syllabus • 3 Hours</p>
                        <button className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 px-4 py-2 rounded-xl text-xs font-bold shadow-md">Register Now</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Practice Screen
const PracticeScreen = ({ onSelectChapter, navigate, profile }: { onSelectChapter: (subject: string, chapter: string) => void, navigate: any, profile: Profile | null }) => {
    const [subjects, setSubjects] = useState<string[]>([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedSubject = searchParams.get('subject');
    
    const [chapters, setChapters] = useState<{en: string, hi: string, count: number}[]>([]);
    const [loading, setLoading] = useState(false);
  
    useEffect(() => {
      api.getSubjects().then(setSubjects);
    }, []);
  
    useEffect(() => {
      if (selectedSubject) {
          setLoading(true);
          api.getChapterStats(selectedSubject).then(data => {
              setChapters(data);
              setLoading(false);
          });
      }
    }, [selectedSubject]);

    // Stack Logic: Chapter List -> Subject List -> Home
    const handleAppBack = () => {
        if (selectedSubject) {
            setSearchParams({}, { replace: true }); 
            return true; 
        } else {
            navigate('/'); 
            return true; 
        }
    };

    useBackHandler(handleAppBack, true); 

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            <div className="sticky top-0 z-50 px-5 pb-3 pt-safe-header bg-white dark:bg-slate-950 flex justify-between items-center border-b border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={handleAppBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors -ml-1 active:scale-95">
                        <ChevronLeft size={24} />
                    </button>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                        {selectedSubject || 'Practice'}
                    </h2>
                </div>
                <div className="flex items-center gap-1 text-brand-600 dark:text-brand-400 font-black">
                    <i className="fa-solid fa-bolt text-xs"></i>
                    <span>{profile?.weekly_xp || 0}</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar p-5 pb-24 animate-fade-in">
                {!selectedSubject ? (
                    <>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Select <span className="text-brand-600 dark:text-brand-500">Subject</span></h2>
                        <div className="grid grid-cols-2 gap-4">
                            {subjects.map(sub => (
                                <div key={sub} onClick={() => setSearchParams({ subject: sub }, { replace: true })} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform hover:border-brand-300 dark:hover:border-brand-500/50 group">
                                    <SubjectIcon subject={sub} />
                                    <span className="font-bold text-slate-600 dark:text-slate-300 text-sm group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{sub}</span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="space-y-3">
                        {loading ? (
                            <div className="text-center p-10 text-slate-500 text-sm font-bold animate-pulse">Loading chapters...</div>
                        ) : (
                            chapters.map((chap, idx) => (
                                <div key={idx} onClick={() => onSelectChapter(selectedSubject, chap.en)} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none active:scale-[0.98] transition-transform flex items-center justify-between cursor-pointer hover:border-brand-200 dark:hover:border-brand-500/30 group">
                                    <div>
                                        <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                            {idx + 1}. {chap.en}
                                        </h4>
                                        {chap.hi && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">{chap.hi}</p>}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-brand-50 dark:group-hover:bg-brand-500/20 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                        <i className="fa-solid fa-chevron-right text-xs"></i>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Result Screen
const ResultScreen = ({ stats, onHome }: { stats: any, onHome: () => void }) => {
    if(!stats) return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400">Loading Result...</div>;
    const score = stats.correct * 1; 
    return (
        <div className="h-[100dvh] overflow-y-auto bg-white dark:bg-slate-950 p-6 animate-slide-up pb-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-brand-50 dark:bg-brand-500/10 rounded-full flex items-center justify-center mb-6 border border-brand-100 dark:border-brand-500/20">
                <i className="fa-solid fa-trophy text-4xl text-brand-600 dark:text-brand-500"></i>
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Test Completed</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">Great job! Here is your performance.</p>
            
            <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-8 w-full mb-8 border border-slate-100 dark:border-slate-800">
                <div className="text-6xl font-black mb-2 text-brand-600 dark:text-brand-400">{score}</div>
                <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Total Score</div>
                
                <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none"><p className="text-2xl font-black text-emerald-500 dark:text-emerald-400">{stats.correct}</p><p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Correct</p></div>
                    <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none"><p className="text-2xl font-black text-rose-500 dark:text-rose-400">{stats.wrong}</p><p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Wrong</p></div>
                </div>
            </div>
            
            <button onClick={onHome} className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] transition-transform shadow-brand-200 dark:shadow-brand-900/50">Return to Chapters</button>
        </div>
    );
};

// --- Main App Component ---
export default function App() {
  const [session, setSession] = useState<any>(null);
  const [isAppInitializing, setIsAppInitializing] = useState(true);
  const { theme, toggleTheme } = useTheme();
  
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [activeTestQuestions, setActiveTestQuestions] = useState<Question[]>([]);
  const [activeSubject, setActiveSubject] = useState<string>('');
  const [testStats, setTestStats] = useState<any>(null);
  const [comingSoonTitle, setComingSoonTitle] = useState('');
  
  // Infinity Practice State
  const [isInfinityOpen, setInfinityOpen] = useState(false);
  const [infinityConfig, setInfinityConfig] = useState<{subject: string, chapters: string[]} | null>(null);
  const [infinityInstantOpen, setInfinityInstantOpen] = useState(false);
  
  // PYQ Modal State
  const [isPYQOpen, setPYQOpen] = useState(false);
  const [pyqInitialTab, setPyqInitialTab] = useState<'objective' | 'subjective'>('objective');
  const [instantOpen, setInstantOpen] = useState(false); 
  
  // Dashboard & Achievements Modals State
  const [isDashboardOpen, setDashboardOpen] = useState(false);
  const [isAchievementsOpen, setAchievementsOpen] = useState(false);
  
  // Double Back to Exit State
  const [exitAttempted, setExitAttempted] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- 1. GLOBAL STATUS BAR MANAGEMENT ---
  useStatusBar();

  // --- DOUBLE BACK TO EXIT LOGIC ---
  useBackHandler(() => {
    if (location.pathname === '/' && !isInfinityOpen && !isPYQOpen && !isDashboardOpen && !isAchievementsOpen) {
        if (exitAttempted) {
            return false; // Exit app
        } else {
            setExitAttempted(true);
            setTimeout(() => setExitAttempted(false), 2000); 
            return true; 
        }
    }
    return false; 
  }, location.pathname === '/' && !isInfinityOpen && !isPYQOpen && !isDashboardOpen && !isAchievementsOpen);

  useEffect(() => {
    let mounted = true;
    const restoreSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (mounted && session) {
            setSession(session);
            fetchProfile(session.user.id).catch(console.error);
        }
      } catch (error) {
        console.error("Session fail", error);
      } finally {
        if (mounted) setIsAppInitializing(false);
      }
    };
    restoreSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      if (session) fetchProfile(session.user.id).catch(console.error);
      else setUserProfile(null);
      setIsAppInitializing(false);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const mode = searchParams.get('mode');
    setInfinityOpen(mode === 'infinity');
  }, [searchParams]);

  useEffect(() => {
    if (location.state && (location.state as any).returnTo === 'infinity') {
      setInfinityInstantOpen(true);
      if (!searchParams.get('mode')) setSearchParams({ mode: 'infinity' }, { replace: true });
      window.history.replaceState({}, document.title);
    } else {
      setInfinityInstantOpen(false);
    }
  }, [location, searchParams, setSearchParams]);

  useEffect(() => {
    if (location.state && (location.state as any).openPYQ) {
        const state = location.state as any;
        setPyqInitialTab(state.tab || 'objective');
        setInstantOpen(true); 
        setPYQOpen(true);
        window.history.replaceState({}, document.title);
    } else {
        setInstantOpen(false); 
    }
  }, [location]);

  const fetchProfile = async (userId: string) => {
    const data = await api.getProfile(userId);
    if (!data) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const fullName = user?.user_metadata?.full_name || 'Student';
            const avatarUrl = user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;
            const newProfile = await api.createProfile(userId, fullName, avatarUrl);
            if (newProfile) setUserProfile(newProfile);
        }
    } else {
        setUserProfile(data);
    }
  };

  const handleStartTest = async (subject: string, chapterEn: string) => {
    const qs = await api.getQuestionsByChapter(subject, chapterEn);
    if (qs.length > 0) {
      setActiveSubject(subject);
      setActiveTestQuestions(qs);
      navigate('/test');
    } else {
      setComingSoonTitle(`${subject} - ${chapterEn}`);
      navigate('/coming-soon');
    }
  };

  const handleTestComplete = async (stats: any) => {
    setTestStats(stats);
    if (session?.user?.id) {
        const submission: TestSubmission = {
            userId: session.user.id,
            subject: activeSubject || 'Practice',
            testType: 'Practice',
            totalQuestions: stats.correct + stats.wrong + stats.skipped,
            correct: stats.correct,
            wrong: stats.wrong,
            skipped: stats.skipped,
            timeTaken: stats.totalTime,
            date: new Date().toISOString()
        };
        await api.submitTestResult(submission);
        await fetchProfile(session.user.id); 
    }
    navigate('/results', { replace: true });
  };

  const handleInfinitySubjectUpdate = (sub: string | null) => {
      const newParams: any = { mode: 'infinity' };
      if (sub) newParams.subject = sub;
      setSearchParams(newParams, { replace: true });
  };

  if (isAppInitializing) return <SplashScreen />;
  if (!session) return <LoginScreen onLoginSuccess={(s) => { setSession(s); navigate('/', { replace: true }); }} />;

  const NavIcon = ({ icon, label, target }: { icon: string, label: string, target: string }) => {
      const isActive = location.pathname === target || (target !== '/' && location.pathname.startsWith(target));
      return (
        <button onClick={() => navigate(target)} className={`flex flex-col items-center justify-center w-16 gap-0.5 transition-all ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
            <i className={`fa-solid ${icon} text-lg mb-0`}></i>
            <span className="text-[10px] font-bold tracking-wide leading-none">{label}</span>
            <div className={`w-1 h-1 rounded-full mt-0 transition-opacity ${isActive ? 'bg-brand-600 dark:bg-brand-400 opacity-100' : 'opacity-0'}`}></div>
        </button>
      )
  };

  const showNav = ['/', '/practice', '/rewards', '/profile', '/exam'].includes(location.pathname);
  const showTopHeader = location.pathname === '/';

  return (
    <div className="max-w-md mx-auto h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-950 font-sans relative shadow-2xl overflow-hidden text-slate-900 dark:text-white transition-colors duration-300">
        
        {showTopHeader && (
            <div className="px-5 pb-3 pt-safe-header bg-white dark:bg-slate-950 flex justify-between items-center sticky top-0 z-30 border-b border-slate-100 dark:border-slate-800 shadow-sm transition-all">
                <div className="flex items-center gap-2 relative -top-[1px]"><RaftaarLogo /></div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={toggleTheme} 
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Weekly XP</span>
                        <div className="flex items-center gap-1 text-brand-600 dark:text-brand-400 font-black">
                             <i className="fa-solid fa-bolt text-xs"></i>
                             <span>{userProfile?.weekly_xp || 0}</span>
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-sm" onClick={() => setDashboardOpen(true)}>
                        <img src={userProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`} className="w-full h-full rounded-full" alt="User" />
                    </div>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto hide-scrollbar relative z-10">
            <AnimatePresence>
                <Routes location={location} key={location.pathname}>
                    <Route 
                        path="/" 
                        element={
                            <HomeScreen 
                                profile={userProfile} 
                                setComingSoonTitle={(t) => { setComingSoonTitle(t); navigate('/coming-soon'); }} 
                                onOpenInfinity={() => setSearchParams({ mode: 'infinity' }, { replace: true })} 
                                onOpenPYQ={() => { setInstantOpen(false); setPyqInitialTab('objective'); setPYQOpen(true); }}
                                onOpenDashboard={() => setDashboardOpen(true)}
                                onOpenAchievements={() => setAchievementsOpen(true)}
                                navigate={navigate} 
                            />
                        } 
                    />
                    <Route path="/practice" element={<PracticeScreen onSelectChapter={handleStartTest} navigate={navigate} profile={userProfile} />} />
                    <Route path="/exam" element={<ExamScreen showCS={() => { setComingSoonTitle('BSEB Physics Mega Mock'); navigate('/coming-soon'); }} profile={userProfile} navigate={navigate} />} />
                    <Route path="/rewards" element={<RewardsScreen profile={userProfile} session={session} navigate={navigate} />} />
                    
                    <Route 
                        path="/pyq-test" 
                        element={
                            <InfinityTestScreen 
                                userId={session?.user?.id} 
                                subject={new URLSearchParams(location.search).get('subject') || ''} 
                                isPYQ={true} 
                                pyqYear={parseInt(new URLSearchParams(location.search).get('year') || '0')} 
                                onExit={() => { 
                                    if(session?.user?.id) fetchProfile(session.user.id); 
                                    // Navigate back to Home but with state to re-open PYQ modal at Objective tab
                                    navigate('/', { replace: true, state: { openPYQ: true, tab: 'objective' } });
                                }} 
                                defaultLanguage={userProfile?.exam_language}
                            />
                        } 
                    />
                    <Route 
                        path="/pyq-learn" 
                        element={
                            <PYQSubjectiveScreen 
                                subject={new URLSearchParams(location.search).get('subject') || ''} 
                                year={parseInt(new URLSearchParams(location.search).get('year') || '0')} 
                                onExit={() => navigate('/', { replace: true, state: { openPYQ: true, tab: 'subjective' } })}
                                defaultLanguage={userProfile?.exam_language} 
                            />
                        } 
                    />
                    
                    <Route path="/shorts" element={<ShortsScreen profile={userProfile} session={session} navigate={navigate} onInteractionSubmit={async (qId, isCorrect, isLiked, time) => { if (session?.user?.id) { await api.submitShortsInteraction(session.user.id, qId, isCorrect, isLiked, time); fetchProfile(session.user.id); } }} />} />
                    
                    <Route 
                        path="/results" 
                        element={
                            <ResultScreen 
                                stats={testStats} 
                                onHome={() => {
                                    if (activeSubject) {
                                        navigate(`/practice?subject=${activeSubject}`, { replace: true });
                                    } else {
                                        // For Modal based tests, go home, state will handle re-opening if needed (logic specific to modal types)
                                        navigate('/', { replace: true, state: { openPYQ: true, tab: 'objective' } });
                                    }
                                }} 
                            />
                        } 
                    />
                    
                    <Route 
                        path="/test" 
                        element={
                            <TestInterface 
                                questions={activeTestQuestions} 
                                subjectName={activeSubject} 
                                userId={session?.user?.id} 
                                onExit={() => {
                                    // Fix: Explicitly navigate to the previous context instead of relying on history stack (-1)
                                    // which might be polluted by the back handler trap.
                                    if (activeSubject) {
                                        navigate(`/practice?subject=${encodeURIComponent(activeSubject)}`, { replace: true });
                                    } else {
                                        navigate('/', { replace: true });
                                    }
                                }} 
                                onComplete={handleTestComplete} 
                                onAnswerSubmit={async (qId, opt, correct, timeTaken) => { 
                                  await api.submitAnswer(session.user.id, qId, opt, correct, timeTaken);
                                  if (correct && session?.user?.id) fetchProfile(session.user.id); // Refresh header XP
                                }} 
                                defaultLanguage={userProfile?.exam_language}
                            />
                        } 
                    />
                    <Route 
                        path="/infinity-test" 
                        element={
                            infinityConfig ? 
                            <InfinityTestScreen 
                                userId={session.user.id} 
                                subject={infinityConfig.subject} 
                                selectedChapters={infinityConfig.chapters} 
                                onExit={async () => { 
                                    if(session?.user?.id) await fetchProfile(session.user.id); 
                                    // Return to Home with Infinity Modal open logic
                                    const subjectParam = infinityConfig?.subject ? `&subject=${encodeURIComponent(infinityConfig.subject)}` : '';
                                    navigate(`/?mode=infinity${subjectParam}`, { replace: true, state: { returnTo: 'infinity' } });
                                }} 
                                defaultLanguage={userProfile?.exam_language}
                            /> : 
                            <div className="p-10 text-center dark:text-slate-400">Loading...</div>
                        } 
                    />
                    <Route 
                        path="/coming-soon" 
                        element={
                            <FullPageComingSoon 
                                title={comingSoonTitle} 
                                onClose={() => navigate(-1)} 
                                profile={userProfile}
                            />
                        } 
                    />
                </Routes>
            </AnimatePresence>
        </div>

        <InfinityPracticeModal 
            isOpen={isInfinityOpen} 
            onClose={() => setSearchParams({}, { replace: true })} 
            userId={session?.user?.id}
            initialSubject={searchParams.get('subject')}
            onUpdateSubject={handleInfinitySubjectUpdate}
            instantOpen={infinityInstantOpen}
            onStartSession={(subject, chapters) => { 
                setInfinityConfig({ subject, chapters }); 
                navigate('/infinity-test'); 
            }} 
        />
        
        <PYQDashboard 
            isOpen={isPYQOpen}
            initialTab={pyqInitialTab}
            instantOpen={instantOpen}
            onClose={() => setPYQOpen(false)}
            onSelectYear={async (subject, year, type) => { 
                setPYQOpen(false); 
                if (type === 'objective') { 
                    navigate(`/pyq-test?subject=${subject}&year=${year}`); 
                } else { 
                    navigate(`/pyq-learn?subject=${subject}&year=${year}`); 
                } 
            }} 
        />

        <DashboardModal 
            isOpen={isDashboardOpen} 
            onBack={() => setDashboardOpen(false)} 
            userId={session?.user?.id}
            profile={userProfile}
        />

        <AchievementsModal 
            isOpen={isAchievementsOpen} 
            onBack={() => setAchievementsOpen(false)}
            profile={userProfile}
        />

        <AnimatePresence>
            {exitAttempted && (
                <motion.div 
                    initial={{ y: 50, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 50, opacity: 0, scale: 0.95 }}
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full text-sm font-bold shadow-lg z-[60] border border-slate-700 flex items-center gap-2 pb-safe"
                >
                    <div className="w-2 h-2 bg-brand-400 rounded-full animate-pulse"></div>
                    Press back again to exit
                </motion.div>
            )}
        </AnimatePresence>

        {showNav && (
            <div className="fixed bottom-0 w-full max-w-md bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-around py-1 pb-safe-offset-2 z-40 shadow-lg">
                <div className="pb-safe flex w-full justify-around pt-1">
                    <NavIcon icon="fa-house" label="Home" target="/" />
                    <NavIcon icon="fa-book-open" label="Practice" target="/practice" />
                    <NavIcon icon="fa-file-signature" label="Exam" target="/exam" />
                    <NavIcon icon="fa-trophy" label="Rewards" target="/rewards" />
                </div>
            </div>
        )}
    </div>
  );
}

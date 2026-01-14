
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
import { NoInternetScreen } from './components/NoInternetScreen'; 
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import { useBackHandler } from './hooks/useBackHandler';
import { useStatusBar } from './hooks/useStatusBar';
import { useOnlineStatus } from './hooks/useOnlineStatus'; 

const RaftaarLogo = () => (
  <div className="flex items-center gap-2 select-none shrink-0">
      {/* Icon: Black box (light) / White box (dark) - Tilted Left */}
      <div className="transform -rotate-6 transition-transform">
        <div className="w-9 h-9 bg-black dark:bg-white rounded-xl flex items-center justify-center shadow-lg shadow-black/10 dark:shadow-white/5 shrink-0">
            <span className="text-white dark:text-black font-black text-xl font-sans leading-none pb-0.5">R</span>
        </div>
      </div>
      
      {/* Text: Smooth Gradient Fade */}
      <div className="font-black text-xl tracking-tighter shrink-0">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-black via-blue-800 to-blue-500 dark:from-white dark:via-blue-200 dark:to-blue-400">
            RAFTAAR
          </span>
      </div>
  </div>
);

// Splash Screen
const SplashScreen = () => (
  <div className="h-[100dvh] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 animate-fade-in transition-colors duration-300">
    <div className="scale-150 mb-8 animate-bounce">
      <RaftaarLogo />
    </div>
    <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-6 animate-pulse">Initializing...</p>
  </div>
);

// Full Page Coming Soon
const FullPageComingSoon = ({ onClose, title, profile }: { onClose: () => void, title: string, profile: Profile | null }) => {
  return (
  <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 font-sans animate-fade-in transition-colors duration-300">
    <div className="sticky top-0 z-50 px-5 pb-3 pt-safe-header bg-white dark:bg-slate-950 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 shadow-sm transition-all">
        <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 transition-colors active:scale-95">
                <ArrowLeft size={20} />
            </button>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate max-w-[200px]">{title}</h2>
        </div>
        <div className="flex items-center gap-1 text-brand-500 dark:text-brand-400 font-black">
             <i className="fa-solid fa-bolt text-xs"></i>
             <span>{profile?.weekly_xp || 0}</span>
        </div>
    </div>
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
        <div className="w-32 h-32 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mb-6 animate-bounce shadow-xl border border-slate-200 dark:border-slate-800">
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
const ExamScreen = ({ showCS, profile, navigate }: { showCS: (title: string) => void, profile: Profile | null, navigate: any }) => {
    useBackHandler(() => {
        navigate('/');
        return true;
    });

    const exams = [
        { id: 1, subject: 'Physics', title: 'Physics Mega Mock', icon: 'fa-atom', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-100 dark:border-blue-900/50' },
        { id: 2, subject: 'Chemistry', title: 'Chemistry Target', icon: 'fa-flask', color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-100 dark:border-teal-900/50' },
        { id: 3, subject: 'Maths', title: 'Maths Formula Test', icon: 'fa-calculator', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-100 dark:border-indigo-900/50' },
        { id: 4, subject: 'Biology', title: 'Biology Diagram Test', icon: 'fa-dna', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-100 dark:border-rose-900/50' },
        { id: 5, subject: 'Hindi', title: 'Hindi Vyakaran', icon: 'fa-om', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-100 dark:border-orange-900/50' },
        { id: 6, subject: 'English', title: 'English Grammar', icon: 'fa-font', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-100 dark:border-violet-900/50' },
    ];

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="sticky top-0 z-50 px-5 pb-3 pt-safe-header bg-white dark:bg-slate-950 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 shadow-sm transition-all">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/')} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1 -ml-1 rounded-full active:bg-slate-100 dark:active:bg-slate-900">
                        <i className="fa-solid fa-chevron-left text-lg"></i>
                    </button>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Live Exam</h2>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                    <div className="flex items-center gap-1 text-brand-500 dark:text-brand-400 font-black">
                        <i className="fa-solid fa-bolt text-xs"></i>
                        <span>{profile?.weekly_xp || 0}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 pb-24 animate-slide-up space-y-3">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 pl-1">Upcoming Exams</h3>
                
                {exams.map((exam) => (
                    <div 
                        key={exam.id} 
                        onClick={() => showCS(exam.title)} 
                        className={`relative p-4 rounded-2xl border ${exam.border} bg-white dark:bg-slate-900 shadow-sm flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform`}
                    >
                        {/* Icon Container */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${exam.bg} ${exam.color}`}>
                            <i className={`fa-solid ${exam.icon} text-xl`}></i>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-slate-900 dark:text-white text-base truncate pr-2">{exam.title}</h4>
                                <span className="shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700">Scheduled</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate">Full Syllabus • 100 Marks</p>
                        </div>
                    </div>
                ))}

                <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="relative z-10">
                        <h4 className="font-bold text-lg mb-1">Weekly Mega Test</h4>
                        <p className="text-slate-300 text-xs mb-4 max-w-[200px] mx-auto">Compete with thousands of students every Sunday.</p>
                        <span className="inline-block bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold border border-white/20">Coming Soon</span>
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
      const cacheKey = 'subjects_cache';
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
          setSubjects(JSON.parse(cached));
      }
      api.getSubjects().then(data => {
          setSubjects(data);
          localStorage.setItem(cacheKey, JSON.stringify(data));
      });
    }, []);
  
    useEffect(() => {
      if (selectedSubject) {
          setLoading(true);
          const cacheKey = `chapters_cache_${selectedSubject}`;
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
              setChapters(JSON.parse(cached));
              setLoading(false); 
          }
          api.getChapterStats(selectedSubject).then(data => {
              setChapters(data);
              localStorage.setItem(cacheKey, JSON.stringify(data));
              setLoading(false);
          });
      }
    }, [selectedSubject]);

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
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            <div className="sticky top-0 z-50 px-5 pb-3 pt-safe-header bg-white dark:bg-slate-950 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                <div className="flex items-center gap-3">
                    <button onClick={handleAppBack} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1 -ml-1 rounded-full active:bg-slate-100 dark:active:bg-slate-900">
                        <i className="fa-solid fa-chevron-left text-lg"></i>
                    </button>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">
                        {selectedSubject || 'Practice'}
                    </h2>
                </div>
                <div className="flex items-center gap-1 text-brand-500 dark:text-brand-400 font-black">
                    <i className="fa-solid fa-bolt text-xs"></i>
                    <span>{profile?.weekly_xp || 0}</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar p-5 pb-24 animate-fade-in bg-slate-50 dark:bg-slate-950 transition-colors">
                {!selectedSubject ? (
                    <>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Select <span className="text-brand-500">Subject</span></h2>
                        <div className="grid grid-cols-2 gap-4">
                            {subjects.map(sub => (
                                <div key={sub} onClick={() => setSearchParams({ subject: sub }, { replace: true })} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md dark:shadow-none flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform hover:border-brand-500/50 group">
                                    <SubjectIcon subject={sub} />
                                    <span className="font-bold text-slate-600 dark:text-slate-300 text-sm group-hover:text-brand-600 dark:group-hover:text-white transition-colors">{sub}</span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="space-y-3">
                        {loading && chapters.length === 0 ? (
                            <div className="text-center p-10 text-slate-500 text-sm font-bold animate-pulse">Loading chapters...</div>
                        ) : (
                            chapters.map((chap, idx) => (
                                <div key={idx} onClick={() => onSelectChapter(selectedSubject, chap.en)} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm active:scale-[0.98] transition-transform flex items-center justify-between cursor-pointer hover:border-brand-500/30 group">
                                    <div>
                                        <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                            {idx + 1}. {chap.en}
                                        </h4>
                                        {chap.hi && <p className="text-xs text-slate-500 mt-1 font-medium">{chap.hi}</p>}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-brand-50 dark:group-hover:bg-brand-500/20 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors">
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
        <div className="h-[100dvh] overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 animate-slide-up pb-20 flex flex-col items-center justify-center text-center transition-colors duration-300">
            <div className="w-20 h-20 bg-brand-50 dark:bg-brand-500/10 rounded-full flex items-center justify-center mb-6 border border-brand-100 dark:border-brand-500/20">
                <i className="fa-solid fa-trophy text-4xl text-brand-600 dark:text-brand-500"></i>
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Test Completed</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">Great job! Here is your performance.</p>
            
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 w-full mb-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-6xl font-black mb-2 text-brand-500 dark:text-brand-400">{score}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Total Score</div>
                
                <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800"><p className="text-2xl font-black text-emerald-500 dark:text-emerald-400">{stats.correct}</p><p className="text-[10px] uppercase font-bold text-slate-500">Correct</p></div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800"><p className="text-2xl font-black text-rose-500 dark:text-rose-400">{stats.wrong}</p><p className="text-[10px] uppercase font-bold text-slate-500">Wrong</p></div>
                </div>
            </div>
            
            <button onClick={onHome} className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] transition-transform shadow-brand-900/20">Return to Chapters</button>
        </div>
    );
};

// --- Main App Component ---
export default function App() {
  const [session, setSession] = useState<any>(null);
  const [isAppInitializing, setIsAppInitializing] = useState(true);
  const isOnline = useOnlineStatus(); // Track online status
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('raftaar-theme') as 'light' | 'dark') || 'light';
  });

  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [activeTestQuestions, setActiveTestQuestions] = useState<Question[]>([]);
  const [activeSubject, setActiveSubject] = useState<string>('');
  const [testStats, setTestStats] = useState<any>(null);
  const [comingSoonTitle, setComingSoonTitle] = useState('');
  
  const [isInfinityOpen, setInfinityOpen] = useState(false);
  const [infinityConfig, setInfinityConfig] = useState<{subject: string, chapters: string[]} | null>(null);
  const [infinityInstantOpen, setInfinityInstantOpen] = useState(false);
  
  const [isPYQOpen, setPYQOpen] = useState(false);
  const [pyqInitialTab, setPyqInitialTab] = useState<'objective' | 'subjective'>('objective');
  const [instantOpen, setInstantOpen] = useState(false); 
  
  const [isDashboardOpen, setDashboardOpen] = useState(false);
  const [isAchievementsOpen, setAchievementsOpen] = useState(false);
  
  const [exitAttempted, setExitAttempted] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  useStatusBar(theme);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('raftaar-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useBackHandler(() => {
    if (location.pathname === '/' && !isInfinityOpen && !isPYQOpen && !isDashboardOpen && !isAchievementsOpen) {
        if (exitAttempted) {
            return false; 
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

  if (!isOnline) {
      return <NoInternetScreen />;
  }

  if (!session) return <LoginScreen onLoginSuccess={(s) => { setSession(s); navigate('/', { replace: true }); }} />;

  const NavIcon = ({ icon, label, target }: { icon: string, label: string, target: string }) => {
      const isActive = location.pathname === target || (target !== '/' && location.pathname.startsWith(target));
      return (
        <button onClick={() => navigate(target)} className={`flex flex-col items-center justify-center w-16 gap-0.5 transition-all ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}>
            <i className={`fa-solid ${icon} text-lg mb-0.5`}></i>
            <span className="text-[10px] font-bold tracking-wide leading-none">{label}</span>
            <div className={`w-1 h-1 rounded-full mt-0.5 transition-opacity ${isActive ? 'bg-brand-600 dark:bg-brand-400 opacity-100' : 'opacity-0'}`}></div>
        </button>
      )
  };

  const showNav = ['/', '/practice', '/rewards', '/profile', '/exam'].includes(location.pathname);
  const showTopHeader = location.pathname === '/';

  return (
    <div className="max-w-md mx-auto h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-950 font-sans relative shadow-2xl overflow-hidden text-slate-900 dark:text-white transition-colors duration-300">
        
        {showTopHeader && (
            <div className="px-4 pb-3 pt-safe-header bg-white dark:bg-slate-950 flex justify-between items-center sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-all">
                <div className="flex items-center gap-2"><RaftaarLogo /></div>
                <div className="flex items-center gap-3 shrink-0">
                    <button 
                        onClick={toggleTheme}
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors shrink-0"
                    >
                        {theme === 'light' ? <Sun size={15} /> : <Moon size={15} />}
                    </button>

                    <div className="flex flex-col items-end w-14 shrink-0">
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">Weekly XP</span>
                        <div className="flex items-center gap-1 text-brand-500 dark:text-brand-400 font-black leading-none">
                             <i className="fa-solid fa-bolt text-[10px]"></i>
                             <span className="text-sm">{userProfile?.weekly_xp || 0}</span>
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-700 cursor-pointer shadow-sm shrink-0" onClick={() => setDashboardOpen(true)}>
                        <img src={userProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`} className="w-full h-full rounded-full" alt="User" />
                    </div>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto hide-scrollbar relative z-10 bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
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
                    <Route path="/exam" element={<ExamScreen showCS={(title) => { setComingSoonTitle(title); navigate('/coming-soon'); }} profile={userProfile} navigate={navigate} />} />
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
                                    if(session?.user?.id) fetchProfile(session.user.id); 
                                    
                                    if (activeSubject) {
                                        navigate(`/practice?subject=${encodeURIComponent(activeSubject)}`, { replace: true });
                                    } else {
                                        navigate('/', { replace: true });
                                    }
                                }} 
                                onComplete={handleTestComplete} 
                                onAnswerSubmit={async (qId, opt, correct, timeTaken) => { await api.submitAnswer(session.user.id, qId, opt, correct, timeTaken); }} 
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
                                    const subjectParam = infinityConfig?.subject ? `&subject=${encodeURIComponent(infinityConfig.subject)}` : '';
                                    navigate(`/?mode=infinity${subjectParam}`, { replace: true, state: { returnTo: 'infinity' } });
                                }} 
                                defaultLanguage={userProfile?.exam_language}
                            /> : 
                            <div className="p-10 text-center">Loading...</div>
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
            <div className="fixed bottom-0 w-full max-w-md bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-around py-[7px] pb-safe z-40 shadow-lg transition-colors duration-300">
                <div className="flex w-full justify-around pt-1">
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
